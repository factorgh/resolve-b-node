import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authMiddleware, authController.getMe);
router.post('/verify-kyc', authMiddleware, upload.array('files'), authController.verifyKyc);
router.post('/reset-temp-password', authMiddleware, authController.resetTempPassword);
router.post('/otp/send', authController.sendOtp);
router.post('/otp/verify', authController.verifyOtp);

export default router;
