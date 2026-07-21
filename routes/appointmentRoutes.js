import express from "express";
import {
  createAppointment,
  getAppointments,
  getSingleAppointment,
  updateAppointment,
  deleteAppointment,
  getDoctorAppointments,
    getDoctorAppointmentsDetailed,
  getPatientAppointments,
  getDoctorSlots,
} from "../controllers/appointmentController.js";
import {
  authenticateUser,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// POST /api/appointments
router.post(
  "/",
  authenticateUser,
  authorizeRoles("admin", "receptionist", "patient"),
  createAppointment
);

// GET /api/appointments — admin/doctor/receptionist only
router.get(
  "/",
  authenticateUser,
  authorizeRoles("admin", "doctor", "receptionist"),
  getAppointments
);

// GET /api/appointments/slots/:doctorId
// Patients need this to see available time slots
router.get(
  "/slots/:doctorId",
  authenticateUser,
  getDoctorSlots        // ← no role restriction, any auth user
);

router.get(
  "/doctor/:doctorId/detailed",
  authenticateUser,
  authorizeRoles("admin", "doctor"),
  getDoctorAppointmentsDetailed
);

  
// GET /api/appointments/doctor/:doctorId — BEFORE /:id
router.get(
  "/doctor/:doctorId",
  authenticateUser,
  authorizeRoles("admin", "doctor"),
  getDoctorAppointments
);

// GET /api/appointments/patient/:patientId
router.get(
  "/patient/:patientId",
  authenticateUser,
  getPatientAppointments
);

// GET /api/appointments/:id
router.get("/:id", authenticateUser, getSingleAppointment);

// PUT /api/appointments/:id
// Patients can update (for cancel/reschedule)
router.put(
  "/:id",
  authenticateUser,
  authorizeRoles("admin", "doctor", "receptionist", "patient"),
  updateAppointment
);

// DELETE /api/appointments/:id — admin only
router.delete(
  "/:id",
  authenticateUser,
  authorizeRoles("admin"),
  deleteAppointment
);

export default router;