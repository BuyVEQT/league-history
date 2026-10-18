import type * as d3 from "d3";

/* Small shared bits for the Records page's d3 charts. */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySel = d3.Selection<any, any, any, any>;
type Val = string | number | null | ((d: never, i: number) => string | number | null);

/** A fresh, full-width SVG in the chart container (1 SVG unit = 1 CSS px, so text stays at its real size). */
export function freshSvg(el: AnySel, width: number, height: number, label: string) {
  el.selectAll("*").remove();
  return el.append("svg").attr("class", "viz").attr("viewBox", `0 0 ${width} ${height}`).style("min-width", `${width}px`).attr("role", "img").attr("aria-label", label);
}

/**
 * Sets `to` on a selection. When `animate`, it first sets `from` and transitions to `to` (so the chart
 * comes to rest on its own); otherwise it draws the finished state at once (resize, reduced motion).
 */
export function settle(
  sel: AnySel,
  animate: boolean,
  from: Record<string, Val>,
  to: Record<string, Val>,
  opts: { duration?: number; delay?: (d: never, i: number) => number; ease?: (t: number) => number; style?: boolean } = {},
) {
  const set = (s: AnySel, attrs: Record<string, Val>) => {
    for (const [k, v] of Object.entries(attrs)) {
      if (opts.style) s.style(k, v as never);
      else s.attr(k, v as never);
    }
  };
  if (!animate) {
    set(sel, to);
    return;
  }
  set(sel, from);
  let t = sel.transition().duration(opts.duration ?? 700);
  if (opts.delay) t = t.delay(opts.delay as never);
  if (opts.ease) t = t.ease(opts.ease);
  for (const [k, v] of Object.entries(to)) {
    if (opts.style) t.style(k, v as never);
    else t.attr(k, v as never);
  }
}

/** Truncates a label to `n` characters with an ellipsis. */
export const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
