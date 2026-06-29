import { loadImageMap } from "./cache/imageCache.js";

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./config/db.js";
import brandsRouter from "./routes/brands.js";
import productsRouter from "./routes/products.js";
import authRouter from "./routes/auth.js";
import communityRouter from "./routes/community.js";
import favoritesRouter from "./routes/favorites.js";
import adminRouter from "./routes/admin.js";
import settingsRouter from "./routes/settings.js";
import aiRouter from "./routes/ai.js";
import { initSourceIdCounter } from "./models/Counter.js";
import { Product } from "./models/Product.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const port = Number(process.env.PORT) || 5000;

if (!process.env.JWT_SECRET) {
  console.warn(
    "Warning: JWT_SECRET is not set. Login will return an error until you add it to server/.env"
  );
}

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/ai", aiRouter);
app.use("/api/products", productsRouter);
app.use("/api/auth", authRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/community", communityRouter);
app.use("/api/me/favorites", favoritesRouter);
app.use("/api/admin", adminRouter);
app.use("/api/brands", brandsRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  const status = Number(err.statusCode) || 500;
  const expose = status !== 500 || process.env.NODE_ENV === "development";
  const message = expose && err.message ? err.message : "Internal server error";
  res.status(status).json({ message });
});

connectDB()
  .then(async () => {

    const maxDoc = await Product.findOne()
      .sort({ sourceId: -1 })
      .lean();

    await initSourceIdCounter(maxDoc?.sourceId || 0);

    // Load all products into memory
    await loadImageMap();

    app.listen(port, () => {
      console.log(`API running on http://localhost:${port}`);
    });

  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB", error);
    process.exit(1);
  });
