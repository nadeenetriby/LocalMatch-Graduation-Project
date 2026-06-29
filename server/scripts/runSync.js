import dotenv from "dotenv";
import { connectDB } from "../config/db.js";
import { runFullSync } from "../services/syncRunner.js";

dotenv.config();

connectDB()
  .then(async () => {
    const result = await runFullSync("manual");
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
