import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    sourceId: { type: Number, required: true, unique: true, index: true },
    brand: { type: String, required: true, index: true },
    name: { type: String, required: true, index: true },
    price: { type: Number, required: true },
    currency: { type: String, default: "EGP" },
    productUrl: { type: String, required: true },
    images: { type: [String], default: [] },
    sourceImageUrls: { type: [String], default: [] },
    isAvailable: { type: Boolean, default: true },
    lastSyncedAt: { type: Date },
  },
  { timestamps: true }
);

productSchema.index({ brand: 1, name: 1 });
productSchema.index({ productUrl: 1 }, { unique: true });
productSchema.index({ brand: 1, isAvailable: 1 });

export const Product = mongoose.model("Product", productSchema);
