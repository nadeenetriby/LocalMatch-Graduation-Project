/** Deterministic color per brand name (matches server logic). */

export function brandCardStyle(name) {
  const s = String(name || "brand");
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const hue = Math.abs(h) % 360;
  const sat = 52 + (Math.abs(h >> 8) % 25);
  const light = 36 + (Math.abs(h >> 16) % 12);
  return { backgroundColor: `hsl(${hue} ${sat}% ${light}%)`, color: "#fff" };
}
