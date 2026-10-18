/* Records: record book tiles, playoff seed→finish arrows, droughts, clutch, best/worst seasons, consistency, schedule. */
(function () {
  const { D, esc } = App;

  App.register("records", "Records", (root) => {
    const R = D.records;
    const ts = R.teamSeasons;
    const best = ts[0], worst = ts[ts.length - 1];
    const clutch = [...R.margins].filter((r) => r.closeWins + r.closeLosses >= 20).sort((a, b) => b.closeWins / (b.closeWins + b.closeLosses) - a.closeWins / (a.closeWins + a.closeLosses))[0];
    const riser = [...R.playoffs].filter((p) => p.appearances >= 3).sort((a, b) => b.avgOverSeed - a.avgOverSeed)[0];
    const S = R.seeds, champSeeds = S.seasons.filter((s) => s.championSeed);
    const lowest = [...champSeeds].sort((a, b) => b.championSeed - a.championSeed)[0];
    const groups = [["playoffs", "Playoffs"], ["streaks", "Streaks & the race"], ["luck", "Luck & what-ifs"], ["scores", "Scorelines"], ["seasons", "Best & worst"], ["fun", "Named after a player"]];

    root.innerHTML = `
      <div><div class="eyebrow">Record book</div><h1 class="title">Clutch, chokes &amp; dynasties</h1>
        <p class="lede">Who rises in the playoffs, who's still waiting on a ring, who gets lucky, and the streaks people still talk about.</p></div>
      <nav class="jump" aria-label="Jump to a record">${groups.map(([k, l]) => `<a class="pill" href="#records" data-jump="${k}">${l}</a>`).join("")}</nav>

      <section class="grid g4">
        <div class="panel rec"><div class="k">Best regular season ${App.info(App.TIP.catPct)}</div><div class="v">${App.pct(best.pct)}</div><div class="d"><b>${esc(best.teamName)}</b> · ${esc(App.name(best.managerId))}, ${esc(best.label)} · ${best.record} · finished ${App.ord(best.finalRank)}</div></div>
        <div class="panel rec"><div class="k">Longest win streak ${App.info(App.TIP.streak)}</div><div class="v">${R.streaks.win[0].length}<small>straight</small></div><div class="d">${App.who(R.streaks.win[0].managerId)} · ${esc(R.streaks.win[0].teamName)}, ${esc(R.streaks.win[0].label)}</div></div>
        <div class="panel rec"><div class="k">Biggest playoff riser ${App.info(App.TIP.overSeed)}</div><div class="v">${App.signed(riser.avgOverSeed, 1)}<small>spots</small></div><div class="d">${App.who(riser.managerId)} · ${riser.appearances} playoff trips (3+ to qualify)</div></div>
        <div class="panel rec"><div class="k">Ice in the veins ${App.info(App.TIP.closeGame)}</div><div class="v">${App.pct(clutch.closeWins / (clutch.closeWins + clutch.closeLosses), 0)}</div><div class="d">${App.who(clutch.managerId)} · ${clutch.closeWins}-${clutch.closeLosses} in one-category weeks</div></div>
      </section>

      <h2 class="group" id="g-playoffs">Playoffs</h2>
      <section class="panel">
        ${App.secHead("Seeds & upsets", "Where every champion came from. Each column is a season's playoff field; gold is the eventual champion.", App.TIP.seeds)}
        <div class="grid g4" style="margin-bottom:16px">
          ${App.tile("Top seed won it all", `${S.topSeedTitles}<small class="muted" style="font-size:20px"> of ${champSeeds.length}</small>`, "seasons the #1 seed took the title")}
          ${App.tile("Higher seed wins", App.pct(S.higherSeedWins / S.bracketGames, 0), `${S.higherSeedWins} of ${S.bracketGames} bracket games`, App.TIP.seeds)}
          ${App.tile("Lowest seed to win", `#${lowest.championSeed}`, `${esc(App.name(lowest.championManagerId))}, ${esc(lowest.label)}`)}
          ${App.tile("Average champion seed", (d3.mean(champSeeds, (s) => s.championSeed)).toFixed(1), "lower = favourites win")}
        </div>
        <div class="chart" id="seedstrip"></div>
      </section>
      <section class="panel">
        ${App.secHead("Playoff risers & fallers", "Arrow runs from average playoff seed to average final finish. Pointing left = finishes better than seeded.", App.TIP.overSeed)}
        <div class="chart" id="seed"></div>
        <div class="legend"><span><i style="background:var(--pos)"></i>Beats their seed</span><span><i style="background:var(--neg)"></i>Falls below their seed</span></div>
      </section>
      <section class="grid g2">
        <div class="panel">${App.secHead("Title droughts", "Seasons since their last championship. Gold = a title year.", App.TIP.drought)}<div class="chart" id="drought"></div></div>
        <div class="panel">${App.secHead("Coin-flip weeks", "Record in weeks decided by one category, and in 7+ category blowouts.", App.TIP.closeGame + " " + App.TIP.blowout)}
          ${App.seg("clutch-k", [["close", "One-category weeks"], ["blow", "Blowouts"]], "close")}
          <div class="chart" id="clutch" style="margin-top:12px"></div></div>
      </section>

      <h2 class="group" id="g-streaks">Streaks &amp; the standings race</h2>
      <section class="panel">
        ${App.secHead("Longest streaks", "Within one regular season. Bars show where the run fell in the season.", App.TIP.streak)}
        <div class="grid g2"><div><h3 class="sub-h">Winning</h3><div class="chart" id="sk-w"></div></div><div><h3 class="sub-h">Losing</h3><div class="chart" id="sk-l"></div></div></div>
      </section>
      <section class="grid g2">
        <div class="panel">${App.secHead("Front-runners", "Most of a season spent in first place.")}<div class="chart" id="front"></div></div>
        <div class="panel">${App.secHead("Comebacks & collapses", "Where they stood after midseason, and where they ended up.", App.TIP.raceStory)}<div class="list" id="cc"></div></div>
      </section>

      <h2 class="group" id="g-luck">Luck &amp; what-ifs</h2>
      <section class="panel">
        ${App.secHead("Matchup luck", "Every team-season: weeks it should have won from its category totals (across) against weeks it actually won (up). Above the line = lucky.", App.TIP.luck)}
        <div class="power" style="grid-template-columns:minmax(0,1.5fr) minmax(280px,1fr)"><div class="chart" id="luck"></div>
          <div><h3 class="sub-h">Career luck</h3><div class="chart" id="cluck"></div></div></div>
      </section>
      <section class="panel">
        ${App.secHead("What if weeks won decided the standings?", "Seasons where ranking by matchups won instead of category win % would have changed the playoff field or first place.", App.TIP.whatIf)}
        <div class="grid g3" id="alts"></div>
      </section>

      <h2 class="group" id="g-scores">Scorelines &amp; sweeps</h2>
      <section class="grid" style="grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:16px;align-items:start">
        <div class="panel">${App.secHead("How matchups end", `${R.scorelines.matchups} matchups. ${App.pct(R.scorelines.withTiedCategory / R.scorelines.matchups, 0)} had at least one tied category.`, App.TIP.scorelines)}<div class="chart" id="scores"></div>
          <div class="legend"><span><i class="sq" style="background:var(--accent)"></i>Decided by one category (or level)</span><span><i class="sq" style="background:var(--s1)"></i>2-6 categories</span><span><i class="sq" style="background:var(--ink)"></i>Blowout (7+)</span><span><i class="sq" style="background:var(--gold)"></i>Sweep</span></div>
          <h3 class="sub-h" style="margin-top:18px">Most dominant seasons ${App.info(App.TIP.dominant)}</h3><div class="list" id="dominant"></div></div>
        <div class="panel">${App.secHead(`Clean sweeps (${R.sweeps.length})`, "Every 9-0 week in league history.", App.TIP.sweep)}<div class="list" id="sweeps"></div></div>
      </section>

      <h2 class="group" id="g-seasons">Best &amp; worst seasons</h2>
      <section class="grid g2">
        <div class="panel">${App.secHead("Best regular seasons ever", "Ranked by category win %, the number the standings use.", App.TIP.catPct)}<div class="list" id="best"></div></div>
        <div class="panel">${App.secHead("Worst regular seasons ever", "Somebody had to.", App.TIP.catPct)}<div class="list" id="worst"></div></div>
      </section>
      <section class="grid g2">
        <div class="panel">${App.secHead("Steady or streaky?", "Typical finish (across) against how much it swings year to year (up). Bottom-left = always good.", App.TIP.consistency)}<div class="chart" id="cons"></div></div>
        <div class="panel">${App.secHead("Parity by season", "Each bar runs from the worst to the best category win % that season. The orange tick is the last playoff seed.", App.TIP.parity)}<div class="chart" id="parity"></div></div>
      </section>

      <h2 class="group" id="g-fun">Named after a player</h2>
      <section class="panel">${App.secHead("Did the namesake deliver?", "Teams named after a player: did they have him, and how did both do?", App.TIP.namesake)}<div class="ncards" id="names"></div>
        <button type="button" class="btn" id="names-more" style="margin-top:14px">Show all ${R.namesakes.length} teams</button></section>`;

    root.querySelector(".jump").addEventListener("click", (e) => { const a = e.target.closest("[data-jump]"); if (!a) return; e.preventDefault(); root.querySelector("#g-" + a.dataset.jump).scrollIntoView({ behavior: "smooth", block: "start" }); });

    const seasonRow = (r, i) => `<div><span class="rk">${i + 1}</span><div class="l"><div class="t1">${esc(r.teamName)}</div><div class="t2">${esc(App.name(r.managerId))} · <a href="#season-${r.year}" data-panel="season:${r.year}">${esc(r.label)}</a> · finished ${App.ord(r.finalRank)}</div></div>
      <div class="rv"><b>${App.pct(r.pct)}</b><div class="t2">${r.record}</div></div></div>`;
    root.querySelector("#best").innerHTML = ts.slice(0, 8).map(seasonRow).join("");
    root.querySelector("#worst").innerHTML = [...ts].reverse().slice(0, 8).map(seasonRow).join("");

    // Comebacks & collapses list
    const rr = R.race;
    const ccRow = (r, kind) => `<div><div class="l"><div class="t1"><span class="badge ${kind === "Comeback" ? "" : "out"}" style="margin-right:6px">${kind}</span>${esc(r.teamName)}</div>
      <div class="t2">${esc(App.name(r.managerId))} · ${esc(r.label)}</div></div>
      <div class="rv"><span class="num">${App.ord(r.rank)} <span class="muted">wk ${r.week}</span> → ${kind === "Collapse" || kind === "Final-week heartbreak" ? `<b class="neg">missed</b>` : `<b class="pos">${App.ord(r.seed)} seed</b>`}</span><div class="t2">finished ${App.ord(r.finalRank)}</div></div></div>`;
    root.querySelector("#cc").innerHTML = [...rr.comebacks.slice(0, 5).map((r) => ccRow(r, "Comeback")), ...rr.collapses.map((r) => ccRow(r, "Collapse")), ...rr.heartbreaks.map((r) => ccRow(r, "Final-week heartbreak"))].join("");

    // What-if cards
    const alts = R.alternates.filter((a) => a.out.length || a.altTop.m !== a.actualTop.m);
    root.querySelector("#alts").innerHTML = alts.length ? alts.map((a) => `<a class="alt" href="#season-${a.year}"><div class="an">${esc(a.label)}</div>
        ${a.out.length ? `<div class="sw"><span class="neg">▼ out</span> ${a.out.map((r) => `<b>${esc(r.team)}</b> <span class="muted">(${esc(App.name(r.m))})</span>`).join(", ")}</div><div class="sw"><span class="pos">▲ in</span> ${a.in.map((r) => `<b>${esc(r.team)}</b> <span class="muted">(${esc(App.name(r.m))})</span>`).join(", ")}</div>` : ""}
        ${a.altTop.m !== a.actualTop.m ? `<div class="sw"><span style="color:var(--gold)">★ 1st</span> <b>${esc(a.altTop.team)}</b> instead of ${esc(a.actualTop.team)}</div>` : ""}
        ${a.finalistsOut.length ? `<div class="badge orange" style="margin-top:6px">A finalist would have missed the playoffs</div>` : ""}</a>`).join("")
      : `<p class="muted">Every season would have had the same first place and playoff field.</p>`;

    // Sweeps + dominant
    root.querySelector("#sweeps").innerHTML = R.sweeps.map((s) => `<div><div class="l"><div class="t1">${esc(s.winnerTeam)} <span class="muted">over</span> ${esc(s.loserTeam)}</div><div class="t2">${esc(App.name(s.winnerManagerId))} · ${esc(s.label)}, ${s.stage === "regular" ? `week ${s.week}` : "playoffs"}</div></div><div class="rv"><b class="num">9-0</b></div></div>`).join("");
    root.querySelector("#dominant").innerHTML = R.dominant.slice(0, 5).map((r, i) => `<div><span class="rk">${i + 1}</span><div class="l"><div class="t1">${esc(r.teamName)}</div><div class="t2">${esc(App.name(r.managerId))} · ${esc(r.label)} · ${r.wins}-${r.losses}</div></div><div class="rv"><b class="num">+${r.avgWinMargin.toFixed(2)}</b><div class="t2">cats per win</div></div></div>`).join("");

    // Namesakes
    const namesEl = root.querySelector("#names"), more = root.querySelector("#names-more");
    more.addEventListener("click", () => { const open = namesEl.classList.toggle("all"); more.textContent = open ? "Show fewer" : `Show all ${R.namesakes.length} teams`; });
    namesEl.innerHTML = R.namesakes.map((n) => {
      const had = n.draftedBy === "them" ? (n.ownedAtEnd ? ["pos", "Drafted & kept him"] : ["", "Drafted him, lost him"]) : n.ownedAtEnd ? ["pos", "Got him later"] : n.draftedBy ? ["neg", `${App.name(n.draftedBy)} had him`] : ["out", "Never had him"];
      return `<div class="ncard"><div class="nt">${esc(n.teamName)}</div><div class="small muted">${esc(App.name(n.managerId))} · ${esc(n.label)}</div>
        <div class="nrow"><div><span class="lbl2">${esc(n.playerName)}</span><b class="num">${App.rankLabel(n.actualRank)}</b></div><div><span class="lbl2">Team</span><b class="num">${n.finalRank === 1 ? "🏆 1st" : `${App.ord(n.finalRank)}/${n.teamCount}`}</b></div></div>
        <span class="badge ${had[0] === "pos" ? "gold" : had[0] === "neg" ? "orange" : ""}">${esc(had[1])}</span></div>`;
    }).join("");

    let ck = "close";
    const clutchEl = root.querySelector("#clutch");
    App.bindSeg(root, "clutch-k", (v) => { ck = v; drawClutch(clutchEl, R.margins, ck); });
    const draw = () => {
      drawSeedStrip(root.querySelector("#seedstrip"), S);
      drawSeed(root.querySelector("#seed"), R.playoffs);
      drawDrought(root.querySelector("#drought"));
      drawClutch(clutchEl, R.margins, ck);
      drawStreaks(root.querySelector("#sk-w"), R.streaks.win, "var(--pos)");
      drawStreaks(root.querySelector("#sk-l"), R.streaks.loss, "var(--neg)");
      drawFront(root.querySelector("#front"), rr.frontRunners);
      drawLuck(root.querySelector("#luck"), R.luck);
      drawCareerLuck(root.querySelector("#cluck"), R.careerLuck);
      drawScores(root.querySelector("#scores"), R.scorelines);
      drawCons(root.querySelector("#cons"), R.consistency);
      drawParity(root.querySelector("#parity"), R.parity);
    };
    draw(); App.onResize(draw);
  });

  // ---------- Champion seed strip ----------
  function drawSeedStrip(el, S) {
    el.innerHTML = "";
    const rows = S.seasons, maxSeed = 8;
    const W = App.w(el), H = 250, m = { t: 14, r: 10, b: 54, l: 56 };
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", "Champion's seed each season");
    const x = d3.scaleBand().domain(rows.map((r) => r.year)).range([m.l, W - m.r]).padding(0.3);
    const y = d3.scaleLinear().domain([1, maxSeed]).range([m.t + 8, H - m.b - 8]);
    d3.range(1, maxSeed + 1).forEach((k) => { svg.append("text").attr("class", "lbl num").attr("x", m.l - 12).attr("y", y(k)).attr("dy", ".35em").attr("text-anchor", "end").text(`#${k}`); });
    svg.append("text").attr("class", "lbl").attr("x", 0).attr("y", m.t - 2).text("SEED").style("font-weight", 700);
    const g = svg.append("g").selectAll("g").data(rows).join("g").attr("data-m", (r) => r.managerId ?? r.championManagerId ?? null).attr("transform", (r) => `translate(${x(r.year) + x.bandwidth() / 2},0)`);
    g.append("line").attr("y1", y(1)).attr("y2", (r) => y(D.seasons.find((s) => s.year === r.year).playoffTeams)).attr("stroke", "var(--line)").attr("stroke-width", 10).attr("stroke-linecap", "round");
    g.each(function (r) { const n = D.seasons.find((s) => s.year === r.year).playoffTeams; d3.select(this).selectAll("circle.s").data(d3.range(1, n + 1)).join("circle").attr("class", "s").attr("cy", y).attr("r", 3).attr("fill", "var(--line-2)"); });
    g.filter((r) => r.championSeed).append("circle").attr("cy", y(1)).attr("r", 11).attr("fill", "var(--gold)").attr("stroke", "var(--panel)").attr("stroke-width", 3)
      .transition().duration(900).delay((r, i) => 150 + i * 90).ease(d3.easeBounceOut).attr("cy", (r) => y(r.championSeed));
    g.filter((r) => r.championSeed).append("text").attr("y", (r) => y(r.championSeed)).attr("dy", ".35em").attr("text-anchor", "middle").style("font-size", "10px").style("font-weight", 800).style("fill", "#fff").style("opacity", 0).text((r) => r.championSeed).transition().delay((r, i) => 1050 + i * 90).style("opacity", 1);
    g.append("text").attr("class", "lbl-ink").attr("y", H - m.b + 18).attr("text-anchor", "middle").text((r) => App.label(r.year));
    g.append("text").attr("class", "lbl").attr("y", H - m.b + 34).attr("text-anchor", "middle").text((r) => `#1 seed: ${App.ord(r.topSeedFinish)}`);
    App.hover(g, (r) => App.tt(App.label(r.year), [["Champion", r.championManagerId ? `${App.name(r.championManagerId)} (#${r.championSeed} seed)` : "—"], ["#1 seed", `${r.topSeedTeam} (${App.name(r.topSeedManagerId)})`], ["#1 seed finished", App.ord(r.topSeedFinish)]]));
  }

  // ---------- Streaks: bars placed on the season's week axis ----------
  function drawStreaks(el, rows, color) {
    el.innerHTML = "";
    const W = App.w(el), rh = 34, m = { t: 16, r: 10, l: 150 }, H = m.t + rows.length * rh;
    const maxWk = 20;
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", "Longest streaks");
    const x = d3.scaleLinear().domain([1, maxWk + 1]).range([m.l, W - m.r]);
    [1, 5, 10, 15, 20].forEach((w) => svg.append("text").attr("class", "lbl num").attr("x", x(w)).attr("y", 10).attr("text-anchor", "middle").text(`wk ${w}`));
    const g = svg.append("g").selectAll("g").data(rows).join("g").attr("data-m", (r) => r.managerId ?? r.championManagerId ?? null).attr("transform", (r, i) => `translate(0,${m.t + i * rh})`);
    g.append("text").attr("class", "lbl-ink").attr("x", m.l - 10).attr("y", rh / 2 - 6).attr("dy", ".35em").attr("text-anchor", "end").text((r) => App.name(r.managerId));
    g.append("text").attr("class", "lbl").attr("x", m.l - 10).attr("y", rh / 2 + 8).attr("dy", ".35em").attr("text-anchor", "end").text((r) => r.label);
    g.append("rect").attr("x", m.l).attr("width", W - m.l - m.r).attr("y", rh / 2 - 9).attr("height", 18).attr("rx", 4).attr("fill", "var(--panel-2)");
    g.append("rect").attr("x", (r) => x(r.fromWeek)).attr("y", rh / 2 - 9).attr("height", 18).attr("rx", 4).attr("fill", color).attr("width", 0)
      .transition().duration(700).delay((r, i) => i * 60).attr("width", (r) => x(r.toWeek + 1) - x(r.fromWeek));
    g.append("text").attr("x", (r) => x(r.fromWeek) + 7).attr("y", rh / 2).attr("dy", ".35em").style("fill", "#fff").style("font-weight", 800).style("font-size", "12px").text((r) => r.length);
    App.hover(g, (r) => App.tt(`${r.teamName}`, [["Manager", App.name(r.managerId)], ["Season", r.label], ["Streak", `${r.length} straight`], ["Weeks", `${r.fromWeek}–${r.toWeek}`]]));
  }

  // ---------- Front-runners: weeks in first as share of season ----------
  function drawFront(el, rows) {
    el.innerHTML = "";
    const W = App.w(el), rh = 30, m = { t: 4, r: 90, l: 170 }, H = m.t + rows.length * rh;
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", "Most weeks in first place");
    const x = d3.scaleLinear().domain([0, 1]).range([0, W - m.l - m.r]);
    const g = svg.append("g").selectAll("g").data(rows).join("g").attr("data-m", (r) => r.managerId ?? r.championManagerId ?? null).attr("transform", (r, i) => `translate(0,${m.t + i * rh})`);
    g.append("text").attr("class", "lbl-ink").attr("x", m.l - 10).attr("y", rh / 2 - 6).attr("dy", ".35em").attr("text-anchor", "end").text((r) => (r.teamName.length > 20 ? r.teamName.slice(0, 19) + "…" : r.teamName));
    g.append("text").attr("class", "lbl").attr("x", m.l - 10).attr("y", rh / 2 + 7).attr("dy", ".35em").attr("text-anchor", "end").text((r) => `${App.name(r.managerId)}, ${r.label}`);
    g.append("rect").attr("x", m.l).attr("y", 7).attr("height", rh - 14).attr("width", x(1)).attr("rx", 3).attr("fill", "var(--panel-2)");
    g.append("rect").attr("x", m.l).attr("y", 7).attr("height", rh - 14).attr("rx", 3).attr("fill", (r) => (r.finalRank === 1 ? "var(--gold)" : "var(--s1)")).attr("width", 0).transition().duration(700).attr("width", (r) => x(r.weeksInFirst / r.weeks));
    g.append("text").attr("class", "lbl-2 num").attr("x", W - m.r + 8).attr("y", rh / 2).attr("dy", ".35em").text((r) => `${r.weeksInFirst}/${r.weeks} · ${r.finalRank === 1 ? "won it" : App.ord(r.finalRank)}`);
  }

  // ---------- Luck scatter: expected vs actual matchup wins ----------
  function drawLuck(el, rows) {
    el.innerHTML = "";
    const W = App.w(el), H = 340, m = { t: 14, r: 14, b: 40, l: 44 };
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", "Expected versus actual matchup wins");
    const ext = [d3.min(rows, (r) => Math.min(r.actual, r.expected)) - 0.5, d3.max(rows, (r) => Math.max(r.actual, r.expected)) + 0.5];
    const x = d3.scaleLinear().domain(ext).range([m.l, W - m.r]), y = d3.scaleLinear().domain(ext).range([H - m.b, m.t]);
    svg.append("path").attr("d", `M${x(ext[0])},${y(ext[0])}L${x(ext[1])},${y(ext[1])}L${x(ext[0])},${y(ext[1])}Z`).attr("fill", "var(--pos-wash)").attr("opacity", 0.45);
    svg.append("line").attr("x1", x(ext[0])).attr("y1", y(ext[0])).attr("x2", x(ext[1])).attr("y2", y(ext[1])).attr("stroke", "var(--ink-2)").attr("stroke-dasharray", "4 4");
    svg.append("text").attr("class", "lbl").attr("x", x(ext[0]) + 8).attr("y", y(ext[1]) + 14).text("LUCKY ↖").style("font-weight", 700).style("fill", "var(--pos)");
    svg.append("text").attr("class", "lbl").attr("x", x(ext[1]) - 8).attr("y", y(ext[0]) - 8).attr("text-anchor", "end").text("↘ UNLUCKY").style("font-weight", 700).style("fill", "var(--neg)");
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(6));
    svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(6));
    svg.append("text").attr("class", "lbl").attr("x", W - m.r).attr("y", H - 6).attr("text-anchor", "end").text("weeks they should have won →");
    svg.append("text").attr("class", "lbl").attr("x", m.l).attr("y", m.t - 2).text("weeks won ↑");
    const c = svg.append("g").selectAll("circle").data(rows).join("circle").attr("data-m", (r) => r.m).attr("cx", (r) => x(r.expected)).attr("cy", (r) => y(r.actual)).attr("r", 0)
      .attr("fill", (r) => (r.luck >= 0 ? "var(--pos)" : "var(--neg)")).attr("fill-opacity", (r) => 0.35 + Math.min(0.6, Math.abs(r.luck) / 3)).attr("stroke", "var(--panel)");
    c.transition().duration(500).delay((r, i) => i * 6).attr("r", 5.5);
    App.hover(c, (r) => App.tt(`${r.team} · ${r.label}`, [["Manager", App.name(r.m)], ["Weeks won", r.actual], ["Expected", r.expected.toFixed(1)], ["Luck", App.signed(r.luck, 1)]]));
    [rows[0], rows[rows.length - 1]].forEach((r, i) => svg.append("text").attr("class", "lbl-ink").attr("x", x(r.expected) + (i ? 9 : -9)).attr("y", y(r.actual)).attr("dy", ".35em").attr("text-anchor", i ? "start" : "end").text(`${App.name(r.m)} ${r.label}`));
  }

  function drawCareerLuck(el, rows) {
    el.innerHTML = "";
    const W = App.w(el), rh = 24, m = { t: 4, r: 44, l: 80 }, H = m.t + rows.length * rh;
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", "Career matchup luck");
    const mx = d3.max(rows, (r) => Math.abs(r.luck));
    const x = d3.scaleLinear().domain([-mx, mx]).range([m.l, W - m.r]);
    svg.append("line").attr("x1", x(0)).attr("x2", x(0)).attr("y1", 0).attr("y2", H).attr("stroke", "var(--line-2)");
    const g = svg.append("g").selectAll("g").data(rows).join("g").attr("data-m", (r) => r.managerId ?? r.championManagerId ?? null).attr("transform", (r, i) => `translate(0,${m.t + i * rh})`);
    g.append("text").attr("class", "lbl-ink").attr("x", m.l - 8).attr("y", rh / 2).attr("dy", ".35em").attr("text-anchor", "end").text((r) => App.name(r.managerId));
    g.append("rect").attr("y", 5).attr("height", rh - 10).attr("rx", 3).attr("fill", (r) => (r.luck >= 0 ? "var(--pos)" : "var(--neg)")).attr("x", x(0)).attr("width", 0)
      .transition().duration(600).attr("x", (r) => Math.min(x(0), x(r.luck))).attr("width", (r) => Math.abs(x(r.luck) - x(0)));
    g.append("text").attr("class", "lbl-2 num").attr("x", W - m.r + 6).attr("y", rh / 2).attr("dy", ".35em").text((r) => App.signed(r.luck, 1));
    App.hover(g, (r) => App.tt(App.name(r.managerId), [["Career luck", `${App.signed(r.luck, 1)} weeks`], ["Seasons", r.seasons]]));
  }

  // ---------- Scorelines histogram ----------
  function drawScores(el, S) {
    el.innerHTML = "";
    const rows = S.rows.slice(0, 12);
    const W = App.w(el), H = 280, m = { t: 22, r: 8, b: 30, l: 8 };
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", "How often each final score happens");
    const x = d3.scaleBand().domain(rows.map((r) => r.score)).range([m.l, W - m.r]).padding(0.22);
    const y = d3.scaleLinear().domain([0, d3.max(rows, (r) => r.count)]).range([H - m.b, m.t]);
    const margin = (s) => { const [a, b] = s.split("-").map(Number); return a - b; };
    const col = (s) => (margin(s) === 9 ? "var(--gold)" : margin(s) <= 1 ? "var(--accent)" : margin(s) >= 7 ? "var(--ink)" : "var(--s1)");
    const g = svg.append("g").selectAll("g").data(rows).join("g").attr("data-m", (r) => r.managerId ?? r.championManagerId ?? null);
    g.append("rect").attr("x", (r) => x(r.score)).attr("width", x.bandwidth()).attr("rx", 4).attr("y", H - m.b).attr("height", 0).attr("fill", (r) => col(r.score))
      .transition().duration(700).delay((r, i) => i * 40).attr("y", (r) => y(r.count)).attr("height", (r) => H - m.b - y(r.count));
    g.append("text").attr("class", "lbl-2 num").attr("x", (r) => x(r.score) + x.bandwidth() / 2).attr("y", (r) => y(r.count) - 6).attr("text-anchor", "middle").text((r) => App.pct(r.share, 0));
    g.append("text").attr("class", "lbl-ink num").attr("x", (r) => x(r.score) + x.bandwidth() / 2).attr("y", H - 10).attr("text-anchor", "middle").text((r) => r.score);
    App.hover(g, (r) => App.tt(`Final score ${r.score}`, [["Matchups", r.count], ["Share", App.pct(r.share, 1)]], margin(r.score) <= 1 ? "Decided by one category" : margin(r.score) >= 7 ? "A blowout" : ""));
  }

  // ---------- Parity by season: worst→best range, bubble marker ----------
  function drawParity(el, rows) {
    el.innerHTML = "";
    const W = App.w(el), rh = 36, m = { t: 22, r: 70, l: 70 }, H = m.t + rows.length * rh;
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", "Spread of standings by season");
    const x = d3.scaleLinear().domain([d3.min(rows, (r) => r.worst) - 0.02, d3.max(rows, (r) => r.best) + 0.02]).range([m.l, W - m.r]);
    [0.4, 0.5, 0.6].forEach((v) => { svg.append("line").attr("x1", x(v)).attr("x2", x(v)).attr("y1", m.t - 6).attr("y2", H).attr("stroke", v === 0.5 ? "var(--line-2)" : "var(--line)"); svg.append("text").attr("class", "lbl num").attr("x", x(v)).attr("y", 12).attr("text-anchor", "middle").text(`${v * 100}%`); });
    const tight = d3.min(rows, (r) => r.spread);
    const g = svg.append("g").selectAll("g").data(rows).join("g").attr("data-m", (r) => r.managerId ?? r.championManagerId ?? null).attr("transform", (r, i) => `translate(0,${m.t + i * rh})`);
    g.append("text").attr("class", "lbl-ink").attr("x", m.l - 10).attr("y", rh / 2).attr("dy", ".35em").attr("text-anchor", "end").text((r) => r.label);
    g.append("line").attr("y1", rh / 2).attr("y2", rh / 2).attr("x1", (r) => x((r.best + r.worst) / 2)).attr("x2", (r) => x((r.best + r.worst) / 2)).attr("stroke", (r) => (r.spread === tight ? "var(--s1)" : "var(--line-2)")).attr("stroke-width", 10).attr("stroke-linecap", "round")
      .transition().duration(700).attr("x1", (r) => x(r.worst)).attr("x2", (r) => x(r.best));
    g.filter((r) => r.bubbleGap != null).append("line").attr("x1", (r) => x(r.best - r.bubbleGap)).attr("x2", (r) => x(r.best - r.bubbleGap)).attr("y1", rh / 2 - 9).attr("y2", rh / 2 + 9).attr("stroke", "var(--accent)").attr("stroke-width", 3);
    g.append("text").attr("class", "lbl-2 num").attr("x", W - m.r + 8).attr("y", rh / 2).attr("dy", ".35em").text((r) => `±${(r.spread * 100).toFixed(1)}`);
    App.hover(g, (r) => App.tt(r.label, [["Best", App.pct(r.best)], ["Worst", App.pct(r.worst)], ["Spread (SD)", `${(r.spread * 100).toFixed(1)} pts`], ["1st to last playoff seed", r.bubbleGap == null ? "—" : `${(r.bubbleGap * 100).toFixed(1)} pts`]], r.spread === tight ? "Most even season" : ""));
  }

  function drawSeed(el, rows) {
    el.innerHTML = "";
    rows = [...rows].sort((a, b) => b.avgOverSeed - a.avgOverSeed);
    const W = App.w(el), rh = 30, m = { t: 26, r: 150, b: 8, l: 96 }, H = m.t + m.b + rows.length * rh;
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", "Average playoff seed versus average finish");
    const x = d3.scaleLinear().domain([1, 8]).range([m.l, W - m.r]);
    d3.range(1, 9).forEach((v) => {
      svg.append("line").attr("x1", x(v)).attr("x2", x(v)).attr("y1", m.t - 6).attr("y2", H - m.b).attr("stroke", "var(--line)");
      svg.append("text").attr("class", "lbl num").attr("x", x(v)).attr("y", 12).attr("text-anchor", "middle").text(App.ord(v));
    });
    svg.append("defs").html(`<marker id="ar-p" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--pos)"/></marker><marker id="ar-n" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--neg)"/></marker>`);
    const g = svg.append("g").selectAll("g").data(rows).join("g").attr("data-m", (r) => r.managerId ?? r.championManagerId ?? null).attr("transform", (d, i) => `translate(0,${m.t + i * rh})`);
    g.append("text").attr("class", "lbl-ink").attr("x", m.l - 12).attr("y", rh / 2).attr("dy", ".35em").attr("text-anchor", "end").text((d) => App.name(d.managerId));
    g.append("circle").attr("cx", (d) => x(d.avgSeed)).attr("cy", rh / 2).attr("r", 4).attr("fill", "var(--panel)").attr("stroke", "var(--ink-2)").attr("stroke-width", 1.5);
    g.append("line").attr("x1", (d) => x(d.avgSeed)).attr("x2", (d) => x(d.avgSeed)).attr("y1", rh / 2).attr("y2", rh / 2)
      .attr("stroke", (d) => (d.avgOverSeed >= 0 ? "var(--pos)" : "var(--neg)")).attr("stroke-width", 3)
      .attr("marker-end", (d) => (Math.abs(d.avgOverSeed) > 0.15 ? `url(#ar-${d.avgOverSeed >= 0 ? "p" : "n"})` : null))
      .transition().duration(800).delay((d, i) => i * 40).ease(d3.easeCubicOut).attr("x2", (d) => x(d.avgFinish) + (d.avgOverSeed > 0.15 ? 4 : d.avgOverSeed < -0.15 ? -4 : 0));
    g.append("text").attr("class", "lbl-2 num").attr("x", W - m.r + 12).attr("y", rh / 2).attr("dy", ".35em")
      .text((d) => `${App.signed(d.avgOverSeed, 1)} · ${d.playoffWins}-${d.playoffLosses}${d.titles ? "  " + "🏆".repeat(d.titles) : ""}`);
    const hit = g.append("rect").attr("width", W).attr("height", rh).attr("fill", "transparent");
    App.hover(hit, (d) => App.tt(App.name(d.managerId), [["Playoff trips", d.appearances], ["Avg seed", d.avgSeed.toFixed(1)], ["Avg finish", d.avgFinish.toFixed(1)], ["Places gained", App.signed(d.avgOverSeed, 1)], ["Playoff W-L", `${d.playoffWins}-${d.playoffLosses}`], ["Finals / titles", `${d.finals} / ${d.titles}`]]));
  }

  function drawDrought(el) {
    el.innerHTML = "";
    const years = D.seasons.map((s) => s.year);
    const rows = D.records.droughts;
    const W = App.w(el), rh = 26, m = { t: 22, r: 74, b: 4, l: 86 }, H = m.t + m.b + rows.length * rh;
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", "Seasons played and titles by manager");
    const x = d3.scaleBand().domain(years).range([m.l, W - m.r]).padding(0.18);
    years.forEach((y) => svg.append("text").attr("class", "lbl").attr("x", x(y) + x.bandwidth() / 2).attr("y", 12).attr("text-anchor", "middle").text(`'${String(y - 1).slice(2)}`));
    const g = svg.append("g").selectAll("g").data(rows).join("g").attr("data-m", (r) => r.managerId ?? r.championManagerId ?? null).attr("transform", (d, i) => `translate(0,${m.t + i * rh})`);
    g.append("text").attr("class", "lbl-ink").attr("x", m.l - 10).attr("y", rh / 2).attr("dy", ".35em").attr("text-anchor", "end").text((d) => App.name(d.managerId));
    g.each(function (d) {
      const list = App.career(d.managerId).seasonsList;
      const yrs = new Map(list.map((s) => [s.year, s]));
      const lastWin = Math.max(-Infinity, ...list.filter((s) => s.final === 1).map((s) => s.year));
      d3.select(this).selectAll("rect").data(years).join("rect").attr("x", (y) => x(y)).attr("y", 5).attr("width", x.bandwidth()).attr("height", rh - 10).attr("rx", 3)
        .attr("fill", (y) => { const s = yrs.get(y); if (!s) return "transparent"; if (s.final === 1) return "var(--gold)"; return y > lastWin ? "var(--neg-wash)" : "var(--panel-2)"; })
        .attr("stroke", (y) => (yrs.get(y) ? "none" : "var(--line)")).attr("stroke-dasharray", "2 2");
      App.hover(d3.select(this).selectAll("rect"), (y) => { const s = yrs.get(y); return s ? App.tt(`${App.name(d.managerId)} · ${App.label(y)}`, [["Team", s.team], ["Finish", `${App.ord(s.final)} of ${s.n}`]]) : App.tt(`${App.label(y)}`, [], "Not in the league"); });
    });
    g.append("text").attr("class", "lbl-2").attr("x", W - m.r + 8).attr("y", rh / 2).attr("dy", ".35em").style("font-weight", 600)
      .text((d) => (d.current === 0 ? "Reigning 👑" : `${d.current} season${d.current > 1 ? "s" : ""}`));
  }

  function drawClutch(el, rows, k) {
    el.innerHTML = "";
    const w = k === "close" ? "closeWins" : "blowoutWins", l = k === "close" ? "closeLosses" : "blowoutLosses";
    rows = [...rows].sort((a, b) => b[w] - b[l] - (a[w] - a[l]) || b[w] - a[w]);
    const W = App.w(el), rh = 26, m = { t: 20, r: 8, b: 4, l: 86 }, H = m.t + m.b + rows.length * rh;
    const max = d3.max(rows, (r) => Math.max(r[w], r[l]));
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", "Wins and losses in close or blowout weeks");
    const cx = m.l + (W - m.l - m.r) / 2;
    const x = d3.scaleLinear().domain([0, max]).range([0, (W - m.l - m.r) / 2 - 30]);
    svg.append("text").attr("class", "lbl").attr("x", cx - 6).attr("y", 11).attr("text-anchor", "end").text("◀ losses");
    svg.append("text").attr("class", "lbl").attr("x", cx + 6).attr("y", 11).text("wins ▶");
    svg.append("line").attr("x1", cx).attr("x2", cx).attr("y1", m.t - 2).attr("y2", H).attr("stroke", "var(--line-2)");
    const g = svg.append("g").selectAll("g").data(rows).join("g").attr("data-m", (r) => r.managerId ?? r.championManagerId ?? null).attr("transform", (d, i) => `translate(0,${m.t + i * rh})`);
    g.append("text").attr("class", "lbl-ink").attr("x", m.l - 10).attr("y", rh / 2).attr("dy", ".35em").attr("text-anchor", "end").text((d) => App.name(d.managerId));
    g.append("rect").attr("y", 5).attr("height", rh - 10).attr("rx", 3).attr("fill", "var(--pos)").attr("x", cx + 1).attr("width", 0).transition().duration(600).attr("width", (d) => x(d[w]));
    g.append("rect").attr("y", 5).attr("height", rh - 10).attr("rx", 3).attr("fill", "var(--neg)").attr("x", cx - 1).attr("width", 0).transition().duration(600).attr("x", (d) => cx - 1 - x(d[l])).attr("width", (d) => x(d[l]));
    g.append("text").attr("class", "lbl-2 num").attr("y", rh / 2).attr("dy", ".35em").attr("x", (d) => cx + x(d[w]) + 6).text((d) => d[w]);
    g.append("text").attr("class", "lbl-2 num").attr("y", rh / 2).attr("dy", ".35em").attr("text-anchor", "end").attr("x", (d) => cx - x(d[l]) - 6).text((d) => d[l]);
    const hit = g.append("rect").attr("width", W).attr("height", rh).attr("fill", "transparent");
    App.hover(hit, (d) => App.tt(App.name(d.managerId), [["One-category weeks", `${d.closeWins}-${d.closeLosses}`], ["Blowouts (7+)", `${d.blowoutWins}-${d.blowoutLosses}`]]));
  }

  function drawCons(el, rows) {
    el.innerHTML = "";
    const W = App.w(el), H = 340, m = { t: 14, r: 110, b: 40, l: 46 };
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", "Typical finish against year-to-year swing");
    const x = d3.scaleLinear().domain([0, Math.max(0.8, d3.max(rows, (r) => r.avgPercentile) + 0.05)]).range([m.l, W - m.r]);
    const y = d3.scaleLinear().domain([0, d3.max(rows, (r) => r.spread) * 1.15]).range([H - m.b, m.t]).nice();
    svg.append("rect").attr("x", m.l).attr("y", y(y.domain()[1] / 2)).attr("width", x(0.5) - m.l).attr("height", H - m.b - y(y.domain()[1] / 2)).attr("fill", "var(--pos-wash)").attr("opacity", 0.6);
    svg.append("text").attr("class", "lbl").attr("x", m.l + 6).attr("y", H - m.b - 8).text("always near the top");
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(5).tickFormat((v) => (v === 0 ? "1st" : `top ${Math.round(v * 100)}%`)));
    svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickFormat((v) => `±${Math.round(v * 100)}%`));
    svg.append("text").attr("class", "lbl").attr("x", W - m.r).attr("y", H - 6).attr("text-anchor", "end").text("typical finish →");
    const g = svg.append("g").selectAll("g").data(rows).join("g").attr("data-m", (r) => r.managerId ?? r.championManagerId ?? null).attr("transform", (d) => `translate(${x(d.avgPercentile)},${y(d.spread)})`);
    g.append("circle").attr("r", 0).attr("fill", (d) => (App.career(d.managerId).titles ? "var(--gold)" : "var(--s1)")).attr("stroke", "var(--panel)").attr("stroke-width", 2).transition().duration(500).delay((d, i) => i * 40).attr("r", 7);
    // Labels: start beside each dot, then nudge vertically apart so none overlap; a thin leader shows any shift.
    // Names sit in a column on the right, in the dots' vertical order, 15px apart, with leader lines to each dot.
    const colX = W - m.r + 14;
    const labs = rows.map((d) => ({ d, x0: x(d.avgPercentile), y0: y(d.spread) })).sort((p, q) => p.y0 - q.y0);
    const span = (labs.length - 1) * 15, mid = d3.mean(labs, (l) => l.y0);
    let top = Math.max(m.t, Math.min(mid - span / 2, H - m.b - span));
    labs.forEach((l, i) => (l.y = top + i * 15));
    const lg = svg.append("g");
    lg.selectAll("path").data(labs).join("path").attr("fill", "none").attr("stroke", "var(--line-2)")
      .attr("d", (l) => `M${l.x0 + 8},${l.y0}C${colX - 30},${l.y0} ${colX - 30},${l.y} ${colX - 4},${l.y}`);
    lg.selectAll("text").data(labs).join("text").attr("class", "lbl-ink").attr("x", colX).attr("y", (l) => l.y).attr("dy", ".35em").text((l) => App.name(l.d.managerId));
    App.hover(g, (d) => App.tt(App.name(d.managerId), [["Seasons", d.seasons], ["Typical finish", `top ${App.pct(d.avgPercentile, 0)}`], ["Swing", `±${App.pct(d.spread, 0)}`], ["Titles", App.career(d.managerId).titles]]));
  }

})();
