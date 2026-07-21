import express from "express";
import {
  getAllUsers,
  getUsersByRole,
} from "../controllers/userController.js";
import {
  authenticateUser,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/users — all users (admin only)
router.get(
  "/",
  authenticateUser,
  authorizeRoles("admin"),
  getAllUsers
);

// GET /api/users/role/:role — users by role (admin only)
router.get(
  "/role/:role",
  authenticateUser,
  authorizeRoles("admin"),
  getUsersByRole
);

export default router;