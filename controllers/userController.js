import User from "../models/User.js";

// GET ALL USERS (admin only)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ["password"] },
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET USERS BY ROLE
export const getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;

    const validRoles = ["admin", "doctor", "receptionist", "patient"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    const users = await User.findAll({
      where: { role },
      attributes: { exclude: ["password"] },
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};