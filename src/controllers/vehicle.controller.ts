import crypto from "crypto";
import { Response } from "express";
import { responseFactory } from "../utils/responseFactory";
import Vehicle from "../models/vehicle.model";
import VehicleUploadToken from "../models/vehicleUploadToken.model";
import FinancialProduct from "../models/product.model";
import Institution from "../models/institution.model";
import { storageService } from "../services/storage.service";
import { buildStorageKey } from "../utils/safeFilename";
import { auditLogger } from "../utils/auditLogger";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function publicVehicle(v: any) {
  const inst = v.recommendedInstitutionId;
  const product = v.financeProductId;
  return {
    id: v._id,
    make: v.make,
    model: v.vehicleModel,
    year: v.year,
    bodyType: v.bodyType,
    fuel: v.fuel,
    transmission: v.transmission,
    mileageKm: v.mileageKm,
    vin: v.vin,
    condition: v.condition,
    color: v.color,
    location: v.location,
    description: v.description,
    customerPrice: v.customerPrice,
    minDownPaymentPercent: v.minDownPaymentPercent,
    photos: v.photos || [],
    status: v.status,
    recommendedBank: inst
      ? {
          id: inst._id,
          name: inst.name,
          logoUrl: inst.logoUrl,
        }
      : null,
    finance: product
      ? {
          id: product._id,
          name: product.name,
          interestRate: product.interestRate,
          minTenureMonths: product.minTenureMonths,
          maxTenureMonths: product.maxTenureMonths,
        }
      : null,
  };
}

function vehiclePack(v: any) {
  return {
    vehicleId: v._id,
    make: v.make,
    model: v.vehicleModel,
    year: v.year,
    bodyType: v.bodyType,
    fuel: v.fuel,
    transmission: v.transmission,
    mileageKm: v.mileageKm,
    vin: v.vin,
    condition: v.condition,
    color: v.color,
    location: v.location,
    description: v.description,
    customerPrice: v.customerPrice,
    minDownPaymentPercent: v.minDownPaymentPercent,
    photos: v.photos || [],
    documents: v.documents || [],
  };
}

function toAdminVehicle(v: any) {
  if (!v) return v;
  const obj = typeof v.toObject === "function" ? v.toObject() : { ...v };
  obj.model = obj.vehicleModel;
  return obj;
}

async function resolveIntakeToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const link = await VehicleUploadToken.findOne({ tokenHash, isActive: true });
  if (!link) return null;
  if (link.expiresAt.getTime() < Date.now()) return null;
  if (link.usedCount >= link.maxUploads) return null;
  return link;
}

async function ensureVehicleProduct(institutionId: string, customerPrice: number) {
  const existing = await FinancialProduct.findOne({
    institutionId,
    productType: "Loan",
    name: /vehicle finance/i,
    isActive: true,
    isBlacklisted: false,
  });

  if (existing) {
    if (existing.maxAmount < customerPrice) {
      existing.maxAmount = customerPrice;
      await existing.save();
    }
    return existing;
  }

  const inst = await Institution.findById(institutionId);
  return FinancialProduct.create({
    name: `${inst?.name || "Partner"} Vehicle Finance`,
    description:
      "Auto loan for a ResolveBridge-listed vehicle. The lender reviews the customer and the vehicle pack, then disburses to ResolveBridge.",
    productType: "Loan",
    institutionId,
    minAmount: 1000,
    maxAmount: Math.max(customerPrice, 50000),
    interestRate: 16,
    minTenureMonths: 12,
    maxTenureMonths: 60,
    requirements: "Ghana Card, proof of income, and the vehicle document pack.",
    benefits: "Finance a verified vehicle with a single recommended lender.",
    termsAndConditions:
      "Minimum down payment is 10% or the rate set by the lender. ResolveBridge is the seller of record and is present at handover.",
    isActive: true,
    isFeatured: true,
  });
}

