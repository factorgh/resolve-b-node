import { Router } from "express";
import { chatController } from "../controllers/chat.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";

const router = Router();
const allowedRoles = [
  "Admin",
  "SuperAdmin",
  "InstitutionAdmin",
  "InsuranceAdmin",
  "BNPLAdmin",
  "InstitutionStaff",
  "InsuranceStaff",
  "BNPLStaff"
];

router.post("/send", authMiddleware, chatController.sendMessage);
router.get("/history", authMiddleware, chatController.getChatHistory);
router.get("/history/:userId", authMiddleware, requireRole(allowedRoles), chatController.getChatHistory);
router.get("/admin/conversations", authMiddleware, requireRole(allowedRoles), chatController.getAdminConversations);

export default router;
