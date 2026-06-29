import mongoose from "mongoose";

const brandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, index: true },
    url: { type: String, default: "" },
    productCount: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    lastScrapedAt: { type: Date },
    lastScrapeStatus: {
      type: String,
      enum: ["idle", "running", "success", "failed"],
      default: "idle",
    },
    lastScrapeError: { type: String, default: "" },
    lastScrapeStats: {
      type: {
        inserted: { type: Number, default: 0 },
        updated: { type: Number, default: 0 },
        unavailable: { type: Number, default: 0 },
        pages: { type: Number, default: 0 },
        cloudinaryUploads: { type: Number, default: 0 },
      },
      default: {},
    },
  },
  { timestamps: true }
);

export const Brand = mongoose.model("Brand", brandSchema);
