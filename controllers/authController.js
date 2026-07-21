import bcrypt    from "bcryptjs";
import User      from "../models/User.js";
import Patient   from "../models/Patient.js";
import { generateToken } from "../utils/generateToken.js";

// ─────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────
export const register = async (req, res) => {
  try {
    const {
      firstName, lastName, email, password,
      role, specialization, phone,
      // ── Patient medical fields ──
      age, gender, contact, bloodGroup, address,
    } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "firstName, lastName, email and password are required",
      });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      firstName,
      lastName,
      email,
      password:         hashedPassword,
      role:             role || "patient",
      specialization:   specialization || null,
      phone:            phone || null,
      subscriptionPlan: "free",
    });

    // ── If patient, also create a Patient record ──
    // This links the app user to the Patients table
    // so doctors and receptionists can see full medical info
    if (role === "patient" || !role) {
      await Patient.create({
        name:       `${firstName} ${lastName}`,
        email:      email,
        contact:    contact || phone || null,
        age:        age     ? parseInt(age)  : null,
        gender:     gender  || null,
        bloodGroup: bloodGroup || null,
        address:    address || null,
        userId:     user.id,    // ← link to Users table
        createdBy:  null,       // self-registered
      });
    }

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      token,
      data: {
        id:               user.id,
        firstName:        user.firstName,
        lastName:         user.lastName,
        email:            user.email,
        role:             user.role,
        subscriptionPlan: user.subscriptionPlan,
        specialization:   user.specialization,
        phone:            user.phone,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Contact admin.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      token,
      data: {
        id:               user.id,
        firstName:        user.firstName,
        lastName:         user.lastName,
        email:            user.email,
        role:             user.role,
        subscriptionPlan: user.subscriptionPlan,
        specialization:   user.specialization,
        phone:            user.phone,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────
// GET CURRENT USER
// ─────────────────────────────────────────────
export const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data:    user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────
// UPDATE PROFILE
// ─────────────────────────────────────────────
export const updateProfile = async (req, res) => {
  try {
    const {
      firstName, lastName, phone, specialization,
      // Patient medical fields
      age, gender, contact, bloodGroup, address,
    } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await user.update({
      firstName:      firstName      || user.firstName,
      lastName:       lastName       || user.lastName,
      phone:          phone          ?? user.phone,
      specialization: specialization ?? user.specialization,
    });

    // ── If patient, also update the Patient record ──
    if (user.role === "patient") {
      const patientRecord = await Patient.findOne({
        where: { userId: user.id },
      });

      if (patientRecord) {
        await patientRecord.update({
          name:       `${user.firstName} ${user.lastName}`,
          email:      user.email,
          contact:    contact    ?? patientRecord.contact,
          age:        age        ? parseInt(age) : patientRecord.age,
          gender:     gender     ?? patientRecord.gender,
          bloodGroup: bloodGroup ?? patientRecord.bloodGroup,
          address:    address    ?? patientRecord.address,
        });
      } else {
        // Create if somehow missing
        await Patient.create({
          name:       `${user.firstName} ${user.lastName}`,
          email:      user.email,
          contact:    contact    || user.phone || null,
          age:        age        ? parseInt(age) : null,
          gender:     gender     || null,
          bloodGroup: bloodGroup || null,
          address:    address    || null,
          userId:     user.id,
          createdBy:  null,
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        id:               user.id,
        firstName:        user.firstName,
        lastName:         user.lastName,
        email:            user.email,
        role:             user.role,
        subscriptionPlan: user.subscriptionPlan,
        specialization:   user.specialization,
        phone:            user.phone,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────
// CHANGE PASSWORD
// ─────────────────────────────────────────────
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "currentPassword and newPassword are required",
      });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedPassword });

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────
// UPGRADE PLAN
// ─────────────────────────────────────────────
export const upgradePlan = async (req, res) => {
  try {
    const { plan } = req.body;

    if (!["free", "pro"].includes(plan)) {
      return res.status(400).json({
        success: false,
        message: "Plan must be 'free' or 'pro'",
      });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await user.update({ subscriptionPlan: plan });

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: `Subscription upgraded to ${plan} plan`,
      token,
      data: {
        id:               user.id,
        firstName:        user.firstName,
        lastName:         user.lastName,
        email:            user.email,
        role:             user.role,
        subscriptionPlan: user.subscriptionPlan,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};