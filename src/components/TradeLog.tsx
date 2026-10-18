"use client";

import { useState } from "react";
import { rankLabel, signed } from "./draft";
import { Avatar, ManagerLink } from "./ui";
import { tt } from "./viz/tt";

export type TradeLogSide = {
  managerId: string;
  teamName: string;
  value: number;
  /** Value as a share of the bigger side in the same trade (0..1). */
  share: number;
  players: { key: string; name: string; actualRank: number | null; afterRank: number | null; afterGames: number | null }[];
};

export type TradeLogEntry = {
  year: number;
  label: string;
  date: string;
  status: "completed" | "vetoed";
  basis: "after" | "season";
  winnerManagerId: string | null;
  margin: number;
  sides: TradeLogSide[];
};

const dateLabel = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** Season filter (defaults to the latest) over trade cards whose value bars grow in; winner's bar blue, vetoed trades dimmed. */
export function TradeLog({
  trades,
  seasons,
  names,
}: {
  trades: TradeLogEntry[];
  seasons: { year: number; label: string; completed: number; vetoed: number }[];
  names: Record<string, string>;
}) {
  const [year, setYear] = useState<number | "all">(seasons[0]?.year ?? "all");
  const list = trades.filter((t) => year === "all" || t.year === year);
  const current = seasons.find((s) => s.year === year);
  const nameOf = (id: string) => names[id] ?? id;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="seg tx-tl-seg" role="group" aria-label="Season">
          {seasons.map((s) => (
            <button key={s.year} type="button" aria-pressed={year === s.year} onClick={() => setYear(s.year)}>
              {s.label}
            </button>
          ))}
          <button type="button" aria-pressed={year === "all"} onClick={() => setYear("all")}>
            All seasons
          </button>
        </div>
        <div className="text-[13px] text-muted" aria-live="polite">
          {current
            ? `${current.completed} trade${current.completed === 1 ? "" : "s"}${current.vetoed ? `, ${current.vetoed} vetoed` : ""} in ${current.label}`
            : `${trades.length} trades and vetoes`}
        </div>
      </div>
      {/* Keyed by the filter so the bars grow again when the season changes. */}
      <div key={String(year)} className="tx-tl-grid">
        {list.map((t, i) => {
          const win = t.status === "completed" ? t.winnerManagerId : null;
          return (
            <article key={`${t.date}-${i}`} className={`tx-tl-card ${t.status === "vetoed" ? "vetoed" : ""}`}>
              <div className="tx-tl-hd">
                <span>
                  {dateLabel(t.date)} · {t.label}
                  {t.status === "completed" && t.basis === "season" && <span> · full-season ranks</span>}
                </span>
                {t.status === "vetoed" ? (
                  <span className="badge tx-tl-veto">Vetoed</span>
                ) : win ? (
                  <span className="badge badge-orange">
                    Edge: {nameOf(win)} ({signed(t.margin, 1)})
                  </span>
                ) : (
                  <span className="badge">Even</span>
                )}
              </div>
              <div className="tx-tl-sides">
                {t.sides.map((s) => (
                  <div key={s.managerId + s.teamName} className="tx-tl-side">
                    <div className="flex min-w-0 items-center gap-2 text-sm">
                      <Avatar size="sm" name={nameOf(s.managerId)} />
                      <span className="truncate">
                        <ManagerLink id={s.managerId} name={nameOf(s.managerId)} />
                      </span>
                    </div>
                    <div className="tx-tl-team">{s.teamName} received</div>
                    <ul>
                      {s.players.map((p) => (
                        <li key={p.key}>
                          <span>{p.name}</span>
                          {t.basis === "after" ? (
                            <span
                              className="num text-muted"
                              title={`Season rank ${rankLabel(p.actualRank)}; ${p.afterGames ?? 0} games after the trade`}
                            >
                              {p.afterRank ? `#${p.afterRank}` : "—"}
                              <span className="text-[11px]"> · {p.afterGames ?? 0}g</span>
                            </span>
                          ) : (
                            <span className="num text-muted">{rankLabel(p.actualRank)}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                    <div
                      className="tx-tl-track"
                      data-tt={tt(`${s.teamName} received`, [
                        ["Value", s.value.toFixed(1)],
                        ["Players", s.players.length],
                        ...(win ? ([["Result", win === s.managerId ? "Won the trade" : "Lost the trade"]] as [string, string][]) : []),
                      ], t.basis === "after" ? "Rated on games after the trade" : "Rated on full-season ranks")}
                    >
                      <div
                        className={`tx-tl-bar ${win === s.managerId ? "win" : ""}`}
                        style={{ width: `${Math.max(2, s.share * 100)}%`, animationDelay: `${Math.min(i, 8) * 50}ms` }}
                      />
                    </div>
                    <div className="tx-tl-val num">value {s.value.toFixed(1)}</div>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
