import express from "express";
import {
  createPatient,
  getPatients,
  getSinglePatient,
  updatePatient,
  deletePatient,
  getAllPatientsUnified,
  upsertAppUserPatient,   // ← add
} from "../controllers/patientController.js";
import {
  authenticateUser,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/patients/unified
router.get(
  "/unified",
  authenticateUser,
  authorizeRoles("admin", "doctor", "receptionist"),
  getAllPatientsUnified
);

// POST /api/patients/upsert-user/:userId  ← NEW
// Creates or updates Patient record for an app user
router.post(
  "/upsert-user/:userId",
  authenticateUser,
  authorizeRoles("admin", "receptionist"),
  upsertAppUserPatient
);

// POST /api/patients
router.post(
  "/",
  authenticateUser,
  authorizeRoles("admin", "receptionist"),
  createPatient
);

// GET /api/patients
router.get(
  "/",
  authenticateUser,
  authorizeRoles("admin", "doctor", "receptionist"),
  getPatients
);

// GET /api/patients/:id
router.get("/:id", authenticateUser, getSinglePatient);

// PUT /api/patients/:id
router.put(
  "/:id",
  authenticateUser,
  authorizeRoles("admin", "receptionist"),
  updatePatient
);

// DELETE /api/patients/:id
router.delete(
  "/:id",
  authenticateUser,
  authorizeRoles("admin"),
  deletePatient
);

export default router;