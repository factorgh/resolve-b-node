import { Response, NextFunction } from 'express';
import { responseFactory } from '../utils/responseFactory';

const ADMIN_ROLES = ['Admin', 'SuperAdmin', 'InstitutionAdmin', 'InsuranceAdmin', 'BNPLAdmin', 'Insurance', 'BNPL'];

export const requirePermission = (requiredPermission: string) => {
  return async (req: any, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json(responseFactory.unauthorized('Authentication required'));
    }

    if (ADMIN_ROLES.includes(req.user.role)) {
      return next();
    }

    const permissions: string[] = req.user.permissions || [];

    if (permissions.length === 0) {
      return res.status(403).json(
        responseFactory.error('Forbidden: No permissions assigned to this account', null, 403),
      );
    }

    if (!permissions.includes(requiredPermission)) {
      return res.status(403).json(
        responseFactory.error(`Forbidden: Missing permission "${requiredPermission}"`, null, 403),
      );
    }

    next();
  };
};
