import { Router } from "express";
import { vehicleController } from "../controllers/vehicle.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import { vehicleUpload } from "../middlewares/upload.middleware";

const router = Router();
const platformAdmins = ["Admin", "SuperAdmin"];

router.get("/public", vehicleController.listPublic);
router.get("/public/:id", vehicleController.getPublicById);

router.get("/intake/:token", vehicleController.getIntakeLink);
router.post(
  "/intake/:token/files",
  vehicleUpload.array("files", 12),
  vehicleController.uploadIntakeFiles,
);
router.post("/intake/:token", vehicleController.submitIntakeVehicle);

router.get(
  "/admin",
  authMiddleware,
  requireRole(platformAdmins),
  vehicleController.adminList,
);
router.post(
  "/admin/links",
  authMiddleware,
  requireRole(platformAdmins),
  vehicleController.createUploadLink,
);
router.get(
  "/admin/links",
  authMiddleware,
  requireRole(platformAdmins),
  vehicleController.listUploadLinks,
);
router.patch(
  "/admin/:id/verify",
  authMiddleware,
  requireRole(platformAdmins),
  vehicleController.adminVerify,
);
router.patch(
  "/admin/:id/release",
  authMiddleware,
  requireRole(platformAdmins),
  vehicleController.adminRelease,
);

export default router;
