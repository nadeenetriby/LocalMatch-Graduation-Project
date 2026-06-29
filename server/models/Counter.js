import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, required: true, default: 0 },
});

export const Counter = mongoose.model("Counter", counterSchema);

export async function getNextSourceId() {
  const doc = await Counter.findByIdAndUpdate(
    "productSourceId",
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
}

export async function initSourceIdCounter(startAt) {
  const existing = await Counter.findById("productSourceId");
  if (!existing) {
    await Counter.create({ _id: "productSourceId", seq: startAt });
  } else if (existing.seq < startAt) {
    existing.seq = startAt;
    await existing.save();
  }
}
