"use client";

import Link from "next/link";
import { Star, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { rankLabel, signed } from "@/components/draft";
import { Avatar } from "@/components/ui";
import { tt } from "@/components/viz/tt";
import { formatPct, formatRecord, ordinal } from "@/lib/analytics/format";
import type { PanelData, PanelManager, PanelPlayer, PanelRival, PanelSeason } from "@/lib/analytics/panelView";
import { panelAttr } from "./openPanel";

export interface PanelCtx {
  data: PanelData;
  base: string;
  mono: Map<string, string>;
  nameOf: (id: string) => string;
  labelOf: (year: number) => string;
  close: () => void;
}

const dateLabel = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const weekHref = (base: string, year: number, week: number) => `${base}/seasons/${year}/week/${week}`;

/** Inline percentage bar on a fixed .35–.70 scale so rows compare; blue at .500+, red below. */
function PctBar({ p }: { p: number | null }) {
  const w = p === null ? 0 : Math.max(2, Math.min(100, ((p - 0.35) / 0.35) * 100));
  return (
    <span className="pn-pct">
      <span className="num">{formatPct(p)}</span>
      <span className="tr">
        <span className="fl" style={{ width: `${w}%`, background: p !== null && p >= 0.5 ? "var(--pos)" : "var(--neg)" }} />
      </span>
    </span>
  );
}

function Rows({ children }: { children: React.ReactNode }) {
  return <div className="pn-list">{children}</div>;
}

function Row({ t1, t2, rv, m }: { t1: React.ReactNode; t2?: React.ReactNode; rv?: React.ReactNode; m?: string }) {
  return (
    <div data-m={m}>
      <div className="l">
        <div className="t1">{t1}</div>
        {t2 && <div className="t2">{t2}</div>}
      </div>
      {rv !== undefined && <div className="rv">{rv}</div>}
    </div>
  );
}

/** A manager's name that opens their own panel. */
function Who({ id, ctx }: { id: string; ctx: PanelCtx }) {
  return (
    <button type="button" className="plink" data-panel={panelAttr("manager", id)}>
      {ctx.nameOf(id)}
    </button>
  );
}

function FinishChart({ m, ctx }: { m: PanelManager; ctx: PanelCtx }) {
  const { years, maxTeams } = ctx.data;
  const w = 360;
  const h = 74;
  const x = (i: number) => 14 + i * ((w - 28) / Math.max(1, years.length - 1));
  const y = (f: number) => 10 + ((f - 1) / Math.max(1, maxTeams - 1)) * (h - 26);
  const pts = years.map((yr, i) => {
    const s = m.finishes.find((f) => f.year === yr.year);
    return s ? { x: x(i), y: y(s.final), ...s } : null;
  });
  let d = "";
  let prev = false;
  for (const p of pts) {
    if (p) d += `${prev ? "L" : "M"}${p.x},${p.y}`;
    prev = !!p;
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="viz pn-chart" role="img" aria-label={`Final finish by season: ${m.finishes.map((f) => `${ctx.labelOf(f.year)} ${ordinal(f.final)}`).join(", ")}`}>
      <line x1={0} x2={w} y1={y(1)} y2={y(1)} stroke="var(--border)" />
      <text className="lbl" x={w} y={y(1) - 3} textAnchor="end">
        1st
      </text>
      <path d={d} fill="none" stroke="var(--s1)" strokeWidth={2.2} />
      {pts.map((p) =>
        p ? (
          <circle
            key={p.year}
            cx={p.x}
            cy={p.y}
            r={p.final === 1 ? 6 : 4}
            fill={p.final === 1 ? "var(--gold)" : "var(--s1)"}
            stroke="var(--surface)"
            strokeWidth={2}
            data-panel={panelAttr("season", p.year)}
            data-tt={tt(`${ctx.labelOf(p.year)}: ${ordinal(p.final)}`, [], "Click for the season")}
          />
        ) : null,
      )}
      {years.map((yr, i) => (
        <text key={yr.year} className="lbl" x={x(i)} y={h - 1} textAnchor="middle">
          &apos;{String(yr.year - 1).slice(2)}
        </text>
      ))}
    </svg>
  );
}

export function FormChips({ year, form, base }: { year: number; form: { week: number; result: "W" | "L" | "T"; my: number; their: number }[]; base: string }) {
  return (
    <span className="pn-form">
      {form.map((g) => (
        <Link key={g.week} href={weekHref(base, year, g.week)} className={`pn-fc ${g.result}`} data-tt={tt(`Week ${g.week}: ${g.my}-${g.their}`)} aria-label={`Week ${g.week}: ${g.result} ${g.my}-${g.their}`}>
          {g.result}
        </Link>
      ))}
    </span>
  );
}

/** Reads the spotlit manager the SpotlightProvider puts on <body data-spot>, if any. */
function useSpotlit(): string | null {
  const [spot, setSpot] = useState<string | null>(null);
  useEffect(() => {
    const read = () => setSpot(document.body.dataset.spot || null);
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.body, { attributes: true, attributeFilter: ["data-spot"] });
    return () => obs.disconnect();
  }, []);
  return spot;
}

