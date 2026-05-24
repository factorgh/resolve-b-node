import { Router } from "express";
import { notificationController } from "../controllers/notification.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.get("/mine", authMiddleware, notificationController.getMyNotifications);
router.patch("/:id/read", authMiddleware, notificationController.markAsRead);

export default router;
