import { Request, Response } from 'express';
import { responseFactory } from '../utils/responseFactory';
import Transaction from '../models/transaction.model';

export const transactionController = {
  getUserTransactions: async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const transactions = await Transaction.find({ userId })
        .sort({ date: -1 });

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

      return res.json(responseFactory.success(mapped, 'Transactions fetched successfully'));
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  createTransaction: async (req: Request, res: Response) => {
    try {
      const { userId, applicationId, institutionId, description, amount, type, category, status } = req.body;
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
