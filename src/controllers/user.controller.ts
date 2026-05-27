import { Request, Response } from 'express';
import { responseFactory } from '../utils/responseFactory';
import User from '../models/user.model';
import Transaction from '../models/transaction.model';
import { auditLogger } from '../utils/auditLogger';
import { paystackService } from '../services/paystack.service';

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

  getDashboardMetrics: async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(responseFactory.unauthorized('User identity not found in token'));
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json(responseFactory.notFound('User not found'));
      }

      const creditScore = user.creditScore || 650;
      const healthIndex = user.healthIndex || 60;
      const cashFlow = user.cashFlow || 5000;
      const netWorth = user.netWorth || 15000;
      const healthIndexMessage = user.healthIndexMessage || 'Assessment Pending';

      const metrics = {
        healthIndex,
        cashFlow,
        netWorth,
        creditScore,
        eligibleOffers: creditScore > 750 ? 5 : creditScore > 650 ? 3 : 1,
        healthIndexMessage,
        velocityData: [
          { label: 'Jan', value: Math.max(30, Math.min(100, Math.round(healthIndex * 0.75))) },
          { label: 'Feb', value: Math.max(30, Math.min(100, Math.round(healthIndex * 0.85))) },
          { label: 'Mar', value: Math.max(30, Math.min(100, Math.round(healthIndex * 0.80))) },
          { label: 'Apr', value: Math.max(30, Math.min(100, Math.round(healthIndex * 0.95))) },
          { label: 'May', value: Math.max(30, Math.min(100, Math.round(healthIndex * 0.90))) },
          { label: 'Jun', value: healthIndex }
        ],
        healthFactors: [
          { name: 'Payment History', status: creditScore > 700 ? 'Good' : 'Fair', color: creditScore > 700 ? '#10b981' : '#f59e0b' },
          { name: 'Credit Utilization', status: creditScore > 750 ? 'Excellent' : creditScore > 650 ? 'Good' : 'Needs Work', color: creditScore > 650 ? '#10b981' : '#ef4444' },
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
  },

  calculateCreditScore: async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const { customScore, monthlyIncome, employmentStatus } = req.body;

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json(responseFactory.notFound('User not found'));
      }

      // Update parameters on the user if provided by admin
      if (monthlyIncome !== undefined) user.monthlyIncome = monthlyIncome;
      if (employmentStatus !== undefined) user.employmentStatus = employmentStatus;

      let score = 600; // Base score
      
      if (customScore !== undefined && customScore !== null && customScore > 0) {
        score = customScore;
      } else {
        // Run Algorithmic Scoring Model
        // 1. Income impact
        const incomeStr = user.monthlyIncome || '';
        const numericIncome = Number(incomeStr.replace(/[^0-9.]/g, '')) || 0;
        
        if (numericIncome >= 20000) {
          score += 150;
        } else if (numericIncome >= 10000) {
          score += 100;
        } else if (numericIncome >= 5000) {
          score += 70;
        } else if (numericIncome >= 2000) {
          score += 40;
        } else {
          score += 20;
        }

        // 2. Employment Status impact
        const empStatus = (user.employmentStatus || '').toLowerCase();
        if (empStatus.includes('permanent') || empStatus.includes('employed')) {
          score += 100;
        } else if (empStatus.includes('self')) {
          score += 70;
        } else if (empStatus.includes('contract')) {
          score += 50;
        } else {
          score += 20;
        }

        // Add minor variation based on years with employer if present
        const yearsStr = user.yearsWithEmployer || '';
        const numericYears = Number(yearsStr.replace(/[^0-9.]/g, '')) || 0;
        if (numericYears > 5) {
          score += 30;
        } else if (numericYears > 2) {
          score += 15;
        }

        // Cap score within normal FICO credit limits [300 - 850]
        score = Math.max(300, Math.min(850, score));
      }

      // Compute derived financial health metrics
      const healthIndex = Math.round(((score - 300) / 550) * 100);
      
      const incomeStr = user.monthlyIncome || '';
      const numericIncome = Number(incomeStr.replace(/[^0-9.]/g, '')) || 2500;
      const cashFlow = Math.round(numericIncome * 0.65 * 100) / 100;
      const netWorth = numericIncome * 18;

      let message = 'Poor financial health';
      if (score >= 750) message = 'Exceptional financial health';
      else if (score >= 700) message = 'Excellent financial health';
      else if (score >= 650) message = 'Good financial health';
      else if (score >= 580) message = 'Fair financial health';

      // Persist to user record
      user.creditScore = score;
      user.healthIndex = healthIndex;
      user.cashFlow = cashFlow;
      user.netWorth = netWorth;
      user.healthIndexMessage = message;

      await user.save();

      // Log action to compliance ledger
      await auditLogger.log({
        adminId: req.user.id,
        institutionId: req.user.role !== 'SuperAdmin' && req.user.role !== 'Admin' ? req.user.institutionId : undefined,
        action: 'CalculateCreditScore',
        targetId: user._id as any,
        details: `Assessed credit score for user ${user.firstName} ${user.lastName}. Score: ${score}, Health Index: ${healthIndex}%.`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      console.log(`[CreditScoringEngine] Assessed score ${score} for user ${user._id}`);

      return res.json(responseFactory.success(user, 'Credit score assessed and updated successfully'));
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  paySubscription: async (req: any, res: Response) => {
    try {
      const userId = req.user.id;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json(responseFactory.notFound('User not found'));
      }

      // Generate a unique subscription reference
      const reference = `PSK-SUB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Initialize Paystack payment for subscription (GH₵ 20.00 = 2000 kobo)
      const result = await paystackService.initiatePayment({
        email: user.email,
        amount: 2000, 
        reference,
        userId,
        description: 'Platform Monthly Access Fee Settlement via Paystack',
        metadata: { isSubscription: true }
      });

      // Audit log the subscription payment initiation
      await auditLogger.log({
        adminId: userId,
        action: 'PAYMENT_INITIATED',
        details: `Initiated Paystack subscription checkout ${reference} for amount GH₵ 20.00`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      console.log(`[SubscriptionBilling] Initiated subscription Paystack checkout for user ${user._id} reference ${reference}`);

      return res.json(responseFactory.success({
        authorizationUrl: result.authorizationUrl,
        reference: result.reference,
        transactionId: result.transactionId
      }, 'Platform subscription checkout initialized successfully'));
    } catch (error: any) {
      console.error("[SubscriptionBilling] Paystack checkout initiation error:", error.message);
      return res.status(500).json(responseFactory.error(error.message || 'Failed to initialize subscription checkout'));
    }
  }
};
