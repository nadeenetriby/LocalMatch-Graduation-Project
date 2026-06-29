import mongoose from "mongoose";

const communityLeadSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    source: { type: String, default: "community_section" },
  },
  { timestamps: true }
);

communityLeadSchema.index({ email: 1, createdAt: -1 });

export const CommunityLead = mongoose.model("CommunityLead", communityLeadSchema);
