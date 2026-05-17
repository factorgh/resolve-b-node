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
        amount: `${tx.type === 'debit' ? '−' : '+'}GH₵ ${Math.abs(tx.amount).toLocaleString()}`,
        status: tx.status,
        type: tx.type,
        cat: tx.category,
        reference: tx.reference || tx._id.toString().substring(0, 8).toUpperCase()
      }));

      return res.json(responseFactory.success(mapped, 'Transactions fetched successfully'));
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  }
};
