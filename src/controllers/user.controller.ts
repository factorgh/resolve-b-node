import { Request, Response } from 'express';
import { responseFactory } from '../utils/responseFactory';
import User from '../models/user.model';

export const userController = {
  getAllUsers: async (req: Request, res: Response) => {
    try {
      const users = await User.find({}, 'id email firstName lastName role isActive');
      return res.json(responseFactory.success(users, 'Users fetched successfully'));
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  getUserById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json(responseFactory.notFound('User not found'));
      }
      return res.json(responseFactory.success(user, 'User fetched successfully'));
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  getDashboardMetrics: async (req: Request, res: Response) => {
    try {
      // In a real app, calculate these based on user's financial data
      const metrics = {
        healthIndex: 72,
        cashFlow: 12450.50,
        netWorth: 85000,
        creditScore: 715,
        eligibleOffers: 3,
        healthIndexMessage: 'Excellent financial health',
        velocityData: [
          { label: 'Jan', value: 45 },
          { label: 'Feb', value: 52 },
          { label: 'Mar', value: 48 },
          { label: 'Apr', value: 61 },
          { label: 'May', value: 55 },
          { label: 'Jun', value: 72 }
        ],
        healthFactors: [
          { name: 'Payment History', status: 'Good', color: '#10b981' },
          { name: 'Credit Utilization', status: 'Excellent', color: '#10b981' },
          { name: 'Account Age', status: 'Fair', color: '#f59e0b' }
        ]
      };
      
      return res.json(responseFactory.success(metrics, 'Dashboard metrics fetched successfully'));
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  }
};
