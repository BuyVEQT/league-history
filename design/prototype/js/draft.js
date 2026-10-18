/* Draft: report card, every pick scatter, steals/busts, slot vs finish, season draft boards. */
(function () {
  const { D, esc } = App;
  const years = () => [...new Set(D.draft.picks.map((p) => p.y))];

  App.register("draft", "Draft", (root, arg) => {
    const picks = D.draft.picks;
    const grades = [...D.draft.managers].sort((a, b) => b.vsLeague - a.vsLeague);
    const steals = [...picks].sort((a, b) => b.v - a.v || a.ov - b.ov).slice(0, 8);
    const busts = picks.filter((p) => p.rd <= 3).sort((a, b) => a.v - b.v || a.ov - b.ov).slice(0, 8);
    const gems = picks.filter((p) => p.rd >= 8 && p.ar != null && p.ar <= 75).sort((a, b) => a.ar - b.ar);
    const yrs = years();
    const boardYear = arg && yrs.includes(+arg) ? +arg : yrs[yrs.length - 1];

    root.innerHTML = `
      <div><div class="eyebrow">Draft night</div><h1 class="title">Who actually drafts well?</h1>
        <p class="lede">Every pick since ${esc(App.label(yrs[0]))} compared with where the player finished that season. Value = draft slot − finish rank: a player taken 50th who finished 10th is +40. ${App.info(App.TIP.draftValue)}</p></div>

      <section class="panel" style="padding:0">
        <div style="padding:16px 18px 0">${App.secHead("Draft report card", "Graded against the league average. Click a manager to light up their picks in the chart below.", App.TIP.vsLeague)}</div>
        <div class="scroll-x"><table class="t" id="grades"><thead><tr>
          <th>Grade</th><th>Manager</th><th class="r">Drafts</th><th>Value vs league ${App.info(App.TIP.vsLeague)}</th><th class="r">Hit rate ${App.info(App.TIP.hitRate)}</th>
          <th>Rounds 1-3: slot → finish</th><th class="r">Late gems ${App.info(App.TIP.gems)}</th><th>Best pick</th></tr></thead><tbody></tbody></table></div>
      </section>

      <section class="panel">
        ${App.secHead("Every pick, ever", "Across: where they were drafted. Up: how well they finished. Above the line beat their slot.", App.TIP.scatter,
          `<div class="controls"><label class="field">Highlight manager<select id="sc-m"><option value="">Everyone</option>${App.played.filter((id) => grades.some((g) => g.managerId === id)).map((id) => `<option value="${id}">${esc(App.name(id))}</option>`).join("")}</select></label>
           <label class="field">Season<select id="sc-y"><option value="">All seasons</option>${yrs.map((y) => `<option value="${y}">${esc(App.label(y))}</option>`).join("")}</select></label></div>`)}
        <div class="chart" id="scatter"></div>
        <div class="legend"><span><i class="dt" style="background:var(--pos)"></i>Steal (finished better than drafted)</span><span><i class="dt" style="background:var(--neg)"></i>Bust</span><span><i class="dt" style="background:var(--line-2)"></i>Outside the top 300 (shown at 300+)</span></div>
      </section>

      <section class="grid g2">
        <div class="panel">${App.secHead("Biggest steals", "Any round.", App.TIP.draftValue)}<div class="list" id="steals"></div></div>
        <div class="panel">${App.secHead("Biggest busts", "Rounds 1-3 only, where a miss really hurts.", App.TIP.draftValue)}<div class="list" id="busts"></div></div>
      </section>

      <section class="grid g2">
        <div class="panel">${App.secHead("Does draft slot matter?", "Average final finish by first-round pick position. Gold marks = titles won from that slot.")}<div class="chart" id="slots"></div></div>
        <div class="panel">${App.secHead(`Late-round gems (${gems.length})`, "Round 8 or later, finished top 75.", App.TIP.gems)}<div class="list" id="gems" style="max-height:330px;overflow:auto"></div></div>
      </section>

      <section class="panel" id="board-sec">
        ${App.secHead("Draft boards", "The full board, colored by how each pick turned out. Hover a pick for the details.", App.TIP.draftValue)}
        <div class="pills" id="board-years">${yrs.map((y) => `<a class="pill" href="#draft-${y}" ${y === boardYear ? 'aria-current="page"' : ""}>${esc(App.label(y))}</a>`).join("")}</div>
        <div class="scroll-x" style="margin-top:14px"><div id="board"></div></div>
        <div class="legend"><span><i class="sq" style="background:var(--pos)"></i>Big steal</span><span><i class="sq" style="background:var(--pos-wash)"></i>Beat the slot</span><span><i class="sq" style="background:var(--neg-wash)"></i>Below the slot</span><span><i class="sq" style="background:var(--neg)"></i>Big bust</span></div>
      </section>`;

    // Report card
    const letter = (v) => (v >= 15 ? "A" : v >= 6 ? "B" : v >= -6 ? "C" : v >= -15 ? "D" : "F");
    const maxAbs = d3.max(grades, (g) => Math.abs(g.vsLeague));
    root.querySelector("#grades tbody").innerHTML = grades.map((g) => `<tr data-m="${g.managerId}" style="cursor:pointer">
      <td><span class="badge ${letter(g.vsLeague) === "A" ? "gold" : ""}" style="font-family:var(--font-display);font-size:16px;min-width:30px;justify-content:center">${letter(g.vsLeague)}</span></td>
      <td>${App.who(g.managerId)}</td><td class="r">${g.drafts}</td>
      <td><div class="inbar" style="min-width:170px"><span class="num ${g.vsLeague >= 0 ? "pos" : "neg"}" style="width:46px">${App.signed(g.vsLeague, 1)}</span>
        <div class="tr" style="position:relative"><div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:var(--line-2)"></div>
        <div class="fl" style="position:absolute;top:0;bottom:0;background:${g.vsLeague >= 0 ? "var(--pos)" : "var(--neg)"};${g.vsLeague >= 0 ? `left:50%;width:${(g.vsLeague / maxAbs) * 50}%` : `right:50%;width:${(-g.vsLeague / maxAbs) * 50}%`};border-radius:3px"></div></div></div></td>
      <td class="r">${App.pct(g.hitRate, 0)}</td>
      <td class="num">#${Math.round(g.coreAvgSlot)} → #${Math.round(g.coreAvgRank)}</td>
      <td class="r">${g.gems}</td>
      <td>${esc(g.best.p)} <span class="muted small">${esc(g.best.y)} · ${App.signed(g.best.v)}</span></td></tr>`).join("");
    root.querySelector("#grades").insertAdjacentHTML("afterend", `<p class="note" style="padding:0 18px 14px">Grade: A = 15+ spots per pick better than the league average, B = 6+, C = within 6, D = 6+ worse, F = 15+ worse. A design suggestion; tune the cut-offs with the league.</p>`);

    const pickRow = (p) => `<div><div class="l"><div class="t1">${esc(p.p)}</div><div class="t2">${esc(App.label(p.y))} · Rd ${p.rd}, #${p.ov} overall · ${esc(App.name(p.m))}</div></div>
      <div class="rv"><b class="${p.v >= 0 ? "pos" : "neg"}">${App.signed(p.v)}</b><div class="t2">finished ${App.rankLabel(p.ar)}</div></div></div>`;
    root.querySelector("#steals").innerHTML = steals.map(pickRow).join("");
    root.querySelector("#busts").innerHTML = busts.map(pickRow).join("");
    root.querySelector("#gems").innerHTML = gems.map((p) => `<div><div class="l"><div class="t1">${esc(p.p)}</div><div class="t2">${esc(App.label(p.y))} · Rd ${p.rd} (#${p.ov}) · ${esc(App.name(p.m))}</div></div><div class="rv"><b class="pos">#${p.ar}</b></div></div>`).join("");

    // Scatter + controls
    const scEl = root.querySelector("#scatter"), selM = root.querySelector("#sc-m"), selY = root.querySelector("#sc-y");
    const sc = drawScatter(scEl, picks);
    const upd = () => sc.highlight(selM.value || null, selY.value ? +selY.value : null);
    selM.addEventListener("change", upd); selY.addEventListener("change", upd);
    root.querySelector("#grades tbody").addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      const tr = e.target.closest("tr[data-m]");
      if (!tr) return;
      selM.value = selM.value === tr.dataset.m ? "" : tr.dataset.m;
      root.querySelectorAll("#grades tbody tr").forEach((r) => (r.style.background = r.dataset.m === selM.value ? "var(--accent-wash)" : ""));
      upd();
      scEl.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    drawSlots(root.querySelector("#slots"));
    drawBoard(root.querySelector("#board"), boardYear);
    if (arg) requestAnimationFrame(() => root.querySelector("#board-sec").scrollIntoView({ block: "start" }));
    App.onResize(() => { sc.redraw(); upd(); drawSlots(root.querySelector("#slots")); });
  });

  function drawScatter(el, picks) {
    let svg, x, y, dots, W, H;
    const m = { t: 16, r: 18, b: 40, l: 50 };
    const maxOv = d3.max(picks, (p) => p.ov);
    const redraw = () => {
      el.innerHTML = "";
      W = App.w(el); H = Math.round(Math.min(480, W * 0.45));
      svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", "Every draft pick: draft slot against end-of-season rank");
      x = d3.scaleLinear().domain([1, maxOv]).range([m.l, W - m.r]);
      y = d3.scaleLinear().domain([1, 310]).range([m.t, H - m.b]);
      svg.append("path").attr("d", `M${x(1)},${y(1)}L${x(maxOv)},${y(maxOv)}L${x(maxOv)},${y(1)}Z`).attr("fill", "var(--pos-wash)").attr("opacity", 0.5);
      svg.append("line").attr("x1", x(1)).attr("y1", y(1)).attr("x2", x(maxOv)).attr("y2", y(maxOv)).attr("stroke", "var(--ink-2)").attr("stroke-dasharray", "4 4");
      svg.append("text").attr("class", "lbl").attr("x", x(maxOv) - 4).attr("y", y(maxOv) - 8).attr("text-anchor", "end").text("finished exactly where drafted");
      svg.append("text").attr("class", "lbl").attr("x", x(maxOv * 0.72)).attr("y", y(30)).text("STEALS ↖").style("font-weight", 700).style("fill", "var(--pos)");
      svg.append("text").attr("class", "lbl").attr("x", x(4)).attr("y", y(270)).text("↙ BUSTS").style("font-weight", 700).style("fill", "var(--neg)");
      svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(8).tickFormat((v) => `#${v}`));
      svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).tickValues([1, 50, 100, 150, 200, 250, 300]).tickFormat((v) => (v === 300 ? "300+" : `#${v}`)));
      svg.append("text").attr("class", "lbl").attr("x", W - m.r).attr("y", H - 6).attr("text-anchor", "end").text("overall pick →");
      svg.append("text").attr("class", "lbl").attr("x", m.l).attr("y", 10).text("finish rank ↓ (1 = best)");
      dots = svg.append("g").selectAll("circle").data(picks).join("circle")
        .attr("cx", (d) => x(d.ov)).attr("cy", (d) => y(d.ar ?? 301) + (d.ar == null ? (((d.ov * 37 + d.y) % 11) - 5) : 0)).attr("r", 3.2)
        .attr("fill", (d) => (d.ar == null ? "var(--line-2)" : d.v >= 0 ? "var(--pos)" : "var(--neg)")).attr("fill-opacity", 0.55);
      App.hover(dots, (d) => App.tt(d.p, [["Season", App.label(d.y)], ["Drafted by", App.name(d.m)], ["Pick", `Rd ${d.rd}, #${d.ov}`], ["Finished", App.rankLabel(d.ar)], ["Preseason rank", d.pr ? `#${d.pr}` : "—"], ["Value", App.signed(d.v)]]));
    };
    const highlight = (mid, yr) => {
      const on = (d) => (!mid || d.m === mid) && (!yr || d.y === yr);
      const any = mid || yr;
      dots.transition().duration(350).attr("r", (d) => (any && on(d) ? 5.5 : 3.2)).attr("fill-opacity", (d) => (!any ? 0.55 : on(d) ? 0.95 : 0.08))
        .attr("stroke", (d) => (any && on(d) ? "var(--panel)" : "none"));
      dots.filter(on).raise();
    };
    redraw();
    return { redraw, highlight };
  }

  function drawSlots(el) {
    el.innerHTML = "";
    const rows = D.draft.bySlot;
    const W = App.w(el), H = 300, m = { t: 16, r: 10, b: 40, l: 40 };
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", "Average finish by first-round draft slot");
    const x = d3.scaleBand().domain(rows.map((r) => r.slot)).range([m.l, W - m.r]).padding(0.25);
    const y = d3.scaleLinear().domain([12, 1]).range([H - m.b, m.t]);
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).tickFormat((v) => `#${v}`));
    svg.append("g").attr("class", "axis grid-l").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).tickValues([1, 3, 6, 9, 12]).tickFormat(App.ord).tickSize(-(W - m.l - m.r)));
    svg.append("text").attr("class", "lbl").attr("x", W - m.r).attr("y", H - 6).attr("text-anchor", "end").text("first-round pick →");
    const avg = d3.mean(rows, (r) => r.avgFinish);
    const g = svg.append("g").selectAll("g").data(rows).join("g");
    g.append("rect").attr("x", (d) => x(d.slot)).attr("width", x.bandwidth()).attr("rx", 4).attr("y", H - m.b).attr("height", 0)
      .attr("fill", (d) => (d.avgFinish < avg ? "var(--s1)" : "var(--line-2)"))
      .transition().duration(600).delay((d, i) => i * 40).attr("y", (d) => y(d.avgFinish)).attr("height", (d) => H - m.b - y(d.avgFinish));
    g.filter((d) => d.titles > 0).append("text").attr("x", (d) => x(d.slot) + x.bandwidth() / 2).attr("y", (d) => y(d.avgFinish) - 6).attr("text-anchor", "middle").style("font-size", "12px").text((d) => "🏆".repeat(d.titles));
    App.hover(g, (d) => App.tt(`Pick #${d.slot}`, [["Seasons", d.seasons], ["Average final finish", d.avgFinish.toFixed(1)], ["Titles from this slot", d.titles]], d.slot > 10 ? "Only exists in 12-team seasons" : ""));
  }

  function drawBoard(el, year) {
    const picks = D.draft.picks.filter((p) => p.y === year);
    const season = App.seasonByYear(year);
    const teamOf = (m) => season.standings.find((s) => s.managerId === m);
    const cols = picks.filter((p) => p.rd === 1).sort((a, b) => a.pk - b.pk);
    const rounds = d3.max(picks, (p) => p.rd);
    const tone = (v) => (v >= 60 ? "var(--pos)" : v >= 0 ? "var(--pos-wash)" : v > -100 ? "var(--neg-wash)" : "var(--neg)");
    const ink = (v) => (v >= 60 || v <= -100 ? "#fff" : "var(--ink)");
    el.innerHTML = `<table class="t" style="table-layout:fixed;min-width:${cols.length * 104 + 40}px"><thead><tr><th style="width:40px">Rd</th>${cols
      .map((c) => { const t = teamOf(c.m); return `<th style="white-space:normal;text-transform:none;letter-spacing:0"><div style="color:var(--ink);font-size:12.5px">${esc(App.name(c.m))}</div><div style="font-weight:500;font-size:11px">${t ? App.ord(t.final) : ""} place</div></th>`; })
      .join("")}</tr></thead><tbody>${d3.range(1, rounds + 1)
      .map((r) => `<tr><td class="muted">${r}</td>${cols
        .map((c) => {
          const p = picks.find((x) => x.rd === r && x.m === c.m);
          if (!p) return "<td></td>";
          return `<td style="padding:3px"><div data-tip="${esc(`${p.p} · Rd ${p.rd}, #${p.ov} overall · finished ${App.rankLabel(p.ar)} · value ${App.signed(p.v)}`)}" style="background:${tone(p.v)};color:${ink(p.v)};border-radius:6px;padding:5px 7px;font-size:12px;line-height:1.25">
            <div style="font-weight:700;overflow:hidden;text-overflow:ellipsis">${esc(p.p)}</div><div style="display:flex;justify-content:space-between;opacity:.85"><span>${App.rankLabel(p.ar)}</span><span>${App.signed(p.v)}</span></div></div></td>`;
        })
        .join("")}</tr>`)
      .join("")}</tbody></table>`;
  }
})();
