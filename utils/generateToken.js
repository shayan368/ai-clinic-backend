import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key_change_in_production";

export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      subscriptionPlan: user.subscriptionPlan || "free",
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
};