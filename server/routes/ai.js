import express from "express";
import axios from "axios";
import multer from "multer";

const router = express.Router();
const upload = multer();

const AI_BASE = "http://127.0.0.1:8000";

// TEXT SEARCH
router.post("/search-text", async (req, res) => {
  try {
    console.log("Incoming query:", req.body); // 👈 debug

    const response = await axios.post(
      `${AI_BASE}/search-text`,
      {
        query: req.body.query,
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error("❌ FULL ERROR:");
    console.error("Message:", err.message);
    console.error("Response:", err.response?.data);
    console.error("Status:", err.response?.status);

    res.status(500).json({
      message: "AI text search failed",
      error: err.response?.data || err.message,
    });
  }
});

// IMAGE SEARCH
router.post("/search-image", upload.single("file"), async (req, res) => {
  try {
    const formData = new FormData();
    formData.append("file", req.file.buffer, req.file.originalname);

    const response = await axios.post(`${AI_BASE}/search-image`, formData, {
      headers: formData.getHeaders(),
    });

    res.json(response.data);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "AI image search failed" });
  }
});

export default router;