export function ManagerPanel({ m, ctx }: { m: PanelManager; ctx: PanelCtx }) {
  const spot = useSpotlit();
  const rival = (r: PanelRival, tone: "pos" | "neg") => <b className={tone === "pos" ? "text-positive" : "text-negative"}>{formatRecord(r.wins, r.losses, r.ties)}</b>;
  const span = `${m.seasons} season${m.seasons === 1 ? "" : "s"} · ${ctx.labelOf(m.firstYear)}${m.firstYear !== m.lastYear ? ` – ${ctx.labelOf(m.lastYear)}` : ""}`;
  return (
    <>
      <div className="pn-hero">
        <Avatar size="lg" name={m.name} initials={ctx.mono.get(m.id)} />
        <div className="min-w-0">
          <h2 className="pn-title" id="pn-title">
            {m.name}
          </h2>
          <div className="pn-sub">{span}</div>
        </div>
      </div>
      {m.badges.length > 0 && (
        <div className="pn-badges">
          {m.badges.map((b) => (
            <span key={b.name} tabIndex={0} data-tt={tt(b.name, [], b.rule)} className={`badge ${b.tone ? `badge-${b.tone}` : ""}`}>
              {b.name}
            </span>
          ))}
        </div>
      )}
      <div className="pn-tiles">
        <div>
          <span>Titles</span>
          <b aria-label={`${m.titles} title${m.titles === 1 ? "" : "s"}`}>{m.titles === 0 ? "0" : m.titles <= 3 ? "🏆".repeat(m.titles) : `${m.titles} 🏆`}</b>
        </div>
        <div>
          <span>Cat. win %</span>
          <b>{formatPct(m.catPct)}</b>
        </div>
        <div>
          <span>Avg finish</span>
          <b>{m.avgFinish === null ? "—" : m.avgFinish.toFixed(1)}</b>
        </div>
        <div>
          <span>Playoffs</span>
          <b>
            {m.playoffApps}/{m.seasons}
          </b>
        </div>
      </div>
      <div>
        <h3 className="pn-h">Finish by season</h3>
        <FinishChart m={m} ctx={ctx} />
      </div>
      <Rows>
        <Row
          t1={`Best season · ${m.best.team}`}
          t2={
            <>
              <button type="button" className="plink" data-panel={panelAttr("season", m.best.year)}>
                {ctx.labelOf(m.best.year)}
              </button>{" "}
              · {m.best.result}
            </>
          }
          rv={<b>{ordinal(m.best.final)}</b>}
        />
        <Row
          t1={`Worst season · ${m.worst.team}`}
          t2={
            <>
              <button type="button" className="plink" data-panel={panelAttr("season", m.worst.year)}>
                {ctx.labelOf(m.worst.year)}
              </button>{" "}
              · {formatPct(m.worst.catPct)} categories
            </>
          }
          rv={<b>{ordinal(m.worst.final)}</b>}
        />
        {m.victim && (
          <Row
            m={m.victim.id}
            t1={
              <>
                Favourite victim · <Who id={m.victim.id} ctx={ctx} />
              </>
            }
            t2={`${m.victim.games} meetings`}
            rv={rival(m.victim, "pos")}
          />
        )}
        {m.nemesis && m.nemesis.id !== m.victim?.id && (
          <Row
            m={m.nemesis.id}
            t1={
              <>
                Nemesis · <Who id={m.nemesis.id} ctx={ctx} />
              </>
            }
            t2={`${m.nemesis.games} meetings`}
            rv={rival(m.nemesis, "neg")}
          />
        )}
        <Row t1={`Latest · ${m.latest.team}`} t2={`${ctx.labelOf(m.latest.year)} · last 5 weeks`} rv={<FormChips year={m.latest.year} form={m.latest.form} base={ctx.base} />} />
      </Rows>
      <div className="pn-actions">
        <Link className="pn-btn primary" href={`${ctx.base}/managers/${m.id}`}>
          Full profile →
        </Link>
        <button
          type="button"
          className="pn-btn"
          onClick={() => {
            document.dispatchEvent(new CustomEvent("spotlight:set", { detail: { managerId: spot === m.id ? null : m.id } }));
            ctx.close();
          }}
        >
          {spot === m.id ? "Stop spotlighting" : `Spotlight ${m.name}`}
        </button>
        {m.nemesis && (
          <Link className="pn-btn" href={`${ctx.base}/rivalries#a=${encodeURIComponent(m.id)}&b=${encodeURIComponent(m.nemesis.id)}`}>
            vs {ctx.nameOf(m.nemesis.id)}
          </Link>
        )}
      </div>
    </>
  );
}

