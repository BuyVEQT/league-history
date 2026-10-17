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
];

export const managerColor = (index: number) => PALETTE[index % PALETTE.length];
