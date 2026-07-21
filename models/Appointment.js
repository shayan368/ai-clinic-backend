import { DataTypes } from "sequelize";
import { database }  from "../config/database.js";

const Appointment = database.define("Appointment", {
  id: {
    type:          DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey:    true,
  },
  patientId: {
    type: DataTypes.INTEGER,
  },
  doctorId: {
    type: DataTypes.INTEGER,
  },
  date: {
    type: DataTypes.DATE,
  },
  status: {
    type: DataTypes.ENUM(
      "pending",
      "confirmed",
      "checked_in", 
      "completed",
      "cancelled"
    ),
    defaultValue: "pending",
  },
  reason: {
    type:      DataTypes.STRING,
    allowNull: true,
  },
  symptoms: {
    type:      DataTypes.TEXT,
    allowNull: true,
  },
});

export default Appointment;