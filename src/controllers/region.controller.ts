import { Request, Response } from 'express';
import { responseFactory } from '../utils/responseFactory';
import Region from '../models/region.model';

export const regionController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const regions = await Region.find({ isActive: true });
      return res.json(responseFactory.success(regions, 'Regions fetched successfully'));
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const region = await Region.findById(id);
      if (!region) {
        return res.status(404).json(responseFactory.notFound('Region not found'));
      }
      return res.json(responseFactory.success(region, 'Region fetched successfully'));
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const region = await Region.create(req.body);
      return res.status(201).json(responseFactory.success(region, 'Region created successfully'));
    } catch (error: any) {
      return res.status(400).json(responseFactory.error(error.message));
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updated = await Region.findByIdAndUpdate(id, req.body, { new: true });
      if (!updated) {
        return res.status(404).json(responseFactory.notFound('Region not found'));
      }
      return res.json(responseFactory.success(updated, 'Region updated successfully'));
    } catch (error: any) {
      return res.status(400).json(responseFactory.error(error.message));
    }
  }
};
