import Appointment from "../models/Appointment.js";
import User from "../models/User.js";
import Patient     from "../models/Patient.js";
import { Op } from "sequelize";

// ─────────────────────────────────────────────
// CREATE APPOINTMENT
// POST /api/appointments
// ─────────────────────────────────────────────
// GET /api/appointments/doctor/:doctorId/detailed
export const getDoctorAppointmentsDetailed = async (req, res) => {
  try {
    const doctorId = parseInt(req.params.doctorId);

    if (isNaN(doctorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID",
      });
    }

    const appointments = await Appointment.findAll({
      where: { doctorId },
      order: [["date", "DESC"]],
    });

    // ── For each appointment, find the patient name ──
    // patientId could refer to either Users.id or Patients.id
    // Check both tables and return whichever matches
    // Inside getDoctorAppointmentsDetailed, replace the enriched mapping:
const enriched = await Promise.all(
  appointments.map(async (appt) => {
    const a   = appt.toJSON();
    let name  = null;

    // Try Users table first
    try {
      const userRecord = await User.findOne({
        where:      { id: a.patientId, role: "patient" },
        attributes: ["id", "firstName", "lastName",
                     "email", "phone"],
      });
      if (userRecord) {
        name          = `${userRecord.firstName} ${userRecord.lastName}`;
        a.patientName  = name;
        a.patientEmail = userRecord.email;
        a.patientPhone = userRecord.phone;
        a.patientSource = "user";

        // Also get medical info from linked Patient record
        const patRecord = await Patient.findOne({
          where:      { userId: userRecord.id },
          attributes: ["id","age","gender","bloodGroup",
                       "address","history","contact"],
        });
        if (patRecord) {
          a.patientRecordId = patRecord.id;
          a.patientAge      = patRecord.age;
          a.patientGender   = patRecord.gender;
          a.patientBlood    = patRecord.bloodGroup;
          a.patientAddress  = patRecord.address;
          a.patientContact  = patRecord.contact || userRecord.phone;
        }
      }
    } catch {}

    // If not found in Users, try Patients table
    if (!name) {
      try {
        const patientRecord = await Patient.findOne({
          where:      { id: a.patientId },
          attributes: ["id","name","email","contact",
                       "age","gender","bloodGroup","address"],
        });
        if (patientRecord) {
          name              = patientRecord.name;
          a.patientName     = name;
          a.patientEmail    = patientRecord.email;
          a.patientPhone    = patientRecord.contact;
          a.patientAge      = patientRecord.age;
          a.patientGender   = patientRecord.gender;
          a.patientBlood    = patientRecord.bloodGroup;
          a.patientAddress  = patientRecord.address;
          a.patientSource   = "patient";
          a.patientRecordId = patientRecord.id;
        }
      } catch {}
    }

    if (!name) {
      a.patientName = `Patient #${a.patientId}`;
    }

    return a;
  })
);
    res.status(200).json({
      success: true,
      count:   enriched.length,
      data:    enriched,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const createAppointment = async (req, res) => {
  try {
    const { patientId, doctorId, date, status, reason, symptoms } =
      req.body;

    // ── Validate required fields ──
    if (!patientId || !doctorId || !date) {
      return res.status(400).json({
        success: false,
        message: "patientId, doctorId, and date are required",
      });
    }

    // ── Validate date is not in the past ──
    const apptDate = new Date(date);
    const now      = new Date();
    if (apptDate <= now) {
      return res.status(400).json({
        success: false,
        message: "Appointment date must be in the future",
      });
    }

    // ── Check doctor exists ──
    const doctor = await User.findOne({
      where: { id: doctorId, role: "doctor" },
    });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // ── Check slot not already booked (same doctor, same time ±30min) ──
    const slotStart = new Date(apptDate.getTime() - 30 * 60000);
    const slotEnd   = new Date(apptDate.getTime() + 30 * 60000);

    const conflict = await Appointment.findOne({
      where: {
        doctorId,
        status:  { [Op.in]: ["pending", "confirmed"] },
        date:    { [Op.between]: [slotStart, slotEnd] },
      },
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: "This time slot is already booked. Please choose another time.",
      });
    }

    // ── Create appointment ──
    const appointment = await Appointment.create({
      patientId,
      doctorId,
      date:     apptDate,
      status:   status || "pending",
      reason:   reason || null,
      symptoms: symptoms || null,
    });

    res.status(201).json({
      success: true,
      data:    appointment,
      message: "Appointment booked successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────
// GET ALL APPOINTMENTS
// GET /api/appointments
// ─────────────────────────────────────────────
export const getAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.findAll({
      order: [["date", "DESC"]],
    });
    res.status(200).json({ success: true, data: appointments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// GET SINGLE APPOINTMENT
// GET /api/appointments/:id
// ─────────────────────────────────────────────
export const getSingleAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }
    res.status(200).json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// UPDATE APPOINTMENT
// PUT /api/appointments/:id
// ─────────────────────────────────────────────
export const updateAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // ── If rescheduling, validate new date ──
    if (req.body.date) {
      const newDate = new Date(req.body.date);
      const now     = new Date();

      if (newDate <= now) {
        return res.status(400).json({
          success: false,
          message: "Reschedule date must be in the future",
        });
      }

      // ── Check slot conflict for reschedule ──
      const slotStart = new Date(newDate.getTime() - 30 * 60000);
      const slotEnd   = new Date(newDate.getTime() + 30 * 60000);

      const conflict = await Appointment.findOne({
        where: {
          doctorId: appointment.doctorId,
          id:       { [Op.ne]: appointment.id },
          status:   { [Op.in]: ["pending", "confirmed"] },
          date:     { [Op.between]: [slotStart, slotEnd] },
        },
      });

      if (conflict) {
        return res.status(409).json({
          success: false,
          message: "This time slot is already booked. Please choose another time.",
        });
      }
    }

    // ── Cannot cancel completed appointments ──
    if (req.body.status === "cancelled" &&
        appointment.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel a completed appointment",
      });
    }

    await appointment.update(req.body);
    res.status(200).json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// DELETE APPOINTMENT
// DELETE /api/appointments/:id
// ─────────────────────────────────────────────
export const deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }
    await appointment.destroy();
    res.status(200).json({
      success: true,
      message: "Appointment deleted",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// GET BY DOCTOR
// GET /api/appointments/doctor/:doctorId
// GET APPOINTMENTS BY DOCTOR
export const getDoctorAppointments = async (req, res) => {
  try {
    const doctorId = parseInt(req.params.doctorId);  // ← FIX: string→int

    if (isNaN(doctorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID",
      });
    }

    const appointments = await Appointment.findAll({
      where: { doctorId },          // ← now integer matches DB integer
      order: [["date", "DESC"]],
    });

    res.status(200).json({
      success: true,
      count:   appointments.length,
      data:    appointments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET APPOINTMENTS BY PATIENT
export const getPatientAppointments = async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId); // ← FIX: same bug

    if (isNaN(patientId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid patient ID",
      });
    }

    const appointments = await Appointment.findAll({
      where: { patientId },
      order: [["date", "DESC"]],
    });

    res.status(200).json({
      success: true,
      count:   appointments.length,
      data:    appointments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// ─────────────────────────────────────────────
// GET DOCTOR AVAILABLE SLOTS
// GET /api/appointments/slots/:doctorId?date=YYYY-MM-DD
// ─────────────────────────────────────────────
export const getDoctorSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date }     = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "date query param is required (YYYY-MM-DD)",
      });
    }

    // ── Get booked slots for this doctor on this date ──
    // Use local date boundaries (not UTC) so Pakistani dates match
    const dayStart = new Date(`${date}T00:00:00+05:00`);
    const dayEnd   = new Date(`${date}T23:59:59+05:00`);

    const booked = await Appointment.findAll({
      where: {
        doctorId: parseInt(doctorId),
        status:   { [Op.in]: ["pending", "confirmed", "checked_in"] },
        date:     { [Op.between]: [dayStart, dayEnd] },
      },
      attributes: ["date"],
    });

    // Extract booked hours in PKT (UTC+5)
    const bookedTimes = booked.map((a) => {
      const d = new Date(a.date);
      // Convert UTC to PKT by adding 5 hours
      const pktHours   = String(
        (d.getUTCHours() + 5) % 24
      ).padStart(2, "0");
      const pktMinutes = String(d.getUTCMinutes()).padStart(2, "0");
      return `${pktHours}:${pktMinutes}`;
    });

    // ── Generate time slots 9 AM – 5 PM PKT, every 30 min ──
    const slots  = [];
    const nowUTC = new Date();

    for (let h = 9; h < 17; h++) {
      for (const m of [0, 30]) {
        const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

        // Build the slot datetime in PKT and convert to UTC for comparison
        // PKT = UTC+5, so 09:00 PKT = 04:00 UTC
        const slotUTCHour = h - 5; // subtract 5 for UTC
        const slotDate    = new Date(Date.UTC(
          ...date.split("-").map((v, i) => i === 1 ? parseInt(v) - 1 : parseInt(v)),
          slotUTCHour < 0 ? slotUTCHour + 24 : slotUTCHour,
          m
        ));

        slots.push({
          time:      timeStr,
          available: !bookedTimes.includes(timeStr) && slotDate > nowUTC,
          label:     new Date(`1970-01-01T${timeStr}:00`)
                       .toLocaleTimeString("en-PK", {
                         hour:   "2-digit",
                         minute: "2-digit",
                         hour12: true,
                       }),
        });
      }
    }

    res.status(200).json({ success: true, data: slots });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};