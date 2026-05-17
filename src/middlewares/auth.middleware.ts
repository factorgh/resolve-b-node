import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { responseFactory } from '../utils/responseFactory';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export const authMiddleware = (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('[AuthMiddleware] Missing or invalid authorization header');
    return res.status(401).json(responseFactory.unauthorized('No token provided'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('[AuthMiddleware] Token verified successfully for user:', (decoded as any).id);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('[AuthMiddleware] Token verification failed:', (error as Error).message);
    return res.status(401).json(responseFactory.unauthorized('Invalid or expired token'));
  }
};
