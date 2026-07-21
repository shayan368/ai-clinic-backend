import { DataTypes } from "sequelize";
import { database } from "../config/database.js";

const User = database.define("User", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },

  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  role: {
    type: DataTypes.ENUM("admin", "doctor", "receptionist", "patient"),
    defaultValue: "patient",
  },

  // SaaS subscription layer
  subscriptionPlan: {
    type: DataTypes.ENUM("free", "pro"),
    defaultValue: "free",
  },

  specialization: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "For doctors only",
  },

  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

export default User;