import AuditLog from '../models/auditLog.model';

export const auditLogger = {
  log: async (params: {
    adminId: string;
    institutionId?: string;
    action: string;
    targetId?: string;
    details: string;
    ipAddress?: string;
    userAgent?: string;
  }) => {
    try {
      await AuditLog.create({
        adminId: params.adminId,
        institutionId: params.institutionId || undefined,
        action: params.action,
        targetId: params.targetId || undefined,
        details: params.details,
        ipAddress: params.ipAddress || '127.0.0.1',
        userAgent: params.userAgent || 'Unknown Agent'
      });
      console.log(`[AuditLog] Saved action: ${params.action} - ${params.details}`);
    } catch (error: any) {
      console.error('❌ Error saving Administrative AuditLog:', error.message);
    }
  }
};
