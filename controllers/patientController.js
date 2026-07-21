import Patient from "../models/Patient.js";
import User    from "../models/User.js";
import { Op }  from "sequelize";

// ─────────────────────────────────────────────
// CREATE PATIENT (manual registration)
// ─────────────────────────────────────────────
export const createPatient = async (req, res) => {
  try {
    const {
      name, age, gender, contact, email,
      address, bloodGroup, history, userId,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Patient name is required",
      });
    }

    const patient = await Patient.create({
      name, age, gender, contact, email,
      address, bloodGroup, history,
      userId:    userId    || null,
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, data: patient });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// GET ALL PATIENTS (Patients table only)
// ─────────────────────────────────────────────
export const getPatients = async (req, res) => {
  try {
    const { search } = req.query;
    let whereClause  = {};

    if (search) {
      const { Op } = await import("sequelize");
      whereClause   = { name: { [Op.like]: `%${search}%` } };
    }

    const patients = await Patient.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      count:   patients.length,
      data:    patients,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// GET SINGLE PATIENT
// ─────────────────────────────────────────────
export const getSinglePatient = async (req, res) => {
  try {
    const patient = await Patient.findByPk(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    res.status(200).json({ success: true, data: patient });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// UPDATE PATIENT
// ─────────────────────────────────────────────
export const updatePatient = async (req, res) => {
  try {
    const patient = await Patient.findByPk(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    const {
      name, age, gender, contact, email,
      address, bloodGroup, history,
    } = req.body;

    await patient.update({
      name:       name       || patient.name,
      age:        age        ?? patient.age,
      gender:     gender     || patient.gender,
      contact:    contact    || patient.contact,
      email:      email      || patient.email,
      address:    address    || patient.address,
      bloodGroup: bloodGroup || patient.bloodGroup,
      history:    history    || patient.history,
    });

    res.status(200).json({ success: true, data: patient });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// DELETE PATIENT
// ─────────────────────────────────────────────
export const deletePatient = async (req, res) => {
  try {
    const patient = await Patient.findByPk(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    await patient.destroy();

    res.status(200).json({
      success: true,
      message: "Patient deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// GET ALL PATIENTS UNIFIED
// Merges Patients table + Users with role=patient
// Now that register() creates a Patient record for app users,
// most patients will appear in BOTH tables.
// We deduplicate by userId linkage first, then email.
// ─────────────────────────────────────────────
export const getAllPatientsUnified = async (req, res) => {
  try {
    // Get everything from both tables
    const [allPatientRecords, userPatients] = await Promise.all([
      Patient.findAll({ order: [["createdAt", "DESC"]] }),
      User.findAll({
        where:      { role: "patient" },
        attributes: { exclude: ["password"] },
        order:      [["createdAt", "DESC"]],
      }),
    ]);

    // Build userId → Patient record lookup
    const userIdToPatient = {};
    for (const p of allPatientRecords) {
      if (p.userId) {
        userIdToPatient[parseInt(p.userId)] = p.toJSON();
      }
    }

    // Build set of Patient record IDs already linked to a user
    const linkedPatientIds = new Set(
      Object.values(userIdToPatient).map((p) => p.id)
    );

    const merged     = [];
    const seenEmails = new Set();

    // ── Pass 1: App users ──
    for (const user of userPatients) {
      const emailKey   = user.email?.toLowerCase();
      const patRecord  = userIdToPatient[parseInt(user.id)];

      if (patRecord) {
        // App user WITH a linked Patient record
        // Use Patient record id so edit works via patientAPI.update()
        merged.push({
          ...patRecord,
          name:      `${user.firstName} ${user.lastName}`,
          email:     user.email,
          contact:   patRecord.contact || user.phone || null,
          source:    "user",           // ← editable
        });
      } else {
        // App user with NO Patient record yet (old users before fix)
        // Use a special source so frontend knows to create first
        merged.push({
          id:         null,            // ← no Patient record yet
          userId:     user.id,
          name:       `${user.firstName} ${user.lastName}`,
          email:      user.email,
          contact:    user.phone || null,
          age:        null,
          gender:     null,
          bloodGroup: null,
          address:    null,
          history:    null,
          source:     "user_no_record",
          createdAt:  user.createdAt,
        });
      }

      if (emailKey) seenEmails.add(emailKey);
    }

    // ── Pass 2: Manual patients (no userId link) ──
    for (const p of allPatientRecords) {
      if (linkedPatientIds.has(p.id)) continue; // already in list
      const emailKey = p.email?.toLowerCase();
      if (emailKey && seenEmails.has(emailKey)) continue;
      if (emailKey) seenEmails.add(emailKey);
      merged.push({ ...p.toJSON(), source: "patient" });
    }

    res.status(200).json({
      success: true,
      count:   merged.length,
      data:    merged,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// ─────────────────────────────────────────────
// UPSERT APP USER PATIENT RECORD
// POST /api/patients/upsert-user/:userId
// Creates or updates the Patient record linked to a User
// Used by receptionist to edit app-registered patients
// ─────────────────────────────────────────────
export const upsertAppUserPatient = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    // Verify the user exists and is a patient
    const user = await User.findOne({
      where: { id: userId, role: "patient" },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Patient user not found",
      });
    }

    const {
      age, gender, contact, bloodGroup,
      address, history,
    } = req.body;

    // Find existing Patient record for this user
    let patientRecord = await Patient.findOne({
      where: { userId },
    });

    if (patientRecord) {
      // Update existing
      await patientRecord.update({
        name:       `${user.firstName} ${user.lastName}`,
        email:      user.email,
        contact:    contact    ?? patientRecord.contact,
        age:        age        != null ? parseInt(age) : patientRecord.age,
        gender:     gender     ?? patientRecord.gender,
        bloodGroup: bloodGroup ?? patientRecord.bloodGroup,
        address:    address    ?? patientRecord.address,
        history:    history    ?? patientRecord.history,
      });
    } else {
      // Create new Patient record linked to this user
      patientRecord = await Patient.create({
        name:       `${user.firstName} ${user.lastName}`,
        email:      user.email,
        contact:    contact    || user.phone || null,
        age:        age        ? parseInt(age) : null,
        gender:     gender     || null,
        bloodGroup: bloodGroup || null,
        address:    address    || null,
        history:    history    || null,
        userId,
        createdBy:  req.user.id,
      });
    }

    res.status(200).json({
      success: true,
      data:    { ...patientRecord.toJSON(), source: "user" },
      message: "Patient record updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};