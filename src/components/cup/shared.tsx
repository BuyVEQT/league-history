export const pct8 = (v: number) => v.toFixed(8).replace(/^0/, "");
export const pct4 = (v: number) => v.toFixed(4).replace(/^0/, "");
const tz = { timeZone: "America/New_York" } as const;
/** "10:30 pm" in Eastern time. */
export const et = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", ...tz }).toLowerCase();
/** "Sat" in Eastern time. */
export const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { weekday: "short", ...tz });
export const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const ResetIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />
  </svg>
);