export const vehicleController = {
  createUploadLink: async (req: any, res: Response) => {
    try {
      const {
        dealerName,
        dealerCompany,
        dealerPhone,
        dealerEmail,
        daysValid,
        maxUploads,
      } = req.body;

      if (!dealerName || !dealerCompany) {
        return res
          .status(400)
          .json(responseFactory.error("Dealer name and company are required"));
      }

      const token = crypto.randomBytes(24).toString("hex");
      const days = Math.min(Math.max(Number(daysValid) || 14, 1), 90);

      const link = await VehicleUploadToken.create({
        tokenHash: hashToken(token),
        dealerName,
        dealerCompany,
        dealerPhone: dealerPhone || "",
        dealerEmail: dealerEmail || "",
        expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
        maxUploads: Math.min(Math.max(Number(maxUploads) || 20, 1), 100),
        createdBy: req.user.id,
      });

      await auditLogger.log({
        adminId: req.user.id,
        action: "CreateVehicleUploadLink",
        targetId: link._id as any,
        details: `Issued dealer upload link for ${dealerCompany} (${dealerName}), valid ${days} days.`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      return res.status(201).json(
        responseFactory.success(
          {
            id: link._id,
            token,
            path: `/dealer-upload/${token}`,
            dealerName: link.dealerName,
            dealerCompany: link.dealerCompany,
            expiresAt: link.expiresAt,
            maxUploads: link.maxUploads,
          },
          "Upload link created",
        ),
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  listUploadLinks: async (req: any, res: Response) => {
    try {
      const links = await VehicleUploadToken.find()
        .sort({ createdAt: -1 })
        .limit(50)
        .select("-tokenHash");
      return res.json(responseFactory.success(links, "Upload links fetched"));
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  getIntakeLink: async (req: any, res: Response) => {
    try {
      const link = await resolveIntakeToken(req.params.token);
      if (!link) {
        return res
          .status(404)
          .json(responseFactory.notFound("This upload link is invalid or has expired"));
      }
      return res.json(
        responseFactory.success(
          {
            dealerName: link.dealerName,
            dealerCompany: link.dealerCompany,
            remaining: Math.max(0, link.maxUploads - link.usedCount),
            expiresAt: link.expiresAt,
          },
          "Upload link is valid",
        ),
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  uploadIntakeFiles: async (req: any, res: Response) => {
    try {
      const link = await resolveIntakeToken(req.params.token);
      if (!link) {
        return res
          .status(404)
          .json(responseFactory.notFound("This upload link is invalid or has expired"));
      }

      const files = (req.files || []) as Express.Multer.File[];
      if (!files.length) {
        return res.status(400).json(responseFactory.error("No files uploaded"));
      }

      const uploaded = [];
      for (const file of files) {
        const key = buildStorageKey("vehicles", link._id.toString(), file.originalname);
        const url = await storageService.uploadFile(file.buffer, key, file.mimetype);
        const isPdf = file.mimetype === "application/pdf";
        uploaded.push({
          url,
          name: file.originalname,
          type: isPdf ? "document" : "photo",
        });
      }

      return res.json(responseFactory.success(uploaded, "Files uploaded"));
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  submitIntakeVehicle: async (req: any, res: Response) => {
    try {
      const link = await resolveIntakeToken(req.params.token);
      if (!link) {
        return res
          .status(404)
          .json(responseFactory.notFound("This upload link is invalid or has expired"));
      }

      const {
        make,
        model,
        year,
        bodyType,
        fuel,
        transmission,
        mileageKm,
        vin,
        condition,
        color,
        location,
        description,
        dealerPrice,
        photos,
        documents,
      } = req.body;

      const price = Number(dealerPrice);
      if (!make || !model || !year || !price || price <= 0) {
        return res
          .status(400)
          .json(responseFactory.error("Make, model, year, and dealer price are required"));
      }

      const vehicle = await Vehicle.create({
        dealerName: link.dealerName,
        dealerCompany: link.dealerCompany,
        dealerPhone: link.dealerPhone,
        dealerEmail: link.dealerEmail,
        make,
        vehicleModel: model,
        year: Number(year),
        bodyType: bodyType || "SUV",
        fuel: fuel || "Petrol",
        transmission: transmission || "Auto",
        mileageKm: Number(mileageKm) || 0,
        vin: vin || "",
        condition: condition || "Used",
        color: color || "",
        location: location || "Accra",
        description: description || "",
        dealerPrice: price,
        markup: 0,
        customerPrice: price,
        photos: Array.isArray(photos) ? photos : [],
        documents: Array.isArray(documents) ? documents : [],
        status: "PendingReview",
        uploadTokenId: link._id,
      });

      link.usedCount += 1;
      await link.save();

      return res.status(201).json(
        responseFactory.success(
          { id: vehicle._id, status: vehicle.status },
          "Vehicle submitted for ResolveBridge verification",
        ),
      );
    } catch (error: any) {
      return res.status(400).json(responseFactory.error(error.message));
    }
  },

  listPublic: async (_req: any, res: Response) => {
    try {
      const vehicles = await Vehicle.find({ status: "Listed" })
        .populate("recommendedInstitutionId", "name logoUrl")
        .populate("financeProductId", "name interestRate minTenureMonths maxTenureMonths")
        .sort({ listedAt: -1, createdAt: -1 });

      return res.json(
        responseFactory.success(vehicles.map(publicVehicle), "Vehicles fetched"),
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  getPublicById: async (req: any, res: Response) => {
    try {
      const vehicle = await Vehicle.findById(req.params.id)
        .populate("recommendedInstitutionId", "name logoUrl")
        .populate("financeProductId", "name interestRate minTenureMonths maxTenureMonths");

      if (!vehicle || !["Listed", "Reserved"].includes(vehicle.status)) {
        return res.status(404).json(responseFactory.notFound("Vehicle not found"));
      }

      return res.json(responseFactory.success(publicVehicle(vehicle), "Vehicle fetched"));
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  adminList: async (req: any, res: Response) => {
    try {
      const { status } = req.query;
      const query: any = {};
      if (status && status !== "all") query.status = status;

      const vehicles = await Vehicle.find(query)
        .populate("recommendedInstitutionId", "name logoUrl type")
        .populate("financeProductId", "name interestRate")
        .populate("verifiedBy", "firstName lastName")
        .sort({ createdAt: -1 });

      return res.json(
        responseFactory.success(
          vehicles.map(toAdminVehicle),
          "Vehicles fetched",
        ),
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  adminVerify: async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const {
        markup,
        recommendedInstitutionId,
        minDownPaymentPercent,
        decision,
        rejectionReason,
      } = req.body;

      const vehicle = await Vehicle.findById(id);
      if (!vehicle) {
        return res.status(404).json(responseFactory.notFound("Vehicle not found"));
      }

      if (decision === "reject") {
        vehicle.status = "Rejected";
        vehicle.rejectionReason = rejectionReason || "Did not pass verification";
        vehicle.verifiedBy = req.user.id;
        vehicle.verifiedAt = new Date();
        await vehicle.save();

        await auditLogger.log({
          adminId: req.user.id,
          action: "RejectVehicle",
          targetId: vehicle._id as any,
          details: `Rejected ${vehicle.year} ${vehicle.make} ${vehicle.vehicleModel}. ${vehicle.rejectionReason}`,
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
        });

        return res.json(responseFactory.success(toAdminVehicle(vehicle), "Vehicle rejected"));
      }

      if (vehicle.status === "Sold") {
        return res.status(400).json(responseFactory.error("Sold vehicles cannot be re-listed"));
      }

      const markupVal = Number(markup);
      if (Number.isNaN(markupVal) || markupVal < 0) {
        return res.status(400).json(responseFactory.error("Markup must be a number of 0 or more"));
      }
      if (!recommendedInstitutionId) {
        return res
          .status(400)
          .json(responseFactory.error("Attach one recommended loan institution"));
      }

      const inst = await Institution.findById(recommendedInstitutionId);
      if (!inst || !inst.isActive || !inst.isVerified) {
        return res
          .status(400)
          .json(responseFactory.error("Recommended institution must be active and verified"));
      }

      const down = Number(minDownPaymentPercent);
      const minDown = Number.isNaN(down) ? 10 : Math.max(10, down);
      const customerPrice = vehicle.dealerPrice + markupVal;
      const product = await ensureVehicleProduct(recommendedInstitutionId, customerPrice);

      vehicle.markup = markupVal;
      vehicle.customerPrice = customerPrice;
      vehicle.minDownPaymentPercent = minDown;
      vehicle.recommendedInstitutionId = recommendedInstitutionId;
      vehicle.financeProductId = product._id as any;
      vehicle.status = "Listed";
      vehicle.verifiedBy = req.user.id;
      vehicle.verifiedAt = new Date();
      vehicle.listedAt = new Date();
      vehicle.rejectionReason = "";
      await vehicle.save();

      await auditLogger.log({
        adminId: req.user.id,
        institutionId: recommendedInstitutionId,
        action: "ListVehicle",
        targetId: vehicle._id as any,
        details: `Listed ${vehicle.year} ${vehicle.make} ${vehicle.vehicleModel} at GH₵ ${customerPrice} (dealer GH₵ ${vehicle.dealerPrice}, markup GH₵ ${markupVal}) with ${inst.name}, min down ${minDown}%.`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      const populated = await Vehicle.findById(vehicle._id)
        .populate("recommendedInstitutionId", "name logoUrl type")
        .populate("financeProductId", "name interestRate");

      return res.json(responseFactory.success(toAdminVehicle(populated), "Vehicle listed"));
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  adminRelease: async (req: any, res: Response) => {
    try {
      const vehicle = await Vehicle.findById(req.params.id);
      if (!vehicle) {
        return res.status(404).json(responseFactory.notFound("Vehicle not found"));
      }
      if (vehicle.status !== "Reserved") {
        return res.status(400).json(responseFactory.error("Only reserved vehicles can be released"));
      }

      vehicle.status = "Listed";
      vehicle.reservedByApplicationId = undefined;
      await vehicle.save();

      await auditLogger.log({
        adminId: req.user.id,
        action: "ReleaseVehicle",
        targetId: vehicle._id as any,
        details: `Released ${vehicle.year} ${vehicle.make} ${vehicle.vehicleModel} back to listed stock.`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      return res.json(responseFactory.success(toAdminVehicle(vehicle), "Vehicle returned to listing"));
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },
};

export { vehiclePack };
