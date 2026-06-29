/** Infer product category from name for client-side filtering. */

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
