import { Router } from 'express';
import { applicationController } from '../controllers/application.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/my-applications', authMiddleware, applicationController.getUserApplications);
router.post('/', authMiddleware, applicationController.createApplication);

export default router;
