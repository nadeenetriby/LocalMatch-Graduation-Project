import { Product } from "../models/Product.js";

export const imageMap = new Map();

export async function loadImageMap() {
  console.log("Loading image cache...");

  const products = await Product.find().lean();

  let imageCount = 0;

  for (const product of products) {
    if (!product.images) continue;

    for (const img of product.images) {
      imageMap.set(img, product);
      imageCount++;
    }
  }

  console.log(`Loaded ${products.length} products`);
  console.log(`Loaded ${imageCount} images into cache`);
}