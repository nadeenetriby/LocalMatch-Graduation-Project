/**
 * Normalize Shopify/product image URLs for tolerant AI result mapping.
 * Mirrors scraper + cleaner normalization so FAISS URLs match stored variants.
 */

export function normalizeImageUrl(url) {
  if (!url) return "";

  let value = String(url).trim();
  if (!value) return "";

  if (value.startsWith("//")) {
    value = `https:${value}`;
  } else if (value.startsWith("http://")) {
    value = `https://${value.slice(7)}`;
  }

  value = value.split("?")[0].split("#")[0];

  // Scraper: re.sub(r"_[0-9]+x[0-9]+(?=\.)", "", img)
  value = value.replace(/_\d+x\d+(?=\.[^./?#]+$)/gi, "");
  // Cleaner: _small, _thumb, _medium, _large, _grande and _WxH variants
  value = value.replace(/_(\d+x\d+|small|thumb|medium|large|grande)(?=\.[^./?#]+$)/gi, "");

  return value;
}

function productImageUrls(product) {
  return [...(product.images || []), ...(product.sourceImageUrls || [])];
}

function indexNormalizedKeys(urls) {
  const orderByKey = new Map();
  urls.forEach((url, index) => {
    const normalized = normalizeImageUrl(url);
    if (normalized && !orderByKey.has(normalized)) {
      orderByKey.set(normalized, index);
    }
    const exact = String(url || "").trim();
    if (exact && !orderByKey.has(exact)) {
      orderByKey.set(exact, index);
    }
  });
  return orderByKey;
}

/** Previous strict behavior: exact string match only. */
export function mapUrlsToProductsExact(urls, products) {
  const urlSet = new Set(urls.map((u) => String(u || "").trim()).filter(Boolean));
  return products.filter((product) =>
    productImageUrls(product).some((img) => urlSet.has(String(img).trim()))
  );
}

/**
 * Map FAISS image URLs to products using normalized URL equality.
 * Preserves FAISS order and returns one mapped product per AI URL.
 */
export function mapUrlsToProducts(urls, products) {
  if (!urls?.length) return [];

  const orderByKey = indexNormalizedKeys(urls);
  const wantedKeys = new Set(orderByKey.keys());
  const matchedByOrder = new Map();

  for (const product of products) {
    for (const img of productImageUrls(product)) {
      const candidates = [normalizeImageUrl(img), String(img || "").trim()].filter(Boolean);
      for (const key of candidates) {
        if (!wantedKeys.has(key)) continue;
        const order = orderByKey.get(key);
        if (order === undefined || matchedByOrder.has(order)) continue;
        matchedByOrder.set(order, product);
        break;
      }
    }
  }

  const result = [];

  for (let i = 0; i < urls.length; i += 1) {
    const product = matchedByOrder.get(i);
    if (!product) continue;
    result.push({
      ...product,
      matchedImageUrl: urls[i],
      aiResultIndex: i,
    });
  }

  return result;
}

/**
 * Build a MongoDB filter to fetch candidate products for the given URLs.
 * Uses filename stems to avoid scanning the entire catalog in memory.
 */
export function buildCandidateFilter(urls) {
  const stems = new Set();
  const normalizedPrefixes = new Set();

  for (const url of urls || []) {
    const normalized = normalizeImageUrl(url);
    if (!normalized) continue;
    normalizedPrefixes.add(normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const filename = normalized.split("/").pop();
    if (filename && filename.length >= 8) {
      stems.add(filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    }
  }

  if (stems.size === 0 && normalizedPrefixes.size === 0) {
    return { images: { $exists: true, $ne: [] } };
  }

  const stemList = [...stems].slice(0, 40);
  const prefixList = [...normalizedPrefixes].slice(0, 40);
  return {
    $or: [
      { images: { $in: urls.filter(Boolean) } },
      { sourceImageUrls: { $in: urls.filter(Boolean) } },
      ...stemList.map((stem) => ({ images: { $regex: stem, $options: "i" } })),
      ...stemList.map((stem) => ({ sourceImageUrls: { $regex: stem, $options: "i" } })),
      ...prefixList.map((prefix) => ({
        images: { $regex: `^${prefix}([?#].*)?$`, $options: "i" },
      })),
      ...prefixList.map((prefix) => ({
        sourceImageUrls: { $regex: `^${prefix}([?#].*)?$`, $options: "i" },
      })),
    ],
  };
}
