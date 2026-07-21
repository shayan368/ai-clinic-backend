import { DataTypes } from "sequelize";
import { database } from "../config/database.js";

const Prescription = database.define("Prescription", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  patientId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  doctorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  medicines: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: "Array of { name, dosage, frequency, duration }",

    // ── Safety net ──
    // Some rows may have been written as a JSON *string* instead of
    // a parsed array (e.g. from an older insert path or raw query).
    // This getter guarantees every consumer — controllers, PDF export,
    // the frontend — always receives a real array, never a string.
    get() {
      const raw = this.getDataValue("medicines");

      if (Array.isArray(raw)) return raw;

      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }

      return raw || [];
    },
  },

  instructions: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  aiExplanation: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "AI-generated patient-friendly explanation",
  },

  status: {
    type: DataTypes.ENUM("active", "completed", "cancelled"),
    defaultValue: "active",
  },
});

export default Prescription;