/* Rivalries: pick two managers, tug-of-war score, every meeting on a timeline, everyone-vs-everyone heatmap. */
(function () {
  const { D, esc } = App;
  const STAGE = { regular: "Regular season", quarterfinal: "Quarterfinal", semifinal: "Semifinal", final: "Final", third_place: "3rd-place game" };

  /** Every meeting between a and b, oldest first, from a's side. */
  App.meetings = (a, b) => {
    const out = [];
    for (const s of D.seasons) for (const m of s.matchups) {
      if (!((m.h === a && m.a === b) || (m.h === b && m.a === a))) continue;
      const aHome = m.h === a;
      out.push({ year: s.year, label: s.label, wk: m.wk, st: m.st, ac: aHome ? m.hc : m.ac, bc: aHome ? m.ac : m.hc, tc: m.tc, win: m.win });
    }
    return out;
  };

  /** All pairs with their tallies (for the rivalry index). */
  const pairs = () => {
    const ids = D.h2h.ids, out = [];
    ids.forEach((a, i) => ids.slice(i + 1).forEach((b) => {
      const c = D.h2h.cells[a]?.[b];
      if (!c) return;
      const n = c.wins + c.losses + c.ties;
      if (!n) return;
      const ms = App.meetings(a, b);
      out.push({ a, b, ...c, n, p: (c.wins + c.ties / 2) / n, po: ms.filter((m) => m.st !== "regular").length, fin: ms.filter((m) => m.st === "final").length });
    }));
    return out;
  };

  App.register("rivalries", "Rivalries", (root) => {
    const ids = App.played;
    const all = pairs();
    const mostPlayed = [...all].sort((x, y) => y.n - x.n)[0];
    let [a, b] = App.rivalPair ?? [mostPlayed.a, mostPlayed.b];
    App.rivalPair = null;

    const opts = (sel, other) => ids.map((id) => `<option value="${id}" ${id === sel ? "selected" : ""} ${id === other ? "disabled" : ""}>${esc(App.name(id))}</option>`).join("");
    const minN = 10;
    const lopsided = all.filter((p) => p.n >= minN).map((p) => (p.p >= 0.5 ? p : { ...p, a: p.b, b: p.a, wins: p.losses, losses: p.wins, p: 1 - p.p })).sort((x, y) => y.p - x.p).slice(0, 5);
    const even = all.filter((p) => p.n >= minN).sort((x, y) => Math.abs(x.p - 0.5) - Math.abs(y.p - 0.5) || y.n - x.n).slice(0, 5);
    const playoff = all.filter((p) => p.po > 0).sort((x, y) => y.po - x.po || y.fin - x.fin).slice(0, 5);

    root.innerHTML = `
      <div><div class="eyebrow">Head-to-head</div><h1 class="title">Settle the debate</h1>
        <p class="lede">Pick any two managers. Everything comes from the weeks they actually played each other, regular season and playoffs. ${App.info(App.TIP.h2h)}</p></div>

      <section class="panel">
        <div class="controls">
          <label class="field">Manager A<select id="rv-a">${opts(a, b)}</select></label>
          <button class="btn" id="rv-swap" type="button">${App.icon("swap")}<span>Swap</span></button>
          <label class="field">Manager B<select id="rv-b">${opts(b, a)}</select></label>
          <span class="small muted" style="margin-left:auto">Or click any square in the grid below.</span>
        </div>
        <div id="rv-body" style="margin-top:18px"></div>
      </section>

      <section class="grid g3">
        <div class="panel">${App.secHead("Most lopsided", `Minimum ${minN} meetings.`)}<div class="list" id="ix-lop"></div></div>
        <div class="panel">${App.secHead("Dead even", `Closest to .500, minimum ${minN} meetings.`)}<div class="list" id="ix-even"></div></div>
        <div class="panel">${App.secHead("Playoff rivals", "Most postseason meetings.")}<div class="list" id="ix-po"></div></div>
      </section>

      <section class="panel">
        ${App.secHead("Everyone vs everyone", "Each row's record against each column. Blue = the row manager leads the series, red = trails. Click a square to load that rivalry above.", App.TIP.h2h)}
        <div class="chart scroll-x" id="matrix"></div>
        <div class="legend"><span><i class="sq" style="background:var(--neg)"></i>Row trails</span><span><i class="sq" style="background:var(--mid)"></i>Even</span><span><i class="sq" style="background:var(--pos)"></i>Row leads</span><span class="muted">· No square = never played</span></div>
      </section>`;

    const pairRow = (p, val, sub) => `<a href="#rivalries" data-pair="${p.a},${p.b}" style="text-decoration:none;color:inherit">
        <div class="l"><div class="t1">${esc(App.name(p.a))} <span class="muted">vs</span> ${esc(App.name(p.b))}</div><div class="t2">${sub}</div></div>
        <div class="rv"><b class="num">${val}</b></div></a>`;
    root.querySelector("#ix-lop").innerHTML = lopsided.map((p) => pairRow(p, App.rec(p.wins, p.losses, p.ties), `${App.pct(p.p, 0)} for ${esc(App.name(p.a))} · ${p.n} meetings`)).join("");
    root.querySelector("#ix-even").innerHTML = even.map((p) => pairRow(p, App.rec(p.wins, p.losses, p.ties), `${p.n} meetings`)).join("");
    root.querySelector("#ix-po").innerHTML = playoff.map((p) => pairRow(p, `${p.po}×`, `${p.fin ? `${p.fin} in the final · ` : ""}${App.rec(p.wins, p.losses, p.ties)} overall`)).join("");

    const selA = root.querySelector("#rv-a"), selB = root.querySelector("#rv-b");
    const set = (na, nb) => {
      a = na; b = nb;
      selA.innerHTML = opts(a, b); selB.innerHTML = opts(b, a);
      renderPair(root.querySelector("#rv-body"), a, b);
      drawMatrix(root.querySelector("#matrix"), a, b, set);
    };
    selA.addEventListener("change", () => set(selA.value, b));
    selB.addEventListener("change", () => set(a, selB.value));
    root.querySelector("#rv-swap").addEventListener("click", () => set(b, a));
    root.addEventListener("click", (e) => {
      const el = e.target.closest("[data-pair]");
      if (!el) return;
      e.preventDefault();
      const [x, y] = el.dataset.pair.split(",");
      set(x, y);
      root.querySelector("#rv-body").scrollIntoView({ behavior: "smooth", block: "center" });
    });
    set(a, b);
    App.onResize(() => set(a, b));
  });

  function renderPair(el, a, b) {
    const ms = App.meetings(a, b);
    if (!ms.length) {
      el.innerHTML = `<div class="callout">${esc(App.name(a))} and ${esc(App.name(b))} never played each other: they weren't in the league at the same time.</div>`;
      return;
    }
    const aw = ms.filter((m) => m.win === a).length, bw = ms.filter((m) => m.win === b).length, ti = ms.length - aw - bw;
    const reg = ms.filter((m) => m.st === "regular"), po = ms.filter((m) => m.st !== "regular");
    const rw = (list, id) => list.filter((m) => m.win === id).length;
    const catA = d3.sum(ms, (m) => m.ac), catB = d3.sum(ms, (m) => m.bc), catT = d3.sum(ms, (m) => m.tc);
    const big = [...ms].sort((x, y) => Math.abs(y.ac - y.bc) - Math.abs(x.ac - x.bc))[0];
    // Current streak in the series
    let sk = 0, sw = null;
    for (const m of [...ms].reverse()) { if (m.win === null) break; if (sw === null) sw = m.win; if (m.win !== sw) break; sk++; }
    const lead = aw === bw ? "Series is tied" : `${esc(App.name(aw > bw ? a : b))} leads`;

    el.innerHTML = `
      <div class="vs">
        <div class="side">${App.mono(a, "lg")}<div><div class="cnt num">${aw}</div><div style="font-weight:700">${esc(App.name(a))}</div></div></div>
        <div class="mid"><div style="font-family:var(--font-display);font-weight:800;font-size:22px;color:var(--ink);text-transform:uppercase">${lead}</div>${ms.length} meetings${ti ? ` · ${ti} tied` : ""}</div>
        <div class="side b"><div><div class="cnt num">${bw}</div><div style="font-weight:700">${esc(App.name(b))}</div></div>${App.mono(b, "lg")}</div>
      </div>
      <div class="tug" role="img" aria-label="${esc(App.name(a))} ${aw} wins, ${ti} ties, ${esc(App.name(b))} ${bw} wins">
        <div style="flex-grow:0;background:var(--s1)" data-g="${aw}"></div><div style="flex-grow:0;background:var(--line-2)" data-g="${ti}"></div><div style="flex-grow:0;background:var(--s2)" data-g="${bw}"></div>
      </div>
      <div class="grid g4" style="margin-top:16px">
        ${App.tile("Regular season", `<span class="num">${rw(reg, a)}-${rw(reg, b)}${reg.length - rw(reg, a) - rw(reg, b) ? "-" + (reg.length - rw(reg, a) - rw(reg, b)) : ""}</span>`, `${esc(App.name(a))}'s W-L-T`)}
        ${App.tile("Playoffs", `<span class="num">${rw(po, a)}-${rw(po, b)}</span>`, po.length ? `${po.length} meeting${po.length > 1 ? "s" : ""}${po.some((m) => m.st === "final") ? " · met in a final" : ""}` : "never met in the playoffs")}
        ${App.tile("Categories", `<span class="num">${catA}-${catB}</span>`, `${catT} tied`, "Every category from every meeting added up, from " + App.name(a) + "'s side.")}
        ${App.tile("Current streak", sk ? `<span class="num">${sk}</span>` : "—", sk ? `straight for ${esc(App.name(sw))}` : "last meeting was a tie")}
      </div>
      <h3 class="small" style="margin:22px 0 4px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">Every meeting</h3>
      <div class="chart" id="rv-time"></div>
      <div class="legend"><span><i class="dt" style="background:var(--s1)"></i>${esc(App.name(a))} won</span><span><i class="dt" style="background:var(--s2)"></i>${esc(App.name(b))} won</span><span><i class="dt" style="background:var(--line-2)"></i>Tie</span><span>Ringed = playoffs · height = category margin</span></div>
      <p class="note">Biggest beatdown: ${esc(App.name(big.win ?? a))} won ${Math.max(big.ac, big.bc)}-${Math.min(big.ac, big.bc)} in ${esc(big.label)}, ${big.st === "regular" ? `week ${big.wk}` : STAGE[big.st].toLowerCase()}.</p>`;

    requestAnimationFrame(() => el.querySelectorAll(".tug div").forEach((d) => (d.style.flexGrow = d.dataset.g)));
    drawTimeline(el.querySelector("#rv-time"), ms, a, b);
  }

  /** Meetings as a strip: x = season/week, y = margin above (A won) or below (B won) the center line. */
  function drawTimeline(el, ms, a, b) {
    const W = App.w(el), H = 170, m = { t: 14, r: 10, b: 26, l: 10 };
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", "Every meeting between the two managers");
    const years = D.seasons.map((s) => s.year);
    const x0 = d3.scaleBand().domain(years).range([m.l, W - m.r]).paddingInner(0.08);
    const maxWk = d3.max(D.seasons, (s) => d3.max(s.matchups, (mm) => mm.wk));
    const x = (d) => x0(d.year) + ((d.wk - 0.5) / maxWk) * x0.bandwidth();
    const mid = (H - m.b + m.t) / 2;
    const y = d3.scaleLinear().domain([-9, 9]).range([H - m.b, m.t]);
    years.forEach((yr) => {
      svg.append("rect").attr("x", x0(yr)).attr("y", m.t).attr("width", x0.bandwidth()).attr("height", H - m.b - m.t).attr("fill", "var(--panel-2)").attr("rx", 4);
      svg.append("text").attr("class", "lbl").attr("x", x0(yr) + x0.bandwidth() / 2).attr("y", H - 8).attr("text-anchor", "middle").text(App.label(yr));
    });
    svg.append("line").attr("x1", m.l).attr("x2", W - m.r).attr("y1", mid).attr("y2", mid).attr("stroke", "var(--line-2)");
    svg.append("text").attr("class", "lbl").attr("x", m.l + 4).attr("y", m.t + 10).text(`▲ ${App.name(a)}`);
    svg.append("text").attr("class", "lbl").attr("x", m.l + 4).attr("y", H - m.b - 4).text(`▼ ${App.name(b)}`);
    const col = (d) => (d.win === a ? "var(--s1)" : d.win === b ? "var(--s2)" : "var(--line-2)");
    const g = svg.append("g").selectAll("g").data(ms).join("g");
    g.append("line").attr("x1", x).attr("x2", x).attr("y1", mid).attr("y2", mid).attr("stroke", col).attr("stroke-width", 2)
      .transition().duration(600).delay((d, i) => i * 18).attr("y2", (d) => y(d.ac - d.bc));
    g.append("circle").attr("cx", x).attr("cy", mid).attr("r", (d) => (d.st === "regular" ? 4.5 : 6)).attr("fill", col)
      .attr("stroke", (d) => (d.st === "regular" ? "var(--panel)" : "var(--gold)")).attr("stroke-width", (d) => (d.st === "regular" ? 1.5 : 2.5))
      .transition().duration(600).delay((d, i) => i * 18).attr("cy", (d) => y(d.ac - d.bc));
    g.style("cursor", "pointer").on("click", (e, d) => App.go(`week-${d.year}-${d.wk}`));
    App.hover(g, (d) => App.tt(`${d.label} · ${d.st === "regular" ? `Week ${d.wk}` : STAGE[d.st]}`, [[App.name(a), d.ac], [App.name(b), d.bc], ["Tied categories", d.tc]], (d.win ? `${App.name(d.win)} won${d.st !== "regular" && d.ac === d.bc ? " on seed tiebreak" : ""}` : "Tied week") + " · click for the week"));
  }

  function drawMatrix(el, selA, selB, set) {
    el.innerHTML = "";
    const ids = D.h2h.ids, n = ids.length;
    const cell = 46, m = { t: 34, l: 96 };
    const W = m.l + n * cell + 2, H = m.t + n * cell + 2;
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).style("max-width", W + "px").attr("role", "img").attr("aria-label", "Head-to-head grid");
    // Diverging fill: mid gray at .500, full blue/red at 80%/20% or beyond.
    const cssVar = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
    const wash = (p) => d3.interpolateRgb(cssVar("--mid"), cssVar(p >= 0.5 ? "--pos" : "--neg"))(Math.min(1, Math.abs(p - 0.5) / 0.3));
    ids.forEach((id, i) => {
      svg.append("text").attr("class", "lbl-ink").attr("x", m.l - 8).attr("y", m.t + i * cell + cell / 2).attr("dy", ".35em").attr("text-anchor", "end").text(App.name(id)).style("font-weight", id === selA ? 800 : 600);
      svg.append("text").attr("class", "lbl").attr("x", m.l + i * cell + cell / 2).attr("y", m.t - 10).attr("text-anchor", "middle").text(App.initials(id)).style("font-weight", id === selB ? 800 : 500);
    });
    const data = [];
    ids.forEach((r, i) => ids.forEach((c, j) => {
      if (r === c) return;
      const x = D.h2h.cells[r]?.[c];
      if (!x) return;
      const n = x.wins + x.losses + x.ties;
      if (!n) return;
      data.push({ r, c, i, j, ...x, n, p: (x.wins + x.ties / 2) / n });
    }));
    ids.forEach((r, i) => svg.append("rect").attr("x", m.l + i * cell + 1).attr("y", m.t + i * cell + 1).attr("width", cell - 2).attr("height", cell - 2).attr("rx", 5).attr("fill", "var(--panel-2)"));
    const g = svg.append("g").selectAll("g").data(data).join("g").attr("transform", (d) => `translate(${m.l + d.j * cell},${m.t + d.i * cell})`).style("cursor", "pointer");
    g.append("rect").attr("x", 1).attr("y", 1).attr("width", cell - 2).attr("height", cell - 2).attr("rx", 5)
      .attr("fill", (d) => wash(d.p)).attr("stroke", (d) => (d.r === selA && d.c === selB ? "var(--ink)" : "none")).attr("stroke-width", 2.5)
      .style("opacity", 0).transition().duration(400).delay((d) => (d.i + d.j) * 18).style("opacity", 1);
    g.append("text").attr("x", cell / 2).attr("y", cell / 2).attr("dy", ".35em").attr("text-anchor", "middle").attr("class", "num")
      .style("font-size", "11.5px").style("font-weight", 700).style("fill", (d) => (Math.abs(d.p - 0.5) > 0.2 ? "#fff" : "var(--ink)"))
      .text((d) => `${d.wins}-${d.losses}`);
    g.on("click", (e, d) => set(d.r, d.c));
    App.hover(g, (d) => App.tt(`${App.name(d.r)} vs ${App.name(d.c)}`, [["Record", App.rec(d.wins, d.losses, d.ties)], ["Win %", App.pct(d.p, 0)], ["Meetings", d.n]], "Click to compare"));
  }
})();
