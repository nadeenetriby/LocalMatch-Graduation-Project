import mongoose from "mongoose";

const featuredBrandSchema = new mongoose.Schema(
  {
    brandName: { type: String, default: "" },
    name: { type: String, required: true },
    title: { type: String, required: true },
    category: { type: String, default: "" },
    drops: { type: String, default: "0" },
    color: { type: String, required: true },
    textColor: { type: String, default: "white" },
  },
  { _id: false }
);

const siteSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "main" },
    featuredBrands: { type: [featuredBrandSchema], default: [] },
  },
  { timestamps: true }
);

export const SiteSettings = mongoose.model("SiteSettings", siteSettingsSchema);
