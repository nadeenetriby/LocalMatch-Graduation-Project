import mongoose from "mongoose";

const syncLogSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["scheduled", "admin", "manual"], default: "manual" },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date },
    brandsTotal: { type: Number, default: 0 },
    brandsFailed: { type: Number, default: 0 },
    stats: {
      inserted: { type: Number, default: 0 },
      updated: { type: Number, default: 0 },
      unavailable: { type: Number, default: 0 },
      cloudinaryUploads: { type: Number, default: 0 },
      pages: { type: Number, default: 0 },
    },
    brandErrors: [{ brand: String, message: String }],
    status: { type: String, enum: ["running", "success", "partial", "failed"], default: "running" },
  },
  { timestamps: true }
);

export const SyncLog = mongoose.model("SyncLog", syncLogSchema);
