import { Router } from 'express';
import { productController } from '../controllers/product.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/search', productController.search);
router.get('/recommendations', authMiddleware, productController.recommendations);
router.get('/', productController.getAll);
router.get('/:id', productController.getById);
router.post('/', authMiddleware, productController.create);
router.patch('/:id', authMiddleware, productController.update);
router.delete('/:id', authMiddleware, productController.delete);

export default router;
