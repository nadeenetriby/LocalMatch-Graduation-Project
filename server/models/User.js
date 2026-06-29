import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    favoriteSourceIds: { type: [Number], default: [] },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
