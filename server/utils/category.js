/** Infer product category from name for filtering (no DB field required). */

export const SEARCH_CATEGORIES = ["ALL", "TOPS", "BOTTOMS", "OUTERWEAR"];

/**
 * @param {string} name
 * @returns {'TOPS'|'BOTTOMS'|'OUTERWEAR'|'ACCESSORIES'}
 */
export function inferCategory(name) {
  const n = String(name || "").toLowerCase();

  if (
    /(jacket|coat|blazer|cardigan|poncho|bisht|outerwear|parka|windbreaker|anorak)/.test(
      n
    )
  ) {
    return "OUTERWEAR";
  }
  if (
    /(pant|jean|short|skirt|cargo|legging|trouser|bottom|boxer\s|boxers|brief)/.test(n)
  ) {
    return "BOTTOMS";
  }
  if (
    /(shirt|top|tee|blouse|tank|bodysuit|burkini|kaftan|tunic|sweater|hoodie|crop|dress|gown|bra|camisole)/.test(
      n
    )
  ) {
    return "TOPS";
  }
  return "ACCESSORIES";
}

/**
 * MongoDB filter fragment for category bucket (used with name field).
 * @param {string} category ALL|TOPS|BOTTOMS|OUTERWEAR
 */
export function categoryNameCondition(category) {
  const c = String(category || "ALL").toUpperCase();
  if (c === "ALL") return null;
  if (!["TOPS", "BOTTOMS", "OUTERWEAR"].includes(c)) return null;

  const patterns = {
    OUTERWEAR:
      /jacket|coat|blazer|cardigan|poncho|bisht|outerwear|parka|windbreaker|anorak/i,
    BOTTOMS:
      /pant|jean|short|skirt|cargo|legging|trouser|bottom|boxer|boxers|brief/i,
    TOPS:
      /shirt|top|tee|blouse|tank|bodysuit|burkini|kaftan|tunic|sweater|hoodie|crop|dress|gown|bra|camisole/i,
  };
  const regex = patterns[c];
  return regex ? { name: { $regex: regex } } : null;
}
