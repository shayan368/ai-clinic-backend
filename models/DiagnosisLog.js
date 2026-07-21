// backend/models/DiagnosisLog.js
import { DataTypes } from "sequelize";
import { database }  from "../config/database.js";

const DiagnosisLog = database.define("DiagnosisLog", {
  id: {
    type:          DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey:    true,
  },
  patientId: {
    type: DataTypes.INTEGER,
  },
  doctorId: {                    // ← MUST exist
    type: DataTypes.INTEGER,
  },
  symptoms: {
    type: DataTypes.TEXT,
  },
  aiResponse: {
    type: DataTypes.TEXT,
  },
  riskLevel: {
    type:         DataTypes.ENUM("low", "medium", "high"),
    defaultValue: "low",
  },
});

export default DiagnosisLog;