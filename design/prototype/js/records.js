/* Records: record book tiles, playoff seed→finish arrows, droughts, clutch, best/worst seasons, consistency, schedule. */
(function () {
  const { D, esc } = App;

  App.register("records", "Records", (root) => {
    const R = D.records;
    const ts = R.teamSeasons;
    const best = ts[0], worst = ts[ts.length - 1];
    const dr = R.droughts.filter((d) => d.titles === 0).sort((a, b) => b.current - a.current)[0];
    const clutch = [...R.margins].filter((r) => r.closeWins + r.closeLosses >= 20).sort((a, b) => b.closeWins / (b.closeWins + b.closeLosses) - a.closeWins / (a.closeWins + a.closeLosses))[0];
    const riser = [...R.playoffs].filter((p) => p.appearances >= 3).sort((a, b) => b.avgOverSeed - a.avgOverSeed)[0];
    const sos = R.schedules;

    root.innerHTML = `
      <div><div class="eyebrow">Record book</div><h1 class="title">Clutch, chokes &amp; dynasties</h1>
        <p class="lede">Who rises in the playoffs, who's still waiting on a ring, who wins the coin-flip weeks, and who had it easy.</p></div>

      <section class="grid g4">
        <div class="panel rec"><div class="k">Best regular season ${App.info(App.TIP.catPct)}</div><div class="v">${App.pct(best.pct)}</div><div class="d"><b>${esc(best.teamName)}</b> · ${esc(App.name(best.managerId))}, ${esc(best.label)} · ${best.record} · finished ${App.ord(best.finalRank)}</div></div>
        <div class="panel rec"><div class="k">Worst regular season ${App.info(App.TIP.catPct)}</div><div class="v">${App.pct(worst.pct)}</div><div class="d"><b>${esc(worst.teamName)}</b> · ${esc(App.name(worst.managerId))}, ${esc(worst.label)} · ${worst.record}</div></div>
        <div class="panel rec"><div class="k">Biggest playoff riser ${App.info(App.TIP.overSeed)}</div><div class="v">${App.signed(riser.avgOverSeed, 1)}<small>spots</small></div><div class="d">${App.who(riser.managerId)} · ${riser.appearances} playoff trips (3+ to qualify)</div></div>
        <div class="panel rec"><div class="k">Ice in the veins ${App.info(App.TIP.closeGame)}</div><div class="v">${App.pct(clutch.closeWins / (clutch.closeWins + clutch.closeLosses), 0)}</div><div class="d">${App.who(clutch.managerId)} · ${clutch.closeWins}-${clutch.closeLosses} in one-category weeks</div></div>
      </section>

      <section class="panel">
        ${App.secHead("Playoff risers & fallers", "Arrow runs from average playoff seed to average final finish. Pointing left = finishes better than seeded.", App.TIP.overSeed)}
        <div class="chart" id="seed"></div>
        <div class="legend"><span><i style="background:var(--pos)"></i>Beats their seed</span><span><i style="background:var(--neg)"></i>Falls below their seed</span><span><span class="trophies">${App.icon("trophy")}</span>Titles</span></div>
      </section>

      <section class="grid g2">
        <div class="panel">${App.secHead("Title droughts", "Seasons since their last championship. Gold = a title year.", App.TIP.drought)}<div class="chart" id="drought"></div></div>
        <div class="panel">${App.secHead("Coin-flip weeks", "Record in weeks decided by one category, and in 7+ category blowouts.", App.TIP.closeGame + " " + App.TIP.blowout)}
          ${App.seg("clutch-k", [["close", "One-category weeks"], ["blow", "Blowouts"]], "close")}
          <div class="chart" id="clutch" style="margin-top:12px"></div></div>
      </section>

      <section class="grid g2">
        <div class="panel">${App.secHead("Best regular seasons ever", "Ranked by category win %, the number the standings use.", App.TIP.catPct)}<div class="list" id="best"></div></div>
        <div class="panel">${App.secHead("Worst regular seasons ever", "Somebody had to.", App.TIP.catPct)}<div class="list" id="worst"></div></div>
      </section>

      <section class="grid g2">
        <div class="panel">${App.secHead("Steady or streaky?", "Typical finish (across) against how much it swings year to year (up). Bottom-left = always good.", App.TIP.consistency)}<div class="chart" id="cons"></div></div>
        <div class="panel">${App.secHead("Strength of schedule", "Every team-season by how good its opponents were. Hover a dot; the extremes are labelled.", App.TIP.sos)}<div class="chart" id="sos"></div></div>
      </section>`;

    const seasonRow = (r, i) => `<div><span class="rk">${i + 1}</span><div class="l" style="flex:1"><div class="t1">${esc(r.teamName)}</div><div class="t2">${esc(App.name(r.managerId))} · <a href="#season-${r.year}">${esc(r.label)}</a> · finished ${App.ord(r.finalRank)}</div></div>
      <div class="rv"><b>${App.pct(r.pct)}</b><div class="t2">${r.record}</div></div></div>`;
    root.querySelector("#best").innerHTML = ts.slice(0, 8).map(seasonRow).join("");
    root.querySelector("#worst").innerHTML = [...ts].reverse().slice(0, 8).map(seasonRow).join("");

    drawSeed(root.querySelector("#seed"), R.playoffs);
    drawDrought(root.querySelector("#drought"));
    let ck = "close";
    const clutchEl = root.querySelector("#clutch");
    drawClutch(clutchEl, R.margins, ck);
    App.bindSeg(root, "clutch-k", (v) => { ck = v; drawClutch(clutchEl, R.margins, ck); });
    drawCons(root.querySelector("#cons"), R.consistency);
    drawSos(root.querySelector("#sos"), sos);
    App.onResize(() => { drawSeed(root.querySelector("#seed"), R.playoffs); drawDrought(root.querySelector("#drought")); drawClutch(clutchEl, R.margins, ck); drawCons(root.querySelector("#cons"), R.consistency); drawSos(root.querySelector("#sos"), sos); });
  });

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
    const g = svg.append("g").selectAll("g").data(rows).join("g").attr("transform", (d, i) => `translate(0,${m.t + i * rh})`);
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
    const g = svg.append("g").selectAll("g").data(rows).join("g").attr("transform", (d, i) => `translate(0,${m.t + i * rh})`);
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
    const g = svg.append("g").selectAll("g").data(rows).join("g").attr("transform", (d, i) => `translate(0,${m.t + i * rh})`);
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
    const g = svg.append("g").selectAll("g").data(rows).join("g").attr("transform", (d) => `translate(${x(d.avgPercentile)},${y(d.spread)})`);
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

  function drawSos(el, rows) {
    el.innerHTML = "";
    const W = App.w(el), H = 340, m = { t: 20, r: 16, b: 40, l: 16 };
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", "Strength of schedule for every team-season");
    // Schedule rows carry no finish; look it up from that season's standings.
    const finalOf = (r) => App.seasonByYear(r.year).standings.find((s) => s.managerId === r.managerId)?.final;
    rows = rows.map((r) => ({ ...r, finalRank: finalOf(r) }));
    const x = d3.scaleLinear().domain(d3.extent(rows, (r) => r.oppPct)).nice().range([m.l, W - m.r]);
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(6).tickFormat((v) => `${(v * 100).toFixed(1)}%`));
    svg.append("text").attr("class", "lbl").attr("x", m.l).attr("y", H - 6).text("← easier schedule");
    svg.append("text").attr("class", "lbl").attr("x", W - m.r).attr("y", H - 6).attr("text-anchor", "end").text("tougher schedule →");
    const nodes = rows.map((r) => ({ ...r, x: x(r.oppPct), y: (H - m.b + m.t) / 2 }));
    const sim = d3.forceSimulation(nodes).force("x", d3.forceX((d) => x(d.oppPct)).strength(1)).force("y", d3.forceY((H - m.b + m.t) / 2)).force("c", d3.forceCollide(6.5)).stop();
    for (let i = 0; i < 160; i++) sim.tick();
    const c = svg.append("g").selectAll("circle").data(nodes).join("circle").attr("cx", (d) => d.x).attr("cy", (d) => d.y).attr("r", 5.5)
      .attr("fill", (d) => (d.finalRank === 1 ? "var(--gold)" : "var(--s1)")).attr("fill-opacity", 0.85).attr("stroke", "var(--panel)");
    App.hover(c, (d) => App.tt(`${d.teamName}`, [["Manager", App.name(d.managerId)], ["Season", d.label], ["Opponents' cat win %", App.pct(d.oppPct)]], d.finalRank === 1 ? "Won the title" : `Finished ${App.ord(d.finalRank)}`));
    // Label the toughest (right end) and easiest (left end) schedules with a short leader line.
    const hi = nodes.reduce((a, b) => (b.oppPct > a.oppPct ? b : a)), lo = nodes.reduce((a, b) => (b.oppPct < a.oppPct ? b : a));
    [[hi, "end"], [lo, "start"]].forEach(([d, anchor]) => {
      const ly = m.t + 6;
      svg.append("line").attr("x1", d.x).attr("x2", d.x).attr("y1", ly + 6).attr("y2", d.y - 7).attr("stroke", "var(--line-2)");
      svg.append("text").attr("class", "lbl-2").attr("x", d.x).attr("y", ly).attr("text-anchor", anchor).text(`${anchor === "end" ? "Toughest" : "Easiest"}: ${App.name(d.managerId)}, ${d.label} · ${App.pct(d.oppPct)}`);
    });
    svg.append("circle").attr("cx", W / 2 - 52).attr("cy", H - 18).attr("r", 5).attr("fill", "var(--gold)");
    svg.append("text").attr("class", "lbl").attr("x", W / 2 - 42).attr("y", H - 18).attr("dy", ".35em").text("won the title that year");
  }
})();
