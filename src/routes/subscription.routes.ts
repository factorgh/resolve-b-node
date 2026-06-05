import { Router } from 'express';
import { subscriptionController } from '../controllers/subscription.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();

// Public routes
router.get('/plans', subscriptionController.getSubscriptionPlans);
router.get('/plans/:id', subscriptionController.getSubscriptionPlan);

// User routes (authenticated)
router.get('/me/subscription', authMiddleware, subscriptionController.getUserSubscription);
router.post('/me/upgrade', authMiddleware, subscriptionController.upgradeSubscription);
router.get('/me/features', authMiddleware, subscriptionController.getPremiumFeatures);

// Admin routes
router.post(
  '/plans',
  authMiddleware,
  requireRole(['SuperAdmin', 'Admin']),
  subscriptionController.createSubscriptionPlan
);

router.patch(
  '/plans/:id',
  authMiddleware,
  requireRole(['SuperAdmin', 'Admin']),
  subscriptionController.updateSubscriptionPlan
);

export default router;
