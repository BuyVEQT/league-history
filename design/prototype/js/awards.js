/* Awards (new): superlatives for each season and all-time, all computed from the same data. */
(function () {
  const { D, esc } = App;

  /** Season superlatives. Each returns null when the season lacks the data. */
  function seasonAwards(s) {
    const st = s.standings, reg = s.matchups.filter((m) => m.st === "regular");
    const by = (id) => st.find((r) => r.managerId === id);
    const games = (id) => reg.filter((m) => m.h === id || m.a === id).map((m) => { const me = m.h === id; return { my: me ? m.hc : m.ac, th: me ? m.ac : m.hc, wk: m.wk, opp: me ? m.a : m.h, win: m.win }; });
    const ids = st.map((r) => r.managerId);
    const tally = ids.map((id) => { const g = games(id); return { id, oneL: g.filter((x) => x.th - x.my === 1).length, oneW: g.filter((x) => x.my - x.th === 1).length, sweeps: g.filter((x) => x.my === 9).length }; });
    const sched = D.records.schedules.filter((r) => r.year === s.year);
    const picks = D.draft.picks.filter((p) => p.y === s.year);
    const trades = D.trades.list.filter((t) => t.year === s.year && t.status === "completed" && t.winner);
    const blow = [...reg].sort((a, b) => Math.abs(b.hc - b.ac) - Math.abs(a.hc - a.ac))[0];
    const top = (arr, f) => [...arr].sort((a, b) => f(b) - f(a))[0];
    const seedGain = st.filter((r) => r.playoffs).map((r) => ({ ...r, gain: r.rank - r.final }));
    const out = [
      { k: "Champion", ic: "trophy", gold: true, who: s.champion, v: by(s.champion).team, d: `Won the final over ${App.name(s.runnerUp)}.` , tip: App.TIP.titles},
      (() => { const r = st[0]; return { k: "Regular-season MVP", ic: "star", who: r.managerId, v: App.pct(r.catPct), d: `${r.cw}-${r.cl}-${r.ct} in categories · the #1 seed · finished ${App.ord(r.final)}`, tip: App.TIP.catPct }; })(),
      (() => { const r = top(seedGain, (x) => x.gain); return r && r.gain > 0 ? { k: "Cinderella", ic: "rocket", who: r.managerId, v: `${App.ord(r.rank)} → ${App.ord(r.final)}`, d: `Climbed ${r.gain} spots from their playoff seed.`, tip: App.TIP.overSeed } : null; })(),
      (() => { const r = top(seedGain, (x) => -x.gain); return r && r.gain < 0 ? { k: "Playoff heartbreak", ic: "heart", who: r.managerId, v: `${App.ord(r.rank)} → ${App.ord(r.final)}`, d: `Dropped ${-r.gain} spots from their seed in the playoffs.`, tip: App.TIP.overSeed } : null; })(),
      (() => { const r = top(tally, (x) => x.oneL * 10 - x.oneW); return { k: "Unluckiest", ic: "wave", who: r.id, v: `${r.oneL} losses`, d: `by a single category (and ${r.oneW} one-category wins).`, tip: App.TIP.unluckyOne }; })(),
      (() => { const r = top(tally, (x) => x.sweeps); return r.sweeps ? { k: "Broom award", ic: "bolt", who: r.id, v: `${r.sweeps} × 9-0`, d: "Most perfect weeks this season.", tip: App.TIP.sweep } : null; })(),
      (() => { const r = sched[0]; return r ? { k: "Toughest road", ic: "road", who: r.managerId, v: App.pct(r.oppPct), d: "Opponents' combined category win %: the hardest schedule.", tip: App.TIP.sos } : null; })(),
      (() => { const r = top(st.filter((x) => x.moves != null), (x) => x.moves); return r ? { k: "Waiver warrior", ic: "swap", who: r.managerId, v: `${r.moves} moves`, d: `Finished ${App.ord(r.final)}.`, tip: App.TIP.moves } : null; })(),
      (() => { const p = top(picks, (x) => x.v); return p ? { k: "Steal of the draft", ic: "target", who: p.m, v: p.p, d: `Taken #${p.ov} (round ${p.rd}), finished ${App.rankLabel(p.ar)} · ${App.signed(p.v)}`, tip: App.TIP.draftValue } : null; })(),
      (() => { const p = [...picks].filter((x) => x.rd <= 3).sort((a, b) => a.v - b.v)[0]; return p ? { k: "Bust of the year", ic: "basement", who: p.m, v: p.p, d: `Taken #${p.ov}, finished ${App.rankLabel(p.ar)} · ${App.signed(p.v)}`, tip: App.TIP.draftValue } : null; })(),
      (() => { const t = top(trades, (x) => x.margin); if (!t) return null; const w = t.sides.find((x) => x.m === t.winner), l = t.sides.find((x) => x.m !== t.winner); return { k: "Heist of the year", ic: "shield", who: t.winner, v: App.signed(t.margin), d: `Got ${w.players.map((p) => p.n).join(", ")} from ${App.name(l.m)} for ${l.players.map((p) => p.n).join(", ")}.`, tip: App.TIP.tradeValue }; })(),
      blow ? { k: "Biggest beatdown", ic: "flame", who: blow.win, v: `${Math.max(blow.hc, blow.ac)}-${Math.min(blow.hc, blow.ac)}`, d: `Week ${blow.wk} over ${App.name(blow.win === blow.h ? blow.a : blow.h)}.`, tip: App.TIP.blowout } : null,
    ];
    return out.filter(Boolean);
  }

  function allTimeAwards() {
    const c = D.careers, X = D.extra;
    const q = c.filter((x) => x.seasons >= 3);
    const top = (arr, f) => [...arr].sort((a, b) => f(b) - f(a))[0];
    const titles = d3.max(c, (x) => x.titles);
    const kings = c.filter((x) => x.titles === titles);
    const podium = top(c, (x) => x.seasonsList.filter((s) => s.final <= 3).length * 100 - x.avgFinish);
    const cat = top(q, (x) => x.catPct);
    const ws = top(X.streaks, (x) => x.win.n), ls = top(X.streaks, (x) => x.loss.n);
    const sw = top(X.weekly, (x) => x.sweeps);
    const hb = top(X.heartbreaks, (x) => x.oneCatLosses);
    const dr = top(D.records.droughts.filter((d) => d.titles === 0), (d) => d.current);
    const ste = top(D.draft.managers, (x) => x.vsLeague);
    const tr = top(D.trades.activity, (x) => x.netValue);
    const mv = top(D.trades.activity, (x) => x.movesPerSeason);
    const steady = D.records.consistency[0];
    const nrp = (n) => `${n}`;
    return [
      { k: "Most decorated", ic: "crown", gold: true, who: kings[0].managerId, v: `${titles} titles`, d: kings.length > 1 ? `Tied with ${kings.slice(1).map((x) => x.name).join(", ")}.` : "", tip: App.TIP.titles, extra: kings.slice(1).map((x) => x.managerId) },
      { k: "Podium regular", ic: "trophy", who: podium.managerId, v: `${podium.seasonsList.filter((s) => s.final <= 3).length} podiums`, d: `Top-3 finishes in ${podium.seasons} seasons.`, tip: App.TIP.finish },
      { k: "Category machine", ic: "star", who: cat.managerId, v: App.pct(cat.catPct), d: `Best career category win % (3+ seasons).`, tip: App.TIP.catPct },
      { k: "Mr. Steady", ic: "target", who: steady.managerId, v: `±${App.pct(steady.spread, 0)}`, d: `Smallest year-to-year swing; typical finish top ${App.pct(steady.avgPercentile, 0)}.`, tip: App.TIP.consistency },
      { k: "Heater", ic: "flame", who: ws.managerId, v: `${ws.win.n} straight`, d: `${App.wkLabel(ws.win.from)} to ${App.wkLabel(ws.win.to)}.`, tip: App.TIP.streak },
      { k: "Ice cold", ic: "basement", who: ls.managerId, v: `${ls.loss.n} straight Ls`, d: `${App.wkLabel(ls.loss.from)} to ${App.wkLabel(ls.loss.to)}.`, tip: App.TIP.streak },
      { k: "Broom closet", ic: "bolt", who: sw.managerId, v: `${nrp(sw.sweeps)} × 9-0`, d: `Most perfect weeks all-time.`, tip: App.TIP.sweep },
      { k: "Snake-bitten", ic: "wave", who: hb.managerId, v: `${hb.oneCatLosses} one-cat losses`, d: `Most regular-season weeks lost by a single category.`, tip: App.TIP.unluckyOne },
      { k: "Draft guru", ic: "clip", who: ste.managerId, v: App.signed(ste.vsLeague, 1), d: `Best value per pick vs the league, ${ste.drafts} drafts.`, tip: App.TIP.vsLeague },
      { k: "Trade shark", ic: "shield", who: tr.managerId, v: App.signed(tr.netValue), d: `Best net trade value · ${tr.tradeWins}-${tr.tradeLosses} in trades.`, tip: App.TIP.tradeValue },
      { k: "Wire hawk", ic: "swap", who: mv.managerId, v: `${Math.round(mv.movesPerSeason)}/season`, d: `Most adds & drops per season.`, tip: App.TIP.moves },
      { k: "Still waiting", ic: "road", who: dr.managerId, v: `${dr.current} seasons`, d: `Longest active title drought (never won).`, tip: App.TIP.drought },
    ];
  }

  const card = (a, i) => `<div class="panel award ${a.gold ? "gold" : ""}" style="animation:pageIn .4s ${i * 0.04}s both">
      <div class="ic">${App.icon(a.ic)}</div>
      <div style="min-width:0"><div class="an">${esc(a.k)}${a.tip ? App.info(a.tip) : ""}</div>
        <div class="aw">${esc(a.v)}</div>
        <div style="margin-top:6px;display:flex;gap:10px;flex-wrap:wrap">${[a.who, ...(a.extra || [])].map((id) => App.who(id)).join("")}</div>
        ${a.d ? `<div class="ad">${esc(a.d.replace(/\.\.$/, "."))}</div>` : ""}</div></div>`;

  App.register("awards", "Awards", (root, arg) => {
    const yrs = D.seasons.map((s) => s.year);
    const sel = arg === "all" || !arg ? "all" : +arg;
    const s = sel === "all" ? null : App.seasonByYear(sel);
    const list = s ? seasonAwards(s) : allTimeAwards();
    root.innerHTML = `
      <div><div class="eyebrow">Awards night</div><h1 class="title">${s ? `The ${esc(s.label)} awards` : "Hall of fame"}</h1>
        <p class="lede">${s ? "Every season gets its trophies, including the ones nobody wants. All computed from that season's matchups, draft and trades." : "All-time superlatives across every season. Pick a season for its own awards."} Hover the ⓘ to see exactly how each one is decided.</p></div>
      <div class="pills"><a class="pill" href="#awards-all" ${sel === "all" ? 'aria-current="page"' : ""}>${App.icon("crown")} All-time</a>${[...yrs].reverse().map((y) => `<a class="pill" href="#awards-${y}" ${sel === y ? 'aria-current="page"' : ""}>${esc(App.label(y))}</a>`).join("")}</div>
      <section class="grid g3">${list.map(card).join("")}</section>
      <div class="callout">Award names and thresholds are placeholders for the league to vote on. The calculations behind each are listed in the handoff spec.</div>`;
  }, { isNew: true });
})();
