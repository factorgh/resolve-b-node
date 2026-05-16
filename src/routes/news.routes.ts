import { Router } from 'express';
import { newsController } from '../controllers/news.controller';

const router = Router();

router.get('/', newsController.getAll);
router.get('/:id', newsController.getById);

export default router;
