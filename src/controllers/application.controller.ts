import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { responseFactory } from "../utils/responseFactory";
import Application from "../models/application.model";
import FinancialProduct from "../models/product.model";
import Transaction from "../models/transaction.model";
import User from "../models/user.model";
import { auditLogger } from "../utils/auditLogger";
import { notificationService } from "../services/notification.service";

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

      const application = await Application.create({
        userId,
        productId,
        amount,
        tenureMonths,
        applicationData,
        status: "Pending",
      });

      return res
        .status(201)
        .json(
          responseFactory.success(
            application,
            "Application submitted successfully",
          ),
        );
    } catch (error: any) {
      return res.status(400).json(responseFactory.error(error.message));
    }
  },

  adminGetApplications: async (req: any, res: Response) => {
    try {
      const { role, institutionId } = req.user;
      const { status, regionId } = req.query;

      const query: any = {};
      if (status) {
        query.status = status;
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
          "firstName lastName email phoneNumber kycStatus regionId",
        )
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
        .populate("userId", "firstName lastName email phoneNumber");
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
        .populate("userId", "firstName lastName email phoneNumber");
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
        .populate("userId", "firstName lastName email phoneNumber kycStatus profile")
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
  }
};
