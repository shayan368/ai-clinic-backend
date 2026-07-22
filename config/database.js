import { Sequelize } from "sequelize";
import "dotenv/config";

const database = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: process.env.DB_DIALECT,
    logging: false,

    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  }
);

const connectDB = async (force = false) => {
  try {
    await database.authenticate();
    console.log("✅ Database connected successfully");

    await database.sync({ force });

    console.log("✅ Database synced");

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

export { database, connectDB };