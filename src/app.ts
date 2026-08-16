import dotenv from "dotenv";

dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import institutionRoutes from "./routes/institution.routes";
import productRoutes from "./routes/product.routes";
import applicationRoutes from "./routes/application.routes";
import transactionRoutes from "./routes/transaction.routes";
import documentRoutes from "./routes/document.routes";
import newsRoutes from "./routes/news.routes";
import auditRoutes from "./routes/audit.routes";
import billingRoutes from "./routes/billing.routes";
import paymentRoutes from "./routes/payment.routes";
import notificationRoutes from "./routes/notification.routes";
import regionRoutes from "./routes/region.routes";
import analyticsRoutes from "./routes/analytics.routes";
import chatRoutes from "./routes/chat.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import vehicleRoutes from "./routes/vehicle.routes";
import { paymentController } from "./controllers/payment.controller";
import { payloadEncryptionMiddleware } from "./middlewares/payloadEncryption.middleware";
import { responseFactory } from "./utils/responseFactory";

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
app.use(morgan("dev"));

// Paystack webhook MUST receive raw body for signature verification
app.post(
  "/api/v1/Payments/webhook",
  express.raw({ type: "application/json" }),
  paymentController.handleWebhook,
);

app.use(express.json({ limit: "2mb" }));
app.use(payloadEncryptionMiddleware);

// Routes
app.use("/api/v1/Auth", authRoutes);
app.use("/api/v1/Users", userRoutes);
app.use("/api/v1/Institutions", institutionRoutes);
app.use("/api/v1/Products", productRoutes);
app.use("/api/v1/Applications", applicationRoutes);
app.use("/api/v1/Transactions", transactionRoutes);
app.use("/api/v1/Documents", documentRoutes);
app.use("/api/v1/News", newsRoutes);
app.use("/api/v1/Audit", auditRoutes);
app.use("/api/v1/Billing", billingRoutes);
app.use("/api/v1/Analytics", analyticsRoutes);
app.use("/api/v1/Notifications", notificationRoutes);
app.use("/api/v1/Payments", paymentRoutes);
app.use("/api/v1/Regions", regionRoutes);
app.use("/api/v1/Chat", chatRoutes);
app.use("/api/v1/Subscriptions", subscriptionRoutes);
app.use("/api/v1/Vehicles", vehicleRoutes);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "ResolveBridge Node Backend",
    timestamp: new Date().toISOString(),
  });
});

app.use((_req, res) => {
  res.status(404).json(responseFactory.notFound("Route not found"));
});

app.use((err: any, req: any, res: any, next: any) => {
  console.error("[UnhandledException] Detailed System Error:", err);

  if (err.code === "LIMIT_FILE_SIZE") {
    const maxFileSizeMb = Number(process.env.MAX_FILE_SIZE_MB) || 10;
    return res.status(400).json({
      success: false,
      message: `File upload failed: File exceeds the maximum allowed size limit (${maxFileSizeMb}MB).`,
      statusCode: 400,
    });
  }

  if (err.message?.includes("not allowed")) {
    return res.status(400).json({
      success: false,
      message: err.message,
      statusCode: 400,
    });
  }

  res.status(500).json({
    success: false,
    message:
      "An unexpected internal server error occurred. Please contact system support.",
    statusCode: 500,
  });
});

export default app;
