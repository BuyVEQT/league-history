"use client";

import * as d3 from "d3";
import { useEffect, useRef } from "react";

export interface ChartContext {
  /** The container's current width in px (at least `minWidth`). */
  width: number;
  /** True when the visitor prefers reduced motion: draw the finished state, no transitions. */
  reduced: boolean;
  /** True on the first draw after mount (animate in); false on resize redraws (draw at rest). */
  first: boolean;
}

/**
 * Runs a d3 `draw` into a container div: once on mount, again whenever the container resizes.
 * `draw` should clear and rebuild its own contents; it can return a cleanup (stop timers, etc.).
 * Pass everything `draw` reads in `deps` so it redraws when the data changes.
 */
export function useD3Chart<T extends HTMLElement = HTMLDivElement>(
  draw: (el: d3.Selection<T, unknown, null, undefined>, ctx: ChartContext) => void | (() => void),
  deps: unknown[] = [],
  minWidth = 280,
) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cleanup: void | (() => void);
    let lastWidth = -1;
    let first = true;
    const run = () => {
      const width = Math.max(minWidth, Math.floor(el.clientWidth));
      if (width === lastWidth) return;
      lastWidth = width;
      if (typeof cleanup === "function") cleanup();
      cleanup = draw(d3.select(el), { width, reduced, first });
      first = false;
    };
    run();
    let t: ReturnType<typeof setTimeout> | undefined;
    const ro = new ResizeObserver(() => {
      clearTimeout(t);
      t = setTimeout(run, 120);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      clearTimeout(t);
      if (typeof cleanup === "function") cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}
