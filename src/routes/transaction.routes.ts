import { Router } from 'express';
import { transactionController } from '../controllers/transaction.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authMiddleware, transactionController.getUserTransactions);
router.post('/', authMiddleware, transactionController.createTransaction);

export default router;
