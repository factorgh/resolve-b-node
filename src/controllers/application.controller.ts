import { Request, Response } from 'express';
import { responseFactory } from '../utils/responseFactory';
import Application from '../models/application.model';

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
  }
};
