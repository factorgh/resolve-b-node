import { Router } from 'express';
import { institutionController } from '../controllers/institution.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', institutionController.getAll);
router.get('/:id', institutionController.getById);
router.post('/', authMiddleware, institutionController.create);

export default router;
