/* Overview: reigning champ, rafters, all-time race, finish bump chart, quick facts. */
(function () {
  const { D, esc } = App;

  App.register("overview", "Overview", (root) => {
    const champs = D.champions;
    const reign = champs[champs.length - 1];
    const rc = App.career(reign.championManagerId);
    const matchups = D.seasons.reduce((n, s) => n + s.matchups.length, 0);
    const maxT = Math.max(...D.careers.map((c) => c.titles));
    const kings = D.careers.filter((c) => c.titles === maxT);
    const streaks = D.extra.streaks;
    const bestStreak = [...streaks].sort((a, b) => b.win.n - a.win.n)[0];
    const worstStreak = [...streaks].sort((a, b) => b.loss.n - a.loss.n)[0];
    const sweepKing = [...D.extra.weekly].sort((a, b) => b.sweeps - a.sweeps || b.avgCats - a.avgCats)[0];
    const catKing = [...D.extra.weekly].filter((w) => w.games >= 60).sort((a, b) => b.avgCats - a.avgCats)[0];

    root.innerHTML = `
      <section class="hero">
        <div class="hero-card">
          ${App.courtSvg()}
          <div class="eyebrow">Reigning champion · ${esc(reign.label)}</div>
          <div class="big">${esc(reign.championTeamName)}</div>
          <div style="display:flex;gap:10px;align-items:center">${App.mono(reign.championManagerId, "md")}
            <div class="sub"><b>${esc(App.name(reign.championManagerId))}</b> · title #${rc.titles}. Beat ${esc(App.name(reign.runnerUpManagerId))} (${esc(reign.runnerUpTeamName)}) in the final.</div></div>
          <a class="go" href="#season-${reign.year}">Relive the ${esc(reign.label)} season →</a>
        </div>
        <div class="grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">
          ${App.tile("Most titles", App.count(maxT), kings.map((k) => esc(k.name)).join(", ") + (kings.length > 1 ? " (tied)" : ""), App.TIP.titles)}
          ${App.tile("Longest win streak", App.count(bestStreak.win.n), `${esc(App.name(bestStreak.managerId))} · ${App.wkLabel(bestStreak.win.from)} → ${bestStreak.win.from.split(":")[0] === bestStreak.win.to.split(":")[0] ? "wk " + bestStreak.win.to.split(":")[1] : App.wkLabel(bestStreak.win.to)}`, App.TIP.streak)}
          ${App.tile("Seasons", App.count(D.seasons.length), `${esc(D.league.firstLabel)} to ${esc(D.league.lastLabel)} · no 2019-20 season`)}
          ${App.tile("Matchups played", App.count(matchups), "weekly head-to-heads, playoffs included")}
        </div>
      </section>

      <section>
        ${App.secHead("Banners in the rafters", "Every champion, hung where they belong. Click a banner to relive that season.")}
        <div class="rafters"><div class="banners" id="banners"></div></div>
      </section>

      <section class="panel">
        ${App.secHead("The all-time race", "Watch the all-time standings take shape, season by season.", App.TIP.race,
          App.seg("race-metric", [["catWins", "Category wins"], ["titles", "Titles"], ["podiums", "Podiums"]], "catWins"))}
        <div class="player-bar">
          <button class="btn primary" id="race-play" type="button">${App.icon("play")}<span>Play</span></button>
          <input type="range" id="race-year" min="0" max="${D.seasons.length - 1}" value="${D.seasons.length - 1}" aria-label="Season">
          <span class="small muted" id="race-label"></span>
        </div>
        <div class="chart" id="race" style="margin-top:8px"></div>
      </section>

      <section class="panel">
        ${App.secHead("Where everyone finished", "Final finish by season. Hover any line; tap names to pin up to three.", App.TIP.bump)}
        <div class="pills" id="bump-pins" role="group" aria-label="Pin managers"></div>
        <div class="chart" id="bump" style="margin-top:12px"></div>
        <div class="legend"><span><i class="dt" style="background:var(--gold)"></i>Champion</span><span><i style="background:var(--line-2)"></i>Other managers</span></div>
      </section>

      <section>
        ${App.secHead("Bragging rights", "The streaks and weeks people still bring up in the group chat.")}
        <div class="grid g4">
          <div class="panel rec"><div class="k">Hottest streak ${App.info(App.TIP.streak)}</div><div class="v">${bestStreak.win.n}<small>straight wins</small></div><div class="d">${App.who(bestStreak.managerId)} · ${App.wkLabel(bestStreak.win.from)} to ${App.wkLabel(bestStreak.win.to)}</div></div>
          <div class="panel rec"><div class="k">Coldest streak ${App.info(App.TIP.streak)}</div><div class="v">${worstStreak.loss.n}<small>straight losses</small></div><div class="d">${App.who(worstStreak.managerId)} · ${App.wkLabel(worstStreak.loss.from)} to ${App.wkLabel(worstStreak.loss.to)}</div></div>
          <div class="panel rec"><div class="k">9-0 sweeps ${App.info(App.TIP.sweep)}</div><div class="v">${sweepKing.sweeps}<small>perfect weeks</small></div><div class="d">${App.who(sweepKing.managerId)} · most in league history</div></div>
          <div class="panel rec"><div class="k">Categories per week ${App.info(App.TIP.avgCats)}</div><div class="v">${catKing.avgCats.toFixed(2)}<small>of 9</small></div><div class="d">${App.who(catKing.managerId)} · best average, ${catKing.games} weeks</div></div>
        </div>
      </section>`;

    // Banners
    root.querySelector("#banners").innerHTML = champs
      .map((c, i) => `<a class="banner ${i === champs.length - 1 ? "latest" : ""}" href="#season-${c.year}">
          <span class="champ-word">Champions</span><span class="yr">${esc(c.label)}</span>${App.icon("trophy", "tr")}
          <span class="tm">${esc(c.championTeamName)}</span><span class="mg">${esc(App.name(c.championManagerId))}</span></a>`)
      .join("");

    drawRace(root);
    drawBump(root);
  });

  // ---------- Bar chart race ----------
  function drawRace(root) {
    const el = root.querySelector("#race");
    const slider = root.querySelector("#race-year");
    const playBtn = root.querySelector("#race-play");
    const lab = root.querySelector("#race-label");
    let metric = "catWins", idx = D.seasons.length - 1, timer = null;
    const rowH = 30, m = { t: 6, r: 56, b: 6, l: 92 };
    const n = App.played.length;
    const H = m.t + m.b + n * rowH;
    const svg = d3.select(el).append("svg").attr("role", "img").attr("aria-label", "All-time race bar chart");
    const yearTxt = svg.append("text").attr("class", "race-year").attr("text-anchor", "end");
    const g = svg.append("g");

    const render = (dur = 650) => {
      const W = App.w(el);
      svg.attr("viewBox", `0 0 ${W} ${H}`);
      const frame = D.extra.race[idx];
      const rows = [...frame.rows].sort((a, b) => b[metric] - a[metric] || b.catWins - a.catWins);
      const max = d3.max(rows, (r) => r[metric]) || 1;
      const x = d3.scaleLinear().domain([0, max]).range([0, W - m.l - m.r]);
      const y = (i) => m.t + i * rowH;
      yearTxt.attr("x", W - 8).attr("y", H - 14).text(frame.label);
      lab.textContent = `${frame.label} · after ${frame.rows.reduce((a, r) => Math.max(a, r.seasons), 0)} season${idx ? "s" : ""}`;
      const lead = rows[0]?.[metric] ?? 0;

      const sel = g.selectAll("g.row").data(rows, (d) => d.managerId);
      const ent = sel.enter().append("g").attr("class", "row").attr("transform", `translate(0,${H})`).style("opacity", 0);
      ent.append("text").attr("class", "lbl-ink nm").attr("x", m.l - 10).attr("y", rowH / 2).attr("dy", ".35em").attr("text-anchor", "end");
      ent.append("path").attr("class", "bar");
      ent.append("text").attr("class", "lbl-2 vl num").attr("y", rowH / 2).attr("dy", ".35em");
      ent.append("rect").attr("class", "hit").attr("fill", "transparent").attr("height", rowH);
      const all = ent.merge(sel);
      all.transition().duration(dur).ease(d3.easeCubicInOut).attr("transform", (d, i) => `translate(0,${y(i)})`).style("opacity", 1);
      all.select(".nm").text((d) => App.name(d.managerId));
      const bh = 18, by = (rowH - bh) / 2;
      const barPath = (w) => { w = Math.max(0, w); const r = Math.min(4, w); return `M${m.l},${by}h${w - r}a${r},${r} 0 0 1 ${r},${r}v${bh - 2 * r}a${r},${r} 0 0 1 -${r},${r}h-${w - r}Z`; };
      all.select(".bar").attr("fill", (d) => (d[metric] === lead && lead > 0 ? "var(--accent)" : "var(--s1)"))
        .transition().duration(dur).ease(d3.easeCubicInOut).attr("d", (d) => barPath(x(d[metric])));
      all.select(".vl").transition().duration(dur).ease(d3.easeCubicInOut)
        .attr("x", (d) => m.l + x(d[metric]) + 6)
        .tween("text", function (d) { const i = d3.interpolateRound(+this.textContent || 0, d[metric]); return (t) => (this.textContent = i(t)); });
      all.select(".hit").attr("x", 0).attr("width", W);
      App.hover(all.select(".hit"), (d) => App.tt(App.name(d.managerId), [["Category wins", d.catWins], ["Matchup wins", d.wins], ["Titles", d.titles], ["Podiums (top 3)", d.podiums], ["Seasons played", d.seasons]], `Through ${frame.label}`));
      sel.exit().transition().duration(dur).style("opacity", 0).remove();
    };
    const stop = () => { clearInterval(timer); timer = null; playBtn.innerHTML = `${App.icon("play")}<span>Play</span>`; };
    playBtn.addEventListener("click", () => {
      if (timer) return stop();
      if (idx === D.seasons.length - 1) { idx = 0; slider.value = 0; render(0); }
      playBtn.innerHTML = `${App.icon("pause")}<span>Pause</span>`;
      timer = setInterval(() => {
        if (!document.body.contains(el)) return stop();
        idx++; slider.value = idx; render(900);
        if (idx >= D.seasons.length - 1) stop();
      }, 1200);
    });
    slider.addEventListener("input", () => { stop(); idx = +slider.value; render(400); });
    App.bindSeg(root, "race-metric", (v) => { metric = v; render(700); });
    render(0);
    App.onResize(() => render(0));
  }

  // ---------- Bump chart of finishes ----------
  function drawBump(root) {
    const el = root.querySelector("#bump");
    const pinsEl = root.querySelector("#bump-pins");
    const SLOTS = ["var(--s1)", "var(--s2)", "var(--s3)"];
    const order = [...D.careers].sort((a, b) => b.titles - a.titles || a.avgFinish - b.avgFinish).map((c) => c.managerId);
    let pins = order.slice(0, 2);
    let hoverId = null;
    const years = D.seasons.map((s) => s.year);
    const maxN = d3.max(D.seasons, (s) => s.teamCount);
    const series = order.map((id) => ({
      id,
      pts: App.career(id).seasonsList.map((s) => ({ id, year: s.year, final: s.final, team: s.team, result: s.result, n: s.n, catPct: s.catPct })),
    }));

    const renderPins = () => {
      pinsEl.innerHTML = order.map((id) => {
        const k = pins.indexOf(id);
        return `<button type="button" class="pill" data-id="${id}" aria-pressed="${k >= 0}">${k >= 0 ? `<span class="dot" style="background:${SLOTS[k]}"></span>` : ""}${esc(App.name(id))}</button>`;
      }).join("");
    };
    pinsEl.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-id]");
      if (!b) return;
      const id = b.dataset.id;
      pins = pins.includes(id) ? pins.filter((x) => x !== id) : [...pins, id].slice(-3);
      renderPins(); render(true);
    });

    const root0 = d3.select(el).append("svg").attr("role", "img").attr("aria-label", "Final finish by season for every manager");
    const svg = root0.append("g");
    const overlay = root0.append("rect").attr("fill", "transparent");
    let geo = null;
    const render = (animate = false) => {
      const W = App.w(el), H = Math.round(Math.min(440, Math.max(320, W * 0.42)));
      const m = { t: 14, r: W < 560 ? 16 : 92, b: 28, l: 34 };
      root0.attr("viewBox", `0 0 ${W} ${H}`);
      svg.selectAll("*").remove();
      const x = d3.scalePoint().domain(years).range([m.l, W - m.r]).padding(0.15);
      const y = d3.scaleLinear().domain([1, maxN]).range([m.t, H - m.b]);
      svg.append("g").attr("class", "grid-l").selectAll("line").data(d3.range(1, maxN + 1)).join("line")
        .attr("x1", m.l).attr("x2", W - m.r).attr("y1", y).attr("y2", y).attr("stroke-width", (d) => (d === 1 ? 1.5 : 1));
      svg.append("g").selectAll("text").data([1, 3, 6, 9, 12]).join("text").attr("class", "lbl num").attr("x", m.l - 10).attr("y", y).attr("dy", ".35em").attr("text-anchor", "end").text((d) => App.ord(d));
      svg.append("g").selectAll("text").data(years).join("text").attr("class", "lbl").attr("x", x).attr("y", H - 6).attr("text-anchor", "middle").text((d) => (W < 560 ? `'${String(d).slice(2)}` : App.label(d)));

      const color = (id) => (pins.includes(id) ? SLOTS[pins.indexOf(id)] : id === hoverId ? "var(--ink)" : "var(--line-2)");
      const active = (id) => pins.includes(id) || id === hoverId;
      const line = d3.line().x((d) => x(d.year)).y((d) => y(d.final)).curve(d3.curveMonotoneX);
      // Split into contiguous runs so gaps (missed seasons) stay gaps.
      const runs = (pts) => { const out = []; let cur = []; pts.forEach((p) => { if (cur.length && years.indexOf(p.year) !== years.indexOf(cur[cur.length - 1].year) + 1) { out.push(cur); cur = []; } cur.push(p); }); if (cur.length) out.push(cur); return out; };
      const sorted = [...series].sort((a, b) => active(a.id) - active(b.id));
      const lg = svg.append("g");
      sorted.forEach((s) => {
        const on = active(s.id);
        runs(s.pts).forEach((r) => {
          const p = lg.append("path").attr("d", line(r)).attr("fill", "none").attr("stroke", color(s.id)).attr("stroke-width", on ? 3 : 1.6).attr("stroke-linecap", "round").attr("opacity", hoverId && !on ? 0.5 : 1);
          if (on && animate && pins.includes(s.id)) { const L = p.node().getTotalLength(); p.attr("stroke-dasharray", `${L} ${L}`).attr("stroke-dashoffset", L).transition().duration(700).ease(d3.easeCubicOut).attr("stroke-dashoffset", 0); }
        });
        lg.append("g").selectAll("circle").data(s.pts).join("circle")
          .attr("cx", (d) => x(d.year)).attr("cy", (d) => y(d.final)).attr("r", (d) => (d.final === 1 ? 6.5 : on ? 4.5 : 3))
          .attr("fill", (d) => (d.final === 1 ? "var(--gold)" : color(s.id))).attr("stroke", "var(--panel)").attr("stroke-width", 2);
      });
      // End labels for pinned / hovered lines
      if (W >= 560) {
        const labs = series.filter((s) => active(s.id)).map((s) => { const last = s.pts[s.pts.length - 1]; return { id: s.id, y: y(last.final), x: x(last.year) }; }).sort((a, b) => a.y - b.y);
        for (let i = 1; i < labs.length; i++) if (labs[i].y - labs[i - 1].y < 15) labs[i].y = labs[i - 1].y + 15;
        svg.append("g").selectAll("text").data(labs).join("text").attr("class", "lbl-ink").attr("x", (d) => d.x + 12).attr("y", (d) => d.y).attr("dy", ".35em").text((d) => App.name(d.id));
      }
      // Hover layer: nearest point
      const pts = series.flatMap((s) => s.pts);
      geo = { pts, delaunay: d3.Delaunay.from(pts, (d) => x(d.year), (d) => y(d.final)) };
      overlay.attr("x", 0).attr("y", 0).attr("width", W).attr("height", H);
    };
    overlay
        .on("pointermove", (e) => {
          const [mx, my] = d3.pointer(e);
          const d = geo.pts[geo.delaunay.find(mx, my)];
          if (d.id !== hoverId) { hoverId = d.id; render(); }
          App.showTip(App.tt(`${App.name(d.id)} · ${App.label(d.year)}`, [["Team", d.team], ["Final finish", `${App.ord(d.final)} of ${d.n}`], ["Result", d.result], ["Category win %", App.pct(d.catPct)]], "Tap the name above to pin"), e.clientX, e.clientY);
        })
        .on("pointerleave", () => { hoverId = null; App.hideTip(); render(); });
    renderPins(); render(true);
    App.onResize(() => render());
  }
})();
