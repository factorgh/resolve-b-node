import { Request, Response } from 'express';
import { responseFactory } from '../utils/responseFactory';
import Institution from '../models/institution.model';

export const institutionController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const institutions = await Institution.find({ isActive: true });
      return res.json(responseFactory.success(institutions, 'Institutions fetched successfully'));
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const institution = await Institution.findById(id);
      if (!institution) {
        return res.status(404).json(responseFactory.notFound('Institution not found'));
      }
      return res.json(responseFactory.success(institution, 'Institution fetched successfully'));
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const institution = await Institution.create(req.body);
      return res.status(201).json(responseFactory.success(institution, 'Institution created successfully'));
    } catch (error: any) {
      return res.status(400).json(responseFactory.error(error.message));
    }
  }
};
