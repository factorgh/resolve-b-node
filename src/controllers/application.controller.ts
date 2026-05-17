import { Request, Response } from 'express';
import { responseFactory } from '../utils/responseFactory';
import Application from '../models/application.model';
import FinancialProduct from '../models/product.model';
import Transaction from '../models/transaction.model';
import { auditLogger } from '../utils/auditLogger';

export const applicationController = {
  getUserApplications: async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const applications = await Application.find({ userId })
        .populate({
          path: 'productId',
          populate: { path: 'institutionId', select: 'name logoUrl' }
        })
        .sort({ createdAt: -1 });

      // Map to frontend expectations
      const mapped = applications.map(app => {
        const product = app.productId as any;
        const institution = product?.institutionId as any;
        
        return {
          id: app._id,
          type: product?.productType || 'Loan',
          provider: institution?.name || 'Institution',
          product: product?.name || 'Financial Product',
          amount: `GH₵ ${app.amount.toLocaleString()}`,
          status: app.status,
          progress: app.status === 'Approved' ? 100 : app.status === 'Pending' ? 25 : 50,
          date: new Date(app.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          logo: institution?.logoUrl || '/resolve_icon.png',
          color: app.status === 'Approved' ? '#10b981' : app.status === 'Rejected' ? '#e11d48' : '#0033aa',
          steps: [
            { label: 'Submitted', date: new Date(app.submittedAt).toLocaleDateString(), desc: 'Application received' },
            { label: 'Reviewing', date: app.reviewedAt ? new Date(app.reviewedAt).toLocaleDateString() : 'In Progress', desc: 'Institutional assessment' },
            { label: 'Approval', date: app.approvedAt ? new Date(app.approvedAt).toLocaleDateString() : 'Pending', desc: 'Final decision' }
          ]
        };
      });

      return res.json(responseFactory.success(mapped, 'Applications fetched successfully'));
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
        status: 'Pending'
      });

      return res.status(201).json(responseFactory.success(application, 'Application submitted successfully'));
    } catch (error: any) {
      return res.status(400).json(responseFactory.error(error.message));
    }
  },

  adminGetApplications: async (req: any, res: Response) => {
    try {
      const { role, institutionId } = req.user;
      const { status } = req.query;

      const query: any = {};
      if (status) {
        query.status = status;
      }

      // Multi-tenant check: if partner (not SuperAdmin / Admin), restrict to their institution's products
      if (role !== 'SuperAdmin' && role !== 'Admin') {
        if (!institutionId) {
          console.warn(`[AdminGetApplications] Partner user ${req.user.id} has no mapped institutionId`);
          return res.status(403).json(responseFactory.error('Forbidden: No associated institution', null, 403));
        }

        const products = await FinancialProduct.find({ institutionId });
        const productIds = products.map(p => p._id);
        query.productId = { $in: productIds };
      }

      const applications = await Application.find(query)
        .populate('userId', 'firstName lastName email phoneNumber kycStatus')
        .populate({
          path: 'productId',
          populate: { path: 'institutionId', select: 'name logoUrl' }
        })
        .sort({ createdAt: -1 });

      return res.json(responseFactory.success(applications, 'Applications retrieved successfully'));
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

      const allowedStatuses = ['UnderReview', 'Approved', 'Rejected', 'Disbursed', 'Completed', 'Cancelled'];
      if (!status || !allowedStatuses.includes(status)) {
        return res.status(400).json(responseFactory.error('Invalid review status'));
      }

      const application = await Application.findById(id).populate('productId');
      if (!application) {
        return res.status(404).json(responseFactory.notFound('Application not found'));
      }

      // Multi-tenant check: partner admins can only review applications for their own products
      if (role !== 'SuperAdmin' && role !== 'Admin') {
        const product = application.productId as any;
        if (!product || product.institutionId.toString() !== institutionId) {
          console.warn(`[AdminReviewApplication] Partner ${reviewerId} tried reviewing application of product owned by institution ${product?.institutionId}`);
          return res.status(403).json(responseFactory.error('Forbidden: Access denied to this application', null, 403));
        }
      }

      application.status = status;
      application.reviewedBy = reviewerId;
      application.reviewedAt = new Date();

      if (status === 'Approved') {
        application.approvedAt = new Date();
      } else if (status === 'Rejected') {
        application.rejectedAt = new Date();
        application.rejectionReason = rejectionReason || 'No reason provided';
      }

      await application.save();

      // Log to compliance audit ledger
      await auditLogger.log({
        adminId: reviewerId,
        institutionId: role !== 'SuperAdmin' && role !== 'Admin' ? institutionId : undefined,
        action: 'ReviewApplication',
        targetId: application._id as any,
        details: `Updated application status to "${status}".${rejectionReason ? ' Reason: ' + rejectionReason : ''}`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      // If status transitioned to Disbursed, record corresponding Transaction
      if (status === 'Disbursed') {
        const product = application.productId as any;
        await Transaction.create({
          userId: application.userId,
          applicationId: application._id,
          institutionId: product?.institutionId,
          description: `Disbursement of ${product?.name || 'Financial Product'}`,
          amount: application.amount,
          type: 'credit',
          category: product?.productType || 'Loan',
          status: 'Completed',
          reference: `DISB-${application._id.toString().substring(0, 8).toUpperCase()}-${Date.now()}`
        });
        console.log(`[AdminReviewApplication] Application ${application._id} Disbursed. Created transaction log.`);
      }

      return res.json(responseFactory.success(application, `Application state updated to "${status}" successfully`));
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  }
};
