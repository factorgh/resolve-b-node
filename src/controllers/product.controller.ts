import { Request, Response } from 'express';
import { responseFactory } from '../utils/responseFactory';
import FinancialProduct from '../models/product.model';

export const productController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const { type } = req.query;
      const query: any = { isActive: true };
      if (type) query.productType = type;

      const products = await FinancialProduct.find(query).populate('institutionId', 'name logoUrl');
      return res.json(responseFactory.success(products, 'Products fetched successfully'));
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const product = await FinancialProduct.findById(id).populate('institutionId');
      if (!product) {
        return res.status(404).json(responseFactory.notFound('Product not found'));
      }
      return res.json(responseFactory.success(product, 'Product fetched successfully'));
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const product = await FinancialProduct.create(req.body);
      return res.status(201).json(responseFactory.success(product, 'Product created successfully'));
    } catch (error: any) {
      return res.status(400).json(responseFactory.error(error.message));
    }
  }
};
