const GUEST_KEY = "lokalmatch_fav_ids_guest";

function normalizeIds(ids) {
  return [...new Set(ids.map(Number).filter(Boolean))];
}

export function loadGuestFavoriteIds() {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? normalizeIds(arr) : [];
  } catch {
    return [];
  }
}

export function saveGuestFavoriteIds(ids) {
  localStorage.setItem(GUEST_KEY, JSON.stringify(normalizeIds(ids)));
}

export function clearGuestFavoriteIds() {
  localStorage.removeItem(GUEST_KEY);
  localStorage.removeItem("lokalmatch_fav_ids");
}

/** @deprecated Use loadGuestFavoriteIds — kept for any stale shared key cleanup */
export function loadLocalFavoriteIds() {
  return loadGuestFavoriteIds();
}
