import { Router } from 'express';
import { documentController } from '../controllers/document.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/my-documents', authMiddleware, documentController.getUserDocuments);
router.post('/upload', authMiddleware, documentController.uploadDocument);

export default router;
