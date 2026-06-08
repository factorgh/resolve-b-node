import { Request, Response } from 'express';
import { responseFactory } from '../utils/responseFactory';
import UserDocument from '../models/document.model';
import User from '../models/user.model';
import { auditLogger } from '../utils/auditLogger';
import { storageService } from '../services/storage.service';

export const documentController = {
  getUserDocuments: async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const documents = await UserDocument.find({ userId })
        .sort({ uploadedAt: -1 });

      // Map to frontend expectations
      const mapped = documents.map(doc => ({
        id: doc._id,
        name: doc.type,
        type: doc.type.toLowerCase().includes('statement') ? 'FINANCE' : 
              doc.type.toLowerCase().includes('registration') ? 'ASSETS' : 'IDENTITY',
        uploaded: new Date(doc.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        expiry: doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A',
        size: '1.2 MB', // Mock size for now
        status: doc.isVerified ? 'Verified' : 'Pending',
        url: doc.documentUrl
      }));

      return res.json(responseFactory.success(mapped, 'Documents fetched successfully'));
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  uploadDocument: async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const { type, documentUrl, documentNumber, expiryDate } = req.body;

      const document = await UserDocument.create({
        userId,
        type,
        documentUrl,
        documentNumber,
        expiryDate,
        isVerified: false
      });

      return res.status(201).json(responseFactory.success(document, 'Document uploaded successfully'));
    } catch (error: any) {
      return res.status(400).json(responseFactory.error(error.message));
    }
  },

  uploadFile: async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const file = req.file;

      if (!file) {
        return res.status(400).json(responseFactory.error('No file uploaded'));
      }

      const fileName = `vault/${userId}/${Date.now()}-${file.originalname}`;
      const url = await storageService.uploadFile(file.buffer, fileName, file.mimetype);

      return res.status(200).json(responseFactory.success({ url }, 'File uploaded to storage successfully'));
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },
  deleteDocument: async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const doc = await UserDocument.findOne({ _id: id, userId });
      if (!doc) {
        return res.status(404).json(responseFactory.notFound('Document not found or access denied'));
      }

      // If document has R2 URL, try to delete from Cloudflare R2
      if (doc.documentUrl) {
        let key = '';
        try {
          const urlObj = new URL(doc.documentUrl);
          key = decodeURIComponent(urlObj.pathname.substring(1));
        } catch (urlError: any) {
          console.warn(`Skipping R2 file deletion: invalid or unparseable URL (${doc.documentUrl})`);
        }

        if (key && key.startsWith('vault/')) {
          try {
            console.log(`Deleting file from R2: ${key}`);
            await storageService.deleteFile(key);
          } catch (r2Error: any) {
            console.error(`Compliance Warning: Failed to delete R2 object (${key}) during vault cleanup:`, r2Error.message);
          }
        }
      }

      // Delete from MongoDB
      await UserDocument.deleteOne({ _id: id });

      // Reset user KYC status back to Pending since their vault has changed
      const user = await User.findById(userId);
      if (user) {
        user.kycStatus = 'Pending';
        await user.save();
      }

      return res.json(responseFactory.success(null, 'Document deleted successfully'));
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  adminGetPendingDocuments: async (req: any, res: Response) => {
    try {
      const { role } = req.user;
      
      // KYC check: standard admins and partner roles can review KYC documents
      const documents = await UserDocument.find()
        .populate('userId', 'firstName lastName email phoneNumber kycStatus profile')
        .sort({ uploadedAt: -1 });

      return res.json(responseFactory.success(documents, 'All KYC documents retrieved successfully'));
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  adminVerifyDocument: async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const { isVerified } = req.body;
      const verifierId = req.user.id;

      const doc = await UserDocument.findById(id);
      if (!doc) {
        return res.status(404).json(responseFactory.notFound('KYC document not found'));
      }

      doc.isVerified = isVerified;
      doc.verifiedBy = verifierId;
      doc.verifiedAt = new Date();
      await doc.save();

      // Log action to compliance ledger
      await auditLogger.log({
        adminId: verifierId,
        institutionId: req.user.role !== 'SuperAdmin' && req.user.role !== 'Admin' ? req.user.institutionId : undefined,
        action: 'VerifyDocument',
        targetId: doc._id as any,
        details: `${isVerified ? 'Approved' : 'Rejected'} customer compliance document (Type: ${doc.type}).`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      // If document is verified, check if we should elevate user's KYC status to 'Verified'
      if (isVerified) {
        const user = await User.findById(doc.userId);
        if (user && user.kycStatus !== 'Verified') {
          // Check if user has at least one verified document and no more unverified ones
          const unverifiedCount = await UserDocument.countDocuments({ userId: doc.userId, isVerified: false });
          if (unverifiedCount === 0) {
            user.kycStatus = 'Verified';
            await user.save();
            console.log(`[KYC Elevation] User ${user._id} elevated to "Verified" due to full document approval.`);
          }
        }
      } else {
        // If rejected, set user KYC status back to Pending or Rejected
        const user = await User.findById(doc.userId);
        if (user) {
          user.kycStatus = 'Pending';
          await user.save();
        }
      }

      return res.json(responseFactory.success(doc, `Document verification set to ${isVerified} successfully`));
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  }
};
