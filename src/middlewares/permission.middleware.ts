import { Response, NextFunction } from 'express';
import { responseFactory } from '../utils/responseFactory';
import User from '../models/user.model';

export const requirePermission = (requiredPermission: string) => {
  return async (req: any, res: Response, next: NextFunction) => {
    if (!req.user) {
      console.warn('[PermissionMiddleware] Access denied: User is not authenticated');
      return res.status(401).json(responseFactory.unauthorized('Authentication required'));
    }

    // Admins and SuperAdmins have all permissions implicitly
    const adminRoles = ['Admin', 'SuperAdmin', 'InstitutionAdmin', 'InsuranceAdmin', 'BNPLAdmin', 'Insurance', 'BNPL'];
    if (adminRoles.includes(req.user.role)) {
      return next();
    }

    try {
      const dbUser = await User.findById(req.user.id);
      if (!dbUser) {
        console.warn(`[PermissionMiddleware] Access denied: User ID ${req.user.id} not found in database`);
        return res.status(404).json(responseFactory.notFound('User not found'));
      }

      // Check if user has the specific permission
      // If dbUser.permissions is empty or undefined, default to true (to not break old staff)
      if (dbUser.permissions && dbUser.permissions.length > 0) {
        if (dbUser.permissions.includes(requiredPermission)) {
          return next();
        }
      } else {
        // Fallback: If no permissions array is defined or empty on this staff account, allow full access
        return next();
      }

      console.warn(`[PermissionMiddleware] Access denied: Staff user ${req.user.id} (Role: ${req.user.role}) lacks permission: ${requiredPermission}`);
      return res.status(403).json(responseFactory.error(`Forbidden: Lack of permission '${requiredPermission}'`, null, 403));
    } catch (err: any) {
      console.error(`[PermissionMiddleware] Error verifying permissions:`, err.message);
      return res.status(500).json(responseFactory.error(err.message));
    }
  };
};
