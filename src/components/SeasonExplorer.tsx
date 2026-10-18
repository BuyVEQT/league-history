"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Trophy } from "lucide-react";

export interface SeasonStory {
  year: number;
  label: string;
  team: string;
  manager: string;
  runnerUp: string;
}

export function SeasonExplorer({ seasons }: { seasons: SeasonStory[] }) {
  const [index, setIndex] = useState(seasons.length - 1);
  const season = seasons[index];
  if (!season) return null;
  return (
    <div className="season-explorer">
      <div className="explorer-copy">
        <div className="eyebrow text-accent">The history books</div>
        <h2 className="display-heading mt-4">Every champion.<br />A different story.</h2>
        <p className="mt-5 max-w-sm text-sm leading-7 text-muted">The unlikely runs. The repeat champions. The finals nobody lets you forget. Take a trip through our fictional demo league.</p>
        <Link href="/demo/seasons" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-accent">Open the season archive <ArrowRight size={16} /></Link>
      </div>
      <div className="explorer-card">
        <div className="flex items-center justify-between gap-4">
          <span className="eyebrow">Season spotlight</span>
          <Trophy size={24} className="text-accent" aria-hidden />
        </div>
        <div aria-live="polite" aria-atomic="true"><div key={season.year} className="reveal">
          <div className="mt-6 inline-block rounded-full border border-foreground/20 px-3 py-1 font-mono text-xs">{season.label} CHAMPIONS</div>
          <h3 className="champion-name">{season.team}</h3>
          <p className="text-sm">Managed by <strong>{season.manager}</strong></p>
          <p className="mt-2 text-xs text-muted">Finals runner-up: {season.runnerUp}</p>
          <Link href={`/demo/seasons/${season.year}`} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-accent">Relive this season <ArrowRight size={16} /></Link>
        </div></div>
        <div className="season-controls">
          <button className="icon-button" aria-label="Previous season" disabled={index === 0} onClick={() => setIndex(index - 1)}><ArrowLeft size={17} /></button>
          <label className="sr-only" htmlFor="spotlight-season">Spotlight season</label>
          <select id="spotlight-season" className="min-w-0 rounded-lg bg-transparent px-3 text-sm font-semibold" value={index} onChange={e => setIndex(Number(e.target.value))}>
            {seasons.map((s, i) => <option key={s.year} value={i}>{s.label}</option>)}
          </select>
          <button className="icon-button" aria-label="Next season" disabled={index === seasons.length - 1} onClick={() => setIndex(index + 1)}><ArrowRight size={17} /></button>
        </div>
      </div>
    </div>
  );
}
