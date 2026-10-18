/* Trades & moves: KPIs, trade network, activity table, wire vs finish, trade log, undrafted gems. */
(function () {
  const { D, esc } = App;
  const dateLabel = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

  App.register("trades", "Trades & moves", (root) => {
    const T = D.trades;
    const done = T.list.filter((t) => t.status === "completed");
    const vetoed = T.list.filter((t) => t.status === "vetoed");
    const act = [...T.activity].sort((a, b) => b.trades - a.trades || b.moves - a.moves);
    const lop = [...done].sort((a, b) => b.margin - a.margin)[0];
    const teamSeasons = D.seasons.flatMap((s) => s.standings.filter((r) => r.moves != null).map((r) => ({ ...r, year: s.year, label: s.label, n: s.teamCount })));
    const busiest = [...teamSeasons].sort((a, b) => b.moves - a.moves)[0];
    const vf = T.vsFinish;
    const tYears = [...new Set(T.list.map((t) => t.year))].sort((a, b) => b - a);

    root.innerHTML = `
      <div><div class="eyebrow">Trades &amp; moves</div><h1 class="title">Wheeling &amp; dealing</h1>
        <p class="lede">Every trade and veto, who got the better end, and whether grinding the waiver wire actually pays off.</p></div>

      <section class="grid g4">
        ${App.tile("Trades completed", App.count(done.length), `${vetoed.length} more vetoed`)}
        ${App.tile("Most trades", App.count(act[0].trades), esc(App.name(act[0].managerId)))}
        ${App.tile("Most moves, one season", App.count(busiest.moves), `${esc(busiest.team)} · ${esc(App.name(busiest.managerId))}, ${esc(busiest.label)}`, App.TIP.moves)}
        ${App.tile("Most lopsided trade", App.val(lop.margin), `${esc(App.name(lop.winner))} won it, ${esc(lop.label)}`, App.TIP.tradeValue)}
      </section>

      <section class="grid g2">
        <div class="panel">${App.secHead("Who trades with whom", "Hover a manager to see their trade partners.", App.TIP.network)}<div class="chart" id="net"></div></div>
        <div class="panel">${App.secHead("Does grinding the wire pay off?", "Average adds/drops per team-season, by how the team finished.", App.TIP.moves)}
          <div class="chart" id="wire"></div>
          <h3 class="small" style="margin:18px 0 0;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">Every team-season</h3>
          <div class="chart" id="wire-sc"></div></div>
      </section>

      <section class="panel" style="padding:0">
        <div style="padding:16px 18px 0">${App.secHead("Activity by manager", "Trade wins compare the end-of-season value of what each side received.", App.TIP.tradeValue)}</div>
        <div class="scroll-x"><table class="t"><thead><tr><th>Manager</th><th>Moves ${App.info(App.TIP.moves)}</th><th class="r">Per season</th><th class="r">Trades</th><th class="r">Trade W-L</th><th>Net value ${App.info(App.TIP.tradeValue)}</th><th class="r">Vetoed</th><th>Favorite partner</th></tr></thead>
        <tbody id="act"></tbody></table></div>
      </section>

      <section class="panel">
        ${App.secHead("Trade log", "Bars show the value each side received. Bigger bar won the trade.", App.TIP.tradeValue,
          App.seg("tl-y", [...tYears.map((y) => [String(y), App.label(y)]), ["all", "All seasons"]], String(tYears[0])))}
        <div class="grid g2" id="log"></div>
      </section>

      <section class="grid g2">
        <div class="panel">${App.secHead(`Undrafted gems (${T.undrafted.length})`, "Nobody drafted them; they finished top 75.", App.TIP.undrafted)}<div class="grid und capped" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr))" id="und"></div>
          <button type="button" class="btn" id="und-more" style="margin-top:12px">Show all ${T.undrafted.length}</button></div>
        <div class="panel">${App.secHead(`Stars nobody owned (${T.unowned.length})`, "Finished top 60, but sat on the waiver wire when the season ended.", App.TIP.unowned)}<div class="chart" id="unowned"></div></div>
      </section>`;

    // Activity table
    const maxMoves = d3.max(act, (r) => r.moves), maxNet = d3.max(act, (r) => Math.abs(r.netValue)) || 1;
    root.querySelector("#act").innerHTML = act.map((r) => `<tr><td>${App.who(r.managerId)}</td>
      <td><div class="inbar" style="min-width:150px"><span class="num" style="width:34px">${r.moves}</span><div class="tr"><div class="fl" style="width:${(r.moves / maxMoves) * 100}%"></div></div></div></td>
      <td class="r">${Math.round(r.movesPerSeason)}</td><td class="r">${r.trades}</td><td class="r">${r.trades ? `${r.tradeWins}-${r.tradeLosses}` : "—"}</td>
      <td>${r.trades ? `<div class="inbar" style="min-width:150px"><span class="num ${r.netValue >= 0 ? "pos" : "neg"}" style="width:46px">${App.val(r.netValue)}</span><div class="tr" style="position:relative"><div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:var(--line-2)"></div><div style="position:absolute;top:0;bottom:0;border-radius:3px;background:${r.netValue >= 0 ? "var(--pos)" : "var(--neg)"};${r.netValue >= 0 ? `left:50%;width:${(r.netValue / maxNet) * 50}%` : `right:50%;width:${(-r.netValue / maxNet) * 50}%`}"></div></div></div>` : "—"}</td>
      <td class="r">${r.vetoed || "—"}</td><td>${r.favoritePartner ? `${esc(App.name(r.favoritePartner.managerId))} <span class="muted">(${r.favoritePartner.count})</span>` : "—"}</td></tr>`).join("");

    // Trade log
    const logEl = root.querySelector("#log");
    const renderLog = (y) => {
      const list = T.list.filter((t) => y === "all" || t.year === +y);
      logEl.innerHTML = list.map((t) => {
        const max = Math.max(1, ...t.sides.map((s) => s.value));
        const win = t.status === "completed" ? t.winner : null;
        return `<div class="trade panel ${t.status === "vetoed" ? "vetoed" : ""}" style="box-shadow:none">
          <div class="hd"><span>${dateLabel(t.date)} · ${esc(t.label)}</span>${t.status === "vetoed" ? '<span class="badge" style="color:var(--bad-ink)">Vetoed</span>' : win ? `<span class="badge orange">Edge: ${esc(App.name(win))} (${App.val(t.margin)})</span>` : '<span class="badge">Even</span>'}</div>
          <div class="sides">${t.sides.map((s) => `<div class="sd">${App.who(s.m)}<div class="small muted">${esc(s.team)} received</div>
            <ul>${s.players.map((p) => `<li><span>${esc(p.n)}</span><span class="muted num">${App.rankLabel(p.r)}</span></li>`).join("")}</ul>
            <div class="vbar ${win === s.m ? "win" : ""}" style="width:0" data-w="${(s.value / max) * 100}"></div><div class="small muted num" style="margin-top:3px">value ${s.value.toFixed(1)}</div></div>`).join("")}</div></div>`;
      }).join("");
      requestAnimationFrame(() => logEl.querySelectorAll(".vbar").forEach((b) => (b.style.width = Math.max(2, +b.dataset.w) + "%")));
    };
    renderLog(String(tYears[0]));
    App.bindSeg(root, "tl-y", renderLog);

    root.querySelector("#und").innerHTML = T.undrafted.map((g) => `<div class="award"><div class="ic" style="font-family:var(--font-display);font-weight:900;font-size:18px;color:var(--good-ink)">#${g.actualRank}</div>
      <div><div class="aw" style="font-size:19px">${esc(g.playerName)}</div><div class="ad">${esc(g.label)} · on ${esc(g.teamName)} (${esc(App.name(g.managerId))}) at season end</div></div></div>`).join("");

    const undEl = root.querySelector("#und"), undMore = root.querySelector("#und-more");
    undMore.addEventListener("click", () => { const capped = undEl.classList.toggle("capped"); undMore.textContent = capped ? `Show all ${T.undrafted.length}` : "Show fewer"; });
    const draw = () => { drawUnowned(root.querySelector("#unowned"), T.unowned); drawNetwork(root.querySelector("#net"), done); drawWire(root.querySelector("#wire"), vf); drawWireScatter(root.querySelector("#wire-sc"), teamSeasons); };
    draw(); App.onResize(draw);
  });

  function drawNetwork(el, trades) {
    el.innerHTML = "";
    const W = App.w(el), H = Math.min(460, W), R = Math.min(W, H) / 2 - 60;
    const ids = App.played.filter((id) => trades.some((t) => t.sides.some((s) => s.m === id)));
    const edges = new Map();
    trades.forEach((t) => { const [a, b] = t.sides.map((s) => s.m).sort(); const k = a + "|" + b; edges.set(k, (edges.get(k) || 0) + 1); });
    const E = [...edges].map(([k, n]) => { const [a, b] = k.split("|"); return { a, b, n }; });
    const deg = new Map(ids.map((id) => [id, d3.sum(E.filter((e) => e.a === id || e.b === id), (e) => e.n)]));
    const ang = d3.scalePoint().domain(ids).range([0, 2 * Math.PI]).padding(0.5);
    const pos = (id) => { const a = ang(id) - Math.PI / 2; return [W / 2 + R * Math.cos(a), H / 2 + R * Math.sin(a), a]; };
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", "Network of trades between managers");
    const maxN = d3.max(E, (e) => e.n);
    const link = svg.append("g").selectAll("path").data(E).join("path")
      .attr("d", (e) => { const [x1, y1] = pos(e.a), [x2, y2] = pos(e.b); return `M${x1},${y1}Q${W / 2},${H / 2} ${x2},${y2}`; })
      .attr("fill", "none").attr("stroke", "var(--s1)").attr("stroke-opacity", 0.35).attr("stroke-linecap", "round")
      .attr("stroke-width", (e) => 1.5 + (e.n / maxN) * 9);
    link.each(function () { const L = this.getTotalLength(); d3.select(this).attr("stroke-dasharray", `${L} ${L}`).attr("stroke-dashoffset", L).transition().duration(900).delay(Math.random() * 300).attr("stroke-dashoffset", 0); });
    App.hover(link, (e) => App.tt(`${App.name(e.a)} ↔ ${App.name(e.b)}`, [["Trades", e.n]]));
    const node = svg.append("g").selectAll("g").data(ids).join("g").attr("transform", (id) => `translate(${pos(id)[0]},${pos(id)[1]})`).style("cursor", "pointer");
    node.append("circle").attr("r", (id) => 12 + deg.get(id) * 0.6).attr("fill", "var(--band)").attr("stroke", "var(--panel)").attr("stroke-width", 3);
    node.append("text").attr("text-anchor", "middle").attr("dy", ".35em").style("fill", "var(--band-ink)").style("font-family", "var(--font-display)").style("font-weight", 800).style("font-size", "13px").text((id) => App.initials(id));
    node.append("text").attr("class", "lbl-ink").attr("text-anchor", (id) => (Math.cos(pos(id)[2]) > 0.2 ? "start" : Math.cos(pos(id)[2]) < -0.2 ? "end" : "middle"))
      .attr("x", (id) => Math.cos(pos(id)[2]) * (22 + deg.get(id) * 0.6)).attr("y", (id) => Math.sin(pos(id)[2]) * (22 + deg.get(id) * 0.6)).attr("dy", ".35em").text((id) => App.name(id));
    node.on("pointerenter", (e, id) => {
      link.transition().duration(150).attr("stroke-opacity", (l) => (l.a === id || l.b === id ? 0.85 : 0.06)).attr("stroke", (l) => (l.a === id || l.b === id ? "var(--accent)" : "var(--s1)"));
      const partners = E.filter((l) => l.a === id || l.b === id).sort((x, y) => y.n - x.n).map((l) => [App.name(l.a === id ? l.b : l.a), l.n]);
      App.showTip(App.tt(`${App.name(id)} · ${deg.get(id)} trades`, partners), e.clientX, e.clientY);
    }).on("pointerleave", () => { link.transition().duration(150).attr("stroke-opacity", 0.35).attr("stroke", "var(--s1)"); App.hideTip(); })
      .on("click", (e, id) => App.go(`m-${id}`));
  }

  /** Unowned stars: one row per player, a rank track from #1 to #60, dot at the finish. */
  function drawUnowned(el, rows) {
    el.innerHTML = "";
    const W = App.w(el), rh = 34, m = { t: 20, r: 16, l: 190 }, H = m.t + rows.length * rh;
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", "Top-60 finishers who were free agents at season end");
    const x = d3.scaleLinear().domain([1, 60]).range([m.l, W - m.r]);
    [1, 20, 40, 60].forEach((v) => { svg.append("line").attr("x1", x(v)).attr("x2", x(v)).attr("y1", m.t - 4).attr("y2", H).attr("stroke", "var(--line)"); svg.append("text").attr("class", "lbl num").attr("x", x(v)).attr("y", 11).attr("text-anchor", "middle").text(`#${v}`); });
    const g = svg.append("g").selectAll("g").data(rows).join("g").attr("transform", (r, i) => `translate(0,${m.t + i * rh})`);
    g.append("text").attr("class", "lbl-ink").attr("x", m.l - 12).attr("y", rh / 2 - 6).attr("dy", ".35em").attr("text-anchor", "end").text((r) => r.playerName);
    g.append("text").attr("class", "lbl").attr("x", m.l - 12).attr("y", rh / 2 + 8).attr("dy", ".35em").attr("text-anchor", "end").text((r) => `${r.label} · ${r.draftedBy ? `drafted by ${App.name(r.draftedBy)}` : "undrafted"}`);
    g.append("line").attr("x1", x(1)).attr("x2", x(60)).attr("y1", rh / 2).attr("y2", rh / 2).attr("stroke", "var(--line)").attr("stroke-width", 6).attr("stroke-linecap", "round");
    g.append("circle").attr("cx", x(60)).attr("cy", rh / 2).attr("r", 8).attr("fill", "var(--accent)").attr("stroke", "var(--panel)").attr("stroke-width", 2)
      .transition().duration(800).delay((r, i) => i * 50).attr("cx", (r) => x(r.actualRank));
    g.append("text").attr("x", x(60)).attr("y", rh / 2).attr("dy", ".35em").attr("text-anchor", "middle").style("font-size", "9px").style("font-weight", 800).style("fill", "#fff")
      .text((r) => r.actualRank).transition().duration(800).delay((r, i) => i * 50).attr("x", (r) => x(r.actualRank));
  }

  function drawWire(el, vf) {
    el.innerHTML = "";
    const rows = [["Champions", vf.championsAvg, "var(--gold)"], ["Top third", vf.topThirdAvg, "var(--s1)"], ["League average", vf.leagueAvg, "var(--ink-2)"], ["Bottom third", vf.bottomThirdAvg, "var(--line-2)"]];
    const W = App.w(el), rh = 34, m = { t: 4, r: 50, l: 118 }, H = m.t + rows.length * rh;
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", "Average moves by final finish group");
    const x = d3.scaleLinear().domain([0, d3.max(rows, (r) => r[1])]).range([0, W - m.l - m.r]);
    const g = svg.append("g").selectAll("g").data(rows).join("g").attr("transform", (d, i) => `translate(0,${m.t + i * rh})`);
    g.append("text").attr("class", "lbl-ink").attr("x", m.l - 10).attr("y", rh / 2).attr("dy", ".35em").attr("text-anchor", "end").text((d) => d[0]);
    g.append("rect").attr("x", m.l).attr("y", 7).attr("height", rh - 14).attr("rx", 4).attr("fill", (d) => d[2]).attr("width", 0).transition().duration(700).attr("width", (d) => x(d[1]));
    g.append("text").attr("class", "lbl-2 num").attr("x", (d) => m.l + x(d[1]) + 6).attr("y", rh / 2).attr("dy", ".35em").style("font-weight", 700).text((d) => Math.round(d[1]));
  }

  function drawWireScatter(el, rows) {
    el.innerHTML = "";
    const W = App.w(el), H = 220, m = { t: 10, r: 14, b: 34, l: 40 };
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", "Moves against final finish for each team-season");
    const x = d3.scaleLinear().domain([0, d3.max(rows, (r) => r.moves)]).nice().range([m.l, W - m.r]);
    const y = d3.scaleLinear().domain([1, 12]).range([m.t, H - m.b]);
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(6));
    svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).tickValues([1, 4, 8, 12]).tickFormat(App.ord));
    svg.append("text").attr("class", "lbl").attr("x", W - m.r).attr("y", H - 4).attr("text-anchor", "end").text("adds & drops that season →");
    const c = svg.append("g").selectAll("circle").data(rows).join("circle").attr("cx", (d) => x(d.moves)).attr("cy", (d) => y(d.final)).attr("r", 4.5)
      .attr("fill", (d) => (d.final === 1 ? "var(--gold)" : "var(--s1)")).attr("fill-opacity", 0.7).attr("stroke", "var(--panel)");
    App.hover(c, (d) => App.tt(d.team, [["Manager", App.name(d.managerId)], ["Season", d.label], ["Moves", d.moves], ["Final finish", `${App.ord(d.final)} of ${d.n}`]]));
  }
})();
