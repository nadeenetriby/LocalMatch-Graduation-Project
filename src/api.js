import { loadGuestFavoriteIds } from "./utils/favoritesStorage";

const API_BASE = "/api";

const TOKEN_KEY = "lokalmatch_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) {
    const message =
      (data && typeof data === "object" && data.message) || `Request failed: ${response.status}`;
    throw new Error(message);
  }
  return data;
}

export function getBrands(page = 1, limit = 12) {
  return apiFetch(`/brands?page=${page}&limit=${limit}`);
}

export function getBrandProducts(brandName, page = 1, limit = 40, filters = {}) {
  const { category = "ALL", priceMin, priceMax } = filters;
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    category,
  });
  if (priceMin != null && priceMin !== "") params.set("priceMin", String(priceMin));
  if (priceMax != null && priceMax !== "") params.set("priceMax", String(priceMax));
  return apiFetch(
    `/brands/${encodeURIComponent(brandName)}/products?${params.toString()}`
  );
}

export function getProducts(page = 1, limit = 40) {
  return apiFetch(`/products?page=${page}&limit=${limit}`);
}

export function searchProducts(query, options = {}) {
  const {
    limit = 40,
    page = 1,
    category = "ALL",
    priceMin,
    priceMax,
  } = options;
  const params = new URLSearchParams({
    q: query || "",
    limit: String(limit),
    page: String(page),
    category,
  });
  if (priceMin != null && priceMin !== "") params.set("priceMin", String(priceMin));
  if (priceMax != null && priceMax !== "") params.set("priceMax", String(priceMax));
  return apiFetch(`/products/search?${params.toString()}`);
}

export async function searchAllProducts(query, options = {}) {
  const limit = 100;
  let page = 1;
  let totalPages = 1;
  const items = [];

  do {
    const data = await searchProducts(query, { ...options, limit, page });
    items.push(...(data.items || []));
    totalPages = data.pagination?.totalPages || 1;
    page += 1;
  } while (page <= totalPages);

  return items;
}

export function getProductById(sourceId) {
  return apiFetch(`/products/${sourceId}`);
}

export function getProductsBatch(ids) {
  const list = [...new Set(ids.map(Number).filter(Boolean))].slice(0, 100);
  if (list.length === 0) return Promise.resolve([]);
  return apiFetch(`/products/batch?ids=${list.join(",")}`);
}

export function subscribeCommunity(email) {
  return apiFetch("/community/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export function registerUser(body) {
  return apiFetch("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function loginUser(body) {
  return apiFetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function fetchMe() {
  return apiFetch("/auth/me");
}

export function mergeFavorites(ids) {
  const local = ids?.length ? ids : loadGuestFavoriteIds();
  if (!local.length) return Promise.resolve({ favoriteSourceIds: [] });
  return apiFetch("/auth/merge-favorites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: local }),
  });
}

export function toggleFavorite(sourceId) {
  return apiFetch("/me/favorites/toggle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceId }),
  });
}

export function getMyFavoritesProducts() {
  return apiFetch("/me/favorites");
}

export function getAdminOverview() {
  return apiFetch("/admin/overview");
}

export function getAdminCommunity(page = 1, limit = 100) {
  return apiFetch(`/admin/community?page=${page}&limit=${limit}`);
}

/** Public — no auth (homepage) */
export async function getFeaturedBrandsPublic() {
  const response = await fetch(`${API_BASE}/settings/featured-brands`);
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return data;
}

export function scrapeAdminBrand(id) {
  return apiFetch(`/admin/brands/${id}/scrape`, { method: "POST" });
}

export function getAdminSyncStatus() {
  return apiFetch("/admin/sync/status");
}

export function runAdminFullSync() {
  return apiFetch("/admin/sync/run", { method: "POST" });
}

export function getAdminBrands() {
  return apiFetch("/admin/brands");
}

export function createAdminBrand(body) {
  return apiFetch("/admin/brands", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function updateAdminBrand(id, body) {
  return apiFetch(`/admin/brands/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function deleteAdminBrand(id) {
  return apiFetch(`/admin/brands/${id}`, { method: "DELETE" });
}

export function getAdminFeaturedBrands() {
  return apiFetch("/admin/featured-brands");
}

export function saveAdminFeaturedBrands(featuredBrands) {
  return apiFetch("/admin/featured-brands", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ featuredBrands }),
  });
}

  // AI-related API calls
  
export const aiSearch = (query) =>
  apiFetch("/ai/search-text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

export const aiSearchImage = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("http://localhost:8000/search-image", {
    method: "POST",
    body: formData,
  });

  return res.json();
};


export const aiTryOn = async (personFile, clothFile) => {
  const formData = new FormData();
  formData.append("person", personFile);
  formData.append("cloth", clothFile);

  return fetch("/api/ai/try-on", {
    method: "POST",
    body: formData,
  }).then(res => res.json());
}
