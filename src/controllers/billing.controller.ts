import { Request, Response } from "express";
import { responseFactory } from "../utils/responseFactory";
import BillingInvoice from "../models/billing.model";
import BillingFeePlan from "../models/billingFeePlan.model";
import Institution from "../models/institution.model";
import { auditLogger } from "../utils/auditLogger";

export const billingController = {
  getInvoices: async (req: any, res: Response) => {
    try {
      const { role, institutionId } = req.user;
      const query: any = {};

      if (role !== "SuperAdmin" && role !== "Admin") {
        if (!institutionId) {
          return res
            .status(403)
            .json(
              responseFactory.error(
                "Forbidden: Partner desk has no associated institution.",
              ),
            );
        }
        query.institutionId = institutionId;
      }

      const invoices = await BillingInvoice.find(query)
        .populate("institutionId", "name type email logoUrl")
        .sort({ billingDate: -1 });

      return res.json(
        responseFactory.success(
          invoices,
          "Billing invoices fetched successfully",
        ),
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  getFeePlans: async (req: any, res: Response) => {
    try {
      const plans = await BillingFeePlan.find().sort({
        amount: 1,
        billingCycle: 1,
      });
      return res.json(
        responseFactory.success(
          plans,
          "Billing fee plans retrieved successfully",
        ),
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  getFeePlan: async (req: any, res: Response) => {
    try {
      const plan = await BillingFeePlan.findById(req.params.id);
      if (!plan) {
        return res
          .status(404)
          .json(responseFactory.notFound("Fee plan not found"));
      }
      return res.json(
        responseFactory.success(
          plan,
          "Billing fee plan retrieved successfully",
        ),
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  createFeePlan: async (req: any, res: Response) => {
    try {
      const { name, description, amount, currency, billingCycle, isActive } =
        req.body;
      const plan = await BillingFeePlan.create({
        name,
        description,
        amount,
        currency,
        billingCycle,
        isActive,
      });

      await auditLogger.log({
        adminId: req.user.id,
        action: "CreateFeePlan",
        targetId: plan._id as any,
        details: `Created billing fee plan ${name} for ${billingCycle} at ${currency} ${amount}`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      return res
        .status(201)
        .json(
          responseFactory.success(
            plan,
            "Billing fee plan created successfully",
          ),
        );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  updateFeePlan: async (req: any, res: Response) => {
    try {
      const plan = await BillingFeePlan.findById(req.params.id);
      if (!plan) {
        return res
          .status(404)
          .json(responseFactory.notFound("Fee plan not found"));
      }

      const { name, description, amount, currency, billingCycle, isActive } =
        req.body;
      if (name !== undefined) plan.name = name;
      if (description !== undefined) plan.description = description;
      if (amount !== undefined) plan.amount = amount;
      if (currency !== undefined) plan.currency = currency;
      if (billingCycle !== undefined) plan.billingCycle = billingCycle;
      if (isActive !== undefined) plan.isActive = isActive;

      await plan.save();
      await auditLogger.log({
        adminId: req.user.id,
        action: "UpdateFeePlan",
        targetId: plan._id as any,
        details: `Updated billing fee plan ${plan.name}`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      return res.json(
        responseFactory.success(plan, "Billing fee plan updated successfully"),
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  deleteFeePlan: async (req: any, res: Response) => {
    try {
      const plan = await BillingFeePlan.findById(req.params.id);
      if (!plan) {
        return res
          .status(404)
          .json(responseFactory.notFound("Fee plan not found"));
      }

      await plan.deleteOne();
      await auditLogger.log({
        adminId: req.user.id,
        action: "DeleteFeePlan",
        targetId: plan._id as any,
        details: `Deleted billing fee plan ${plan.name}`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      return res.json(
        responseFactory.success(null, "Billing fee plan deleted successfully"),
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  applyFeePlanToInstitution: async (req: any, res: Response) => {
    try {
      const plan = await BillingFeePlan.findById(req.params.id);
      if (!plan) {
        return res
          .status(404)
          .json(responseFactory.notFound("Fee plan not found"));
      }

      const institution = await Institution.findById(req.params.institutionId);
      if (!institution) {
        return res
          .status(404)
          .json(responseFactory.notFound("Institution not found"));
      }

      institution.subscriptionFee = plan.amount;
      institution.billingCycle = plan.billingCycle;
      institution.billingStatus = "Active";
      await institution.save();

      await auditLogger.log({
        adminId: req.user.id,
        action: "ApplyFeePlan",
        targetId: institution._id as any,
        details: `Applied billing fee plan ${plan.name} to ${institution.name}`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      return res.json(
        responseFactory.success(
          institution,
          "Fee plan applied to institution successfully",
        ),
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  getInstitutionsBilling: async (req: any, res: Response) => {
    try {
      const { role } = req.user;
      if (role !== "SuperAdmin" && role !== "Admin") {
        return res
          .status(403)
          .json(
            responseFactory.error(
              "Forbidden: Access denied to billing profiles",
            ),
          );
      }

      const institutions = await Institution.find(
        {},
        "name legalName type email logoUrl isActive subscriptionFee billingCycle billingStatus nextBillingDate lastBillingDate",
      );

      // Calculate unpaid invoices count/sum for each institution
      const mapped = await Promise.all(
        institutions.map(async (inst: any) => {
          const unpaidSum = await BillingInvoice.aggregate([
            { $match: { institutionId: inst._id, status: "Unpaid" } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ]);
          return {
            ...inst.toObject(),
            unpaidBalance: unpaidSum[0]?.total || 0,
          };
        }),
      );

      return res.json(
        responseFactory.success(
          mapped,
          "Platform billing directory retrieved successfully",
        ),
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  updateSubscriptionFee: async (req: any, res: Response) => {
    try {
      const { role } = req.user;
      if (role !== "SuperAdmin" && role !== "Admin") {
        return res
          .status(403)
          .json(
            responseFactory.error(
              "Forbidden: Only platform admins can adjust subscription fee models",
            ),
          );
      }

      const { id } = req.params;
      const { subscriptionFee, billingCycle, billingStatus } = req.body;

      const inst = await Institution.findById(id);
      if (!inst) {
        return res
          .status(404)
          .json(responseFactory.notFound("Institution not found"));
      }

      if (subscriptionFee !== undefined) inst.subscriptionFee = subscriptionFee;
      if (billingCycle !== undefined) inst.billingCycle = billingCycle;
      if (billingStatus !== undefined) inst.billingStatus = billingStatus;

      await inst.save();

      // Log action to compliance ledger
      await auditLogger.log({
        adminId: req.user.id,
        action: "UpdateSubscriptionFee",
        targetId: inst._id as any,
        details: `Updated subscription parameters for ${inst.name}. Fee: GH₵ ${subscriptionFee}, Cycle: ${billingCycle}, Status: ${billingStatus}.`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      return res.json(
        responseFactory.success(
          inst,
          "Institution subscription model configured successfully",
        ),
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  createInvoice: async (req: any, res: Response) => {
    try {
      const { role } = req.user;
      if (role !== "SuperAdmin" && role !== "Admin") {
        return res
          .status(403)
          .json(
            responseFactory.error(
              "Forbidden: Access denied to manual invoicing",
            ),
          );
      }

      const { institutionId, amount, description, dueDate } = req.body;

      const inst = await Institution.findById(institutionId);
      if (!inst) {
        return res
          .status(404)
          .json(responseFactory.notFound("Target institution not found"));
      }

      const reference = `INV-${inst.name.substring(0, 3).toUpperCase()}-${Date.now().toString().substring(8)}`;

      const invoice = await BillingInvoice.create({
        institutionId,
        amount,
        description: description || "Monthly Platform Subscription Fee",
        dueDate: dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Default 14 days payment window
        status: "Unpaid",
        reference,
        billingDate: new Date(),
      });

      // Log action to compliance ledger
      await auditLogger.log({
        adminId: req.user.id,
        action: "CreateInvoice",
        targetId: invoice._id as any,
        details: `Manually generated subscription invoice (${reference}) of GH₵ ${amount} for ${inst.name}.`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      return res
        .status(201)
        .json(
          responseFactory.success(
            invoice,
            "Subscription invoice issued successfully",
          ),
        );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  payInvoice: async (req: any, res: Response) => {
    try {
      const { id } = req.params;

      const invoice =
        await BillingInvoice.findById(id).populate("institutionId");
      if (!invoice) {
        return res
          .status(404)
          .json(responseFactory.notFound("Invoice record not found"));
      }

      invoice.status = "Paid";
      invoice.paidAt = new Date();
      await invoice.save();

      // Log to compliance ledger
      await auditLogger.log({
        adminId: req.user.id,
        action: "PayInvoice",
        targetId: invoice._id as any,
        details: `Marked invoice ${invoice.reference} for ${(invoice.institutionId as any)?.name} as fully settled/paid.`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      return res.json(
        responseFactory.success(
          invoice,
          "Invoice marked as fully paid and logged on ledger",
        ),
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  triggerBillingRun: async (req: any, res: Response) => {
    try {
      const { role } = req.user;
      if (role !== "SuperAdmin" && role !== "Admin") {
        return res
          .status(403)
          .json(
            responseFactory.error(
              "Forbidden: Access denied to manual billing trigger",
            ),
          );
      }

      // Query active institutions whose nextBillingDate is today or past due
      const now = new Date();
      const dueInstitutions = await Institution.find({
        isActive: true,
        subscriptionFee: { $gt: 0 },
        nextBillingDate: { $lte: now },
      });

      let invoicesCreated = 0;

      for (const inst of dueInstitutions) {
        const reference = `SUB-${inst.name.substring(0, 3).toUpperCase()}-${Date.now().toString().substring(8)}-${Math.floor(Math.random() * 100)}`;

        // Create the invoice
        await BillingInvoice.create({
          institutionId: inst._id,
          amount: inst.subscriptionFee,
          description: `Platform subscription fee for cycle beginning ${inst.lastBillingDate.toLocaleDateString()}`,
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Due in 14 days
          status: "Unpaid",
          reference,
          billingDate: new Date(),
        });

        // Advance billing parameters
        inst.lastBillingDate = new Date();
        const duration =
          inst.billingCycle === "annually"
            ? 365 * 24 * 60 * 60 * 1000
            : 30 * 24 * 60 * 60 * 1000;
        inst.nextBillingDate = new Date(Date.now() + duration);
        await inst.save();

        invoicesCreated++;

        // Log action to compliance ledger
        await auditLogger.log({
          adminId: req.user.id,
          action: "BillingCycleRenewal",
          targetId: inst._id as any,
          details: `Processed billing renewal run for ${inst.name}. Created subscription invoice ${reference} for GH₵ ${inst.subscriptionFee}.`,
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
        });
      }

      return res.json(
        responseFactory.success(
          { count: invoicesCreated },
          `Billing cycle run executed. Processed ${invoicesCreated} renewals.`,
        ),
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },
};
