import type { Manager } from "@/lib/types";

/** Two-letter monograms; single names take two letters, or first + first differing letter when that collides (Michael / Mitchell). */
export function monograms(managers: Manager[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of managers) {
    const parts = m.name.replace(/\./g, "").split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      out.set(m.id, (parts[0][0] + parts[1][0]).toUpperCase());
      continue;
    }
    const n = m.name.toLowerCase();
    const others = managers.filter((o) => o.id !== m.id && o.name.toLowerCase().slice(0, 2) === n.slice(0, 2)).map((o) => o.name.toLowerCase());
    let i = 1;
    while (i < n.length && others.some((o) => o[i] === n[i])) i++;
    out.set(m.id, (m.name[0] + (others.length ? (n[i] ?? n[1]) : n[1])).toUpperCase());
  }
  return out;
}
