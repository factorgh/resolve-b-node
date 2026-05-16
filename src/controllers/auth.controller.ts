import { Request, Response } from 'express';
import { responseFactory } from '../utils/responseFactory';
import { authService } from '../services/auth.service';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phoneNumber: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
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
      const result = await authService.login(validatedData.email, validatedData.password);
      
      if (!result.success) {
        return res.status(401).json(responseFactory.unauthorized(result.message));
      }
      
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
  }
};
