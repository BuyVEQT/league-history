"use client";

import { useEffect, useRef, useState } from "react";
import { et, reducedMotion } from "./shared";

/** Sunday's seven arenas, lights going out one by one until only the last game is live. */
export function CupNight({ games }: { games: { tip: string; game: string; espnId: string }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion()) {
      queueMicrotask(() => setDone(true));
      return;
    }
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          io.disconnect();
          setTimeout(() => setDone(true), 60);
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`night ${done ? "done" : ""}`} role="list" aria-label="Every NBA game on Sunday, March 31, 2019">
      {games.map((g, i) => {
        const last = i === games.length - 1;
        return (
          <div key={g.espnId} role="listitem" className={`arena ${last ? "last" : ""}`} style={{ ["--d" as string]: `${i * 320}ms` }}>
            <div className="lights" />
            <span className="tip-t num">{et(g.tip)} ET</span>
            <b>{g.game}</b>
            <span className="st">{last ? "LIVE" : "FINAL"}</span>
          </div>
        );
      })}
    </div>
  );
}
