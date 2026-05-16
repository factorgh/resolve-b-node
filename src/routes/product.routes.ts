import { Router } from 'express';
import { productController } from '../controllers/product.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', productController.getAll);
router.get('/:id', productController.getById);
router.post('/', authMiddleware, productController.create);

export default router;