export function SeasonPanel({ s, ctx }: { s: PanelSeason; ctx: PanelCtx }) {
  return (
    <>
      <div className="pn-hero">
        <div className="pn-trophy">
          <Trophy aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="pn-title" id="pn-title">
            {s.label}
          </h2>
          <div className="pn-sub">
            {s.teamCount} teams
            {s.champion && (
              <>
                {" "}
                · champion {s.champion.team} (<Who id={s.champion.managerId} ctx={ctx} />)
              </>
            )}
          </div>
        </div>
      </div>
      <div>
        <h3 className="pn-h">Final standings</h3>
        <div className="pn-stand">
          {s.rows.map((r) => (
            <div key={r.managerId} data-m={r.managerId}>
              <span className="text-muted num">{r.rank}</span>
              <span className="nm">
                <button type="button" className="plink" data-panel={panelAttr("manager", r.managerId)} title={`${r.team} · ${ctx.nameOf(r.managerId)}`}>
                  {r.team}
                </button>
              </span>
              <PctBar p={r.catPct} />
              <span className={`num fin ${r.final === 1 ? "text-gold" : ""}`} aria-label={`Finished ${ordinal(r.final)}`}>
                {r.final === 1 ? "🏆" : ordinal(r.final)}
              </span>
            </div>
          ))}
        </div>
        <p className="pn-note">Regular-season place · team · category win % · final finish</p>
      </div>
      <div>
        <h3 className="pn-h">Jump to a week</h3>
        <div className="pn-pills">
          {s.weeks.map((w) => (
            <Link key={w.week} className="pill" href={weekHref(ctx.base, s.year, w.week)} aria-label={`${w.playoff ? "Playoff week" : "Week"} ${w.week}`}>
              {w.playoff ? `P${w.week}` : w.week}
            </Link>
          ))}
        </div>
      </div>
      <div className="pn-actions">
        <Link className="pn-btn primary" href={`${ctx.base}/seasons/${s.year}`}>
          Open the season →
        </Link>
        <Link className="pn-btn" href={`${ctx.base}/awards/${s.year}`}>
          Season awards
        </Link>
      </div>
    </>
  );
}

export function PlayerPanel({ p, ctx }: { p: PanelPlayer; ctx: PanelCtx }) {
  const avg = p.picks.length ? p.picks.reduce((a, x) => a + x[5], 0) / p.picks.length : null;
  return (
    <>
      <div className="pn-hero">
        <div className="pn-trophy star">
          <Star aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="pn-title" id="pn-title">
            {p.name}
          </h2>
          <div className="pn-sub">
            Drafted {p.picks.length} time{p.picks.length === 1 ? "" : "s"} in league history
            {avg !== null && ` · average value ${signed(avg, 1)}`}
          </div>
        </div>
      </div>
      <div>
        <h3 className="pn-h">Every time he was drafted</h3>
        {p.picks.length ? (
          <div className="pn-picks">
            {p.picks.map(([y, m, rd, ov, ar, v]) => (
              <div key={`${y}-${ov}`} data-m={m}>
                <button type="button" className="plink yr" data-panel={panelAttr("season", y)}>
                  {ctx.labelOf(y)}
                </button>
                <Avatar size="sm" name={ctx.nameOf(m)} initials={ctx.mono.get(m)} />
                <span className="min-w-0 truncate">
                  <button type="button" className="plink font-bold" data-panel={panelAttr("manager", m)}>
                    {ctx.nameOf(m)}
                  </button>
                  <span className="text-[12px] text-muted">
                    {" "}
                    · Rd {rd}, #{ov}
                  </span>
                </span>
                <span className="num" data-tt={tt("Finished", [["Season rank", rankLabel(ar)]])}>
                  {rankLabel(ar)}
                </span>
                <span className={`pn-vchip ${v >= 0 ? "up" : "down"}`} data-tt={tt("Draft value", [["Value vs the slot", signed(v, 1)]])}>
                  {signed(v, 1)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="pn-sub">Never drafted.</p>
        )}
      </div>
      {p.trades.length > 0 && (
        <div>
          <h3 className="pn-h">Traded</h3>
          <Rows>
            {p.trades.map(([y, date, from, to, won], i) => (
              <Row
                key={i}
                m={to}
                t1={
                  <>
                    <Who id={from} ctx={ctx} /> → <Who id={to} ctx={ctx} />
                  </>
                }
                t2={`${ctx.labelOf(y)} · ${dateLabel(date)}`}
                rv={won ? <span className="badge badge-orange">won it</span> : undefined}
              />
            ))}
          </Rows>
        </div>
      )}
      {p.notes.length > 0 && (
        <div>
          <h3 className="pn-h">Also in the record book</h3>
          <Rows>
            {p.notes.map((n, i) => (
              <Row key={i} t1={n.t1} t2={n.t2} />
            ))}
          </Rows>
        </div>
      )}
    </>
  );
}

export function NotFound({ kind }: { kind: string }) {
  return (
    <div className="pn-hero">
      <h2 className="pn-title" id="pn-title">
        Not found
      </h2>
      <p className="pn-sub">No {kind} by that name in this league&apos;s records.</p>
    </div>
  );
}
