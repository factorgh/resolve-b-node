import { Request, Response } from 'express';
import { responseFactory } from '../utils/responseFactory';
import User from '../models/user.model';
import { auditLogger } from '../utils/auditLogger';

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
  },

  getMe: async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId).select('-password');
      if (!user) {
        return res.status(404).json(responseFactory.notFound('User not found'));
      }
      return res.json(responseFactory.success(user, 'Current user profile fetched'));
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  updateProfile: async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(responseFactory.unauthorized('User identity not found in token'));
      }

      const { firstName, lastName, email } = req.body;
      
      // Basic validation
      if (!firstName || !lastName || !email) {
        return res.status(400).json(responseFactory.error('First name, last name, and email are required'));
      }

      console.log(`[UpdateProfile] Attempting update for user ${userId}`, req.body);

      // Check if email is already taken by another user
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        console.warn(`[UpdateProfile] Email conflict: ${email}`);
        return res.status(400).json(responseFactory.error('This email is already associated with another account'));
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: { firstName, lastName, email } },
        { new: true, runValidators: true }
      ).select('-password');

      if (!updatedUser) {
        console.error(`[UpdateProfile] User ${userId} not found`);
        return res.status(404).json(responseFactory.notFound('Account not found'));
      }

      console.log(`[UpdateProfile] Success for user ${userId}`);
      return res.json(responseFactory.success(updatedUser, 'Profile updated successfully'));
    } catch (error: any) {
      console.error('[UpdateProfile] Critical Error:', error);
      return res.status(500).json(responseFactory.error(error.message || 'An internal server error occurred during update'));
    }
  },

  adminUpdateUser: async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const { role, isActive, kycStatus, regionId } = req.body;

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json(responseFactory.notFound('User profile not found'));
      }

      if (role !== undefined) user.role = role;
      if (isActive !== undefined) user.isActive = isActive;
      if (kycStatus !== undefined) user.kycStatus = kycStatus;
      if (regionId !== undefined) user.regionId = regionId || undefined;

      await user.save();

      // Log action to compliance ledger
      await auditLogger.log({
        adminId: req.user.id,
        institutionId: req.user.role !== 'SuperAdmin' && req.user.role !== 'Admin' ? req.user.institutionId : undefined,
        action: 'UpdateUser',
        targetId: user._id as any,
        details: `Modified parameter details for user ${user.firstName} {${user.lastName}} (Role: ${role !== undefined ? role : 'Unchanged'}, Active: ${isActive !== undefined ? isActive : 'Unchanged'}).`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      console.log(`[UserAdministration] Admin updated user ${id} profile state.`);
      return res.json(responseFactory.success(user, 'User profile updated successfully by administrator'));
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  }
};
