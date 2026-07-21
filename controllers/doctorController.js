import User from "../models/User.js";
import Appointment from "../models/Appointment.js";
import Prescription from "../models/Prescription.js";
import DiagnosisLog from "../models/DiagnosisLog.js";

// GET ALL DOCTORS
export const getDoctors = async (req, res) => {
  try {
    const doctors = await User.findAll({
      where: { role: "doctor" },
      attributes: { exclude: ["password"] },
    });

    res.status(200).json({
      success: true,
      data: doctors,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET SINGLE DOCTOR
export const getSingleDoctor = async (req, res) => {
  try {
    const doctor = await User.findOne({
      where: { id: req.params.id, role: "doctor" },
      attributes: { exclude: ["password"] },
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    res.status(200).json({
      success: true,
      data: doctor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET DOCTOR STATS (for doctor dashboard)
// GET DOCTOR STATS
export const getDoctorStats = async (req, res) => {
  try {
    const doctorId = parseInt(req.params.id); // ← FIX: string→int

    if (isNaN(doctorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID",
      });
    }

    const totalAppointments = await Appointment.count({
      where: { doctorId },
    });

    const pendingAppointments = await Appointment.count({
      where: { doctorId, status: "pending" },
    });

    const completedAppointments = await Appointment.count({
      where: { doctorId, status: "completed" },
    });

    const totalPrescriptions = await Prescription.count({
      where: { doctorId },
    });

    // ← FIX: added totalDiagnoses — was missing entirely
    const totalDiagnoses = await DiagnosisLog.count({
      where: { doctorId },
    });

    res.status(200).json({
      success: true,
      data: {
        totalAppointments,
        pendingAppointments,
        completedAppointments,
        totalPrescriptions,
        totalDiagnoses,         // ← now included
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET ADMIN ANALYTICS
export const getAdminAnalytics = async (req, res) => {
  try {
    const totalDoctors = await User.count({ where: { role: "doctor" } });
    const totalPatients = await User.count({ where: { role: "patient" } });
    const totalAppointments = await Appointment.count();
    const totalPrescriptions = await Prescription.count();

    const pendingAppointments = await Appointment.count({
      where: { status: "pending" },
    });

    const completedAppointments = await Appointment.count({
      where: { status: "completed" },
    });

    res.status(200).json({
      success: true,
      data: {
        totalDoctors,
        totalPatients,
        totalAppointments,
        totalPrescriptions,
        pendingAppointments,
        completedAppointments,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};