import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key_change_in_production";

// ─────────────────────────────────────────────
// AUTHENTICATE USER — verifies JWT token
// ─────────────────────────────────────────────
export const authenticateUser = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

// ─────────────────────────────────────────────
// AUTHORIZE ROLES — restricts by role
// Usage: authorizeRoles("admin", "doctor")
// ─────────────────────────────────────────────
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(", ")}`,
      });
    }
    next();
  };
};

// ─────────────────────────────────────────────
// SUBSCRIPTION GATE — restricts by plan
// Usage: requirePlan("pro")
// ─────────────────────────────────────────────
export const requirePlan = (plan) => {
  return (req, res, next) => {
    const planHierarchy = { free: 0, pro: 1 };
    const userPlanLevel = planHierarchy[req.user.subscriptionPlan] ?? 0;
    const requiredLevel = planHierarchy[plan] ?? 0;

    if (userPlanLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        message: `This feature requires a ${plan} subscription plan.`,
        upgradeRequired: true,
      });
    }
    next();
  };
};