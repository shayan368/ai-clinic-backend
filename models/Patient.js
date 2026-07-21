import { DataTypes } from "sequelize";
import { database } from "../config/database.js";

const Patient = database.define("Patient", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  age: {
    type: DataTypes.INTEGER,
  },

  gender: {
    type: DataTypes.ENUM("male", "female", "other"),
    allowNull: true,
  },

  contact: {
    type: DataTypes.STRING,
  },

  email: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  address: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  bloodGroup: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  history: {
    type: DataTypes.TEXT,
    comment: "Past medical history",
  },

  // Links patient record to a user account (optional)
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "If patient has a portal account",
  },

  // Who registered this patient (receptionist or admin)
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "User ID of the staff who registered this patient",
  },
});

export default Patient;