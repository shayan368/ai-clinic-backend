import { Sequelize } from "sequelize";
import "dotenv/config";

const database = new Sequelize(
  process.env.DB_NAME || "clinic_management",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "localhost",
    dialect: process.env.DB_DIALECT || "mysql",
    logging: false,
  }
);

const connectDB = async (force = false) => {
  try {
    await database.authenticate();
    console.log("✅ Database connected successfully");

    await database.sync({ force });

    if (force) {
      console.log("⚠️  Database synced with force: true — All tables recreated");
    } else {
      console.log("✅ Database synced — Tables preserved");
    }

    return true;
  } catch (error) {
    console.error("❌ Unable to connect to database:", error);
    return false;
  }
};

export { database, connectDB };