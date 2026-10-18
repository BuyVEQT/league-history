"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Section } from "@/components/ui";
import { PickScatter, type ScatterPick } from "@/components/viz/PickScatter";

/**
 * Holds the "highlighted manager" shared by the draft report card and the every-pick scatter.
 * The report card is server-rendered (`card`); its rows carry `data-m` and a grade button, and a click
 * anywhere on a row (except a link) toggles that manager in the scatter. `between` renders between the two.
 */
export function DraftExplorer({
  card,
  between,
  picks,
  names,
  seasons,
  scatterTip,
}: {
  card: ReactNode;
  between?: ReactNode;
  picks: ScatterPick[];
  names: Record<string, string>;
  seasons: { year: number; label: string }[];
  scatterTip?: string;
}) {
  const [manager, setManager] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // Reflect the selection on the server-rendered rows.
  useEffect(() => {
    cardRef.current?.querySelectorAll<HTMLTableRowElement>("tr[data-m]").forEach((row) => {
      const on = row.dataset.m === manager;
      row.classList.toggle("on", on);
      row.querySelector("button[data-hl]")?.setAttribute("aria-pressed", String(on));
    });
  }, [manager]);

  const onCardClick = (e: MouseEvent) => {
    const t = e.target as Element;
    if (t.closest("a")) return;
    const row = t.closest<HTMLTableRowElement>("tr[data-m]");
    if (!row) return;
    const id = row.dataset.m!;
    setManager((m) => (m === id ? "" : id));
    if (manager !== id) {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      chartRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    }
  };

  return (
    <>
      {/* Clicks bubble up from the rows; the grade button in each row is the keyboard control. */}
      <div ref={cardRef} onClick={onCardClick}>
        {card}
      </div>
      {between}
      <Section title="Every pick, ever" tip={scatterTip}>
        <div ref={chartRef} className="panel space-y-2 p-4">
          <p className="dr-sub !mt-0">
            Across: where they were drafted. Up: how well they finished. Above the line beat their slot. Hover a dot for the pick; pick a manager here or in the report card to light up their picks.
          </p>
          <PickScatter picks={picks} names={names} seasons={seasons} manager={manager} onManager={setManager} />
        </div>
      </Section>
    </>
  );
}
