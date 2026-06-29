import { SiteSettings } from "../models/SiteSettings.js";
import { DEFAULT_FEATURED_BRANDS } from "../utils/defaultFeatured.js";

const KEY = "main";

export async function getOrCreateFeatured() {
  let doc = await SiteSettings.findOne({ key: KEY });
  if (!doc) {
    doc = await SiteSettings.create({
      key: KEY,
      featuredBrands: DEFAULT_FEATURED_BRANDS,
    });
    return doc;
  }
  if (!doc.featuredBrands?.length) {
    doc.featuredBrands = DEFAULT_FEATURED_BRANDS;
    await doc.save();
  }
  return doc;
}
