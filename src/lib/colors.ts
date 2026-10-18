import type { League } from "./types";

/** Chart colors, assigned per manager by their position in the league's manager list. */
const PALETTE = [
  "#f59e0b",
  "#38bdf8",
  "#34d399",
  "#f472b6",
  "#a78bfa",
  "#fb7185",
  "#facc15",
  "#2dd4bf",
  "#60a5fa",
  "#fb923c",
  "#c084fc",
  "#a3e635",
  "#e879f9",
  "#94a3b8",
];

export const managerColor = (index: number) => PALETTE[index % PALETTE.length];

export const colorForManager = (league: League, managerId: string) =>
  managerColor(Math.max(0, league.managers.findIndex((m) => m.id === managerId)));

/**
 * The design's series colors, assigned to picked series in the order they were picked; everything
 * else is drawn in MUTED_SERIES. Charts highlight at most four series at a time.
 */
export const SERIES = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)"];
export const MUTED_SERIES = "var(--border-2)";
