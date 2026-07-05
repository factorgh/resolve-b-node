import { Request, Response } from 'express';
import { responseFactory } from '../utils/responseFactory';
import UserDocument from '../models/document.model';
import User from '../models/user.model';
import { auditLogger } from '../utils/auditLogger';
import { storageService } from '../services/storage.service';
import { buildStorageKey } from '../utils/safeFilename';
import { parsePagination, paginatedResponse } from '../utils/pagination';

export const documentController = {
  getUserDocuments: async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const { limit, skip } = parsePagination(req.query, 50, 100);

      const [documents, total] = await Promise.all([
        UserDocument.find({ userId }).sort({ uploadedAt: -1 }).skip(skip).limit(limit),
        UserDocument.countDocuments({ userId }),
      ]);

      const mapped = documents.map(doc => ({
        id: doc._id,
        name: doc.type,
        type: doc.type.toLowerCase().includes('statement') ? 'FINANCE' : 
              doc.type.toLowerCase().includes('registration') ? 'ASSETS' : 'IDENTITY',
        uploaded: new Date(doc.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        expiry: doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A',
        size: '—',
        status: doc.isVerified ? 'Verified' : 'Pending',
        url: doc.documentUrl
      }));

      return res.json(responseFactory.success(
        paginatedResponse(mapped, total, { limit, skip, page: Math.floor(skip / limit) + 1 }),
        'Documents fetched successfully',
      ));
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  uploadDocument: async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const { type, documentNumber, expiryDate } = req.body;

      if (!req.file) {
        return res.status(400).json(responseFactory.error('File upload is required. Client-supplied URLs are not accepted.'));
      }

      const fileName = buildStorageKey('vault', userId, req.file.originalname);
      const documentUrl = await storageService.uploadFile(req.file.buffer, fileName, req.file.mimetype);

      const document = await UserDocument.create({
        userId,
        type: type || 'GENERAL',
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

      const fileName = buildStorageKey('vault', userId, file.originalname);
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

      if (doc.documentUrl) {
        let key = '';
        try {
          const urlObj = new URL(doc.documentUrl);
          key = decodeURIComponent(urlObj.pathname.substring(1));
        } catch {
          console.warn(`Skipping R2 file deletion: invalid URL (${doc.documentUrl})`);
        }

        if (key && (key.startsWith('vault/') || key.startsWith('kyc/'))) {
          try {
            await storageService.deleteFile(key);
          } catch (r2Error: any) {
            console.error(`Failed to delete R2 object (${key}):`, r2Error.message);
          }
        }
      }

      await UserDocument.deleteOne({ _id: id });

      await User.findByIdAndUpdate(userId, { kycStatus: 'Pending' });

      return res.json(responseFactory.success(null, 'Document deleted successfully'));
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  adminGetPendingDocuments: async (req: any, res: Response) => {
    try {
      const { limit, skip } = parsePagination(req.query, 25, 100);

      const [documents, total] = await Promise.all([
        UserDocument.find()
          .populate('userId', 'firstName lastName email phoneNumber kycStatus')
          .sort({ uploadedAt: -1 })
          .skip(skip)
          .limit(limit),
        UserDocument.countDocuments(),
      ]);

      return res.json(responseFactory.success(
        paginatedResponse(documents, total, { limit, skip, page: Math.floor(skip / limit) + 1 }),
        'KYC documents retrieved successfully',
      ));
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

      await auditLogger.log({
        adminId: verifierId,
        institutionId: req.user.role !== 'SuperAdmin' && req.user.role !== 'Admin' ? req.user.institutionId : undefined,
        action: 'VerifyDocument',
        targetId: doc._id as any,
        details: `${isVerified ? 'Approved' : 'Rejected'} customer compliance document (Type: ${doc.type}).`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      if (isVerified) {
        const user = await User.findById(doc.userId);
        if (user && user.kycStatus !== 'Verified') {
          const unverifiedCount = await UserDocument.countDocuments({ userId: doc.userId, isVerified: false });
          if (unverifiedCount === 0) {
            user.kycStatus = 'Verified';
            await user.save();
          }
        }
      } else {
        await User.findByIdAndUpdate(doc.userId, { kycStatus: 'Pending' });
      }

      return res.json(responseFactory.success(doc, `Document verification set to ${isVerified} successfully`));
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  }
};
