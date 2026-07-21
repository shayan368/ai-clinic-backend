import express from "express";
import {
  symptomChecker,
  prescriptionExplanation,
  riskFlagging,
  predictiveAnalytics,
  getDiagnosisLogs,
  getPatientDiagnosisLogs,
  getSingleDiagnosisLog,
  getDoctorDiagnosisLogs,
} from "../controllers/aiController.js";
import {
  authenticateUser,
  authorizeRoles,
  requirePlan,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// POST /api/ai/symptom-checker
// Doctor only + pro plan required
router.post(
  "/symptom-checker",
  authenticateUser,
  authorizeRoles("doctor"),
  requirePlan("pro"),
  symptomChecker
);

// POST /api/ai/prescription-explanation
// Any authenticated user + pro plan
router.post(
  "/prescription-explanation",
  authenticateUser,
  requirePlan("pro"),
  prescriptionExplanation
);

// POST /api/ai/risk-flagging
// Doctor or Admin + pro plan
router.post(
  "/risk-flagging",
  authenticateUser,
  authorizeRoles("doctor", "admin"),
  requirePlan("pro"),
  riskFlagging
);

// POST /api/ai/predictive-analytics
// Admin only + pro plan
router.post(
  "/predictive-analytics",
  authenticateUser,
  authorizeRoles("admin"),
  requirePlan("pro"),
  predictiveAnalytics
);

// GET /api/ai/logs
router.get(
  "/logs",
  authenticateUser,
  authorizeRoles("admin", "doctor"),
  getDiagnosisLogs
);

// GET /api/ai/logs/patient/:patientId
router.get(
  "/logs/patient/:patientId",
  authenticateUser,
  getPatientDiagnosisLogs
);

router.get(
  "/logs/doctor/:doctorId",
  authenticateUser,
  authorizeRoles("admin", "doctor"),
  getDoctorDiagnosisLogs
);
// GET /api/ai/logs/:id
router.get(
  "/logs/:id",
  authenticateUser,
  authorizeRoles("admin", "doctor"),
  getSingleDiagnosisLog
);

export default router;