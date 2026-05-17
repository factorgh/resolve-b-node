import { Request, Response } from 'express';
import { responseFactory } from '../utils/responseFactory';
import UserDocument from '../models/document.model';

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
  }
};
