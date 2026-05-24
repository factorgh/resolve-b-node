import { Router } from "express";
import { productController } from "../controllers/product.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";

const router = Router();

router.get("/search", productController.search);
router.get(
  "/recommendations",
  authMiddleware,
  productController.recommendations,
);
router.get("/", productController.getAll);
router.get(
  "/blacklisted",
  authMiddleware,
  requireRole(["Admin", "SuperAdmin"]),
  productController.getBlacklistedProducts,
);
router.patch(
  "/blacklist/:id",
  authMiddleware,
  requireRole(["Admin", "SuperAdmin"]),
  productController.blacklistProduct,
);
router.patch(
  "/blacklisted/:id/restore",
  authMiddleware,
  requireRole(["Admin", "SuperAdmin"]),
  productController.restoreProduct,
);
router.get("/:id", productController.getById);
router.post("/", authMiddleware, productController.create);
router.patch("/:id", authMiddleware, productController.update);
router.delete("/:id", authMiddleware, productController.delete);

export default router;
