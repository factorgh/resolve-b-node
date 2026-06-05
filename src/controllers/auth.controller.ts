import { Request, Response } from 'express';
import { responseFactory } from '../utils/responseFactory';
import { authService } from '../services/auth.service';
import { z } from 'zod';
import User from '../models/user.model';
import bcrypt from 'bcryptjs';
import { auditLogger } from '../utils/auditLogger';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phoneNumber: z.string().min(1),
  middleName: z.string().optional(),
  dateOfBirth: z.string().optional().nullable(),
  market: z.string().optional(),
  role: z.string().optional(),
  title: z.string().optional(),
  maritalStatus: z.string().optional(),
  gender: z.string().optional(),
  nationality: z.string().optional(),
  dependants: z.string().optional(),
  residentialAddress: z.string().optional(),
  city: z.string().optional(),
  mmda: z.string().optional(),
  landmark: z.string().optional(),
  employer: z.string().optional(),
  sector: z.string().optional(),
  occupation: z.string().optional(),
  ssnitNo: z.string().optional(),
  workAddress: z.string().optional(),
  yearsWithEmployer: z.string().optional(),
  goals: z.array(z.string()).optional(),
  employmentStatus: z.string().optional(),
  monthlyIncome: z.string().optional(),
  loanDuration: z.string().optional(),
  idType: z.string().optional(),
  idNumber: z.string().optional(),
}).passthrough();

const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string(),
});

export const authController = {
  register: async (req: Request, res: Response) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      const result = await authService.register(validatedData);
      
      if (!result.success) {
        return res.status(400).json(responseFactory.error(result.message));
      }
      
      return res.status(201).json(responseFactory.success(result.data, 'Registration successful'));
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(responseFactory.error('Validation failed', error.issues));
      }
      return res.status(500).json(responseFactory.error(error.message || 'Internal server error'));
    }
  },

  login: async (req: Request, res: Response) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      const result = await authService.login(validatedData.identifier, validatedData.password);
      
      if (!result.success || !result.data) {
        return res.status(401).json(responseFactory.unauthorized(result.message || 'Login failed'));
      }
      
      // Log successful login to compliance ledger
      await auditLogger.log({
        adminId: result.data.user._id.toString(),
        institutionId: result.data.user.institutionId ? result.data.user.institutionId.toString() : undefined,
        action: 'Login',
        details: `User ${result.data.user.email} successfully logged in to the portal.`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.json(responseFactory.success(result.data, 'Login successful'));
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(responseFactory.error('Validation failed', error.issues));
      }
      return res.status(500).json(responseFactory.error(error.message || 'Internal server error'));
    }
  },

  getMe: async (req: any, res: Response) => {
    try {
      const user = await authService.getMe(req.user.id);
      if (!user) {
        return res.status(404).json(responseFactory.notFound('User not found'));
      }
      return res.json(responseFactory.success(user, 'User profile fetched successfully'));
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message || 'Internal server error'));
    }
  },

  verifyKyc: async (req: any, res: Response) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json(responseFactory.error('No documents uploaded'));
      }

      const result = await authService.verifyKyc(req.user.id, req.files);
      return res.json(responseFactory.success(result, 'KYC submitted successfully'));
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message || 'Internal server error'));
    }
  },

  resetTempPassword: async (req: any, res: Response) => {
    try {
      const { newPassword } = req.body;
      const userId = req.user.id;

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json(responseFactory.error('Password must be at least 6 characters long'));
      }

      // Fetch user profile
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json(responseFactory.notFound('User not found'));
      }

      // Hash the new password and save it
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      user.mustResetPassword = false;
      await user.save();

      // Log action to compliance ledger
      await auditLogger.log({
        adminId: userId,
        action: 'ResetTempPassword',
        targetId: userId as any,
        details: `User ${user.email} completed mandatory first-login password reset.`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      console.log(`[B2B-AuthSecurity] Success: Password reset completed for user ${user.email}`);
      return res.json(responseFactory.success(null, 'Password changed successfully. You can now access your dashboard.'));
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message || 'Internal server error'));
    }
  }
};
