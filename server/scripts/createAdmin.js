import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";

dotenv.config();

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

async function main() {
  if (!email || !password) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD in server/.env");
    process.exit(1);
  }
  await connectDB();
  const passwordHash = await bcrypt.hash(String(password), 10);
  const normalized = String(email).toLowerCase().trim();
  await User.findOneAndUpdate(
    { email: normalized },
    {
      $set: {
        email: normalized,
        passwordHash,
        role: "admin",
        firstName: "Admin",
        lastName: "",
      },
    },
    { upsert: true }
  );
  console.log("Admin user ready:", normalized);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
