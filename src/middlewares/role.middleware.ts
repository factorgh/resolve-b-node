import { Response, NextFunction } from 'express';
import { responseFactory } from '../utils/responseFactory';

export const requireRole = (allowedRoles: string[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.user) {
      console.warn('[RoleMiddleware] Access denied: User is not authenticated');
      return res.status(401).json(responseFactory.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.warn(`[RoleMiddleware] Access denied: User role "${req.user.role}" is not one of: ${allowedRoles.join(', ')}`);
      return res.status(403).json(responseFactory.error('Forbidden: Access denied', null, 403));
    }

    next();
  };
};
