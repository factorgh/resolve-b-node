import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { responseFactory } from "../utils/responseFactory";
import Application from "../models/application.model";
import FinancialProduct from "../models/product.model";
import Transaction from "../models/transaction.model";
import User from "../models/user.model";
import BillingInvoice from "../models/billing.model";
import Institution from "../models/institution.model";
import { auditLogger } from "../utils/auditLogger";
import { notificationService } from "../services/notification.service";
import { paystackService } from "../services/paystack.service";

export const applicationController = {
  getUserApplications: async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const applications = await Application.find({ userId })
        .populate({
          path: "productId",
          populate: { path: "institutionId", select: "name logoUrl" },
        })
        .sort({ createdAt: -1 });

      // Map to frontend expectations
      const mapped = applications.map((app) => {
        const product = app.productId as any;
        const institution = product?.institutionId as any;

        return {
          id: app._id,
          type: product?.productType || "Loan",
          provider: institution?.name || "Institution",
          product: product?.name || "Financial Product",
          amount: `GH₵ ${app.amount.toLocaleString()}`,
          status: app.status,
          progress:
            app.status === "Approved"
              ? 100
              : app.status === "Pending"
                ? 25
                : 50,
          date: new Date(app.submittedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          logo: institution?.logoUrl || "/resolve_icon.png",
          color:
            app.status === "Approved"
              ? "#10b981"
              : app.status === "Rejected"
                ? "#e11d48"
                : "#0033aa",
          steps: [
            {
              label: "Submitted",
              date: new Date(app.submittedAt).toLocaleDateString(),
              desc: "Application received",
            },
            {
              label: "Reviewing",
              date: app.reviewedAt
                ? new Date(app.reviewedAt).toLocaleDateString()
                : "In Progress",
              desc: "Institutional assessment",
            },
            {
              label: "Approval",
              date: app.approvedAt
                ? new Date(app.approvedAt).toLocaleDateString()
                : "Pending",
              desc: "Final decision",
            },
          ],
        };
      });

      return res.json(
        responseFactory.success(mapped, "Applications fetched successfully"),
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  createApplication: async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const { productId, amount, tenureMonths, applicationData } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json(responseFactory.notFound("User not found"));
      }

      const application = await Application.create({
        userId,
        productId,
        amount,
        tenureMonths,
        applicationData,
        status: "PaymentPending",
      });

      const reference = `PSK-APP-${application._id}-${Date.now()}`;
      const paymentResult = await paystackService.initiatePayment({
        email: user.email,
        amount: 1000, // GH₵ 10.00 in kobo
        reference,
        userId,
        productId,
        applicationId: application._id.toString(),
        description: "Client Connection Agent Fee",
        metadata: {
          isClientConnectionFee: true,
          applicationId: application._id.toString(),
        },
      });

      return res
        .status(201)
        .json(
          responseFactory.success(
            {
              application,
              requiresPayment: true,
              authorizationUrl: paymentResult.authorizationUrl,
              reference: paymentResult.reference,
            },
            "Application created. Payment required to complete submission.",
          ),
        );
    } catch (error: any) {
      return res.status(400).json(responseFactory.error(error.message));
    }
  },

  adminGetApplications: async (req: any, res: Response) => {
    try {
      const { role, institutionId } = req.user;
      const { status, regionId, assignedTo } = req.query;

      const query: any = {};
      if (status) {
        query.status = status;
      }

      if (assignedTo === "unassigned") {
        query.$or = [
          { assignedTo: { $exists: false } },
          { assignedTo: null }
        ];
      } else if (assignedTo) {
        query.assignedTo = assignedTo;
      }

      // Exclude unpaid draft applications (status 'PaymentPending') from standard default lists unless explicitly queried
      if (!query.status) {
        query.status = { $ne: "PaymentPending" };
      }

      // Regional Admin checks: if assigned to specific region, restrict to regional users.
      // Super Admin or Admins can also filter by regionId via query parameters.
      const filterRegionId = req.user.regionId || regionId;
      if (filterRegionId) {
        const regionalUsers = await User.find({ regionId: filterRegionId });
        const regionalUserIds = regionalUsers.map((u) => u._id);
        query.userId = { $in: regionalUserIds };
      }

      // Multi-tenant check: if partner (not SuperAdmin / Admin), restrict to their institution's products
      if (role !== "SuperAdmin" && role !== "Admin") {
        if (!institutionId) {
          console.warn(
            `[AdminGetApplications] Partner user ${req.user.id} has no mapped institutionId`,
          );
          return res
            .status(403)
            .json(
              responseFactory.error(
                "Forbidden: No associated institution",
                null,
                403,
              ),
            );
        }

        const products = await FinancialProduct.find({ institutionId });
        const productIds = products.map((p) => p._id);
        query.productId = { $in: productIds };
      }

      const applications = await Application.find(query)
        .populate(
          "userId",
          "firstName lastName email phoneNumber kycStatus regionId creditScore",
        )
        .populate("assignedTo", "firstName lastName email role")
        .populate({
          path: "productId",
          populate: { path: "institutionId", select: "name logoUrl" },
        })
        .sort({ createdAt: -1 });

      return res.json(
        responseFactory.success(
          applications,
          "Applications retrieved successfully",
        ),
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  adminReviewApplication: async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const { status, rejectionReason } = req.body;
      const reviewerId = req.user.id;
      const { role, institutionId } = req.user;

      const allowedStatuses = [
        "UnderReview",
        "Approved",
        "Rejected",
        "Disbursed",
        "Completed",
        "Cancelled",
      ];
      if (!status || !allowedStatuses.includes(status)) {
        return res
          .status(400)
          .json(responseFactory.error("Invalid review status"));
      }

      const application = await Application.findById(id)
        .populate("productId")
        .populate("userId", "firstName lastName email phoneNumber creditScore");
      if (!application) {
        return res
          .status(404)
          .json(responseFactory.notFound("Application not found"));
      }

      // Multi-tenant check: partner admins can only review applications for their own products
      if (role !== "SuperAdmin" && role !== "Admin") {
        const product = application.productId as any;
        if (!product || product.institutionId.toString() !== institutionId) {
          console.warn(
            `[AdminReviewApplication] Partner ${reviewerId} tried reviewing application of product owned by institution ${product?.institutionId}`,
          );
          return res
            .status(403)
            .json(
              responseFactory.error(
                "Forbidden: Access denied to this application",
                null,
                403,
              ),
            );
        }
      }

      application.status = status;
      application.reviewedBy = reviewerId;
      application.reviewedAt = new Date();

      if (status === "Approved") {
        application.approvedAt = new Date();
      } else if (status === "Rejected") {
        application.rejectedAt = new Date();
        application.rejectionReason = rejectionReason || "No reason provided";
      }

      // Defer connection arrears charging until partner starts processing (UnderReview or Approved or Disbursed)
      const processingStatuses = ["UnderReview", "Approved", "Disbursed", "Completed"];
      if (processingStatuses.includes(status) && !application.isConnectionCharged) {
        const product = application.productId as any;
        if (product && product.institutionId) {
          const inst = await Institution.findById(product.institutionId);
          if (inst) {
            const fee = inst.connectionFee !== undefined ? inst.connectionFee : 50;
            if (fee > 0) {
              inst.accumulatedArrears = (inst.accumulatedArrears || 0) + fee;
              await inst.save();

              application.isConnectionCharged = true;

              // Log arrears accrual in platform compliance ledger
              await auditLogger.log({
                adminId: "system",
                institutionId: inst._id as any,
                action: "AccrueConnectionArrears",
                targetId: application._id as any,
                details: `Accrued connection fee arrears of GH₵ ${fee} (New Arrears Balance: GH₵ ${inst.accumulatedArrears}) for ${inst.name} following status change of application ${application._id} to "${status}".`,
                ipAddress: req.ip,
                userAgent: req.headers["user-agent"],
              });
            }
          }
        }
      }

      await application.save();

      // Log to compliance audit ledger
      await auditLogger.log({
        adminId: reviewerId,
        institutionId:
          role !== "SuperAdmin" && role !== "Admin" ? institutionId : undefined,
        action: "ReviewApplication",
        targetId: application._id as any,
        details: `Updated application status to "${status}".${rejectionReason ? " Reason: " + rejectionReason : ""}`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      const user = application.userId as any;
      const notificationMessage =
        status === "Rejected"
          ? `Your application has been rejected. Reason: ${application.rejectionReason}`
          : `Your application state has been updated to ${status}.`;

      if (user?._id) {
        await notificationService.notifyUser({
          userId: user._id.toString(),
          type: "ApplicationReview",
          title: `Application ${status}`,
          message: notificationMessage,
          email: true,
          sms: true,
        });
      }

      await notificationService.createNotification({
        userId: reviewerId,
        type: "AdminAction",
        title: `Reviewed application ${application._id.toString().slice(-6)}`,
        message: `Marked application ${application._id.toString().slice(-8)} as ${status}.`,
      });

      // If status transitioned to Disbursed, record corresponding Transaction
      if (status === "Disbursed") {
        const product = application.productId as any;
        await Transaction.create({
          userId: application.userId,
          applicationId: application._id,
          institutionId: product?.institutionId,
          description: `Disbursement of ${product?.name || "Financial Product"}`,
          amount: application.amount,
          type: "credit",
          category: product?.productType || "Loan",
          status: "Completed",
          reference: `DISB-${application._id.toString().substring(0, 8).toUpperCase()}-${Date.now()}`,
        });
        console.log(
          `[AdminReviewApplication] Application ${application._id} Disbursed. Created transaction log.`,
        );
      }

      return res.json(
        responseFactory.success(
          application,
          `Application state updated to "${status}" successfully`,
        ),
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  adminRestoreApplication: async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const reviewerId = req.user.id;
      const { role, institutionId } = req.user;

      const application = await Application.findById(id)
        .populate("productId")
        .populate("userId", "firstName lastName email phoneNumber creditScore");
      if (!application) {
        return res
          .status(404)
          .json(responseFactory.notFound("Application not found"));
      }

      if (!["Rejected", "Cancelled"].includes(application.status)) {
        return res
          .status(400)
          .json(
            responseFactory.error(
              "Only rejected or cancelled applications can be restored",
            ),
          );
      }

      if (role !== "SuperAdmin" && role !== "Admin") {
        const product = application.productId as any;
        if (!product || product.institutionId.toString() !== institutionId) {
          return res
            .status(403)
            .json(
              responseFactory.error(
                "Forbidden: Access denied to this application",
                null,
                403,
              ),
            );
        }
      }

      application.status = "Pending";
      application.rejectedAt = undefined;
      application.rejectionReason = undefined;
      application.reviewedAt = new Date();
      application.reviewedBy = reviewerId;
      await application.save();

      await auditLogger.log({
        adminId: reviewerId,
        institutionId:
          role !== "SuperAdmin" && role !== "Admin" ? institutionId : undefined,
        action: "RestoreApplication",
        targetId: application._id as any,
        details: `Restored application ${application._id.toString()} to pending status`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      const user = application.userId as any;
      if (user?._id) {
        await notificationService.notifyUser({
          userId: user._id.toString(),
          type: "ApplicationReview",
          title: "Application Restored",
          message:
            "Your application has been restored to Pending for a follow-up review.",
          email: true,
          sms: true,
        });
      }

      await notificationService.createNotification({
        userId: reviewerId,
        type: "AdminAction",
        title: `Restored application ${application._id.toString().slice(-6)}`,
        message: `Returned application ${application._id.toString().slice(-8)} to pending review.`,
      });

      return res.json(
        responseFactory.success(
          application,
          "Application restored and set to Pending review",
        ),
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  generatePolicyVerificationToken: async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      
      const application = await Application.findById(id).populate("productId");
      if (!application) {
        return res.status(404).json(responseFactory.notFound("Insurance Application cover not found"));
      }

      const product = application.productId as any;
      if (product?.productType !== "Insurance") {
        return res.status(400).json(responseFactory.error("Verification tokens can only be generated for Insurance policies"));
      }

      // Generate cryptographically signed token with 10-year expiration for physical policy validation
      const secret = process.env.JWT_SECRET || 'secret';
      const token = jwt.sign(
        {
          applicationId: application._id.toString(),
          productId: product._id.toString(),
          holderId: application.userId.toString(),
          createdAt: Date.now()
        },
        secret,
        { expiresIn: '3650d' } // 10-year verification lifetime
      );

      const verifyUrl = `${req.protocol}://${req.get('host')}/verify/policy?token=${token}`;

      return res.json(
        responseFactory.success({
          token,
          verifyUrl,
          applicationId: application._id,
          status: application.status
        }, "Verification token generated successfully")
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  verifyPolicyToken: async (req: Request, res: Response) => {
    try {
      const { token } = req.query;
      if (!token) {
        return res.status(400).json(responseFactory.error("Token query parameter is required"));
      }

      const secret = process.env.JWT_SECRET || 'secret';
      let decoded: any;
      try {
        decoded = jwt.verify(token as string, secret);
      } catch (err: any) {
        return res.status(400).json(responseFactory.error("Invalid or expired policy verification token signature"));
      }

      const { applicationId } = decoded;
      const application = await Application.findById(applicationId)
        .populate("userId", "firstName lastName email phoneNumber kycStatus profile creditScore")
        .populate({
          path: "productId",
          populate: { path: "institutionId", select: "name logoUrl email phoneNumber website streetAddress taxId" }
        });

      if (!application) {
        return res.status(404).json(responseFactory.notFound("Associated policy subscription cover not found or retracted"));
      }

      const product = application.productId as any;
      const user = application.userId as any;
      const institution = product?.institutionId as any;

      const startDate = application.approvedAt || application.createdAt;
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + (application.tenureMonths || 12));

      const isExpired = new Date() > endDate;
      const isValid = (application.status === 'Approved' || application.status === 'Disbursed') && !isExpired;

      const policyDetails = {
        policyId: application._id.toString().toUpperCase().substring(0, 12),
        holderName: `${user?.firstName} ${user?.lastName}`,
        holderEmail: user?.email,
        holderPhone: user?.phoneNumber,
        kycStatus: user?.kycStatus,
        productName: product?.name,
        productType: product?.productType,
        providerName: institution?.name,
        providerEmail: institution?.email,
        providerPhone: institution?.phoneNumber,
        providerLogo: institution?.logoUrl || "/resolve_icon.png",
        providerAddress: institution?.streetAddress || "High Street, Accra",
        premiumAmount: application.amount,
        tenureMonths: application.tenureMonths,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        status: application.status,
        isValid,
        isExpired,
        vehicleDetails: application.applicationData?.vehicle || application.applicationData || null,
        decryptedChecksum: decoded
      };

      return res.json(
        responseFactory.success(policyDetails, "Policy validation metrics resolved successfully")
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  adminToggleReminderFlag: async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const reviewerId = req.user.id;
      const { role, institutionId } = req.user;

      const application = await Application.findById(id).populate("productId");
      if (!application) {
        return res.status(404).json(responseFactory.notFound("Application not found"));
      }

      if (role !== "SuperAdmin" && role !== "Admin") {
        const product = application.productId as any;
        if (!product || product.institutionId.toString() !== institutionId) {
          return res.status(403).json(responseFactory.error("Forbidden: Access denied to this application"));
        }
      }

      application.flaggedForReminder = !application.flaggedForReminder;
      await application.save();

      await auditLogger.log({
        adminId: reviewerId,
        institutionId: role !== "SuperAdmin" && role !== "Admin" ? institutionId : undefined,
        action: "ToggleReminderFlag",
        targetId: application._id as any,
        details: `Toggled reminder flag on application ${application._id.toString()} to ${application.flaggedForReminder}`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      return res.json(
        responseFactory.success(
          application,
          `Application reminder flag toggled to ${application.flaggedForReminder}`
        )
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  adminTriggerReminders: async (req: any, res: Response) => {
    try {
      const reviewerId = req.user.id;
      const { role, institutionId } = req.user;

      const query: any = {
        status: "PaymentPending",
        flaggedForReminder: true
      };

      // Multi-tenant check: if B2B admin, only trigger reminders for their own products
      if (role !== "SuperAdmin" && role !== "Admin") {
        const products = await FinancialProduct.find({ institutionId });
        const productIds = products.map(p => p._id);
        query.productId = { $in: productIds };
      }

      const applications = await Application.find(query)
        .populate("userId", "firstName lastName phoneNumber")
        .populate("productId");

      let sentCount = 0;
      for (const app of applications) {
        const user = app.userId as any;
        const product = app.productId as any;
        if (user && user.phoneNumber) {
          const reminderMsg = `Hello ${user.firstName}, this is a reminder to complete your connection payment for your ${product?.name || 'Financial Product'} application on ResolveBridge. Please visit the dashboard to complete checkout.`;
          
          await notificationService.sendSmsNotification(user.phoneNumber, reminderMsg);

          app.reminderSentCount = (app.reminderSentCount || 0) + 1;
          app.lastReminderSentAt = new Date();
          await app.save();

          sentCount++;
        }
      }

      await auditLogger.log({
        adminId: reviewerId,
        institutionId: role !== "SuperAdmin" && role !== "Admin" ? institutionId : undefined,
        action: "TriggerApplicationReminders",
        targetId: reviewerId as any,
        details: `Triggered SMS reminders for ${sentCount} applications in PaymentPending.`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      return res.json(
        responseFactory.success(
          { sentCount },
          `Successfully triggered and sent ${sentCount} SMS reminders.`
        )
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  adminAssignApplication: async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const { assignedTo } = req.body;
      const reviewerId = req.user.id;
      const { role, institutionId } = req.user;

      const application = await Application.findById(id);
      if (!application) {
        return res.status(404).json(responseFactory.notFound("Application not found"));
      }

      // Multi-tenant check: verify product ownership
      const product = await FinancialProduct.findById(application.productId);
      if (role !== "SuperAdmin" && role !== "Admin") {
        if (!product || product.institutionId.toString() !== institutionId) {
          console.warn(
            `[AdminAssignApplication] Partner ${reviewerId} tried assigning application of product owned by institution ${product?.institutionId}`
          );
          return res
            .status(403)
            .json(responseFactory.error("Forbidden: Access denied to this application", null, 403));
        }
      }

      let assigneeUser = null;
      if (assignedTo) {
        assigneeUser = await User.findById(assignedTo);
        if (!assigneeUser) {
          return res.status(404).json(responseFactory.notFound("Assignee staff user not found"));
        }

        // Verify assignee belongs to same institution if not platform admin
        if (role !== "SuperAdmin" && role !== "Admin") {
          if (assigneeUser.institutionId?.toString() !== institutionId) {
            return res.status(400).json(responseFactory.error("Assignee must belong to your institution"));
          }
        }
      }

      application.assignedTo = assignedTo ? (assignedTo as any) : undefined;
      await application.save();

      // Log action to compliance ledger
      await auditLogger.log({
        adminId: reviewerId,
        institutionId: role !== "SuperAdmin" && role !== "Admin" ? institutionId : undefined,
        action: "AssignApplication",
        targetId: application._id as any,
        details: assigneeUser
          ? `Assigned application ${application._id} to staff ${assigneeUser.firstName} ${assigneeUser.lastName} (${assigneeUser.email}).`
          : `Unassigned application ${application._id}.`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      console.log(`[B2B-Underwriting] Application ${application._id} assignee set to ${assignedTo}`);
      return res.json(
        responseFactory.success(
          application,
          assigneeUser
            ? `Successfully assigned application to ${assigneeUser.firstName} ${assigneeUser.lastName}`
            : "Successfully unassigned application"
        )
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  }
};
