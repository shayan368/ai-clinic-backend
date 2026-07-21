import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

import { connectDB } from "./config/database.js";

import authRoutes from "./routes/authRoutes.js";
import patientRoutes from "./routes/patientRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import prescriptionRoutes from "./routes/prescriptionRoutes.js";
import doctorRoutes from "./routes/doctorRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import userRoutes from "./routes/userRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// ─────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────
app.use(cors({
  origin: "*", // change to your frontend URL in production
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/users", userRoutes);

// ─────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "AI Clinic API is running",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
  });
});

// ─────────────────────────────────────────────
// 404 HANDLER
// ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ─────────────────────────────────────────────
// GLOBAL ERROR HANDLER
// ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err.stack);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// ─────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────
async function initializeApp() {
const dbConnected = await connectDB();
  if (!dbConnected) {
    console.error("❌ Database connection failed. Exiting.");
    process.exit(1);
  }

  app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  });
}

initializeApp();