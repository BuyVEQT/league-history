/* Managers: trading-card grid and full profiles. */
(function () {
  const { D, esc } = App;

  // ---------- Archetype badges (computed, each with its rule) ----------
  function badgesFor(id) {
    const out = [];
    const c = App.career(id);
    const eligible = D.careers.filter((x) => x.seasons >= 3).map((x) => x.managerId);
    const top = (rows, key, dir = -1, filter = () => true) => {
      const r = rows.filter((x) => eligible.includes(x.managerId) && filter(x)).sort((a, b) => (a[key] - b[key]) * (dir === -1 ? -1 : 1))[0];
      return r?.managerId;
    };
    const maxT = Math.max(...D.careers.map((x) => x.titles));
    if (c.titles === maxT && maxT > 0) out.push(["gold", "trophy", "Dynasty", `Tied for the most titles in league history (${maxT}).`]);
    if (top(D.draft.managers, "vsLeague") === id) out.push(["orange", "clip", "Draft guru", "Best average draft value vs the league (min. 3 seasons). " + App.TIP.vsLeague]);
    if (top(D.trades.activity, "movesPerSeason") === id) out.push(["", "bolt", "Wire hawk", "Most adds and drops per season (min. 3 seasons)."]);
    if (top(D.trades.activity, "netValue", -1, (x) => x.trades >= 3) === id) out.push(["", "swap", "Trade shark", "Most net trade value received (min. 3 trades). " + App.TIP.tradeValue]);
    const clutch = D.records.margins.map((m) => ({ ...m, p: m.closeWins / Math.max(1, m.closeWins + m.closeLosses), n: m.closeWins + m.closeLosses }));
    if (top(clutch, "p", -1, (x) => x.n >= 10) === id) out.push(["", "target", "Ice in veins", "Best record in one-category games (min. 10). " + App.TIP.closeGame]);
    if (top(D.records.playoffs, "avgOverSeed", -1, (x) => x.appearances >= 2) === id) out.push(["", "rocket", "Playoff riser", "Gains the most places from seed to final finish (min. 2 playoff trips). " + App.TIP.overSeed]);
    if (top(D.records.consistency, "spread", 1) === id) out.push(["", "shield", "Steady hand", "Smallest swing in finish from year to year. " + App.TIP.consistency]);
    const ws = D.records.streaks.win[0];
    if (ws && ws.managerId === id) out.push(["", "flame", "Heater", `Owns the league's longest win streak (${ws.length} straight weeks, ${ws.label}).`]);
    const lk = D.records.careerLuck[0];
    if (lk && lk.managerId === id) out.push(["", "star", "Horseshoe", "Most career matchup luck: wins more weeks than their categories deserve. " + App.TIP.luck]);
    return out;
  }
  App.badgesFor = (id) => badgesFor(id);
  const badgeHtml = (b) => `<span class="badge ${b[0]}" data-tip="${esc(b[3])}" tabindex="0">${App.icon(b[1])}${esc(b[2])}</span>`;
  App.badgeHtml = (b) => badgeHtml(b);

  function miniPath(c) {
    const years = D.seasons.map((s) => s.year), w = 140, h = 34, maxN = 12;
    const y = (f) => 4 + ((f - 1) / (maxN - 1)) * (h - 8);
    const pts = years.map((yr, i) => { const s = c.seasonsList.find((x) => x.year === yr); return s ? [6 + i * ((w - 12) / (years.length - 1)), y(s.final), s.final] : null; });
    let d = "", prev = null; pts.forEach((p) => { if (p) d += `${prev ? "L" : "M"}${p[0]},${p[1]}`; prev = p; });
    return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" aria-hidden="true" preserveAspectRatio="none"><path d="${d}" fill="none" stroke="var(--line-2)" stroke-width="1.5" vector-effect="non-scaling-stroke"/>${pts.map((p) => (p ? `<circle cx="${p[0]}" cy="${p[1]}" r="${p[2] === 1 ? 3.5 : 2.2}" fill="${p[2] === 1 ? "var(--gold)" : "var(--ink-2)"}"/>` : "")).join("")}</svg>`;
  }

  App.register("managers", "Managers", (root, id) => {
    if (id && App.career(id)) return profile(root, id);
    const list = [...D.careers].sort((a, b) => b.titles - a.titles || b.catPct - a.catPct);
    root.innerHTML = `
      <div><div class="eyebrow">The managers</div><h1 class="title">Thirteen managers, one cup</h1>
        <p class="lede">Every manager who has played in the Caboclo Cup. Badges are earned from the numbers; hover one to see the rule.</p></div>
      <div class="mcards">${list.map((c) => `
        <a class="mcard" href="#m-${c.managerId}" data-m="${c.managerId}">
          <div class="top">${App.mono(c.managerId, "md")}<div><div class="nm">${esc(c.name)}</div><div class="meta">${c.seasons} season${c.seasons > 1 ? "s" : ""} · ${esc(App.label(c.firstYear))}${c.firstYear !== c.lastYear ? " – " + esc(App.label(c.lastYear)) : ""}</div></div></div>
          ${miniPath(c)}
          <div class="stats"><div><b>${c.titles}</b>titles</div><div><b>${App.pct(c.catPct, 1)}</b>cat. win</div><div><b>${c.avgFinish.toFixed(1)}</b>avg finish</div></div>
          <div class="badges">${badgesFor(c.managerId).slice(0, 3).map(badgeHtml).join("")}</div>
        </a>`).join("")}</div>
      <p class="note">The line on each card is final finish by season (higher = better); gold dots are titles.</p>`;
  }, {});

  function profile(root, id) {
    const c = App.career(id);
    const others = D.careers.filter((x) => x.managerId !== id);
    const st = c.streaks;
    const elo = D.elo.current.find((x) => x.m === id), peak = D.elo.peak[id];
    const luck = D.records.careerLuck.find((x) => x.managerId === id);
    const yr = D.ratings?.rows.find((x) => x.managerId === id);
    const reach = D.draft.reach?.rows.find((x) => x.managerId === id), keep = D.draft.keeps.rows.find((x) => x.managerId === id);
    const fav = D.draft.favourites.find((x) => x.m === id);
    const wk = D.extra.weekly.find((x) => x.managerId === id);
    const dr = D.draft.managers.find((x) => x.managerId === id);
    const tr = D.trades.activity.find((x) => x.managerId === id);
    const hb = D.extra.heartbreaks.find((x) => x.managerId === id);
    const finals = c.titles + c.runnerUps;

    root.innerHTML = `
      <a href="#managers" class="small" style="text-decoration:none;color:var(--ink-2)">← All managers</a>
      <div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap">${App.mono(id, "lg")}
        <div style="min-width:0"><div class="eyebrow">Manager profile</div><h1 class="title">${esc(c.name)}</h1>
          <p class="lede" style="margin-top:6px">${c.seasons} season${c.seasons > 1 ? "s" : ""}, ${esc(App.label(c.firstYear))} to ${esc(App.label(c.lastYear))}. ${c.titles ? `${c.titles}× champion.` : "Still chasing a first title."}</p></div></div>
      <div class="badges">${badgesFor(id).map(badgeHtml).join("") || '<span class="small muted">No badges yet.</span>'}</div>
      <div class="pills" aria-label="Team names by season">${c.seasonsList.map((x) => `<span class="pill" style="cursor:default" data-tip="${esc(App.label(x.year))}: ${esc(x.result)}">${x.final === 1 ? App.icon("trophy").replace("<svg", '<svg width="13" height="13" style="color:var(--gold)"') : ""}<span class="muted">${esc(App.label(x.year))}</span> ${esc(x.team)}</span>`).join("")}</div>

      <div class="grid g4">
        ${App.tile("Titles", App.count(c.titles), `${finals} final${finals === 1 ? "" : "s"} reached`, App.TIP.titles)}
        ${App.tile("Category win %", App.count(c.catPct * 100, 1, "%"), `${App.rec(c.catWins, c.catLosses, c.catTies)} · league rank ${D.careers.filter((x) => x.catPct > c.catPct).length + 1}`, App.TIP.catPct)}
        ${App.tile("Average finish", App.count(c.avgFinish, 1), `best ${App.ord(c.bestFinish)} · playoffs ${c.playoffApps}/${c.seasons}`, App.TIP.avgFinish)}
        ${App.tile("Longest win streak", st.win ? App.count(st.win.n) : "—", st.win ? `${esc(App.label(st.win.year))}, weeks ${st.win.from}–${st.win.to} · ${esc(st.win.team)}` : "", App.TIP.streak)}
      </div>

      <div class="form-strip">
        <div class="fs"><div class="lab">Power rating ${App.info(App.TIP.elo)}</div>
          <div class="fs-row"><span class="val">${elo ? App.count(elo.r) : "—"}</span><span class="fs-sub">${elo ? `#${D.elo.current.findIndex((x) => x.m === id) + 1} of ${D.elo.current.length} now` : "not in the latest season"}<br>peak ${peak.r} · ${esc(App.label(peak.year))} wk ${peak.wk}</span></div>
          <div class="chart" id="elo-mini"></div></div>
        <div class="fs"><div class="lab">Matchup luck ${App.info(App.TIP.luck)}</div>
          <div class="fs-row"><span class="val ${luck && luck.luck >= 0 ? "pos" : "neg"}">${luck ? App.signed(luck.luck, 1) : "—"}</span><span class="fs-sub">weeks won vs expected<br>over ${luck?.seasons ?? 0} season${luck?.seasons === 1 ? "" : "s"}</span></div>
          <div class="chart" id="luck-mini"></div></div>
        <div class="fs"><div class="lab">Longest losing streak ${App.info(App.TIP.streak)}</div>
          <div class="fs-row"><span class="val">${st.loss ? st.loss.n : "—"}</span><span class="fs-sub">${st.loss ? `${esc(App.label(st.loss.year))}, weeks ${st.loss.from}–${st.loss.to}<br>${esc(st.loss.team)}` : ""}</span></div></div>
        <div class="fs"><div class="lab">Yahoo manager rating</div>
          <div class="fs-row"><span class="val">${yr ? yr.rating : "—"}</span>${yr ? `<span class="level lv-${yr.level.toLowerCase()}">${esc(yr.level)}</span>` : ""}</div>
          <div class="fs-sub">${yr ? `#${yr.rank} in the league · Yahoo snapshot ${esc(D.ratings.asOf)}` : "No Yahoo rating"}</div></div>
      </div>

      <div class="grid g2">
        <section class="panel">${App.secHead("Career path", "Final finish (filled) and regular-season seed (ring) each season.", App.TIP.finish)}<div class="chart" id="path"></div>
          <div class="legend"><span><i class="dt" style="background:var(--s1)"></i>Final finish</span><span><i class="dt" style="background:transparent;box-shadow:inset 0 0 0 2px var(--ink-2)"></i>Regular-season seed</span><span><i class="dt" style="background:var(--gold)"></i>Title</span></div></section>
        <section class="panel">${App.secHead("What a typical week looks like", "How many of the 9 categories they won each week, against the league's average week.", App.TIP.avgCats)}<div class="chart" id="dist"></div>
          <div class="legend"><span><i class="sq" style="background:var(--s1)"></i>${esc(c.name)}</span><span><i style="background:var(--ink)"></i>League average</span><span>${wk.sweeps} sweep${wk.sweeps === 1 ? "" : "s"} (9-0) ${App.info(App.TIP.sweep)}</span></div></section>
      </div>

      <section class="panel">${App.secHead("Head-to-head vs everyone", "Matchup record against each opponent, regular season and playoffs. Right of center = winning record.", App.TIP.h2h)}<div class="chart" id="riv"></div></section>

      <div class="grid g3">
        <section class="panel">${App.secHead("Draft habits", "", App.TIP.draftValue)}${dr ? `<div class="list">
          ${reach ? `<div><span class="l"><span class="t1">Drafts ahead of the rankings ${App.info(App.TIP.reach)}</span><span class="t2">${App.pct(reach.reachShare, 0)} of picks are 15+ spot reaches</span></span><span class="rv">${App.signed(reach.avgEarly, 1)} <span class="t2">spots</span></span></div>` : ""}
          ${keep ? `<div><span class="l"><span class="t1">Keeps their picks ${App.info(App.TIP.keep)}</span><span class="t2">still rostered at season end</span></span><span class="rv">${keep.avgKept.toFixed(1)} <span class="t2">per draft (${App.pct(keep.keptShare, 0)})</span></span></div>` : ""}
          ${fav ? `<div><span class="l"><span class="t1">Can't quit: ${esc(fav.p)}</span><span class="t2">drafted in ${fav.picks.length} seasons</span></span><span class="rv">${fav.picks.map((x) => `'${String(x.y - 1).slice(2)}`).join(" ")}</span></div>` : ""}
          <div><span class="l"><span class="t1">Value vs league</span><span class="t2">${dr.drafts} drafts · ${dr.picks} picks</span></span><span class="rv ${dr.vsLeague >= 0 ? "pos" : "neg"}">${App.val(dr.vsLeague)} ${App.info(App.TIP.vsLeague)}</span></div>
          <div><span class="l"><span class="t1">Hit rate</span><span class="t2">picks that beat their slot</span></span><span class="rv">${App.pct(dr.hitRate, 0)}</span></div>
          <div><span class="l"><span class="t1">Best pick: ${esc(dr.best.p)}</span><span class="t2">${esc(dr.best.y)} · #${dr.best.ov} overall → ${App.rankLabel(dr.best.ar)}</span></span><span class="rv pos">${App.val(dr.best.v)}</span></div>
          <div><span class="l"><span class="t1">Ouch: ${esc(dr.worst.p)}</span><span class="t2">${esc(dr.worst.y)} · #${dr.worst.ov} overall → ${App.rankLabel(dr.worst.ar)}</span></span><span class="rv neg">${App.val(dr.worst.v)}</span></div></div>` : '<p class="muted">No draft data.</p>'}</section>
        <section class="panel">${App.secHead("On the wire & in trades", "", App.TIP.tradeValue)}${tr ? `<div class="list">
          <div><span class="l"><span class="t1">Moves per season</span><span class="t2">${tr.moves} total adds/drops</span></span><span class="rv">${tr.movesPerSeason.toFixed(0)}</span></div>
          <div><span class="l"><span class="t1">Trades</span><span class="t2">${tr.vetoed ? `${tr.vetoed} more vetoed` : "none vetoed"}</span></span><span class="rv">${tr.trades} <span class="t2">(${tr.tradeWins}-${tr.tradeLosses})</span></span></div>
          <div><span class="l"><span class="t1">Net trade value</span><span class="t2">received − given</span></span><span class="rv ${tr.netValue > 0 ? "pos" : tr.netValue < 0 ? "neg" : ""}">${tr.trades ? App.val(tr.netValue) : "—"}</span></div>
          <div><span class="l"><span class="t1">Favorite partner</span><span class="t2">most trades with</span></span><span class="rv">${tr.favoritePartner ? `${esc(App.name(tr.favoritePartner.managerId))} (${tr.favoritePartner.count})` : "—"}</span></div></div>` : '<p class="muted">No activity data.</p>'}</section>
        <section class="panel">${App.secHead("Close calls", "", App.TIP.unluckyOne)}<div class="list">
          <div><span class="l"><span class="t1">One-category wins</span><span class="t2">regular season</span></span><span class="rv pos">${hb?.oneCatWins ?? 0}</span></div>
          <div><span class="l"><span class="t1">One-category losses</span><span class="t2">regular season</span></span><span class="rv neg">${hb?.oneCatLosses ?? 0}</span></div>
          <div><span class="l"><span class="t1">Weeks swept 9-0</span><span class="t2">by an opponent</span></span><span class="rv">${wk.swept}</span></div>
          <div><span class="l"><span class="t1">Avg categories per week</span><span class="t2">${wk.games} weeks</span></span><span class="rv">${wk.avgCats.toFixed(2)}</span></div></div></section>
      </div>

      <section class="panel" style="padding:0"><div style="padding:16px 18px 0">${App.secHead("Season by season")}</div><div class="scroll-x"><table class="t">
        <thead><tr><th>Season</th><th>Team</th><th>Cat. win % ${App.info(App.TIP.catPct)}</th><th>Category W-L-T</th><th>Seed → final ${App.info(App.TIP.overSeed)}</th><th>Last 5 weeks</th><th>Result</th></tr></thead>
        <tbody>${[...c.seasonsList].reverse().map((x) => `<tr><td><a href="#season-${x.year}" data-panel="season:${x.year}" style="color:var(--accent-ink);font-weight:600">${esc(App.label(x.year))}</a></td><td>${esc(x.team)}</td><td>${App.pctBar(x.catPct)}</td><td>${App.rec(x.cw, x.cl, x.ct)}</td><td>${App.seedArrow(x.rank, x.final)}</td><td>${App.formChips(App.seasonByYear(x.year), c.managerId)}</td><td>${x.final === 1 ? `<span class="badge gold">${App.icon("trophy")}Champion</span>` : esc(x.result)}</td></tr>`).join("")}</tbody></table></div></section>

      <nav class="pills" aria-label="Other managers">${others.map((o) => `<a class="pill" href="#m-${o.managerId}">${esc(o.name)}</a>`).join("")}</nav>`;

    drawPath(root.querySelector("#path"), c);
    drawDist(root.querySelector("#dist"), id);
    drawRivals(root.querySelector("#riv"), id);
    const minis = () => { drawEloMini(root.querySelector("#elo-mini"), id); drawLuckMini(root.querySelector("#luck-mini"), id); };
    minis(); App.onResize(minis);
  }

  /** Whole-career power rating line, one segment per season, 1500 reference. */
  function drawEloMini(el, id) {
    el.innerHTML = "";
    const pts = (D.elo.history[id] || []).map(([y, w, r]) => ({ y, w, r }));
    if (!pts.length) return;
    const W = App.w(el, 200), H = 54;
    const years = D.seasons.map((s) => s.year), xs = d3.scaleBand().domain(years).range([0, W]).paddingInner(0.08);
    const maxWk = d3.max(D.seasons, (s) => d3.max(s.matchups, (m) => m.wk));
    const x = (p) => xs(p.y) + ((p.w - 1) / (maxWk - 1)) * xs.bandwidth();
    const all = Object.values(D.elo.history).flat().map((p) => p[2]);
    const y = d3.scaleLinear().domain(d3.extent(all)).range([H - 3, 3]);
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("aria-label", "Power rating over the career");
    svg.append("line").attr("x1", 0).attr("x2", W).attr("y1", y(1500)).attr("y2", y(1500)).attr("stroke", "var(--line-2)").attr("stroke-dasharray", "3 3");
    const line = d3.line().x(x).y((p) => y(p.r)).curve(d3.curveMonotoneX);
    d3.groups(pts, (p) => p.y).forEach(([, r]) => svg.append("path").attr("d", line(r)).attr("fill", "none").attr("stroke", "var(--s1)").attr("stroke-width", 1.8));
    const pk = D.elo.peak[id];
    svg.append("circle").attr("cx", x({ y: pk.year, w: pk.wk })).attr("cy", y(pk.r)).attr("r", 3.5).attr("fill", "var(--gold)");
    const dots = svg.append("g").selectAll("rect").data(years).join("rect").attr("x", (yy) => xs(yy)).attr("width", xs.bandwidth()).attr("y", 0).attr("height", H).attr("fill", "transparent");
    App.hover(dots, (yy) => { const r = pts.filter((p) => p.y === yy); return r.length ? App.tt(App.label(yy), [["Start", r[0].r], ["End", r[r.length - 1].r], ["High", d3.max(r, (p) => p.r)]]) : App.tt(App.label(yy), [], "Not in the league"); });
  }

  /** Luck per season: diverging bars, won more weeks than deserved (up) or fewer (down). */
  function drawLuckMini(el, id) {
    el.innerHTML = "";
    const rows = D.records.luck.filter((r) => r.m === id).sort((a, b) => a.year - b.year);
    if (!rows.length) return;
    const W = App.w(el, 200), H = 54, years = D.seasons.map((s) => s.year);
    const x = d3.scaleBand().domain(years).range([0, W]).padding(0.25);
    const mx = d3.max(D.records.luck, (r) => Math.abs(r.luck));
    const y = d3.scaleLinear().domain([-mx, mx]).range([H - 2, 2]);
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("aria-label", "Matchup luck by season");
    svg.append("line").attr("x1", 0).attr("x2", W).attr("y1", y(0)).attr("y2", y(0)).attr("stroke", "var(--line-2)");
    const b = svg.selectAll("rect").data(rows).join("rect").attr("x", (r) => x(r.year)).attr("width", x.bandwidth()).attr("rx", 2)
      .attr("y", (r) => Math.min(y(0), y(r.luck))).attr("height", (r) => Math.max(1.5, Math.abs(y(r.luck) - y(0)))).attr("fill", (r) => (r.luck >= 0 ? "var(--pos)" : "var(--neg)"));
    App.hover(b, (r) => App.tt(`${r.team} · ${r.label}`, [["Matchups won", r.actual], ["Expected", r.expected.toFixed(1)], ["Luck", App.signed(r.luck, 1)]]));
  }

  function drawPath(el, c) {
    const years = D.seasons.map((s) => s.year);
    const draw = () => {
      const W = App.w(el), H = 250, m = { t: 12, r: 12, b: 26, l: 34 };
      d3.select(el).selectAll("*").remove();
      const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", "Career path");
      const x = d3.scalePoint().domain(years).range([m.l, W - m.r]).padding(0.4);
      const y = d3.scaleLinear().domain([1, 12]).range([m.t, H - m.b]);
      svg.append("g").selectAll("line").data([1, 4, 8, 12]).join("line").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y).attr("y2", y).attr("stroke", "var(--line)");
      svg.append("g").selectAll("text").data([1, 4, 8, 12]).join("text").attr("class", "lbl num").attr("x", m.l - 8).attr("y", y).attr("dy", ".35em").attr("text-anchor", "end").text(App.ord);
      svg.append("g").selectAll("text").data(years).join("text").attr("class", "lbl").attr("x", x).attr("y", H - 6).attr("text-anchor", "middle").text((d) => `'${String(d).slice(2)}`);
      const pts = c.seasonsList;
      svg.append("g").selectAll("line").data(pts).join("line").attr("x1", (d) => x(d.year)).attr("x2", (d) => x(d.year)).attr("y1", (d) => y(d.rank)).attr("y2", (d) => y(d.final)).attr("stroke", (d) => (d.final < d.rank ? "var(--pos)" : d.final > d.rank ? "var(--neg)" : "var(--line-2)")).attr("stroke-width", 2);
      svg.append("g").selectAll("circle").data(pts).join("circle").attr("cx", (d) => x(d.year)).attr("cy", (d) => y(d.rank)).attr("r", 5).attr("fill", "var(--panel)").attr("stroke", "var(--ink-2)").attr("stroke-width", 2);
      const dots = svg.append("g").selectAll("circle").data(pts).join("circle").attr("cx", (d) => x(d.year)).attr("cy", (d) => y(d.final)).attr("r", (d) => (d.final === 1 ? 8 : 6)).attr("fill", (d) => (d.final === 1 ? "var(--gold)" : "var(--s1)")).attr("stroke", "var(--panel)").attr("stroke-width", 2);
      const hit = svg.append("g").selectAll("rect").data(pts).join("rect").attr("x", (d) => x(d.year) - 18).attr("width", 36).attr("y", 0).attr("height", H).attr("fill", "transparent");
      App.hover(hit, (d) => App.tt(`${App.label(d.year)} · ${d.team}`, [["Seed", `${d.rank} of ${d.n}`], ["Final", App.ord(d.final)], ["Result", d.result], ["Category win %", App.pct(d.catPct)]]));
      if (App.booted) dots.attr("r", 0).transition().delay((d, i) => i * 70).duration(400).attr("r", (d) => (d.final === 1 ? 8 : 6));
    };
    draw(); App.onResize(draw);
  }

  function drawDist(el, id) {
    const me = D.extra.weekly.find((x) => x.managerId === id);
    const total = D.extra.weekly.reduce((a, w) => a.map((v, i) => v + w.dist[i]), Array(10).fill(0));
    const tn = d3.sum(total), mn = d3.sum(me.dist);
    const rows = d3.range(10).map((k) => ({ k, me: me.dist[k] / mn, lg: total[k] / tn, n: me.dist[k] }));
    const draw = () => {
      const W = App.w(el), H = 250, m = { t: 12, r: 8, b: 28, l: 36 };
      d3.select(el).selectAll("*").remove();
      const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", "Categories won per week distribution");
      const x = d3.scaleBand().domain(d3.range(10)).range([m.l, W - m.r]).padding(0.3);
      const y = d3.scaleLinear().domain([0, d3.max(rows, (r) => Math.max(r.me, r.lg)) * 1.1]).range([H - m.b, m.t]).nice();
      svg.append("g").attr("class", "grid-l").selectAll("line").data(y.ticks(4)).join("line").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y).attr("y2", y);
      svg.append("g").selectAll("text").data(y.ticks(4)).join("text").attr("class", "lbl num").attr("x", m.l - 6).attr("y", y).attr("dy", ".35em").attr("text-anchor", "end").text((d) => `${Math.round(d * 100)}%`);
      svg.append("g").selectAll("text").data(d3.range(10)).join("text").attr("class", "lbl num").attr("x", (d) => x(d) + x.bandwidth() / 2).attr("y", H - 8).attr("text-anchor", "middle").text((d) => d);
      const bw = Math.min(24, x.bandwidth());
      const bars = svg.append("g").selectAll("path").data(rows).join("path").attr("fill", "var(--s1)");
      const bp = (d, h) => { const x0 = x(d.k) + (x.bandwidth() - bw) / 2, y0 = H - m.b, r = Math.min(4, h); return `M${x0},${y0}v${-(h - r)}a${r},${r} 0 0 1 ${r},${-r}h${bw - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${h - r}Z`; };
      bars.attr("d", (d) => bp(d, Math.max(0.1, H - m.b - y(d.me))));
      svg.append("path").datum(rows).attr("fill", "none").attr("stroke", "var(--ink)").attr("stroke-width", 2).attr("d", d3.line().x((d) => x(d.k) + x.bandwidth() / 2).y((d) => y(d.lg)).curve(d3.curveMonotoneX));
      const hit = svg.append("g").selectAll("rect").data(rows).join("rect").attr("x", (d) => x(d.k)).attr("width", x.bandwidth()).attr("y", 0).attr("height", H).attr("fill", "transparent");
      App.hover(hit, (d) => App.tt(`Won ${d.k} of 9 categories`, [[App.name(id), `${d.n} weeks (${App.pct(d.me, 0)})`], ["League average", App.pct(d.lg, 0)]]));
      svg.append("text").attr("class", "lbl").attr("x", W - m.r).attr("y", H - 8).attr("text-anchor", "end").attr("dy", "-1.2em").text("categories won →");
    };
    draw(); App.onResize(draw);
  }

  function drawRivals(el, id) {
    const cells = D.h2h.cells[id] || {};
    const rows = Object.entries(cells).map(([opp, r]) => ({ opp, ...r, n: r.wins + r.losses + r.ties, p: (r.wins + r.ties / 2) / (r.wins + r.losses + r.ties) })).sort((a, b) => b.p - a.p || b.n - a.n);
    const draw = () => {
      const W = App.w(el), rh = 26, m = { t: 20, r: 70, b: 4, l: 90 }, H = m.t + m.b + rows.length * rh;
      d3.select(el).selectAll("*").remove();
      const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", "Head-to-head record vs each opponent");
      const x = d3.scaleLinear().domain([0, 1]).range([m.l, W - m.r]);
      [0, 0.25, 0.5, 0.75, 1].forEach((v) => { svg.append("line").attr("x1", x(v)).attr("x2", x(v)).attr("y1", m.t - 4).attr("y2", H).attr("stroke", v === 0.5 ? "var(--line-2)" : "var(--line)"); svg.append("text").attr("class", "lbl num").attr("x", x(v)).attr("y", 11).attr("text-anchor", "middle").text(`${v * 100}%`); });
      const g = svg.append("g").selectAll("g").data(rows).join("g").attr("transform", (d, i) => `translate(0,${m.t + i * rh})`);
      g.append("text").attr("class", "lbl-ink").attr("x", m.l - 10).attr("y", rh / 2).attr("dy", ".35em").attr("text-anchor", "end").text((d) => App.name(d.opp));
      g.append("rect").attr("y", 5).attr("height", rh - 10).attr("rx", 3).attr("fill", (d) => (d.p >= 0.5 ? "var(--pos)" : "var(--neg)"))
        .attr("x", (d) => Math.min(x(0.5), x(d.p))).attr("width", (d) => Math.max(2, Math.abs(x(d.p) - x(0.5))));
      g.append("text").attr("class", "lbl-2 num").attr("x", W - m.r + 8).attr("y", rh / 2).attr("dy", ".35em").text((d) => App.rec(d.wins, d.losses, d.ties));
      const hit = g.append("rect").attr("width", W).attr("height", rh).attr("fill", "transparent").style("cursor", "pointer").on("click", (e, d) => App.go(`rivalries`) || (App.rivalPair = [id, d.opp]));
      App.hover(hit, (d) => App.tt(`${App.name(id)} vs ${App.name(d.opp)}`, [["Record", App.rec(d.wins, d.losses, d.ties)], ["Win %", App.pct(d.p, 0)], ["Meetings", d.n]], "Click to open the rivalry"));
    };
    draw(); App.onResize(draw);
  }
})();
