import { Request, Response } from 'express';
import { responseFactory } from '../utils/responseFactory';
import AuditLog from '../models/auditLog.model';

export const auditController = {
  getAuditLogs: async (req: any, res: Response) => {
    try {
      const { role, institutionId } = req.user;
      const query: any = {};

      // Multi-tenancy check
      if (role !== 'SuperAdmin' && role !== 'Admin') {
        if (!institutionId) {
          return res.status(403).json(responseFactory.error('Access Denied: Partner desk has no associated institution.'));
        }
        query.institutionId = institutionId;
      }

      const logs = await AuditLog.find(query)
        .populate('adminId', 'firstName lastName email role')
        .populate('institutionId', 'name')
        .sort({ createdAt: -1 })
        .limit(200); // Caps it to the last 200 logs for high performance

      return res.json(responseFactory.success(logs, 'Compliance audit logs retrieved successfully'));
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  }
};
