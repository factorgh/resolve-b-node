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

  search: async (req: Request, res: Response) => {
    try {
      const { productType, searchTerm, providerType } = req.query;
      
      const query: any = {};
      
      if (productType && productType !== 'all') {
        query.category = productType;
      }
      
      if (searchTerm) {
        query.$or = [
          { name: { $regex: searchTerm, $options: 'i' } },
          { provider: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } }
        ];
      }

      if (providerType) {
        // frontend sends providerType as an array or comma-separated string
        const providers = Array.isArray(providerType) ? providerType : (providerType as string).split(',');
        if (providers.length > 0) {
          query.providerType = { $in: providers };
        }
      }
      
      // Mongoose models use camelCase.
      const products = await FinancialProduct.find(query).populate('institutionId', 'name logoUrl');
      
      // Map to frontend expectations
      const mappedProducts = products.map(p => {
        const institution = p.institutionId as any;
        return {
          id: p._id,
          name: p.name,
          provider: institution?.name || 'Institution',
          cat: p.productType,
          rate: p.interestRate,
          rateSuffix: p.productType === 'insurance' ? '/mo' : '%',
          trust: 95, // Default for now
          match: 90, // Default for now
          logo: p.imageUrl || institution?.logoUrl || '/resolve_icon.png',
          tag: p.isFeatured ? 'Featured' : '',
          desc: p.description
        };
      });

      return res.json(responseFactory.success(mappedProducts, 'Products found'));
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  recommendations: async (req: Request, res: Response) => {
    try {
      // Logic for personalized recommendations based on user profile
      const products = await FinancialProduct.find({ isFeatured: true }).limit(5);
      return res.json(responseFactory.success(products, 'Recommendations fetched'));
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
  },
  
  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const product = await FinancialProduct.findByIdAndUpdate(id, req.body, { new: true });
      if (!product) {
        return res.status(404).json(responseFactory.notFound('Product not found'));
      }
      return res.json(responseFactory.success(product, 'Product updated successfully'));
    } catch (error: any) {
      return res.status(400).json(responseFactory.error(error.message));
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const product = await FinancialProduct.findByIdAndDelete(id);
      if (!product) {
        return res.status(404).json(responseFactory.notFound('Product not found'));
      }
      return res.json(responseFactory.success(null, 'Product deleted successfully'));
    } catch (error: any) {
      return res.status(400).json(responseFactory.error(error.message));
    }
  }
};
