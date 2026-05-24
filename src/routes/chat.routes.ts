import { Router } from "express";
import { chatController } from "../controllers/chat.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.post("/send", authMiddleware, chatController.sendMessage);
router.get("/history", authMiddleware, chatController.getChatHistory);
router.get("/history/:userId", authMiddleware, chatController.getChatHistory);
router.get("/admin/conversations", authMiddleware, chatController.getAdminConversations);

export default router;
