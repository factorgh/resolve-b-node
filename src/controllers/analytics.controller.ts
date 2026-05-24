import { Request, Response } from "express";
import { responseFactory } from "../utils/responseFactory";
import Application from "../models/application.model";
import Transaction from "../models/transaction.model";
import BillingInvoice from "../models/billing.model";
import AuditLog from "../models/auditLog.model";
import FinancialProduct from "../models/product.model";

const formatMonthLabel = (year: number, month: number) => {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString("en-US", { month: "short", year: "numeric" });
};

export const analyticsController = {
  getOverview: async (req: any, res: Response) => {
    try {
      const { role, institutionId } = req.user;
      const isPlatformAdmin = role === "SuperAdmin" || role === "Admin";

      let productFilter: any = {};
      let invoiceFilter: any = {};
      let auditFilter: any = {};
      let transactionFilter: any = { status: "Completed" };

      if (!isPlatformAdmin) {
        if (!institutionId) {
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

        const products = await FinancialProduct.find({ institutionId }).select(
          "_id",
        );
        const productIds = products.map((p) => p._id);
        productFilter = { productId: { $in: productIds } };
        invoiceFilter = { institutionId };
        auditFilter = { institutionId };
        transactionFilter = { ...transactionFilter, institutionId };
      }

      const applicationStatusCounts = await Application.aggregate([
        { $match: productFilter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]);

      const totalApplicationVolume = await Application.aggregate([
        {
          $match: {
            ...productFilter,
            status: { $in: ["Approved", "Disbursed"] },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);

      const transactionByCategory = await Transaction.aggregate([
        { $match: transactionFilter },
        {
          $group: {
            _id: "$category",
            volume: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { volume: -1 } },
      ]);

      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const monthlyDisbursements = await Transaction.aggregate([
        {
          $match: {
            ...transactionFilter,
            type: "credit",
            status: "Completed",
            date: { $gte: sixMonthsAgo },
          },
        },
        {
          $group: {
            _id: { year: { $year: "$date" }, month: { $month: "$date" } },
            total: { $sum: "$amount" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]);

      const invoiceSummary = await BillingInvoice.aggregate([
        { $match: invoiceFilter },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            amount: { $sum: "$amount" },
          },
        },
      ]);

      const auditActionCounts = await AuditLog.aggregate([
        { $match: auditFilter },
        { $group: { _id: "$action", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      const recentEvents = await AuditLog.find(auditFilter)
        .sort({ createdAt: -1 })
        .limit(20)
        .populate("adminId", "firstName lastName role")
        .lean();

      const statusCountsMap = applicationStatusCounts.reduce(
        (acc: any, item: any) => {
          acc[item._id] = item.count;
          return acc;
        },
        {},
      );

      const invoiceSummaryMap = invoiceSummary.reduce((acc: any, item: any) => {
        acc[item._id] = { count: item.count, amount: item.amount };
        return acc;
      }, {});

      const monthlyChart = Array.from({ length: 6 }).map((_, idx) => {
        const date = new Date(
          sixMonthsAgo.getFullYear(),
          sixMonthsAgo.getMonth() + idx,
          1,
        );
        const label = formatMonthLabel(date.getFullYear(), date.getMonth() + 1);
        const entry = monthlyDisbursements.find(
          (m: any) =>
            m._id.year === date.getFullYear() &&
            m._id.month === date.getMonth() + 1,
        );
        return { label, total: entry?.total || 0 };
      });

      return res.json(
        responseFactory.success(
          {
            statusCounts: statusCountsMap,
            totalApplicationVolume: totalApplicationVolume[0]?.total || 0,
            transactionByCategory,
            monthlyDisbursements: monthlyChart,
            invoiceSummary: invoiceSummaryMap,
            auditActionCounts,
            recentEvents,
          },
          "Analytics overview fetched successfully",
        ),
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  getEvents: async (req: any, res: Response) => {
    try {
      const { role, institutionId } = req.user;
      const isPlatformAdmin = role === "SuperAdmin" || role === "Admin";
      const filter: any = {};
      if (!isPlatformAdmin) {
        if (!institutionId) {
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
        filter.institutionId = institutionId;
      }

      const events = await AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .limit(50)
        .populate("adminId", "firstName lastName role")
        .lean();

      return res.json(
        responseFactory.success(
          events,
          "Analytics events fetched successfully",
        ),
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },
};
