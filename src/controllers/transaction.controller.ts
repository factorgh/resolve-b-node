import { Request, Response } from 'express';
import { responseFactory } from '../utils/responseFactory';
import Transaction from '../models/transaction.model';
import { parsePagination, paginatedResponse } from '../utils/pagination';

const ADMIN_ROLES = new Set([
  'SuperAdmin', 'Admin', 'InstitutionAdmin', 'InsuranceAdmin', 'BNPLAdmin',
  'InstitutionStaff', 'InsuranceStaff', 'BNPLStaff', 'Insurance', 'BNPL',
]);

export const transactionController = {
  getUserTransactions: async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const { limit, skip } = parsePagination(req.query, 50, 100);

      const [transactions, total] = await Promise.all([
        Transaction.find({ userId }).sort({ date: -1 }).skip(skip).limit(limit),
        Transaction.countDocuments({ userId }),
      ]);

      const mapped = transactions.map(tx => ({
        id: tx._id,
        date: new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        desc: tx.description,
        description: tx.description,
        amount: tx.amount,
        status: tx.status,
        type: tx.type,
        cat: tx.category,
        category: tx.category,
        reference: tx.reference || tx._id.toString().substring(0, 8).toUpperCase()
      }));

      return res.json(responseFactory.success(
        paginatedResponse(mapped, total, { limit, skip, page: Math.floor(skip / limit) + 1 }),
        'Transactions fetched successfully',
      ));
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  createTransaction: async (req: any, res: Response) => {
    try {
      const { role, id: authUserId } = req.user;
      let { userId, applicationId, institutionId, description, amount, type, category, status } = req.body;

      if (!description || amount == null || !type || !category) {
        return res.status(400).json(responseFactory.error('description, amount, type, and category are required'));
      }

      if (role === 'Customer') {
        userId = authUserId;
        if (type !== 'debit' || !['Loan', 'Repayment'].includes(category)) {
          return res.status(403).json(responseFactory.error('Customers may only record loan repayments'));
        }
        if (amount <= 0 || amount > 1_000_000) {
          return res.status(400).json(responseFactory.error('Invalid payment amount'));
        }
      } else if (!ADMIN_ROLES.has(role)) {
        return res.status(403).json(responseFactory.error('Forbidden'));
      }

      const reference = `${type === 'debit' ? 'REPAY' : 'DISB'}-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const tx = await Transaction.create({
        userId,
        applicationId,
        institutionId,
        description,
        amount,
        type,
        category,
        status: status || 'Completed',
        reference
      });
      return res.status(201).json(responseFactory.success(tx, 'Transaction logged successfully'));
    } catch (error: any) {
      return res.status(400).json(responseFactory.error(error.message));
    }
  }
};
