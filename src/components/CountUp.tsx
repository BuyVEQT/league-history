"use client";

import { useEffect, useRef } from "react";

let booted = false;

/**
 * A number that counts up from 0 (700ms, ease-out) when it appears after a client-side navigation.
 * The server-rendered value is the final one, so the first page load, no-JS and reduced motion all show it at rest.
 */
export function CountUp({ value, decimals = 0, prefix = "", suffix = "" }: { value: number; decimals?: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const text = (v: number) => `${prefix}${v.toFixed(decimals)}${suffix}`;
  useEffect(() => {
    const el = ref.current;
    // Only animate on client navigations, never on the first page load.
    if (!booted) {
      queueMicrotask(() => (booted = true));
      return;
    }
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 700);
      el.textContent = text(value * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <span ref={ref} className="tabular-nums">
      {text(value)}
    </span>
  );
}
