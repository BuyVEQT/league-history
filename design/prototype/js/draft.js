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
        <p class="lede">Every pick since ${esc(App.label(yrs[0]))} compared with where the player finished that season. Value is in 9-category value points: positive beat the slot, negative fell short, and an early flop costs more than a late gem gains. ${App.info(App.TIP.draftValue)}</p></div>

      <section class="panel" style="padding:0">
        <div style="padding:16px 18px 0">${App.secHead("Draft report card", "Graded against the league average. Click a manager to light up their picks in the chart below.", App.TIP.vsLeague)}</div>
        <div class="scroll-x"><table class="t" id="grades"><thead><tr>
          <th>Grade</th><th>Manager</th><th class="r">Drafts</th><th>Value vs league ${App.info(App.TIP.vsLeague)}</th><th class="r">Hit rate ${App.info(App.TIP.hitRate)}</th>
          <th>Rounds 1-3: slot → finish</th><th class="r">Late gems ${App.info(App.TIP.gems)}</th><th>Best pick</th></tr></thead><tbody></tbody></table></div>
      </section>

      <section class="impact">
        <div class="panel imp-gauge">${App.secHead("How much does draft day decide?", "", App.TIP.impact)}
          <div class="chart" id="gauge"></div>
          <p class="note" style="margin-top:0">Across ${D.draft.impact.teamSeasons} team-seasons. The rest comes down to the waiver wire, trades, injuries and weekly luck.</p></div>
        <div class="panel">${App.secHead("Does reaching pay off?", `Picks in rounds 1-${D.draft.reach.maxRound} grouped by how far ahead of the pre-season rankings they were taken. Bars show how often each group beat its pre-season rank.`, App.TIP.reach)}
          <div class="chart" id="reachg"></div>
          <p class="note">${D.draft.reach.missingPreseason} picks without a pre-season rank are left out. Keeping your own picks: correlation with final finish ${D.draft.keeps.correlation.toFixed(2)} (close to zero = no real link). ${App.info(App.TIP.keep)}</p></div>
      </section>

      <section class="panel">
        ${App.secHead("Draft position: who got the early picks?", "Every first-round slot each manager has drawn. The ring is their average; chips count #1 and #2 picks and top-3 finishers they drafted.", App.TIP.position)}
        <div class="chart" id="dpos"></div>
      </section>

      <section class="panel">
        ${App.secHead("Every pick, ever", "Across: where they were drafted. Up: how well they finished. Above the line beat their slot. Click any dot for that player's draft history.", App.TIP.scatter,
          `<div class="controls"><label class="field">Highlight manager<select id="sc-m"><option value="">Everyone</option>${App.played.filter((id) => grades.some((g) => g.managerId === id)).map((id) => `<option value="${id}">${esc(App.name(id))}</option>`).join("")}</select></label>
           <label class="field">Season<select id="sc-y"><option value="">All seasons</option>${yrs.map((y) => `<option value="${y}">${esc(App.label(y))}</option>`).join("")}</select></label></div>`)}
        <div class="chart" id="scatter"></div>
        <div class="legend"><span><i class="dt" style="background:var(--pos)"></i>Steal (finished better than drafted)</span><span><i class="dt" style="background:var(--neg)"></i>Bust</span><span><i class="dt" style="background:var(--line-2)"></i>Outside the top 300 (shown at 300+)</span></div>
      </section>

      <section class="grid g2">
        <div class="panel">${App.secHead("Biggest steals", "Any round.", App.TIP.draftValue)}<div class="list" id="steals"></div></div>
        <div class="panel">${App.secHead("Biggest busts", "Rounds 1-3 only, where a miss really hurts.", App.TIP.draftValue)}<div class="list" id="busts"></div></div>
      </section>

      <section class="panel" style="padding:0">
        <div style="padding:16px 18px 0">${App.secHead("Draft habits", "How each manager drafts: ahead of or behind the rankings, and how many of their picks they keep.")}</div>
        <div class="scroll-x"><table class="t"><thead><tr><th>Manager</th><th>Spots early ${App.info(App.TIP.reach)}</th><th class="r">Reaches (15+)</th><th>Picks kept ${App.info(App.TIP.keep)}</th><th>Favourite player</th></tr></thead><tbody id="habits"></tbody></table></div>
      </section>

      <section class="panel">${App.secHead(`Favourite players (${D.draft.favourites.length})`, "Players one manager keeps coming back to: drafted in three or more seasons. Blue = beat the slot that year, red = fell short.")}
        <div class="favs capped" id="favs"></div><button type="button" class="btn more" data-more="favs" style="margin-top:12px">Show all ${D.draft.favourites.length}</button></section>
      <section class="panel">${App.secHead(`The ones that got away (${D.draft.gotAway.length})`, "Drafted, then finished top 40 on someone else's roster.", App.TIP.gotAway)}
        <div class="list away capped" id="away"></div><button type="button" class="btn more" data-more="away" style="margin-top:12px">Show all ${D.draft.gotAway.length}</button></section>

      <section class="panel">
        ${App.secHead("First overall picks", "Who held #1 each season, how the player did, and how the team finished.")}
        <div class="firsts" id="firsts"></div>
      </section>

      <section class="grid g2">
        <div class="panel">${App.secHead("Does draft slot matter?", "Average final finish by first-round pick position. Gold marks = titles won from that slot.")}<div class="chart" id="slots"></div></div>
        <div class="panel">${App.secHead(`Late-round gems (${gems.length})`, "Round 8 or later, finished top 75.", App.TIP.gems)}<div class="list" id="gems" style="max-height:330px;overflow:auto"></div></div>
      </section>

      <section class="panel" id="board-sec">
        ${App.secHead("Draft boards", "The full board, colored by how each pick turned out. Replay draft night pick by pick, or click any player for his draft history.", App.TIP.draftValue)}
        <div class="pills" id="board-years">${yrs.map((y) => `<a class="pill" href="#draft-${y}" ${y === boardYear ? 'aria-current="page"' : ""}>${esc(App.label(y))}</a>`).join("")}</div>
        <div class="scroll-x" style="margin-top:14px"><div id="board"></div></div>
        <div class="legend"><span><i class="sq" style="background:var(--pos)"></i>Big steal</span><span><i class="sq" style="background:var(--pos-wash)"></i>Beat the slot</span><span><i class="sq" style="background:var(--neg-wash)"></i>Below the slot</span><span><i class="sq" style="background:var(--neg)"></i>Big bust</span></div>
      </section>`;

    // Report card
    const letter = (v) => (v >= 0.3 ? "A" : v >= 0.1 ? "B" : v > -0.1 ? "C" : v > -0.3 ? "D" : "F");
    const maxAbs = d3.max(grades, (g) => Math.abs(g.vsLeague));
    root.querySelector("#grades tbody").innerHTML = grades.map((g) => `<tr data-m="${g.managerId}" style="cursor:pointer">
      <td><span class="badge ${letter(g.vsLeague) === "A" ? "gold" : ""}" style="font-family:var(--font-display);font-size:16px;min-width:30px;justify-content:center">${letter(g.vsLeague)}</span></td>
      <td>${App.who(g.managerId)}</td><td class="r">${g.drafts}</td>
      <td><div class="inbar" style="min-width:170px"><span class="num ${g.vsLeague >= 0 ? "pos" : "neg"}" style="width:46px">${App.signed(g.vsLeague, 2)}</span>
        <div class="tr" style="position:relative"><div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:var(--line-2)"></div>
        <div class="fl" style="position:absolute;top:0;bottom:0;background:${g.vsLeague >= 0 ? "var(--pos)" : "var(--neg)"};${g.vsLeague >= 0 ? `left:50%;width:${(g.vsLeague / maxAbs) * 50}%` : `right:50%;width:${(-g.vsLeague / maxAbs) * 50}%`};border-radius:3px"></div></div></div></td>
      <td class="r">${App.pct(g.hitRate, 0)}</td>
      <td class="num">#${Math.round(g.coreAvgSlot)} → #${Math.round(g.coreAvgRank)}</td>
      <td class="r">${g.gems}</td>
      <td>${esc(g.best.p)} <span class="muted small">${esc(g.best.y)} · ${App.val(g.best.v)}</span></td></tr>`).join("");
    root.querySelector("#grades").insertAdjacentHTML("afterend", `<p class="note" style="padding:0 18px 14px">Grade: A = +0.30 or more value per pick above the league average, B = +0.10, C = within ±0.10, D = −0.10 or worse, F = −0.30 or worse. Placeholder cut-offs for the league to tune.</p>`);

    const pickRow = (p) => `<div><div class="l"><div class="t1"><a class="plink" href="#draft" data-panel="player:${esc(p.p)}">${esc(p.p)}</a></div><div class="t2">${esc(App.label(p.y))} · Rd ${p.rd}, #${p.ov} overall · ${esc(App.name(p.m))}</div></div>
      <div class="rv"><b class="${p.v >= 0 ? "pos" : "neg"}">${App.val(p.v)}</b><div class="t2">finished ${App.rankLabel(p.ar)}</div></div></div>`;
    root.querySelector("#steals").innerHTML = steals.map(pickRow).join("");
    root.querySelector("#busts").innerHTML = busts.map(pickRow).join("");
    root.querySelector("#gems").innerHTML = gems.map((p) => `<div><div class="l"><div class="t1"><a class="plink" href="#draft" data-panel="player:${esc(p.p)}">${esc(p.p)}</a></div><div class="t2">${esc(App.label(p.y))} · Rd ${p.rd} (#${p.ov}) · ${esc(App.name(p.m))}</div></div><div class="rv"><b class="pos">#${p.ar}</b></div></div>`).join("");

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

    // Habits table
    const H = D.draft.reach.rows, maxE = d3.max(H, (r) => Math.abs(r.avgEarly));
    root.querySelector("#habits").innerHTML = H.map((r) => {
      const k = D.draft.keeps.rows.find((x) => x.managerId === r.managerId), f = D.draft.favourites.find((x) => x.m === r.managerId);
      return `<tr data-m="${r.managerId}"><td>${App.who(r.managerId)}</td>
        <td><div class="inbar" style="min-width:180px"><span class="num" style="width:44px">${App.signed(r.avgEarly, 1)}</span><div class="tr" style="position:relative"><div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:var(--line-2)"></div><div style="position:absolute;top:0;bottom:0;border-radius:3px;background:${r.avgEarly >= 0 ? "var(--accent)" : "var(--s1)"};${r.avgEarly >= 0 ? `left:50%;width:${(r.avgEarly / maxE) * 50}%` : `right:50%;width:${(-r.avgEarly / maxE) * 50}%`}"></div></div></div></td>
        <td class="r">${App.pct(r.reachShare, 0)}</td>
        <td>${k ? `<div class="inbar" style="min-width:150px"><span class="num" style="width:58px">${k.avgKept.toFixed(1)}/draft</span><div class="tr"><div class="fl" style="width:${k.keptShare * 100}%"></div></div></div>` : "—"}</td>
        <td>${f ? `${esc(f.p)} <span class="muted small">×${f.picks.length}</span>` : '<span class="muted">—</span>'}</td></tr>`;
    }).join("");
    root.querySelector("#habits").closest("section").insertAdjacentHTML("beforeend", `<p class="note" style="padding:0 18px 14px">Orange = drafts ahead of the pre-season rankings (reaches); blue = waits for players to fall.</p>`);
    root.querySelectorAll("button.more").forEach((b) => b.addEventListener("click", () => { const el = root.querySelector("#" + b.dataset.more); const open = el.classList.toggle("capped") === false; b.textContent = open ? "Show fewer" : b.textContent.replace("Show fewer", "Show all"); if (!open) b.textContent = `Show all ${el.children.length}`; }));
    // Favourites
    root.querySelector("#favs").innerHTML = D.draft.favourites.map((f) => `<div class="fav"><div class="fav-h">${App.mono(f.m)}<div><a class="plink" href="#draft" data-panel="player:${esc(f.p)}"><b>${esc(f.p)}</b></a><div class="small muted">${esc(App.name(f.m))} · drafted ${f.picks.length} times</div></div></div>
      <div class="fav-yrs">${f.picks.map((x) => `<span class="fy ${x.v >= 0 ? "up" : "down"}" data-tip="${esc(`${App.label(x.y)}: round ${x.rd}, #${x.ov} overall, finished ${App.rankLabel(x.ar)} (${App.val(x.v)})`)}"><span>${esc(App.label(x.y))}</span><b>Rd ${x.rd}</b><i>${App.val(x.v)}</i></span>`).join("")}</div></div>`).join("");
    // Got away
    root.querySelector("#away").innerHTML = D.draft.gotAway.map((g) => `<div><div class="l"><div class="t1"><a class="plink" href="#draft" data-panel="player:${esc(g.playerName)}">${esc(g.playerName)}</a> <span class="badge ${g.how === "traded" ? "orange" : ""}" style="margin-left:4px">${g.how}</span></div>
      <div class="t2">${esc(App.name(g.drafterManagerId))} took him #${g.overall} (rd ${g.round}), ${esc(g.label)} → ${g.endManagerId ? `ended on ${esc(g.endTeam)} (${esc(App.name(g.endManagerId))})` : "a free agent at season end"}</div></div><div class="rv"><b class="pos num">#${g.actualRank}</b><div class="t2">finished</div></div></div>`).join("");
    // First overall picks timeline
    root.querySelector("#firsts").innerHTML = D.draft.slotHistory.map((h) => `<div class="first"><div class="fy-l">${esc(h.label)}</div><a class="fp plink" href="#draft" data-panel="player:${esc(h.first.p)}">${esc(h.first.p)}</a>
      <div class="small muted">${esc(App.name(h.first.m))} · ${h.n} teams</div>
      <div class="fstats"><div><span>Player finished</span><b class="num ${h.first.ar && h.first.ar <= 12 ? "pos" : "neg"}">${App.rankLabel(h.first.ar)}</b></div><div><span>Team finished</span><b class="num">${h.firstTeamFinish === 1 ? "🏆 1st" : App.ord(h.firstTeamFinish)}</b></div></div>
      <div class="small muted">Champion drafted from #${h.champSlot ?? "—"}</div></div>`).join("");

    drawSlots(root.querySelector("#slots"));
    const drawNew = () => { drawGauge(root.querySelector("#gauge"), D.draft.impact); drawReach(root.querySelector("#reachg"), D.draft.reach); drawPositions(root.querySelector("#dpos")); };
    drawNew(); App.onResize(drawNew);
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
      dots = svg.append("g").selectAll("circle").data(picks).join("circle").attr("data-m", (d) => d.m).style("cursor", "pointer").on("click", (e, d) => App.openPanel("player", d.p))
        .attr("cx", (d) => x(d.ov)).attr("cy", (d) => y(d.ar ?? 301) + (d.ar == null ? (((d.ov * 37 + d.y) % 11) - 5) : 0)).attr("r", 3.2)
        .attr("fill", (d) => (d.ar == null ? "var(--line-2)" : d.v >= 0 ? "var(--pos)" : "var(--neg)")).attr("fill-opacity", 0.55);
      App.hover(dots, (d) => App.tt(d.p, [["Season", App.label(d.y)], ["Drafted by", App.name(d.m)], ["Pick", `Rd ${d.rd}, #${d.ov}`], ["Finished", App.rankLabel(d.ar)], ["Preseason rank", d.pr ? `#${d.pr}` : "—"], ["Value", App.val(d.v)]]));
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

  // ---------- Draft impact gauge (r²) ----------
  function drawGauge(el, I) {
    el.innerHTML = "";
    const W = Math.min(App.w(el), 340), H = 200, r = 120, cx = W / 2, cy = 140;
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).style("max-width", W + "px").style("display", "block").style("margin", "0 auto").attr("role", "img").attr("aria-label", `The draft explains about ${Math.round(I.r2 * 100)}% of the regular-season standings`);
    const arc = d3.arc().innerRadius(r - 22).outerRadius(r).cornerRadius(6);
    svg.append("path").attr("transform", `translate(${cx},${cy})`).attr("d", arc({ startAngle: -Math.PI / 2, endAngle: Math.PI / 2 })).attr("fill", "var(--panel-2)");
    const fg = svg.append("path").attr("transform", `translate(${cx},${cy})`).attr("fill", "var(--accent)");
    fg.transition().duration(1100).ease(d3.easeCubicOut).attrTween("d", () => { const i = d3.interpolate(-Math.PI / 2, -Math.PI / 2 + Math.PI * I.r2); return (t) => arc({ startAngle: -Math.PI / 2, endAngle: i(t) }); });
    const txt = svg.append("text").attr("x", cx).attr("y", cy - 8).attr("text-anchor", "middle").style("font-family", "var(--font-display)").style("font-weight", 900).style("font-size", "54px").style("fill", "var(--ink)").text("0%");
    txt.transition().duration(1100).tween("text", function () { const i = d3.interpolateRound(0, Math.round(I.r2 * 100)); return (t) => (this.textContent = i(t) + "%"); });
    svg.append("text").attr("x", cx - r + 11).attr("y", cy + 16).attr("text-anchor", "middle").attr("class", "lbl").text("0%");
    svg.append("text").attr("x", cx + r - 11).attr("y", cy + 16).attr("text-anchor", "middle").attr("class", "lbl").text("100%");
    svg.append("text").attr("x", cx).attr("y", cy + 44).attr("text-anchor", "middle").attr("class", "lbl-2").style("font-weight", 600).text("of the regular-season standings is explained by the draft");
  }

  // ---------- Reach groups: beat-the-rankings rate ----------
  function drawReach(el, R) {
    el.innerHTML = "";
    const rows = R.groups, W = App.w(el), rh = 48, m = { t: 6, r: 64, l: 190 }, H = m.t + rows.length * rh;
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", "How often reaches, on-time picks and fallers beat their pre-season rank");
    const x = d3.scaleLinear().domain([0, 0.6]).range([0, W - m.l - m.r]);
    const colors = ["var(--accent)", "var(--ink-2)", "var(--s1)"];
    const g = svg.append("g").selectAll("g").data(rows).join("g").attr("transform", (r, i) => `translate(0,${m.t + i * rh})`);
    g.append("text").attr("class", "lbl-ink").attr("x", m.l - 12).attr("y", rh / 2 - 7).attr("dy", ".35em").attr("text-anchor", "end").text((r) => r.label);
    g.append("text").attr("class", "lbl").attr("x", m.l - 12).attr("y", rh / 2 + 8).attr("dy", ".35em").attr("text-anchor", "end").text((r) => `${r.picks} picks`);
    g.append("rect").attr("x", m.l).attr("y", rh / 2 - 11).attr("height", 22).attr("rx", 5).attr("width", x(0.6)).attr("fill", "var(--panel-2)");
    g.append("rect").attr("x", m.l).attr("y", rh / 2 - 11).attr("height", 22).attr("rx", 5).attr("fill", (r, i) => colors[i]).attr("width", 0).transition().duration(800).delay((r, i) => i * 120).attr("width", (r) => x(r.beatRate));
    g.append("text").attr("class", "num").attr("x", (r) => m.l + x(r.beatRate) + 8).attr("y", rh / 2).attr("dy", ".35em").style("font-family", "var(--font-display)").style("font-weight", 800).style("font-size", "20px").style("fill", "var(--ink)").text((r) => App.pct(r.beatRate, 0));
    const spread = d3.max(rows, (r) => r.beatRate) - d3.min(rows, (r) => r.beatRate);
    svg.append("text").attr("class", "lbl").attr("x", W - 4).attr("y", H - 2).attr("text-anchor", "end").text(spread < 0.05 ? "About the same either way" : "");
  }

  // ---------- Draft position: dot strip of first-round slots ----------
  function drawPositions(el) {
    el.innerHTML = "";
    const rows = D.draft.positions, picks = D.draft.picks.filter((p) => p.rd === 1);
    const W = App.w(el), rh = 32, m = { t: 22, r: 250, l: 100 }, H = m.t + rows.length * rh;
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", "First-round draft slots by manager");
    const x = d3.scaleLinear().domain([1, 12]).range([m.l + 10, W - m.r - 10]);
    d3.range(1, 13).forEach((k) => { svg.append("line").attr("x1", x(k)).attr("x2", x(k)).attr("y1", m.t - 4).attr("y2", H).attr("stroke", "var(--line)"); svg.append("text").attr("class", "lbl num").attr("x", x(k)).attr("y", 12).attr("text-anchor", "middle").text(`#${k}`); });
    svg.append("text").attr("class", "lbl").attr("x", W - m.r + 16).attr("y", 12).text("#1 · #2 · top-3 finishers drafted").style("font-weight", 700);
    const g = svg.append("g").selectAll("g").data(rows).join("g").attr("data-m", (r) => r.managerId).attr("transform", (r, i) => `translate(0,${m.t + i * rh})`);
    g.append("text").attr("class", "lbl-ink").attr("x", m.l - 6).attr("y", rh / 2).attr("dy", ".35em").attr("text-anchor", "end").text((r) => App.name(r.managerId));
    g.append("line").attr("x1", x(1)).attr("x2", x(12)).attr("y1", rh / 2).attr("y2", rh / 2).attr("stroke", "var(--line-2)");
    g.each(function (r) {
      const mine = picks.filter((p) => p.m === r.managerId);
      const dots = d3.select(this).selectAll("circle.d").data(mine).join("circle").attr("class", "d").attr("cx", x(6.5)).attr("cy", rh / 2).attr("r", 5.5)
        .attr("fill", (p) => (p.pk === 1 ? "var(--gold)" : "var(--s1)")).attr("fill-opacity", 0.75).attr("stroke", "var(--panel)").attr("stroke-width", 1.5);
      dots.transition().duration(700).delay((p, i) => i * 40).attr("cx", (p) => x(p.pk));
      App.hover(dots, (p) => App.tt(`${App.name(p.m)} · ${App.label(p.y)}`, [["Round-one slot", `#${p.pk}`], ["Took", p.p], ["Player finished", App.rankLabel(p.ar)]]));
    });
    g.append("circle").attr("cx", (r) => x(r.avgSlot)).attr("cy", rh / 2).attr("r", 9).attr("fill", "none").attr("stroke", "var(--ink)").attr("stroke-width", 2);
    const chip = (gg, dx, val, on) => { gg.append("rect").attr("x", W - m.r + dx).attr("y", rh / 2 - 10).attr("width", 34).attr("height", 20).attr("rx", 10).attr("fill", on ? "var(--accent-wash)" : "var(--panel-2)");
      gg.append("text").attr("x", W - m.r + dx + 17).attr("y", rh / 2).attr("dy", ".35em").attr("text-anchor", "middle").attr("class", "num").style("font-size", "12px").style("font-weight", 800).style("fill", on ? "var(--accent-ink)" : "var(--muted)").text(val); };
    g.each(function (r) { const gg = d3.select(this); chip(gg, 16, r.firstPicks, r.firstPicks > 0); chip(gg, 56, r.secondPicks, r.secondPicks > 0); chip(gg, 96, r.topThreeFinishers, r.topThreeFinishers > 0);
      gg.append("text").attr("class", "lbl").attr("x", W - m.r + 142).attr("y", rh / 2).attr("dy", ".35em").text(`avg #${r.avgSlot.toFixed(1)} · ${r.drafts} draft${r.drafts > 1 ? "s" : ""}`); });
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
    const picks = D.draft.picks.filter((p) => p.y === year).sort((a, b) => a.ov - b.ov);
    const season = App.seasonByYear(year);
    const teamOf = (m) => season.standings.find((s) => s.managerId === m);
    const cols = picks.filter((p) => p.rd === 1).sort((a, b) => a.pk - b.pk);
    const rounds = d3.max(picks, (p) => p.rd);
    const tone = (v) => (v >= 3 ? "var(--pos)" : v >= 0 ? "var(--pos-wash)" : v > -3 ? "var(--neg-wash)" : "var(--neg)");
    const ink = (v) => (v >= 3 || v <= -3 ? "#fff" : "var(--ink)");
    const steal = [...picks].sort((a, b) => b.v - a.v)[0], bust = [...picks].filter((p) => p.rd <= 3).sort((a, b) => a.v - b.v)[0];
    el.innerHTML = `
      <div class="replay-bar">
        <button class="btn primary" type="button" id="dr-play">${App.icon("play")}<span>Replay draft night</span></button>
        <div class="seg" role="group" id="dr-speed"><button type="button" data-v="420" aria-pressed="true">1×</button><button type="button" data-v="140" aria-pressed="false">3×</button></div>
        <button class="btn" type="button" id="dr-skip" hidden>Skip to the end</button>
        <div class="ticker" id="dr-ticker" aria-live="polite"><span class="tk-k">${esc(season.label)} draft</span><span class="tk-t">${picks.length} picks · ${cols.length} teams · ${rounds} rounds. Press play to relive it pick by pick.</span></div>
      </div>
      <table class="t board" style="table-layout:fixed;min-width:${cols.length * 92 + 40}px"><thead><tr><th style="width:40px">Rd</th>${cols
      .map((c) => { const t = teamOf(c.m); return `<th data-col="${c.m}" style="white-space:normal;text-transform:none;letter-spacing:0"><div style="color:var(--ink);font-size:12.5px">${esc(App.name(c.m))}</div><div style="font-weight:500;font-size:11px">${t ? App.ord(t.final) : ""} place</div></th>`; })
      .join("")}</tr></thead><tbody>${d3.range(1, rounds + 1)
      .map((r) => `<tr><td class="muted">${r}</td>${cols
        .map((c) => {
          const p = picks.find((x) => x.rd === r && x.m === c.m);
          if (!p) return "<td></td>";
          return `<td style="padding:3px"><div class="pk res" data-ov="${p.ov}" data-m="${p.m}" data-panel="player:${esc(p.p)}" data-tip="${esc(`${p.p} · Rd ${p.rd}, #${p.ov} overall · finished ${App.rankLabel(p.ar)} · value ${App.val(p.v)} · click for his draft history`)}" style="--tone:${tone(p.v)};--tink:${ink(p.v)}">
            <span class="pk-no num">#${p.ov}</span><div class="pk-nm">${esc(p.p)}</div><div class="pk-rs"><span>${App.rankLabel(p.ar)}</span><span>${App.val(p.v)}</span></div></div></td>`;
        })
        .join("")}</tr>`)
      .join("")}</tbody></table>`;

    const cells = new Map([...el.querySelectorAll(".pk")].map((c) => [+c.dataset.ov, c]));
    const ticker = el.querySelector("#dr-ticker"), play = el.querySelector("#dr-play"), skip = el.querySelector("#dr-skip");
    let speed = 420, i = 0, timer = null, phase = "idle";
    const say = (k, t) => (ticker.innerHTML = `<span class="tk-k">${k}</span><span class="tk-t">${t}</span>`);
    const onClock = (p) => { el.querySelectorAll("th[data-col]").forEach((th) => th.classList.toggle("clock", !!p && th.dataset.col === p.m)); };
    const setBtn = (label, icon) => (play.innerHTML = `${App.icon(icon)}<span>${label}</span>`);
    const stop = () => { clearInterval(timer); timer = null; };
    const reveal = () => {
      phase = "reveal"; stop(); onClock(null); skip.hidden = true;
      say("Season's over", "Here's how every pick turned out…");
      picks.forEach((p, k) => setTimeout(() => { const c = cells.get(p.ov); c.classList.remove("drafted"); c.classList.add("res", "flip"); }, 30 + k * 12));
      setTimeout(() => { phase = "done"; setBtn("Replay draft night", "play");
        say("Verdict", `Steal: <b>${esc(steal.p)}</b> (#${steal.ov} → ${App.rankLabel(steal.ar)}, ${App.val(steal.v)}, ${esc(App.name(steal.m))}) · Bust: <b>${esc(bust.p)}</b> (#${bust.ov} → ${App.rankLabel(bust.ar)}, ${App.val(bust.v)}, ${esc(App.name(bust.m))})`); }, 60 + picks.length * 12 + 400);
    };
    const step = () => {
      if (!document.body.contains(el)) return stop();
      if (i >= picks.length) { stop(); phase = "drafted"; onClock(null); say("Draft complete", "Every roster is set. Now skip to the end of the season…"); setBtn("Reveal how it went", "bolt"); return; }
      const p = picks[i++], c = cells.get(p.ov);
      c.classList.remove("hid"); c.classList.add("drafted", "pop");
      onClock(picks[i] || null);
      say(`Round ${p.rd} · Pick ${p.pk} (#${p.ov})`, `<b>${esc(App.name(p.m))}</b> selects <b>${esc(p.p)}</b>${picks[i] ? ` · <span class="muted">${esc(App.name(picks[i].m))} is on the clock</span>` : ""}`);
    };
    const start = () => { phase = "drafting"; skip.hidden = false; setBtn("Pause", "pause"); stop(); timer = setInterval(step, speed); };
    play.addEventListener("click", () => {
      if (phase === "idle" || phase === "done") {
        i = 0; cells.forEach((c) => { c.classList.remove("res", "drafted", "pop", "flip"); c.classList.add("hid"); });
        say("Draft night", `<b>${esc(App.name(picks[0].m))}</b> is on the clock with the first pick.`); onClock(picks[0]); start();
      } else if (phase === "drafting") { stop(); phase = "paused"; setBtn("Resume", "play"); }
      else if (phase === "paused") start();
      else if (phase === "drafted") reveal();
    });
    skip.addEventListener("click", () => { stop(); while (i < picks.length) { const c = cells.get(picks[i++].ov); c.classList.remove("hid"); c.classList.add("drafted"); } reveal(); });
    App.bindSeg(el, "dr-speed", (v) => { speed = +v; if (timer) start(); });
  }

})();
