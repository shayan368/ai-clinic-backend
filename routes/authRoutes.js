import express from "express";
import {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  upgradePlan,
} from "../controllers/authController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public
router.post("/register", register);
router.post("/login", login);

// Protected
router.get("/me", authenticateUser, getMe);
router.put("/update-profile", authenticateUser, updateProfile);
router.put("/change-password", authenticateUser, changePassword);
router.put("/upgrade-plan", authenticateUser, upgradePlan);

export default router;