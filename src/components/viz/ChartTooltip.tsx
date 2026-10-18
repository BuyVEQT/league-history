"use client";

import { useEffect, useRef, useState } from "react";

/** One floating tooltip for every chart mark with a `data-tt` attribute (see ./tt). */
export function ChartTooltip() {
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = (e: Event) => (e.target instanceof Element ? e.target.closest<HTMLElement | SVGElement>("[data-tt]") : null);
    const move = (e: PointerEvent) => {
      const el = target(e);
      setTip(el ? { text: el.dataset.tt!, x: e.clientX, y: e.clientY } : null);
    };
    const focus = (e: FocusEvent) => {
      const el = target(e);
      if (!el) return;
      const r = el.getBoundingClientRect();
      setTip({ text: el.dataset.tt!, x: r.left + r.width / 2, y: r.bottom });
    };
    const hide = () => setTip(null);
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("focusin", focus);
    document.addEventListener("focusout", hide);
    window.addEventListener("scroll", hide, { passive: true });
    return () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("focusin", focus);
      document.removeEventListener("focusout", hide);
      window.removeEventListener("scroll", hide);
    };
  }, []);

  // Keep the box on screen: flip left/up near the edges.
  useEffect(() => {
    const el = ref.current;
    if (!el || !tip) return;
    const { width, height } = el.getBoundingClientRect();
    let left = tip.x + 14;
    let top = tip.y + 14;
    if (left + width > window.innerWidth - 8) left = tip.x - width - 14;
    if (top + height > window.innerHeight - 8) top = tip.y - height - 14;
    el.style.left = `${Math.max(8, left)}px`;
    el.style.top = `${Math.max(8, top)}px`;
  }, [tip]);

  if (!tip) return null;
  const [title, ...lines] = tip.text.split("\n");
  return (
    <div ref={ref} className="ctip" role="tooltip" style={{ left: -9999, top: -9999 }}>
      <div className="h">{title}</div>
      {lines.map((l, i) =>
        l.startsWith("~") ? (
          <div key={i} className="m mt-1">
            {l.slice(1)}
          </div>
        ) : (
          <div key={i} className="r">
            <span className="m">{l.split("\t")[0]}</span>
            <span>{l.split("\t")[1]}</span>
          </div>
        ),
      )}
    </div>
  );
}
