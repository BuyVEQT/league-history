/* Seasons: week-by-week replay, weekly results grid, playoff bracket, standings. */
(function () {
  const { D, esc } = App;

  App.register("seasons", "Seasons", (root, arg) => {
    const season = App.seasonByYear(arg) || App.latest;
    const team = (id) => season.standings.find((s) => s.managerId === id);
    const reg = season.matchups.filter((m) => m.st === "regular");
    const weeks = [...new Set(reg.map((m) => m.wk))].sort((a, b) => a - b);
    const blow = [...reg].sort((a, b) => Math.abs(b.hc - b.ac) - Math.abs(a.hc - a.ac))[0];
    const bw = blow.hc > blow.ac ? blow.h : blow.a, bl = bw === blow.h ? blow.a : blow.h;
    const top = season.standings[0];

    root.innerHTML = `
      <div><div class="eyebrow">Season</div><h1 class="title">${esc(season.label)}</h1>
        <p class="lede">${season.teamCount} teams · ${weeks.length} regular-season weeks · ${season.playoffTeams}-team playoff · nine categories: ${season.categories.map(esc).join(", ")}.</p></div>
      <nav class="pills" aria-label="Choose season">${D.seasons.map((s) => `<a class="pill" href="#season-${s.year}" aria-current="${s.year === season.year ? "page" : "false"}">${esc(s.label)}</a>`).join("")}</nav>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><span class="sub-h" style="margin:0">Open a week</span><nav class="weekstrip" aria-label="Weeks">${[...new Set(season.matchups.map((m) => m.wk))].sort((a, b) => a - b).map((w) => { const st = season.matchups.find((m) => m.wk === w).st; return `<a href="#week-${season.year}-${w}" class="${st !== "regular" ? "po" : ""}" title="${st === "regular" ? `Week ${w}` : `Playoffs, week ${w}`}">${st === "regular" ? w : "P"}</a>`; }).join("")}</nav></div>
      <div class="grid g4">
        ${App.tile("Champion", esc(team(season.champion).team), `${esc(App.name(season.champion))}`, App.TIP.titles)}
        ${App.tile("Runner-up", esc(team(season.runnerUp).team), esc(App.name(season.runnerUp)))}
        ${App.tile("Regular-season #1", esc(top.team), `${esc(App.name(top.managerId))} · ${App.rec(top.cw, top.cl, top.ct)} in categories`, App.TIP.catPct)}
        ${App.tile("Biggest blowout", `${Math.max(blow.hc, blow.ac)}-${Math.min(blow.hc, blow.ac)}${blow.tc ? "-" + blow.tc : ""}`, `${esc(team(bw).team)} over ${esc(team(bl).team)}, week ${blow.wk}`, App.TIP.blowout)}
      </div>

      <section class="panel">
        ${App.secHead("The standings race", "Every team's place after every week; the shaded band is the playoff zone. Follow a storyline, or switch to Replay and press play.", App.TIP.raceStory,
          App.seg("race-mode", [["lines", "Every week"], ["bars", "Replay"]], "lines"))}
        <div class="race-wrap" id="race-lines">
          <div style="min-width:0"><div class="chart" id="srace"></div></div>
          <aside class="stories" id="stories" aria-label="Storylines"></aside>
        </div>
        <div id="race-bars" hidden>
        <div class="player-bar">
          <button class="btn primary" id="rp-play" type="button">${App.icon("play")}<span>Play</span></button>
          <input type="range" id="rp-wk" min="0" max="${weeks.length - 1}" value="${weeks.length - 1}" aria-label="Week">
          <span class="small muted num" id="rp-label" style="min-width:120px"></span>
        </div>
        <div class="chart" id="replay" style="margin-top:8px"></div>
        <p class="note">Bars run from .500: right of center is a winning category record. ${App.info(App.TIP.replay)}</p>
        </div>
      </section>

      <section class="panel">
        ${App.secHead("Playoff bracket", "Seeds come from the regular-season standings. Ties in a playoff week go to the higher seed.")}
        <div id="bracket"></div>
      </section>

      <section class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1.35fr);gap:16px">
        <div class="panel">${App.secHead("What if weeks won decided it?", "Left: the real order (category win %). Right: ranked by matchups won instead. Lines that cross the playoff line change who gets in.", App.TIP.whatIf)}
          <div class="chart" id="whatif"></div><div id="whatif-note"></div></div>
        <div class="panel">${App.secHead("Roster builds", season.roster ? `How each roster stacked up in every category (best ${season.roster.n} players by season rank). Outlined cells look like punts.` : "", App.TIP.roster)}
          <div class="scroll-x"><div class="chart" id="roster"></div></div>
          ${season.roster ? `<div class="legend"><span><i class="sq" style="background:var(--neg)"></i>Weak</span><span><i class="sq" style="background:var(--mid)"></i>Average</span><span><i class="sq" style="background:var(--pos)"></i>Strong</span><span><i class="sq" style="background:transparent;box-shadow:inset 0 0 0 2px var(--ink)"></i>Likely punt</span></div>` : ""}</div>
      </section>

      <section class="panel">
        ${App.secHead("Every week, every team", "Categories won in each weekly matchup. Hover a cell for the full score; click it (or a week number) to open that week.", App.TIP.weekGrid)}
        <div class="scroll-x"><div class="chart" id="wgrid" style="min-width:680px"></div></div>
        <div class="legend"><span><i class="sq" style="background:var(--pos)"></i>Won the week</span><span><i class="sq" style="background:var(--neg)"></i>Lost</span><span><i class="sq" style="background:var(--mid)"></i>Tied</span><span>Darker = bigger margin · P = playoff week</span></div>
      </section>

      <section class="panel" style="padding:0">
        <div style="padding:16px 18px 0">${App.secHead("Final standings", "Regular-season order, with where each team finished after the playoffs.")}</div>
        <div class="scroll-x"><table class="t">
          <thead><tr><th>Seed</th><th>Team</th><th>Manager</th><th>Category win % ${App.info(App.TIP.catPct)}</th><th>Category W-L-T ${App.info(App.TIP.catRec)}</th><th>Matchups ${App.info(App.TIP.matchPct)}</th><th>Last 5 weeks</th><th>Seed → final ${App.info(App.TIP.overSeed)}</th><th>Moves ${App.info(App.TIP.moves)}</th><th>Final ${App.info(App.TIP.finish)}</th></tr></thead>
          <tbody>${season.standings.map((r) => `<tr data-m="${r.managerId}" class="${r.rank === season.playoffTeams ? "cutline" : ""}"><td class="muted">${r.rank}</td><td><b>${esc(r.team)}</b></td><td>${App.who(r.managerId)}</td><td>${App.pctBar(r.catPct)}</td><td>${App.rec(r.cw, r.cl, r.ct)}</td><td>${App.rec(r.w, r.l, r.t)}</td><td>${App.formChips(season, r.managerId)}</td><td>${r.playoffs ? App.seedArrow(r.rank, r.final) : '<span class="muted small">missed</span>'}</td><td>${r.moves ?? "—"}</td><td>${finalBadge(r)}</td></tr>`).join("")}</tbody>
        </table></div>
      </section>`;

    App.bindSeg(root, "race-mode", (v) => { root.querySelector("#race-lines").hidden = v !== "lines"; const bars = root.querySelector("#race-bars"); bars.hidden = v !== "bars"; if (v === "bars") window.dispatchEvent(new Event("resize")); });
    drawReplay(root, season, weeks, team);
    const drawNew = () => { drawRace(root, season); drawWhatIf(root, season); drawRoster(root.querySelector("#roster"), season); };
    drawNew(); App.onResize(drawNew);
    drawBracket(root.querySelector("#bracket"), season, team);
    drawGrid(root.querySelector("#wgrid"), season, team);
  });

  function finalBadge(r) {
    if (r.final === 1) return `<span class="badge gold">${App.icon("trophy")}Champion</span>`;
    if (r.final <= 3) return `<span class="badge">${App.ord(r.final)}</span>`;
    if (r.playoffs) return `<span class="badge out">${App.ord(r.final)} · playoffs</span>`;
    return `<span class="muted">${App.ord(r.final)}</span>`;
  }

  // ---------- Standings race (rank by week) + storylines ----------
  function drawRace(root, season) {
    const R = season.race, el = root.querySelector("#srace"), side = root.querySelector("#stories");
    el.innerHTML = "";
    const n = season.teamCount, W = App.w(el), H = 26 * n + 40, m = { t: 10, r: 150, b: 26, l: 30 };
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", "Standings by week");
    const x = d3.scalePoint().domain(R.weeks).range([m.l, W - m.r]);
    const y = d3.scaleLinear().domain([1, n]).range([m.t + 8, H - m.b - 8]);
    svg.append("rect").attr("x", m.l - 8).attr("width", W - m.r - m.l + 16).attr("y", m.t).attr("height", y(R.spots + 0.5) - m.t).attr("fill", "var(--pos-wash)").attr("opacity", 0.45).attr("rx", 6);
    svg.append("text").attr("class", "lbl").attr("x", W - m.r - 4).attr("y", y(R.spots + 0.5) - 5).attr("text-anchor", "end").text(`playoff line · top ${R.spots}`).style("fill", "var(--accent-ink)").style("font-weight", 700);
    d3.range(1, n + 1).forEach((k) => svg.append("text").attr("class", "lbl num").attr("x", m.l - 14).attr("y", y(k)).attr("dy", ".35em").attr("text-anchor", "end").text(k));
    R.weeks.forEach((w, i) => { if (i % 2 === 0 || i === R.weeks.length - 1) svg.append("a").attr("href", `#week-${season.year}-${w}`).append("text").attr("class", "lbl num weeklink").attr("x", x(w)).attr("y", H - 6).attr("text-anchor", "middle").text(`wk ${w}`); });
    const line = d3.line().x((d, i) => x(R.weeks[i])).y((d) => y(d)).curve(d3.curveBumpX);
    let focus = null;
    const g = svg.append("g").selectAll("g").data(R.lines).join("g").attr("data-m", (l) => l.m);
    g.append("path").attr("class", "rl").attr("d", (l) => line(l.ranks)).attr("fill", "none").attr("stroke-linecap", "round");
    g.append("circle").attr("cx", x(R.weeks.at(-1))).attr("cy", (l) => y(l.seed)).attr("r", 4.5);
    g.append("text").attr("class", "lbl-ink").attr("x", W - m.r + 10).attr("y", (l) => y(l.seed)).attr("dy", ".35em").text((l) => `${l.team.length > 20 ? l.team.slice(0, 19) + "…" : l.team}`);
    const paint = () => {
      const on = (l) => !focus || focus.includes(l.m);
      g.select(".rl").attr("stroke", (l) => (focus && on(l) ? (l.po ? "var(--s1)" : "var(--s2)") : l.final === 1 ? "var(--gold)" : on(l) && !focus ? (l.po ? "var(--ink-2)" : "var(--line-2)") : "var(--line)")).attr("stroke-width", (l) => (focus && on(l) ? 3.4 : l.final === 1 ? 2.6 : 1.6));
      g.select("circle").attr("fill", (l) => (l.final === 1 ? "var(--gold)" : focus && on(l) ? (l.po ? "var(--s1)" : "var(--s2)") : "var(--line-2)"));
      g.select("text").style("opacity", (l) => (on(l) ? 1 : 0.35)).style("font-weight", (l) => (focus && on(l) ? 800 : 600));
      g.filter((l) => focus && on(l)).raise();
    };
    paint();
    g.append("path").attr("d", (l) => line(l.ranks)).attr("fill", "none").attr("stroke", "transparent").attr("stroke-width", 14)
      .on("pointerenter", (e, l) => { if (!side.querySelector("[aria-pressed=true]")) { focus = [l.m]; paint(); } })
      .on("pointermove", (e, l) => { const [mx] = d3.pointer(e); const i = d3.minIndex(R.weeks, (w) => Math.abs(x(w) - mx));
        App.showTip(App.tt(`${l.team} · week ${R.weeks[i]}`, [["Place", App.ord(l.ranks[i])], ["Weeks in first", l.first], ["Seed", App.ord(l.seed)], ["Final finish", App.ord(l.final)]], App.name(l.m)), e.clientX, e.clientY); })
      .on("pointerleave", () => { App.hideTip(); if (!side.querySelector("[aria-pressed=true]")) { focus = null; paint(); } });

    // Storylines
    const T = (id) => R.lines.find((l) => l.m === id);
    const leader = [...R.lines].sort((a, b) => b.first - a.first)[0];
    const stories = [
      { k: "Front-runner", ic: "crown", ids: [leader.m], t: `${leader.team}`, d: `${leader.first} of ${R.weeks.length} weeks in first · finished ${App.ord(leader.final)}` },
      ...R.comebacks.map((c) => ({ k: "Comeback", ic: "rocket", ids: [c.m], t: T(c.m).team, d: `${App.ord(c.rank)} in week ${c.wk} → ${App.ord(c.seed)} seed · finished ${App.ord(c.final)}` })),
      ...R.collapses.map((c) => ({ k: "Collapse", ic: "basement", ids: [c.m], t: T(c.m).team, d: `${App.ord(c.rank)} in week ${c.wk} → missed the playoffs (${App.ord(c.seed)})` })),
      ...(R.lastWeekOut.length ? [{ k: "Final-week knockout", ic: "heart", ids: [...R.lastWeekOut, ...R.lastWeekIn], t: R.lastWeekOut.map((id) => T(id).team).join(", "), d: `Knocked out in the last week${R.lastWeekIn.length ? ` by ${R.lastWeekIn.map((id) => T(id).team).join(", ")}` : ""}` }] : []),
    ];
    side.innerHTML = `<div class="small muted" style="font-weight:700;letter-spacing:.1em;text-transform:uppercase">Storylines</div>` + stories.map((s, i) => `<button type="button" class="story" data-i="${i}" aria-pressed="false"><span class="ic">${App.icon(s.ic)}</span><span><b>${esc(s.k)}</b><span class="st">${esc(s.t)}</span><span class="sd">${esc(s.d)}</span></span></button>`).join("")
      + (stories.length === 1 ? `<p class="small muted" style="margin:6px 0 0">No comebacks, collapses or final-week knockouts this season.</p>` : "");
    side.onclick = (e) => {
      const b = e.target.closest(".story"); if (!b) return;
      const was = b.getAttribute("aria-pressed") === "true";
      side.querySelectorAll(".story").forEach((x) => x.setAttribute("aria-pressed", "false"));
      if (!was) { b.setAttribute("aria-pressed", "true"); focus = stories[+b.dataset.i].ids; } else focus = null;
      paint();
    };
  }

  // ---------- What if: slope chart, category order vs matchup-win order ----------
  function drawWhatIf(root, season) {
    const el = root.querySelector("#whatif"), note = root.querySelector("#whatif-note");
    el.innerHTML = "";
    // Display order only; the site computes this with seasonStandings(season, { method: "matchups" }).
    const alt = [...season.standings].sort((a, b) => (b.w + b.t / 2) / (b.w + b.l + b.t) - (a.w + a.t / 2) / (a.w + a.l + a.t) || (b.cw - b.cl) - (a.cw - a.cl) || b.cw - a.cw);
    const altRank = new Map(alt.map((r, i) => [r.managerId, i + 1]));
    const n = season.teamCount, spots = season.playoffTeams;
    const W = App.w(el), H = 24 * n + 30, m = { t: 22, b: 8 }, colL = 150, colR = W - 150;
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", "Standings by category win % versus by matchups won");
    const y = (k) => m.t + (k - 0.5) * ((H - m.t - m.b) / n);
    svg.append("text").attr("class", "lbl").attr("x", colL).attr("y", 11).attr("text-anchor", "end").text("REAL (CATEGORY %)").style("font-weight", 700);
    svg.append("text").attr("class", "lbl").attr("x", colR).attr("y", 11).text("BY WEEKS WON").style("font-weight", 700);
    const cut = (y(spots) + y(spots + 1)) / 2;
    svg.append("line").attr("x1", 0).attr("x2", W).attr("y1", cut).attr("y2", cut).attr("stroke", "var(--accent)").attr("stroke-dasharray", "4 3");
    const rows = season.standings.map((r) => ({ ...r, a: altRank.get(r.managerId) }));
    const moved = (r) => (r.rank <= spots) !== (r.a <= spots);
    const g = svg.append("g").selectAll("g").data(rows).join("g");
    g.append("line").attr("x1", colL + 8).attr("x2", colR - 8).attr("y1", (r) => y(r.rank)).attr("y2", (r) => y(r.rank))
      .attr("stroke", (r) => (moved(r) ? (r.a <= spots ? "var(--pos)" : "var(--neg)") : "var(--line-2)")).attr("stroke-width", (r) => (moved(r) ? 3 : 1.5))
      .transition().duration(900).delay(200).attr("y2", (r) => y(r.a));
    g.append("text").attr("class", "lbl-ink").attr("x", colL).attr("y", (r) => y(r.rank)).attr("dy", ".35em").attr("text-anchor", "end").text((r) => `${r.rank}. ${r.team.length > 16 ? r.team.slice(0, 15) + "…" : r.team}`).style("font-weight", (r) => (moved(r) ? 800 : 500));
    g.append("text").attr("class", "lbl-2").attr("x", colR).attr("y", (r) => y(r.a)).attr("dy", ".35em").text((r) => `${r.a}. ${App.name(r.managerId)} · ${r.w}-${r.l}${r.t ? "-" + r.t : ""}`).style("font-weight", (r) => (moved(r) ? 800 : 500));
    App.hover(g, (r) => App.tt(r.team, [["Real place", App.ord(r.rank)], ["By weeks won", App.ord(r.a)], ["Matchups W-L-T", App.rec(r.w, r.l, r.t)], ["Category win %", App.pct(r.catPct)]]));
    const A = D.records.alternates.find((a) => a.year === season.year);
    note.innerHTML = A && (A.out.length || A.altTop.m !== A.actualTop.m)
      ? `<div class="callout" style="margin-top:12px">${A.out.length ? `<b>${A.out.map((r) => esc(r.team)).join(", ")}</b> would have missed the playoffs; <b>${A.in.map((r) => esc(r.team)).join(", ")}</b> would have got in.` : ""} ${A.altTop.m !== A.actualTop.m ? `First place would have gone to <b>${esc(A.altTop.team)}</b>.` : ""} ${A.finalistsOut.length ? `That includes a finalist.` : ""}</div>`
      : `<p class="note">Same first place and same playoff field either way.</p>`;
  }

  // ---------- Roster builds heat map ----------
  function drawRoster(el, season) {
    el.innerHTML = "";
    const R = season.roster;
    if (!R) { el.innerHTML = `<div class="callout">Player stats are captured from 2022-23 on, so roster builds start that season.</div>`; return; }
    const cats = R.categories, cw = 52, ch = 28, lw = 170, W = lw + cats.length * cw + 60, H = 24 + R.rows.length * ch;
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).style("max-width", W + "px").attr("role", "img").attr("aria-label", "Category strengths by team");
    const col = (z) => d3.interpolateRgb(App.css("--mid"), App.css(z >= 0 ? "--pos" : "--neg"))(Math.min(1, Math.abs(z) / 2));
    cats.forEach((c, j) => svg.append("text").attr("class", "lbl").attr("x", lw + j * cw + cw / 2).attr("y", 14).attr("text-anchor", "middle").style("font-weight", 700).text(c));
    svg.append("text").attr("class", "lbl").attr("x", lw + cats.length * cw + 10).attr("y", 14).style("font-weight", 700).text("FINISH");
    const g = svg.append("g").selectAll("g").data(R.rows).join("g").attr("transform", (r, i) => `translate(0,${24 + i * ch})`);
    g.append("text").attr("class", "lbl-ink").attr("x", lw - 10).attr("y", ch / 2).attr("dy", ".35em").attr("text-anchor", "end").text((r) => (r.team.length > 22 ? r.team.slice(0, 21) + "…" : r.team));
    g.append("text").attr("class", "lbl-2 num").attr("x", lw + cats.length * cw + 10).attr("y", ch / 2).attr("dy", ".35em").text((r) => (r.final === 1 ? "🏆 1st" : App.ord(r.final)));
    const cell = g.selectAll("g.c").data((r) => cats.map((c, j) => ({ r, c, j, z: r.z[c], punt: r.punts.includes(c) }))).join("g").attr("class", "c").attr("transform", (d) => `translate(${lw + d.j * cw},0)`);
    cell.append("rect").attr("x", 2).attr("y", 2).attr("width", cw - 4).attr("height", ch - 4).attr("rx", 4).attr("fill", (d) => col(d.z))
      .attr("stroke", (d) => (d.punt ? "var(--ink)" : "none")).attr("stroke-width", 2).style("opacity", 0).transition().duration(400).delay((d) => d.j * 30).style("opacity", 1);
    cell.append("text").attr("x", cw / 2).attr("y", ch / 2).attr("dy", ".35em").attr("text-anchor", "middle").attr("class", "num").style("font-size", "11px").style("font-weight", 700)
      .style("fill", (d) => (Math.abs(d.z) > 1.2 ? "#fff" : "var(--ink)")).text((d) => (d.punt ? "PUNT" : (d.z > 0 ? "+" : "") + d.z.toFixed(1)));
    App.hover(cell, (d) => App.tt(`${d.r.team} · ${d.c}`, [["Standard score", (d.z > 0 ? "+" : "") + d.z.toFixed(2)], ["Manager", App.name(d.r.m)]], d.punt ? "Looks like a punt" : d.z >= 1 ? "A strength" : d.z <= -1 ? "A weakness" : ""));
  }

  // ---------- Replay ----------
  function drawReplay(root, season, weeks, team) {
    const el = root.querySelector("#replay");
    const slider = root.querySelector("#rp-wk"), lab = root.querySelector("#rp-label"), btn = root.querySelector("#rp-play");
    const ids = season.standings.map((s) => s.managerId);
    // cumulative records per week index
    const frames = weeks.map((wk) => {
      const acc = new Map(ids.map((id) => [id, { id, cw: 0, cl: 0, ct: 0, w: 0, l: 0, t: 0 }]));
      season.matchups.filter((m) => m.st === "regular" && m.wk <= wk).forEach((m) => {
        const h = acc.get(m.h), a = acc.get(m.a);
        h.cw += m.hc; h.cl += m.ac; h.ct += m.tc; a.cw += m.ac; a.cl += m.hc; a.ct += m.tc;
        if (m.hc > m.ac) { h.w++; a.l++; } else if (m.ac > m.hc) { a.w++; h.l++; } else { h.t++; a.t++; }
      });
      const rows = [...acc.values()].map((r) => ({ ...r, pct: (r.cw + r.ct / 2) / Math.max(1, r.cw + r.cl + r.ct) }));
      rows.sort((a, b) => b.pct - a.pct || (b.cw - b.cl) - (a.cw - a.cl) || b.cw - a.cw);
      return { wk, rows };
    });
    // final frame uses official order (handles Yahoo tiebreaks)
    const last = frames[frames.length - 1];
    last.rows.sort((a, b) => team(a.id).rank - team(b.id).rank);

    let idx = frames.length - 1, timer = null;
    const rowH = 28, n = ids.length;
    const svg = d3.select(el).append("svg").attr("role", "img").attr("aria-label", "Standings by week");
    const gAxis = svg.append("g"), g = svg.append("g");
    const render = (dur = 500) => {
      const W = App.w(el), narrow = W < 600;
      const m = { t: 22, r: 16, b: 6, l: narrow ? 120 : 210 };
      const H = m.t + m.b + n * rowH;
      svg.attr("viewBox", `0 0 ${W} ${H}`);
      const x = d3.scaleLinear().domain([0.25, 0.75]).range([m.l, W - m.r]);
      const f = frames[idx];
      const cut = season.playoffTeams;
      lab.textContent = `Week ${f.wk} of ${weeks[weeks.length - 1]}`;
      gAxis.selectAll("*").remove();
      [0.3, 0.4, 0.5, 0.6, 0.7].forEach((v) => {
        gAxis.append("line").attr("x1", x(v)).attr("x2", x(v)).attr("y1", m.t - 4).attr("y2", H - m.b).attr("stroke", v === 0.5 ? "var(--line-2)" : "var(--line)");
        gAxis.append("text").attr("class", "lbl num").attr("x", x(v)).attr("y", 12).attr("text-anchor", "middle").text(v.toFixed(1).replace(/^0/, ""));
      });
      gAxis.append("line").attr("x1", 0).attr("x2", W).attr("y1", m.t + cut * rowH).attr("y2", m.t + cut * rowH).attr("stroke", "var(--accent)").attr("stroke-dasharray", "0").attr("stroke-width", 1.5);
      gAxis.append("text").attr("class", "lbl").attr("x", W - m.r).attr("text-anchor", "end").attr("y", m.t + cut * rowH - 5).attr("fill", "var(--accent-ink)").style("fill", "var(--accent-ink)").text(`Playoff line · top ${cut} make it`);

      const sel = g.selectAll("g.r").data(f.rows, (d) => d.id);
      const ent = sel.enter().append("g").attr("class", "r").attr("data-m", (d) => d.id);
      ent.append("text").attr("class", "lbl num rk").attr("x", 0).attr("y", rowH / 2).attr("dy", ".35em");
      ent.append("text").attr("class", "lbl-ink tm").attr("x", 22).attr("y", rowH / 2).attr("dy", ".35em");
      ent.append("rect").attr("class", "bar").attr("height", 16).attr("y", (rowH - 16) / 2).attr("rx", 3);
      ent.append("text").attr("class", "lbl-2 num rc").attr("y", rowH / 2).attr("dy", ".35em");
      ent.append("rect").attr("class", "hit").attr("fill", "transparent").attr("height", rowH);
      const all = ent.merge(sel);
      all.transition().duration(dur).ease(d3.easeCubicInOut).attr("transform", (d, i) => `translate(0,${m.t + i * rowH})`);
      all.select(".rk").text((d, i) => i + 1);
      all.select(".tm").text((d) => { const t = narrow ? App.name(d.id) : team(d.id).team; return t.length > 26 ? t.slice(0, 25) + "…" : t; });
      all.select(".bar").transition().duration(dur).ease(d3.easeCubicInOut)
        .attr("x", (d) => Math.min(x(0.5), x(Math.max(0.25, d.pct))))
        .attr("width", (d) => Math.max(2, Math.abs(x(Math.min(0.75, Math.max(0.25, d.pct))) - x(0.5))))
        .attr("fill", (d) => (d.pct >= 0.5 ? "var(--pos)" : "var(--neg)"));
      all.select(".rc").transition().duration(dur).ease(d3.easeCubicInOut)
        .attr("x", (d) => (d.pct >= 0.5 ? x(Math.min(0.75, d.pct)) + 6 : x(Math.max(0.25, d.pct)) - 6))
        .attr("text-anchor", (d) => (d.pct >= 0.5 ? "start" : "end"))
        .text((d) => App.pct(d.pct, 1));
      all.select(".hit").attr("width", W);
      App.hover(all.select(".hit"), (d) => App.tt(`${team(d.id).team}`, [["Manager", App.name(d.id)], ["Categories", App.rec(d.cw, d.cl, d.ct)], ["Category win %", App.pct(d.pct)], ["Matchups", App.rec(d.w, d.l, d.t)]], `Through week ${f.wk}`));
    };
    const stop = () => { clearInterval(timer); timer = null; btn.innerHTML = `${App.icon("play")}<span>Play</span>`; };
    btn.addEventListener("click", () => {
      if (timer) return stop();
      if (idx === frames.length - 1) { idx = 0; slider.value = 0; render(0); }
      btn.innerHTML = `${App.icon("pause")}<span>Pause</span>`;
      timer = setInterval(() => {
        if (!document.body.contains(el)) return stop();
        idx++; slider.value = idx; render(550);
        if (idx >= frames.length - 1) stop();
      }, 700);
    });
    slider.addEventListener("input", () => { stop(); idx = +slider.value; render(300); });
    render(0);
    App.onResize(() => render(0));
  }

  // ---------- Bracket ----------
  function drawBracket(el, season, team) {
    const po = season.matchups.filter((m) => m.st !== "regular");
    const seed = (id) => team(id).rank;
    const side = (m, id, cats) => {
      const won = m.win === id;
      return `<div class="side ${won ? "w" : "l"}"><span class="seed">${seed(id)}</span><span class="tm" title="${esc(team(id).team)}">${esc(team(id).team)}</span><span class="sc">${cats}</span></div>`;
    };
    const game = (m, cls = "") => {
      const [a, b] = seed(m.h) <= seed(m.a) ? [[m.h, m.hc], [m.a, m.ac]] : [[m.a, m.ac], [m.h, m.hc]];
      const tie = m.hc === m.ac ? `<div class="small muted" style="padding:4px 10px;border-top:1px solid var(--line)">Tied ${m.hc}-${m.ac}-${m.tc}: higher seed advances</div>` : "";
      return `<div class="game ${cls}" data-tip="Week ${m.wk}: ${esc(team(m.h).team)} ${m.hc}-${m.ac}${m.tc ? "-" + m.tc : ""} ${esc(team(m.a).team)}">${side(m, a[0], a[1])}${side(m, b[0], b[1])}${tie}</div>`;
    };
    const by = (st) => po.filter((m) => m.st === st).sort((a, b) => Math.min(seed(a.h), seed(a.a)) - Math.min(seed(b.h), seed(b.a)));
    const qf = by("quarterfinal"), sf = by("semifinal"), fi = by("final"), th = by("third_place");
    // order quarterfinals to line up with the semifinal their winner reached
    const qfOrdered = sf.flatMap((s) => qf.filter((q) => q.win === s.h || q.win === s.a));
    const byes = season.standings.filter((r) => r.playoffs && !qf.some((q) => q.h === r.managerId || q.a === r.managerId));
    el.innerHTML = `<div class="bracket">
      ${qf.length ? `<div class="round"><h4>Quarterfinals</h4>${(qfOrdered.length === qf.length ? qfOrdered : qf).map((m) => game(m)).join("")}${byes.length ? `<div class="small muted">Byes: ${byes.map((b) => `${esc(b.team)} (${b.rank})`).join(", ")}</div>` : ""}</div>` : ""}
      <div class="round"><h4>Semifinals</h4>${sf.map((m) => game(m)).join("")}</div>
      <div class="round"><h4>Final</h4>${fi.map((m) => game(m, "final")).join("")}${th.length ? `<h4 style="margin-top:14px">Third place</h4>${th.map((m) => game(m)).join("")}` : ""}</div>
      <div class="round"><h4>Champion</h4><div class="panel" style="text-align:center;box-shadow:none;background:var(--gold-wash);border:0">
        <div style="color:var(--gold)">${App.icon("trophy").replace("<svg", '<svg width="34" height="34"')}</div>
        <div style="font-family:var(--font-display);font-weight:900;font-size:24px;text-transform:uppercase;line-height:1">${esc(team(season.champion).team)}</div>
        <div class="small muted" style="margin-top:4px">${esc(App.name(season.champion))} · ${App.ord(seed(season.champion))} seed</div></div></div>
    </div>`;
  }

  // ---------- Weekly grid ----------
  function drawGrid(el, season, team) {
    const ids = season.standings.map((s) => s.managerId);
    const wks = [...new Set(season.matchups.map((m) => m.wk))].sort((a, b) => a - b);
    const cell = new Map();
    season.matchups.forEach((m) => {
      cell.set(`${m.h}|${m.wk}`, { me: m.h, opp: m.a, my: m.hc, their: m.ac, tc: m.tc, st: m.st, wk: m.wk, win: m.win });
      cell.set(`${m.a}|${m.wk}`, { me: m.a, opp: m.h, my: m.ac, their: m.hc, tc: m.tc, st: m.st, wk: m.wk, win: m.win });
    });
    const posC = d3.scaleLinear().domain([1, 7]).range([App.css("--pos-wash"), App.css("--pos")]).clamp(true);
    const negC = d3.scaleLinear().domain([1, 7]).range([App.css("--neg-wash"), App.css("--neg")]).clamp(true);
    const draw = () => {
      const W = Math.max(680, App.w(el));
      const lw = 190, cw = (W - lw) / wks.length, ch = 24;
      const H = 20 + ids.length * ch;
      d3.select(el).selectAll("*").remove();
      const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", "Weekly results grid");
      svg.selectAll("a.wk").data(wks).join("a").attr("class", "wk").attr("href", (d) => `#week-${season.year}-${d}`).append("text").attr("class", "lbl num weeklink").attr("x", (d, i) => lw + i * cw + cw / 2).attr("y", 12).attr("text-anchor", "middle")
        .text((d) => { const st = season.matchups.find((m) => m.wk === d)?.st; return st !== "regular" ? "P" : d; });
      svg.selectAll("text.tm").data(ids).join("text").attr("class", "lbl-ink").attr("x", lw - 8).attr("y", (d, i) => 20 + i * ch + ch / 2).attr("dy", ".35em").attr("text-anchor", "end")
        .text((d) => { const t = team(d).team; return t.length > 24 ? t.slice(0, 23) + "…" : t; });
      const data = ids.flatMap((id, r) => wks.map((wk, c) => ({ r, c, d: cell.get(`${id}|${wk}`) })));
      const cells = svg.append("g").selectAll("g").data(data.filter((x) => x.d)).join("g").attr("transform", (x) => `translate(${lw + x.c * cw + 1},${20 + x.r * ch + 1})`).attr("data-m", (x) => x.d.me).style("cursor", "pointer").on("click", (e, x) => App.go(`week-${season.year}-${x.d.wk}`));
      const margin = (d) => Math.abs(d.my - d.their);
      cells.append("rect").attr("width", cw - 2).attr("height", ch - 2).attr("rx", 3)
        .attr("fill", (x) => (x.d.win === null ? "var(--mid)" : x.d.win === x.d.me ? posC(margin(x.d) || 1) : negC(margin(x.d) || 1)))
        .attr("stroke", (x) => (x.d.st !== "regular" ? "var(--gold)" : "none")).attr("stroke-width", 1.5);
      cells.append("text").attr("x", (cw - 2) / 2).attr("y", (ch - 2) / 2).attr("dy", ".35em").attr("text-anchor", "middle").attr("font-size", 11.5).attr("font-weight", 600)
        .attr("fill", (x) => (x.d.win !== null && margin(x.d) >= 5 ? "#fff" : "var(--ink)")).text((x) => x.d.my);
      App.hover(cells, (x) => App.tt(`Week ${x.d.wk}${x.d.st !== "regular" ? " · playoffs" : ""}`, [[team(x.d.me).team, x.d.my], [team(x.d.opp).team, x.d.their], ["Tied categories", x.d.tc]], x.d.win === null ? "Tied week · click for the week" : `${App.name(x.d.win)} won the week · click for the week`));
    };
    draw();
    App.onResize(draw);
  }
})();
