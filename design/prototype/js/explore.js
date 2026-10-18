/* Explore layer: side panel, spotlight, week page, inline table charts.
   Everything here is presentation; numbers come from window.DATA (the site's analytics). */
(function () {
  const { D, esc } = App;

  // ======================================================================
  // Inline table helpers (charts inside tables)
  // ======================================================================
  /** Results of a manager's last n regular-season weeks in a season, oldest first: "W" | "L" | "T". */
  App.form = (season, id, n = 5) =>
    season.matchups.filter((m) => m.st === "regular" && (m.h === id || m.a === id)).sort((a, b) => a.wk - b.wk).slice(-n)
      .map((m) => ({ r: m.win === null ? "T" : m.win === id ? "W" : "L", wk: m.wk, my: m.h === id ? m.hc : m.ac, th: m.h === id ? m.ac : m.hc }));
  App.formChips = (season, id, n = 5) =>
    `<span class="form">${App.form(season, id, n).map((g) => `<a class="fc ${g.r}" href="#week-${season.year}-${g.wk}" data-tip="${esc(`Week ${g.wk}: ${g.my}-${g.th}`)}">${g.r}</a>`).join("")}</span>`;
  /** Inline percentage bar on a fixed scale so rows compare (default .35–.70). */
  App.pctBar = (p, lo = 0.35, hi = 0.7) =>
    `<span class="inbar" style="min-width:150px"><span class="num" style="width:48px">${App.pct(p)}</span><span class="tr"><span class="fl" style="display:block;width:${Math.max(2, Math.min(100, ((p - lo) / (hi - lo)) * 100))}%;background:${p >= 0.5 ? "var(--pos)" : "var(--neg)"}"></span></span></span>`;
  /** Seed → final chip: green when they finished better than seeded. */
  App.seedArrow = (seed, final) => {
    const d = seed - final;
    return `<span class="sa ${d > 0 ? "up" : d < 0 ? "down" : ""}" data-tip="${esc(`Seeded ${App.ord(seed)}, finished ${App.ord(final)}`)}"><b>${seed}</b><i>${d > 0 ? "▲" : d < 0 ? "▼" : "→"}</i><b>${final}</b></span>`;
  };

  // ======================================================================
  // Spotlight: one manager highlighted in every chart and table
  // ======================================================================
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} } };
  const spotStyle = document.createElement("style");
  document.head.appendChild(spotStyle);
  App.spot = null;
  App.setSpot = (id) => {
    App.spot = id && App.career(id) ? id : null;
    store.set("spot", App.spot);
    document.body.classList.toggle("spotting", !!App.spot);
    // Every mark or row tagged data-m dims unless it belongs to the spotlit manager.
    spotStyle.textContent = App.spot
      ? `body.spotting [data-m]:not([data-m="${App.spot}"]) { opacity: .22 !important; }
         body.spotting tr[data-m]:not([data-m="${App.spot}"]), body.spotting .pk[data-m]:not([data-m="${App.spot}"]), body.spotting .mcard[data-m]:not([data-m="${App.spot}"]), body.spotting .dr-body [data-m]:not([data-m="${App.spot}"]) { opacity: .45 !important; }
         body.spotting tr[data-m="${App.spot}"] { background: var(--accent-wash); box-shadow: inset 4px 0 0 var(--accent); }
         body.spotting .mcard[data-m="${App.spot}"], body.spotting .game [data-m="${App.spot}"] { box-shadow: 0 0 0 2px var(--accent); }`
      : "";
    const sel = document.getElementById("spot-sel");
    if (sel) sel.value = App.spot || "";
    document.getElementById("spot-chip").hidden = !App.spot;
    document.getElementById("spot-name").textContent = App.spot ? App.name(App.spot) : "";
  };

  // ======================================================================
  // Side panel (drawer)
  // ======================================================================
  const drawer = document.createElement("aside");
  drawer.className = "drawer";
  drawer.id = "drawer";
  drawer.setAttribute("aria-hidden", "true");
  drawer.setAttribute("aria-label", "Details");
  drawer.innerHTML = `<div class="dr-head"><span class="dr-kind" id="dr-kind"></span><button type="button" class="dr-x" id="dr-x" aria-label="Close panel">✕</button></div><div class="dr-body" id="dr-body"></div>`;
  const veil = document.createElement("div");
  veil.className = "veil";
  document.body.append(veil, drawer);
  let lastFocus = null;
  App.closePanel = () => { drawer.classList.remove("open"); veil.classList.remove("open"); drawer.setAttribute("aria-hidden", "true"); App.hideTip(); lastFocus?.focus?.(); };
  App.openPanel = (kind, id) => {
    const body = drawer.querySelector("#dr-body");
    const kinds = { manager: managerPanel, season: seasonPanel, player: playerPanel };
    if (!kinds[kind]) return;
    lastFocus = document.activeElement;
    drawer.querySelector("#dr-kind").textContent = { manager: "Manager", season: "Season", player: "Player" }[kind];
    body.innerHTML = "";
    kinds[kind](body, id);
    drawer.classList.add("open"); veil.classList.add("open"); drawer.setAttribute("aria-hidden", "false");
    body.scrollTop = 0;
    drawer.querySelector("#dr-x").focus();
  };
  veil.addEventListener("click", App.closePanel);
  drawer.querySelector("#dr-x").addEventListener("click", App.closePanel);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && drawer.classList.contains("open")) App.closePanel(); });
  window.addEventListener("hashchange", () => drawer.classList.contains("open") && App.closePanel());

  // Any manager name (.who) or element with data-panel opens the panel. Cmd/Ctrl-click still follows the link.
  document.addEventListener("click", (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    const p = e.target.closest("[data-panel]");
    if (p) { e.preventDefault(); const [k, ...rest] = p.dataset.panel.split(":"); App.openPanel(k, rest.join(":")); return; }
    const w = e.target.closest("a.who");
    if (w && !w.closest("#drawer")) { e.preventDefault(); App.openPanel("manager", w.getAttribute("href").slice(3)); }
  });

  const miniFinish = (c) => {
    const years = D.seasons.map((s) => s.year), w = 360, h = 70, maxN = 12;
    const x = (i) => 14 + i * ((w - 28) / (years.length - 1)), y = (f) => 10 + ((f - 1) / (maxN - 1)) * (h - 22);
    const pts = years.map((yr, i) => { const s = c.seasonsList.find((v) => v.year === yr); return s ? { x: x(i), y: y(s.final), s } : null; });
    let d = "", prev = null;
    pts.forEach((p) => { if (p) d += `${prev ? "L" : "M"}${p.x},${p.y}`; prev = p; });
    return `<svg viewBox="0 0 ${w} ${h}" class="dr-chart" role="img" aria-label="Final finish by season">
      <line x1="0" x2="${w}" y1="${y(1)}" y2="${y(1)}" stroke="var(--line)"/><text class="lbl" x="${w}" y="${y(1) - 3}" text-anchor="end">1st</text>
      <path d="${d}" fill="none" stroke="var(--s1)" stroke-width="2.2"/>
      ${pts.map((p, i) => (p ? `<circle cx="${p.x}" cy="${p.y}" r="${p.s.final === 1 ? 6 : 4}" fill="${p.s.final === 1 ? "var(--gold)" : "var(--s1)"}" stroke="var(--panel)" stroke-width="2"><title>${esc(App.label(p.s.year))}: ${App.ord(p.s.final)}</title></circle>` : "")).join("")}
      ${years.map((yr, i) => `<text class="lbl" x="${x(i)}" y="${h - 1}" text-anchor="middle">'${String(yr - 1).slice(2)}</text>`).join("")}</svg>`;
  };

  function managerPanel(el, id) {
    const c = App.career(id);
    const best = [...c.seasonsList].sort((a, b) => a.final - b.final || b.catPct - a.catPct)[0];
    const worst = [...c.seasonsList].sort((a, b) => b.final - a.final || a.catPct - b.catPct)[0];
    const rivals = Object.entries(D.h2h.cells[id] || {}).map(([o, r]) => ({ o, ...r, n: r.wins + r.losses + r.ties, p: (r.wins + r.ties / 2) / (r.wins + r.losses + r.ties) })).filter((r) => r.n >= 6);
    const victim = [...rivals].sort((a, b) => b.p - a.p || b.n - a.n)[0], nemesis = [...rivals].sort((a, b) => a.p - b.p || b.n - a.n)[0];
    const last = c.seasonsList[c.seasonsList.length - 1];
    const badges = App.badgesFor ? App.badgesFor(id) : [];
    el.innerHTML = `
      <div class="dr-hero">${App.mono(id, "lg")}<div><h2 class="dr-title">${esc(c.name)}</h2><div class="small muted">${c.seasons} season${c.seasons > 1 ? "s" : ""} · ${esc(App.label(c.firstYear))}${c.firstYear !== c.lastYear ? " – " + esc(App.label(c.lastYear)) : ""}</div></div></div>
      ${badges.length ? `<div class="badges">${badges.slice(0, 4).map(App.badgeHtml).join("")}</div>` : ""}
      <div class="dr-tiles">
        <div><span>Titles</span><b>${c.titles ? "🏆".repeat(c.titles) : "0"}</b></div>
        <div><span>Cat. win %</span><b>${App.pct(c.catPct)}</b></div>
        <div><span>Avg finish</span><b>${c.avgFinish.toFixed(1)}</b></div>
        <div><span>Playoffs</span><b>${c.playoffApps}/${c.seasons}</b></div>
      </div>
      <h3 class="sub-h">Finish by season</h3>${miniFinish(c)}
      <div class="list">
        <div><div class="l"><div class="t1">Best season · ${esc(best.team)}</div><div class="t2">${esc(App.label(best.year))} · ${esc(best.result)}</div></div><div class="rv"><b>${App.ord(best.final)}</b></div></div>
        <div><div class="l"><div class="t1">Worst season · ${esc(worst.team)}</div><div class="t2">${esc(App.label(worst.year))} · ${App.pct(worst.catPct)} categories</div></div><div class="rv"><b>${App.ord(worst.final)}</b></div></div>
        ${victim ? `<div><div class="l"><div class="t1">Favourite victim · ${esc(App.name(victim.o))}</div><div class="t2">${victim.n} meetings</div></div><div class="rv"><b class="pos">${App.rec(victim.wins, victim.losses, victim.ties)}</b></div></div>` : ""}
        ${nemesis && nemesis.o !== victim?.o ? `<div><div class="l"><div class="t1">Nemesis · ${esc(App.name(nemesis.o))}</div><div class="t2">${nemesis.n} meetings</div></div><div class="rv"><b class="neg">${App.rec(nemesis.wins, nemesis.losses, nemesis.ties)}</b></div></div>` : ""}
        <div><div class="l"><div class="t1">Latest · ${esc(last.team)}</div><div class="t2">${esc(App.label(last.year))}</div></div><div class="rv">${App.formChips(App.seasonByYear(last.year), id)}</div></div>
      </div>
      <div class="dr-actions">
        <a class="btn primary" href="#m-${id}">Full profile →</a>
        <button type="button" class="btn" id="dr-spot">${App.spot === id ? "Stop spotlighting" : "Spotlight " + esc(c.name)}</button>
        ${nemesis ? `<a class="btn" href="#rivalries" id="dr-riv">vs ${esc(App.name(nemesis.o))}</a>` : ""}
      </div>`;
    el.querySelector("#dr-spot").addEventListener("click", () => { App.setSpot(App.spot === id ? null : id); App.closePanel(); });
    el.querySelector("#dr-riv")?.addEventListener("click", () => (App.rivalPair = [id, nemesis.o]));
  }

  function seasonPanel(el, year) {
    const s = App.seasonByYear(year);
    const champ = s.standings.find((r) => r.managerId === s.champion);
    el.innerHTML = `
      <div class="dr-hero"><div class="dr-trophy">${App.icon("trophy")}</div><div><h2 class="dr-title">${esc(s.label)}</h2><div class="small muted">${s.teamCount} teams · champion ${esc(champ.team)} (${esc(App.name(s.champion))})</div></div></div>
      <h3 class="sub-h">Final standings</h3>
      <div class="dr-stand">${s.standings.map((r) => `<div data-m="${r.managerId}"><span class="muted num">${r.rank}</span><span class="nm">${esc(r.team)}</span>${App.pctBar(r.catPct)}<span class="num ${r.final === 1 ? "gold-t" : ""}">${r.final === 1 ? "🏆" : App.ord(r.final)}</span></div>`).join("")}</div>
      <h3 class="sub-h" style="margin-top:14px">Jump to a week</h3>
      <div class="pills">${[...new Set(s.matchups.map((m) => m.wk))].sort((a, b) => a - b).map((w) => `<a class="pill" href="#week-${s.year}-${w}">${s.matchups.find((m) => m.wk === w).st === "regular" ? w : "P" + w}</a>`).join("")}</div>
      <div class="dr-actions"><a class="btn primary" href="#season-${s.year}">Open the season →</a><a class="btn" href="#awards-${s.year}">Season awards</a></div>`;
  }

  function playerPanel(el, name) {
    const picks = D.draft.picks.filter((p) => p.p === name).sort((a, b) => a.y - b.y);
    const away = D.draft.gotAway.filter((g) => g.playerName === name);
    const unowned = D.trades.unowned.filter((u) => u.playerName === name);
    const trades = D.trades.list.filter((t) => t.status === "completed" && t.sides.some((s) => s.players.some((p) => p.n === name)));
    const namesake = D.records.namesakes.filter((n) => n.playerName === name);
    const avg = picks.length ? d3.mean(picks, (p) => p.v) : null;
    el.innerHTML = `
      <div class="dr-hero"><div class="dr-trophy" style="background:var(--band);color:var(--band-ink)">${App.icon("star")}</div><div><h2 class="dr-title">${esc(name)}</h2><div class="small muted">Drafted ${picks.length} time${picks.length === 1 ? "" : "s"} in league history${avg != null ? ` · average value ${App.val(avg)}` : ""}</div></div></div>
      <h3 class="sub-h">Every time he was drafted</h3>
      ${picks.length ? `<div class="dr-picks">${picks.map((p) => `<div data-m="${p.m}"><span class="yr">${esc(App.label(p.y))}</span>${App.mono(p.m)}<span><b>${esc(App.name(p.m))}</b><span class="small muted"> · Rd ${p.rd}, #${p.ov}</span></span><span class="num">${App.rankLabel(p.ar)}</span><span class="vchip ${p.v >= 0 ? "up" : "down"}">${App.val(p.v)}</span></div>`).join("")}</div>` : '<p class="muted">Never drafted.</p>'}
      ${trades.length ? `<h3 class="sub-h" style="margin-top:14px">Traded</h3><div class="list">${trades.map((t) => { const to = t.sides.find((s) => s.players.some((p) => p.n === name)), from = t.sides.find((s) => s !== to); return `<div><div class="l"><div class="t1">${esc(App.name(from.m))} → ${esc(App.name(to.m))}</div><div class="t2">${esc(t.label)} · ${esc(t.date)}</div></div><div class="rv">${t.winner === to.m ? '<span class="badge orange">won it</span>' : ""}</div></div>`; }).join("")}</div>` : ""}
      ${away.length || unowned.length || namesake.length ? `<h3 class="sub-h" style="margin-top:14px">Also in the record book</h3><div class="list">
        ${away.map((g) => `<div><div class="l"><div class="t1">Got away from ${esc(App.name(g.drafterManagerId))}</div><div class="t2">${esc(g.label)} · ${g.how} · finished #${g.actualRank}</div></div></div>`).join("")}
        ${unowned.map((u) => `<div><div class="l"><div class="t1">Nobody owned him at season end</div><div class="t2">${esc(u.label)} · finished #${u.actualRank}</div></div></div>`).join("")}
        ${namesake.map((n) => `<div><div class="l"><div class="t1">Team named after him: ${esc(n.teamName)}</div><div class="t2">${esc(App.name(n.managerId))}, ${esc(n.label)}</div></div></div>`).join("")}</div>` : ""}`;
  }

  // ======================================================================
  // Week page: #week-YEAR-WEEK
  // ======================================================================
  const STAGE = { regular: "Regular season", quarterfinal: "Quarterfinals", semifinal: "Semifinals", final: "Final", third_place: "Third place" };
  App.register("week", "Week", (root, arg) => {
    const [yy, ww] = String(arg || "").split("-").map(Number);
    const s = App.seasonByYear(yy) || App.latest;
    const weeks = [...new Set(s.matchups.map((m) => m.wk))].sort((a, b) => a - b);
    const wk = weeks.includes(ww) ? ww : weeks[0];
    const games = s.matchups.filter((m) => m.wk === wk);
    const stage = games[0].st;
    const team = (id) => s.standings.find((r) => r.managerId === id);
    // Standings going in / after: the site's standings race (seasonRace) gives rank after each regular week.
    const ri = s.race.weeks.indexOf(wk);
    const rankAfter = (id) => (ri >= 0 ? s.race.lines.find((l) => l.m === id).ranks[ri] : null);
    // Regular weeks: place going into the week. Playoff weeks: the team's playoff seed.
    const playoffs = stage !== "regular";
    const rankBefore = (id) => (playoffs ? team(id).rank : ri > 0 ? s.race.lines.find((l) => l.m === id).ranks[ri - 1] : null);
    const rkLabel = (id) => (rankBefore(id) ? (playoffs ? `#${rankBefore(id)}` : App.ord(rankBefore(id))) : "");
    const margin = (m) => Math.abs(m.hc - m.ac);
    const decided = games.filter((m) => m.win);
    const blow = [...decided].sort((a, b) => margin(b) - margin(a))[0];
    const close = [...games].sort((a, b) => margin(a) - margin(b))[0];
    const upsets = ri > 0 || playoffs ? decided.map((m) => { const loser = m.win === m.h ? m.a : m.h; return { m, gap: rankBefore(m.win) - rankBefore(loser), loser }; }).filter((u) => u.gap > 0).sort((a, b) => b.gap - a.gap) : [];
    const idx = weeks.indexOf(wk);
    const nav = (w, label) => (w == null ? `<span class="btn" aria-disabled="true" style="opacity:.4">${label}</span>` : `<a class="btn" href="#week-${s.year}-${w}">${label}</a>`);

    root.innerHTML = `
      <div><div class="eyebrow"><a href="#season-${s.year}" style="color:inherit">${esc(s.label)}</a> · ${esc(STAGE[stage])}</div>
        <div style="display:flex;align-items:end;justify-content:space-between;gap:12px;flex-wrap:wrap"><h1 class="title">Week ${wk}</h1>
        <div style="display:flex;gap:8px">${nav(weeks[idx - 1], "← Week " + (weeks[idx - 1] ?? ""))}${nav(weeks[idx + 1], "Week " + (weeks[idx + 1] ?? "") + " →")}</div></div></div>
      <nav class="weekstrip" aria-label="Weeks">${weeks.map((w) => { const st = s.matchups.find((m) => m.wk === w).st; return `<a href="#week-${s.year}-${w}" class="${w === wk ? "on" : ""} ${st !== "regular" ? "po" : ""}" ${w === wk ? 'aria-current="page"' : ""}>${st === "regular" ? w : "P"}</a>`; }).join("")}</nav>

      <section class="grid g4">
        ${App.tile("Biggest blowout", blow ? `${Math.max(blow.hc, blow.ac)}-${Math.min(blow.hc, blow.ac)}` : "—", blow ? `${esc(team(blow.win).team)} over ${esc(team(blow.win === blow.h ? blow.a : blow.h).team)}` : "", App.TIP.blowout)}
        ${App.tile("Closest", `${Math.max(close.hc, close.ac)}-${Math.min(close.hc, close.ac)}${close.tc ? "-" + close.tc : ""}`, `${esc(team(close.h).team)} vs ${esc(team(close.a).team)}`, App.TIP.closeGame)}
        ${App.tile("Upset of the week", upsets[0] ? `${rkLabel(upsets[0].m.win)} over ${rkLabel(upsets[0].loser)}` : "—", upsets[0] ? `${esc(team(upsets[0].m.win).team)} beat ${esc(team(upsets[0].loser).team)}` : ri > 0 || playoffs ? `The ${playoffs ? "higher seed" : "higher-ranked team"} won every matchup` : "No standings yet in week 1", playoffs ? "Playoff seeds. The biggest seed gap where the lower seed won." : "Standings place going into the week. The biggest gap where the lower-ranked team won.")}
        ${App.tile("Categories tied", d3.sum(games, (m) => m.tc), `${games.filter((m) => m.tc).length} of ${games.length} matchups had a tie`)}
      </section>

      <section>
        ${App.secHead("Scoreboard", "Each bar is the nine categories: the winner's in blue from the left, ties in gray, the loser's in orange. Click a team for its manager.")}
        <div class="scoreboard">${games.map((m) => {
          const sides = [[m.h, m.hc], [m.a, m.ac]];
          const up = upsets.find((u) => u.m === m);
          const tags = [m.st !== "regular" ? STAGE[m.st] : null, m.hc === 9 || m.ac === 9 ? "Sweep" : null, margin(m) <= 1 ? "Coin flip" : null, up ? "Upset" : null, m.win === null ? "Tie" : null].filter(Boolean);
          return `<article class="game2">
            ${tags.length ? `<div class="g2-tags">${tags.map((t) => `<span class="badge ${t === "Upset" ? "orange" : t === "Sweep" || t === "Final" ? "gold" : ""}">${t}</span>`).join("")}</div>` : ""}
            ${sides.map(([id, cats]) => `<div class="g2-side ${m.win === id ? "w" : m.win ? "l" : ""}" data-m="${id}">
              <span class="g2-rk num">${rkLabel(id)}</span>
              <a class="who" href="#m-${id}">${App.mono(id)}<span class="nm"><b>${esc(team(id).team)}</b><span class="small muted"> ${esc(App.name(id))}</span></span></a>
              <span class="g2-c num">${cats}</span></div>`).join("")}
            ${(() => { const hiC = Math.max(m.hc, m.ac), loC = Math.min(m.hc, m.ac); return `<div class="g2-bar" role="img" aria-label="${hiC} to ${loC}, ${m.tc} tied">${d3.range(hiC).map(() => '<i class="h"></i>').join("")}${d3.range(m.tc).map(() => '<i class="t"></i>').join("")}${d3.range(loC).map(() => '<i class="a"></i>').join("")}</div>`; })()}
          </article>`;
        }).join("")}</div>
      </section>

      ${ri >= 0 ? `<section class="panel" style="padding:0">
        <div style="padding:16px 18px 0">${App.secHead(`Standings after week ${wk}`, "Arrows show movement since the week before. The orange line is the playoff cut.", App.TIP.catPct)}</div>
        <div class="scroll-x"><table class="t"><thead><tr><th>Place</th><th>Move</th><th>Team</th><th>Manager</th><th>Category % ${App.info(App.TIP.catPct)}</th><th>Last 5</th></tr></thead><tbody>${[...s.race.lines].sort((a, b) => a.ranks[ri] - b.ranks[ri]).map((l) => {
          const before = rankBefore(l.m), mv = before ? before - l.ranks[ri] : 0;
          const thru = s.matchups.filter((m) => m.st === "regular" && m.wk <= wk && (m.h === l.m || m.a === l.m));
          const cw = d3.sum(thru, (m) => (m.h === l.m ? m.hc : m.ac)), cl = d3.sum(thru, (m) => (m.h === l.m ? m.ac : m.hc)), ct = d3.sum(thru, (m) => m.tc);
          const sub = { ...s, matchups: s.matchups.filter((m) => m.wk <= wk) };
          return `<tr data-m="${l.m}" class="${l.ranks[ri] === s.race.spots ? "cutline" : ""}"><td class="num"><b>${l.ranks[ri]}</b></td>
            <td class="num ${mv > 0 ? "pos" : mv < 0 ? "neg" : "muted"}">${mv > 0 ? "▲" + mv : mv < 0 ? "▼" + -mv : "–"}</td>
            <td><b>${esc(l.team)}</b></td><td>${App.who(l.m)}</td><td>${App.pctBar((cw + ct / 2) / Math.max(1, cw + cl + ct))}</td><td>${App.formChips(sub, l.m)}</td></tr>`;
        }).join("")}</tbody></table></div>
        <p class="note" style="padding:0 18px 14px">Display-only running totals; the site computes these with <code>seasonStandings(season, { throughWeek })</code>.</p>
      </section>` : `<div class="callout">Playoff week. <a href="#season-${s.year}">See the bracket on the season page →</a></div>`}`;
  }, { hidden: true, tab: "seasons" });

  // ======================================================================
  // Header controls: spotlight picker
  // ======================================================================
  App.mountExplore = () => {
    const wrap = document.querySelector(".band .wrap");
    const box = document.createElement("div");
    box.className = "spot";
    box.innerHTML = `<label class="spot-l" for="spot-sel">${App.icon("target")}<span>Spotlight</span></label>
      <select id="spot-sel" aria-label="Spotlight a manager"><option value="">Nobody</option>${[...D.managers].filter((m) => App.career(m.id)).map((m) => `<option value="${m.id}">${esc(m.name)}</option>`).join("")}</select>
      <button type="button" class="spot-chip" id="spot-chip" hidden aria-label="Clear spotlight"><span id="spot-name"></span> ✕</button>`;
    wrap.insertBefore(box, wrap.querySelector("#tabs"));
    box.querySelector("#spot-sel").addEventListener("change", (e) => App.setSpot(e.target.value || null));
    box.querySelector("#spot-chip").addEventListener("click", () => App.setSpot(null));
    App.setSpot(store.get("spot"));
  };
})();
