import { Request, Response } from "express";
import { responseFactory } from "../utils/responseFactory";
import SubscriptionPlan from "../models/subscriptionPlan.model";
import PremiumFeatureUsage from "../models/premiumFeatureUsage.model";
import User from "../models/user.model";
import { auditLogger } from "../utils/auditLogger";

export const subscriptionController = {
  // Get all active subscription plans
  getSubscriptionPlans: async (req: Request, res: Response) => {
    try {
      const plans = await SubscriptionPlan.find({ isActive: true }).sort({
        displayOrder: 1,
      });
      return res.json(
        responseFactory.success(
          plans,
          "Subscription plans retrieved successfully"
        )
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  // Get single subscription plan
  getSubscriptionPlan: async (req: Request, res: Response) => {
    try {
      const plan = await SubscriptionPlan.findById(req.params.id);
      if (!plan) {
        return res
          .status(404)
          .json(responseFactory.notFound("Subscription plan not found"));
      }
      return res.json(
        responseFactory.success(plan, "Subscription plan retrieved successfully")
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  // Create subscription plan (Admin only)
  createSubscriptionPlan: async (req: any, res: Response) => {
    try {
      if (req.user.role !== "SuperAdmin" && req.user.role !== "Admin") {
        return res
          .status(403)
          .json(responseFactory.error("Forbidden: Admin access required"));
      }

      const {
        name,
        tier,
        monthlyPrice,
        yearlyPrice,
        description,
        features,
        maxLoans,
        maxApplications,
        prioritySupport,
        advisorAccess,
        fraudProtection,
        investmentInsights,
        businessTools,
        educationCourses,
        debtDashboard,
        vipConcierge,
        eligibilityChecker,
        creditMonitoring,
        displayOrder,
      } = req.body;

      const plan = await SubscriptionPlan.create({
        name,
        tier,
        monthlyPrice,
        yearlyPrice,
        description,
        features,
        maxLoans,
        maxApplications,
        prioritySupport,
        advisorAccess,
        fraudProtection,
        investmentInsights,
        businessTools,
        educationCourses,
        debtDashboard,
        vipConcierge,
        eligibilityChecker,
        creditMonitoring,
        displayOrder,
      });

      await auditLogger.log({
        adminId: req.user.id,
        action: "CreateSubscriptionPlan",
        targetId: plan._id as any,
        details: `Created subscription plan ${name} at ${tier} tier`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      return res.status(201).json(
        responseFactory.success(
          plan,
          "Subscription plan created successfully"
        )
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  // Update subscription plan (Admin only)
  updateSubscriptionPlan: async (req: any, res: Response) => {
    try {
      if (req.user.role !== "SuperAdmin" && req.user.role !== "Admin") {
        return res
          .status(403)
          .json(responseFactory.error("Forbidden: Admin access required"));
      }

      const plan = await SubscriptionPlan.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );

      if (!plan) {
        return res
          .status(404)
          .json(responseFactory.notFound("Subscription plan not found"));
      }

      await auditLogger.log({
        adminId: req.user.id,
        action: "UpdateSubscriptionPlan",
        targetId: plan._id as any,
        details: `Updated subscription plan ${plan.name}`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      return res.json(
        responseFactory.success(plan, "Subscription plan updated successfully")
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  // Get user's current subscription plan
  getUserSubscription: async (req: any, res: Response) => {
    try {
      const user = await User.findById(req.user.id).populate(
        "subscriptionPlanId"
      );
      if (!user) {
        return res
          .status(404)
          .json(responseFactory.notFound("User not found"));
      }

      const subscription = user.subscriptionPlanId || null;
      return res.json(
        responseFactory.success(
          subscription,
          "User subscription retrieved successfully"
        )
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  // Upgrade user subscription (payment will be processed separately)
  upgradeSubscription: async (req: any, res: Response) => {
    try {
      const { planId } = req.body;

      const plan = await SubscriptionPlan.findById(planId);
      if (!plan) {
        return res
          .status(404)
          .json(responseFactory.notFound("Subscription plan not found"));
      }

      const user = await User.findByIdAndUpdate(
        req.user.id,
        {
          subscriptionPlanId: planId,
          subscriptionStartDate: new Date(),
          subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        { new: true }
      );

      if (!user) {
        return res
          .status(404)
          .json(responseFactory.notFound("User not found"));
      }

      // Create feature usage records for all enabled features
      const features = [
        "creditMonitoring",
        "eligibilityChecker",
        "advisorAccess",
        "fraudProtection",
        "investmentInsights",
        "businessTools",
        "educationCourses",
        "debtDashboard",
        "vipConcierge",
      ];

      for (const feature of features) {
        const isEnabled = (plan as any)[feature];
        if (isEnabled) {
          await PremiumFeatureUsage.updateOne(
            { userId: req.user.id, feature },
            {
              userId: req.user.id,
              subscriptionPlanId: planId,
              feature,
              isEnabled: true,
            },
            { upsert: true }
          );
        }
      }

      await auditLogger.log({
        adminId: req.user.id,
        action: "UpgradeSubscription",
        targetId: user._id as any,
        details: `User upgraded to ${plan.name} subscription plan`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      return res.json(
        responseFactory.success(
          user,
          "Subscription upgraded successfully"
        )
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  // Get user's available premium features
  getPremiumFeatures: async (req: any, res: Response) => {
    try {
      const user = await User.findById(req.user.id).populate(
        "subscriptionPlanId"
      );
      if (!user) {
        return res
          .status(404)
          .json(responseFactory.notFound("User not found"));
      }

      const plan = user.subscriptionPlanId as any;
      const features = plan
        ? {
            creditMonitoring: plan.creditMonitoring,
            eligibilityChecker: plan.eligibilityChecker,
            advisorAccess: plan.advisorAccess,
            fraudProtection: plan.fraudProtection,
            investmentInsights: plan.investmentInsights,
            businessTools: plan.businessTools,
            educationCourses: plan.educationCourses,
            debtDashboard: plan.debtDashboard,
            vipConcierge: plan.vipConcierge,
            prioritySupport: plan.prioritySupport,
          }
        : {
            creditMonitoring: true,
            eligibilityChecker: false,
            advisorAccess: false,
            fraudProtection: false,
            investmentInsights: false,
            businessTools: false,
            educationCourses: false,
            debtDashboard: false,
            vipConcierge: false,
            prioritySupport: false,
          };

      return res.json(
        responseFactory.success(
          features,
          "Premium features retrieved successfully"
        )
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },
};
