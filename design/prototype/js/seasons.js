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
      <div class="grid g4">
        ${App.tile("Champion", esc(team(season.champion).team), `${esc(App.name(season.champion))}`, App.TIP.titles)}
        ${App.tile("Runner-up", esc(team(season.runnerUp).team), esc(App.name(season.runnerUp)))}
        ${App.tile("Regular-season #1", esc(top.team), `${esc(App.name(top.managerId))} · ${App.rec(top.cw, top.cl, top.ct)} in categories`, App.TIP.catPct)}
        ${App.tile("Biggest blowout", `${Math.max(blow.hc, blow.ac)}-${Math.min(blow.hc, blow.ac)}${blow.tc ? "-" + blow.tc : ""}`, `${esc(team(bw).team)} over ${esc(team(bl).team)}, week ${blow.wk}`, App.TIP.blowout)}
      </div>

      <section class="panel">
        ${App.secHead("Replay the season", "Press play to watch the standings race unfold week by week. Bars run from .500: right of center is a winning category record.", App.TIP.replay)}
        <div class="player-bar">
          <button class="btn primary" id="rp-play" type="button">${App.icon("play")}<span>Play</span></button>
          <input type="range" id="rp-wk" min="0" max="${weeks.length - 1}" value="${weeks.length - 1}" aria-label="Week">
          <span class="small muted num" id="rp-label" style="min-width:120px"></span>
        </div>
        <div class="chart" id="replay" style="margin-top:8px"></div>
      </section>

      <section class="panel">
        ${App.secHead("Playoff bracket", "Seeds come from the regular-season standings. Ties in a playoff week go to the higher seed.")}
        <div id="bracket"></div>
      </section>

      <section class="panel">
        ${App.secHead("Every week, every team", "Categories won in each weekly matchup. Hover a cell for the full score.", App.TIP.weekGrid)}
        <div class="scroll-x"><div class="chart" id="wgrid" style="min-width:680px"></div></div>
        <div class="legend"><span><i class="sq" style="background:var(--pos)"></i>Won the week</span><span><i class="sq" style="background:var(--neg)"></i>Lost</span><span><i class="sq" style="background:var(--mid)"></i>Tied</span><span>Darker = bigger margin · P = playoff week</span></div>
      </section>

      <section class="panel" style="padding:0">
        <div style="padding:16px 18px 0">${App.secHead("Final standings", "Regular-season order, with where each team finished after the playoffs.")}</div>
        <div class="scroll-x"><table class="t">
          <thead><tr><th>Seed</th><th>Team</th><th>Manager</th><th>Category W-L-T ${App.info(App.TIP.catRec)}</th><th>Category win % ${App.info(App.TIP.catPct)}</th><th>Matchups ${App.info(App.TIP.matchPct)}</th><th>Moves ${App.info(App.TIP.moves)}</th><th>Final ${App.info(App.TIP.finish)}</th></tr></thead>
          <tbody>${season.standings.map((r) => `<tr><td class="muted">${r.rank}</td><td><b>${esc(r.team)}</b></td><td>${App.who(r.managerId)}</td><td>${App.rec(r.cw, r.cl, r.ct)}</td><td>${App.pct(r.catPct)}</td><td>${App.rec(r.w, r.l, r.t)}</td><td>${r.moves ?? "—"}</td><td>${finalBadge(r)}</td></tr>`).join("")}</tbody>
        </table></div>
      </section>`;

    drawReplay(root, season, weeks, team);
    drawBracket(root.querySelector("#bracket"), season, team);
    drawGrid(root.querySelector("#wgrid"), season, team);
  });

  function finalBadge(r) {
    if (r.final === 1) return `<span class="badge gold">${App.icon("trophy")}Champion</span>`;
    if (r.final <= 3) return `<span class="badge">${App.ord(r.final)}</span>`;
    if (r.playoffs) return `<span class="badge out">${App.ord(r.final)} · playoffs</span>`;
    return `<span class="muted">${App.ord(r.final)}</span>`;
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
      const ent = sel.enter().append("g").attr("class", "r");
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
      svg.selectAll("text.wk").data(wks).join("text").attr("class", "lbl num").attr("x", (d, i) => lw + i * cw + cw / 2).attr("y", 12).attr("text-anchor", "middle")
        .text((d) => { const st = season.matchups.find((m) => m.wk === d)?.st; return st !== "regular" ? "P" : d; });
      svg.selectAll("text.tm").data(ids).join("text").attr("class", "lbl-ink").attr("x", lw - 8).attr("y", (d, i) => 20 + i * ch + ch / 2).attr("dy", ".35em").attr("text-anchor", "end")
        .text((d) => { const t = team(d).team; return t.length > 24 ? t.slice(0, 23) + "…" : t; });
      const data = ids.flatMap((id, r) => wks.map((wk, c) => ({ r, c, d: cell.get(`${id}|${wk}`) })));
      const cells = svg.append("g").selectAll("g").data(data.filter((x) => x.d)).join("g").attr("transform", (x) => `translate(${lw + x.c * cw + 1},${20 + x.r * ch + 1})`);
      const margin = (d) => Math.abs(d.my - d.their);
      cells.append("rect").attr("width", cw - 2).attr("height", ch - 2).attr("rx", 3)
        .attr("fill", (x) => (x.d.win === null ? "var(--mid)" : x.d.win === x.d.me ? posC(margin(x.d) || 1) : negC(margin(x.d) || 1)))
        .attr("stroke", (x) => (x.d.st !== "regular" ? "var(--gold)" : "none")).attr("stroke-width", 1.5);
      cells.append("text").attr("x", (cw - 2) / 2).attr("y", (ch - 2) / 2).attr("dy", ".35em").attr("text-anchor", "middle").attr("font-size", 11.5).attr("font-weight", 600)
        .attr("fill", (x) => (x.d.win !== null && margin(x.d) >= 5 ? "#fff" : "var(--ink)")).text((x) => x.d.my);
      App.hover(cells, (x) => App.tt(`Week ${x.d.wk}${x.d.st !== "regular" ? " · playoffs" : ""}`, [[team(x.d.me).team, x.d.my], [team(x.d.opp).team, x.d.their], ["Tied categories", x.d.tc]], x.d.win === null ? "Tied week" : `${App.name(x.d.win)} won the week`));
    };
    draw();
    App.onResize(draw);
  }
})();
