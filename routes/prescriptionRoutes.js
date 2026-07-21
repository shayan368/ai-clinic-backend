import express from "express";
import {
  createPrescription,
  getPrescriptions,
  getSinglePrescription,
  updatePrescription,
  deletePrescription,
  getPatientPrescriptions,
  getDoctorPrescriptions,    // ← add this import
  downloadPrescriptionPDF,
} from "../controllers/prescriptionController.js";
import {
  authenticateUser,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// POST /api/prescriptions
router.post(
  "/",
  authenticateUser,
  authorizeRoles("doctor"),
  createPrescription
);

// GET /api/prescriptions — admin/doctor all
router.get(
  "/",
  authenticateUser,
  authorizeRoles("admin", "doctor"),
  getPrescriptions
);

// GET /api/prescriptions/doctor/:doctorId ← NEW — BEFORE /:id
router.get(
  "/doctor/:doctorId",
  authenticateUser,
  authorizeRoles("admin", "doctor"),
  getDoctorPrescriptions
);

// GET /api/prescriptions/patient/:patientId — BEFORE /:id
router.get(
  "/patient/:patientId",
  authenticateUser,
  getPatientPrescriptions
);

// GET /api/prescriptions/:id/download — BEFORE /:id
router.get(
  "/:id/download",
  authenticateUser,
  downloadPrescriptionPDF
);

// GET /api/prescriptions/:id
router.get("/:id", authenticateUser, getSinglePrescription);

// PUT /api/prescriptions/:id
router.put(
  "/:id",
  authenticateUser,
  authorizeRoles("doctor"),
  updatePrescription
);

// DELETE /api/prescriptions/:id
router.delete(
  "/:id",
  authenticateUser,
  authorizeRoles("admin", "doctor"),
  deletePrescription
);

export default router;