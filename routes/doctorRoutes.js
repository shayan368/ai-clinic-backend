import express from "express";
import {
  getDoctors,
  getSingleDoctor,
  getDoctorStats,
  getAdminAnalytics,
} from "../controllers/doctorController.js";
import {
  authenticateUser,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/doctors/admin/analytics — BEFORE /:id
router.get(
  "/admin/analytics",
  authenticateUser,
  authorizeRoles("admin"),
  getAdminAnalytics
);

// GET /api/doctors — ALL authenticated users can see doctors
// Patients need this to book appointments
router.get(
  "/",
  authenticateUser,
  getDoctors          // ← removed authorizeRoles restriction
);

// GET /api/doctors/:id — any authenticated user
router.get("/:id", authenticateUser, getSingleDoctor);

// GET /api/doctors/:id/stats — admin or the doctor themselves
router.get(
  "/:id/stats",
  authenticateUser,
  authorizeRoles("admin", "doctor"),
  getDoctorStats
);

export default router;