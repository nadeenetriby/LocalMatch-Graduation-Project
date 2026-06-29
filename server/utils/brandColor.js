/** Deterministic “random” color per brand name for UI cards. */

/**
 * @param {string} name
 * @returns {{ backgroundColor: string, color: string }}
 */
export function brandCardStyle(name) {
  const s = String(name || "brand");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const hue = Math.abs(h) % 360;
  const sat = 52 + (Math.abs(h >> 8) % 25);
  const light = 36 + (Math.abs(h >> 16) % 12);
  const bg = `hsl(${hue} ${sat}% ${light}%)`;
  return { backgroundColor: bg, color: "#fff" };
}
