/* The Cup: why the league is named after Bruno Caboclo. Numbers from window.FINAL (src/lib/analytics/cabocloFinal.ts + caboclo-final.json). */
(function () {
  const { esc } = App;
  const F = window.FINAL;
  if (!F) return;
  const W_ID = "matt", L_ID = "jacob-g";
  const team = (id) => F.final.teams.find((t) => t.managerId === id);
  const win = team(W_ID), lose = team(L_ID);
  const T = F.timeline, WI = F.whatIf, P = T.points, N = P.length;
  const BRUNO = "Bruno Caboclo", HOLIDAY = "Justin Holiday";
  const pct8 = (v) => v.toFixed(8).replace(/^0/, "");
  const pct4 = (v) => v.toFixed(4).replace(/^0/, "");
  const tz = { timeZone: "America/New_York" };
  const et = (iso) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", ...tz }).toLowerCase();
  const day = (iso) => new Date(iso).toLocaleDateString("en-US", { weekday: "short", ...tz });
  const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const marginTxt = pct8(WI.margin).replace(/^\.0+/, (z) => z); // .00014747

  // Derived display facts (no new formulas: counts and ratios of values already computed)
  const leadChanges = P.reduce((n, p, i) => n + ((i ? P[i - 1].leading : T.start.leading) !== p.leading ? 1 : 0), 0);
  const cabMakes = P.filter((p) => p.player === BRUNO && p.made);
  const hol = P.filter((p) => p.player === HOLIDAY), holMiss = hol.filter((p) => !p.made).length;
  const last = P[N - 1];
  const oneBasket = WI.made.pct - lose.yahooFgPct; // what one more make was worth (1/567)
  const nth = Math.round(oneBasket / WI.margin);
  const ORD = { 8: "eighth", 9: "ninth", 10: "tenth", 11: "eleventh", 12: "twelfth", 13: "thirteenth", 14: "fourteenth", 15: "fifteenth" };
  const fraction = ORD[nth] ? `one-${ORD[nth]}` : `1/${nth}`;
  const ordinal = (n) => n + (["th", "st", "nd", "rd"][((n % 100) - 20) % 10] || ["th", "st", "nd", "rd"][n % 100] || "th");
  const adds = F.final.adds || [];
  const brunoAdd = adds.find((a) => a.player === BRUNO), holAdd = adds.find((a) => a.player === HOLIDAY);
  const addGap = brunoAdd && holAdd ? Math.round((new Date(holAdd.time) - new Date(brunoAdd.time)) / 60000) : null;
  const sat = F.final.activeDays.find((a) => a.name === BRUNO)?.games.find((g) => g.date === "2019-03-30");

  // 4 decimals with the deciding digit highlighted; full 8 in the title
  const dec4 = (v) => { const s = pct4(v); return `<b class="num" title="${pct8(v)}">${s.slice(0, 4)}<b>${s.slice(4)}</b></b>`; };

  App.register("cup", "The Cup", (root) => {
    root.innerHTML = `
      <section class="cup-hero">
        <div class="cup-hero-txt">
          <div class="eyebrow" style="color:var(--accent)">2018–19 · Week ${F.final.week.number} · Our first final</div>
          <h1 class="cup-title">The Caboclo Cup</h1>
          <p class="cup-sub">Our first championship was decided by the <b>${F.brunoRank ? `${ordinal(F.brunoRank)}-ranked player` : "a waiver pickup"}</b> in fantasy basketball, on <b>the last shot anyone took all season</b>.</p>
          <div class="cup-ticker">
            <div class="fg"><span>Field-goal %</span>${dec4(win.yahooFgPct)}<i>vs</i>${dec4(lose.yahooFgPct)}</div>
            <div><span>Final</span><b class="num">${win.categoriesWon}–${lose.categoriesWon}</b></div>
          </div>
        </div>
        <div class="cup-hoop">
          <svg viewBox="0 0 320 300" id="hoop" role="img" aria-label="A ball rims out of the hoop">
            <rect x="196" y="40" width="12" height="120" rx="3" fill="#dbe3ee"/>
            <rect x="120" y="62" width="88" height="62" rx="4" fill="none" stroke="#dbe3ee" stroke-width="4"/>
            <rect x="150" y="84" width="34" height="26" fill="none" stroke="#dbe3ee" stroke-width="3"/>
            <g id="net" stroke="#f3f6fa" stroke-width="1.6" fill="none" opacity=".85">
              <path d="M104 128 L114 176 M118 128 L122 178 M132 128 L131 178 M146 128 L140 178 M160 128 L149 176"/>
              <path d="M106 140 Q132 150 158 140 M110 156 Q132 164 154 156 M113 170 Q132 176 150 170"/>
            </g>
            <ellipse cx="132" cy="128" rx="30" ry="7" fill="none" stroke="var(--accent)" stroke-width="5"/>
            <g id="ball"><circle r="17" fill="#e0601c"/><path d="M-17 0 H17 M0 -17 V17 M-12 -12 Q0 0 -12 12 M12 -12 Q0 0 12 12" stroke="rgba(0,0,0,.45)" stroke-width="1.6" fill="none"/></g>
            <text x="20" y="288" class="cup-hoop-cap" id="hoop-cap">One six-footer</text>
          </svg>
          <button type="button" class="btn" id="hoop-again">${App.icon("reset")}<span>Replay</span></button>
        </div>
      </section>

      <section>
        ${App.secHead("Meet Bruno", "Every Raptors fan knows the name. Here's how it ended up on our trophy.")}
        <ol class="bruno">
          <li><span class="by">June 2014</span><b>Two years away from being two years away</b><p>The Raptors take him 20th overall, and Fran Fraschilla delivers the line on the broadcast. Toronto never lets it go.</p></li>
          <li><span class="by">Mon, Mar 25 2019</span><b>Career-high 24. Wrong day.</b><p>Now a Grizzly, he drops 24 on OKC on the first day of championship week. He isn't on Jacob's roster yet.</p></li>
          <li class="hot"><span class="by">${brunoAdd ? `${day(brunoAdd.time)}, Mar 30 · ${et(brunoAdd.time)}` : "Sat, Mar 30"}</span><b>Jacob clicks Add</b>
            <p>He had options. He took Bruno${addGap ? `, then Justin Holiday ${addGap} minutes later: the two Grizzlies who decide the final` : ""}.${sat ? ` Bruno gives him ${sat.pts} that night.` : ""}</p>
            ${adds.length ? `<div class="addlog">${adds.map((a, i) => `<div class="${a.managerId === L_ID ? "" : "other"}" style="--d:${0.5 + i * 0.25}s"><span class="plus">+</span><b>${esc(a.player)}</b><span class="t num">${day(a.time)} ${et(a.time)}</span><span class="by2">${esc(a.teamName)}</span></div>`).join("")}</div>` : ""}
          </li>
        </ol>
      </section>

      <section class="panel">
        ${App.secHead(`The final: ${win.categoriesWon}–${lose.categoriesWon}`, "Nine categories. Three came down to one: one steal, one point, one shot.", "", `<button type="button" class="btn" id="cats-again">${App.icon("reset")}<span>Flip again</span></button>`)}
        <div class="cats" id="cats"></div>
        <div class="cats-big" id="cats-big"></div>
        <div class="cats-score"><span>${App.mono(W_ID, "md")}<b>${esc(win.teamName)}</b></span><b class="num" id="cats-tally">${win.categoriesWon}–${lose.categoriesWon}</b><span><b>${esc(lose.teamName)}</b>${App.mono(L_ID, "md")}</span></div>
      </section>

      <section class="panel cast">
        ${App.secHead("Garbage time in LA", "Grizzlies at Clippers, the last game of the night. Memphis was playing out the string. In our league, it was the whole season.", "Skip's week FG% after each Grizzlies shot, with every other game already final. The gold line is Klaw Leonard's finished FG%.",
          `<div class="cast-ctl"><button class="btn primary" type="button" id="cast-play">${App.icon("play")}<span>Play the final</span></button><button class="btn" type="button" id="cast-back" aria-label="Previous shot">‹</button><button class="btn" type="button" id="cast-fwd" aria-label="Next shot">›</button></div>`)}
        <div class="night" id="night"></div>
        <div class="cast-grid">
          <div class="board">
            <div class="board-top"><span class="board-q num" id="b-clock">Tip-off</span><span class="board-g num" id="b-game">MEM 0 – LAC 0</span></div>
            <div class="board-row"><span>${esc(lose.teamName)} FG% (Jacob)</span><b class="num" id="b-pct">${pct8(T.start.pct)}</b><span class="num muted" id="b-fg">${T.start.fgm}/${T.start.fga}</span></div>
            <div class="board-row tgt"><span>${esc(win.teamName)} FG%, final</span><b class="num">${pct8(T.target)}</b><span class="num muted">${win.fgm}/${win.fga}</span></div>
            <div class="board-status" id="b-status">AHEAD</div>
            <div class="board-play" id="b-play"></div>
            <div class="board-meta"><span>Lead changes <b class="num" id="b-lc">0</b></span><span>Shot <b class="num" id="b-n">0</b>/${N}</span></div>
          </div>
          <div class="chart" id="fgline"></div>
        </div>
      </section>

      <section class="panel opts">
        ${App.secHead("Bruno had three options at 1:50", "Two of them made Jacob a champion.", "", App.seg("hist-k", [["miss", "Miss it (what happened)"], ["make", "Make it"], ["pass", "Pass it"]], "miss"))}
        <div class="opts-grid">
          <div class="bench-clock"><span class="num">${last.clock}</span><small>left in the season</small></div>
          <div class="hist" id="hist"></div>
        </div>
        <p class="opts-foot">He never took another shot, and neither did anyone else on either roster. Jacob lost the first Caboclo Cup by about <b>${fraction} of a basket</b>.</p>
      </section>

      <details class="panel how"><summary><b>How we know</b> <span class="muted small">Yahoo's tiebreaker to eight decimals, the play-by-play, the add log, and which days each player counted</span></summary>
        <div class="list" style="margin-top:10px">
          <div><div class="l"><div class="t1">The score</div><div class="t2">Yahoo's week ${F.final.week.number} page: ${win.fgm}/${win.fga} and ${lose.fgm}/${lose.fga}, tiebreaker values ${pct8(win.yahooFgPct)} and ${pct8(lose.yahooFgPct)}. The arithmetic matches to eight decimals.</div></div></div>
          <div><div class="l"><div class="t1">Who was playing</div><div class="t2">${F.final.activeDays.map((a) => `${esc(a.name)} (${a.yahoo.pts} pts, ${a.yahoo.fgPct}) = ${a.games.map((g) => g.date.slice(5)).join(" + ")}`).join("; ")}</div></div></div>
          <div><div class="l"><div class="t1">The shots</div><div class="t2">Every attempt from the play-by-play; counts match the box score. "${fraction} of a basket" = the losing margin (${marginTxt}) divided by what one more make was worth (${pct8(oneBasket)}).</div></div></div>
        </div>
        <ul class="small">${F.final.sources.map((s) => `<li>${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noreferrer">${esc(s.label)}</a>` : esc(s.label)}</li>`).join("")}</ul>
      </details>`;
    hoop(root.querySelector("#hoop"));
    root.querySelector("#hoop-again").addEventListener("click", () => hoop(root.querySelector("#hoop")));
    cats(root);
    root.querySelector("#cats-again").addEventListener("click", () => cats(root));
    night(root.querySelector("#night"));
    const cast = broadcast(root);
    App.onResize(() => cast.redraw());
    history(root);
  }, { isNew: true });
  App.order.splice(App.order.indexOf("cup"), 1);
  App.order.splice(1, 0, "cup");

  // ---------- Hero: the rim-out ----------
  function hoop(svg) {
    const ball = d3.select(svg).select("#ball"), net = d3.select(svg).select("#net"), cap = d3.select(svg).select("#hoop-cap");
    // Piecewise path: release → arc to front rim → pop up → roll on the rim → off the side and down.
    const segs = [
      { d: 900, f: (t) => [10 + t * 106, 250 - Math.sin(t * Math.PI * 0.86) * 230 + t * 52] },
      { d: 260, f: (t) => [116 + t * 28, 116 - Math.sin(t * Math.PI) * 38] },
      { d: 380, f: (t) => [144 + Math.sin(t * Math.PI) * 14, 116 - Math.sin(t * Math.PI) * 6] },
      { d: 700, f: (t) => [160 + t * 118, 112 + t * t * 128] },
    ];
    ball.interrupt().attr("transform", "translate(10,250)").attr("opacity", 1);
    cap.attr("opacity", 0);
    if (reduce()) { ball.attr("transform", "translate(278,240)"); cap.attr("opacity", 1); return; }
    let chain = ball.transition().duration(0);
    segs.forEach((s, i) => {
      chain = chain.transition().duration(s.d).ease(i === 0 ? d3.easeQuadOut : i === 3 ? d3.easeQuadIn : d3.easeSinInOut)
        .attrTween("transform", () => (t) => { const [x, y] = s.f(t); return `translate(${x},${y}) rotate(${(i * 90 + t * 120) % 360})`; });
      if (i === 1) chain.on("start", () => net.transition().duration(120).attr("transform", "translate(0,2)").transition().duration(240).attr("transform", "translate(0,0)"));
    });
    chain.on("end", () => cap.transition().duration(300).attr("opacity", 1));
  }

  // ---------- The final: six quick chips, three photo finishes ----------
  function cats(root) {
    const C = [
      ["FT%", "FT%", (t) => (t.yahooFtPct == null ? "—" : t.yahooFtPct.toFixed(3).replace(/^0/, ""))],
      ["3PTM", "3PM", (t) => t.tpm],
      ["REB", "REB", (t) => t.reb],
      ["AST", "AST", (t) => t.ast],
      ["BLK", "BLK", (t) => t.blk],
      ["TO", "TO", (t) => t.to],
    ];
    const BIG = [
      ["ST", "Steals", (t) => t.stl, "one steal"],
      ["PTS", "Points", (t) => t.pts, "one point"],
      ["FG%", "Field-goal %", (t) => pct8(t.yahooFgPct), "one shot"],
    ];
    const card = (k, label, v, cls, extra = "") => {
      const w = F.final.winners[k];
      return `<div class="cat ${cls}"><div class="cat-in">
        <div class="cat-f"><span>${label}</span><b>?</b></div>
        <div class="cat-b ${w === W_ID ? "w" : "l"}"><span>${label}${extra ? `<em>${extra}</em>` : ""}</span>
          <div class="cat-v"><b class="num">${v(win)}</b><i>vs</i><b class="num">${v(lose)}</b></div>
          <div class="cat-w">${App.mono(w)}<span>${esc(team(w).teamName)}</span></div></div></div></div>`;
    };
    const small = root.querySelector("#cats"), big = root.querySelector("#cats-big"), tally = root.querySelector("#cats-tally");
    small.innerHTML = C.map(([k, l, v]) => card(k, l, v, "")).join("");
    big.innerHTML = BIG.map(([k, l, v, by]) => card(k, l, v, "close", `decided by ${by}`)).join("");
    const all = [...small.children, ...big.children], keys = [...C, ...BIG].map((c) => c[0]);
    if (reduce()) { all.forEach((c) => c.classList.add("on")); return; }
    let a = 0, b = 0;
    tally.textContent = "0–0";
    keys.forEach((k, i) => setTimeout(() => {
      all[i].classList.add("on");
      F.final.winners[k] === W_ID ? a++ : b++;
      tally.textContent = `${a}–${b}`;
    }, 300 + (i < C.length ? i * 180 : C.length * 180 + (i - C.length) * 900)));
  }

  // ---------- Lights out: every other arena goes dark ----------
  function night(el) {
    const games = F.final.sunday;
    el.innerHTML = games.map((g, i) => {
      const lastG = i === games.length - 1;
      return `<div class="arena ${lastG ? "last" : ""}" style="--d:${i * 320}ms"><div class="lights"></div><span class="tip num">${et(g.tip)} ET</span><b>${esc(g.game)}</b><span class="st">${lastG ? "LIVE" : "FINAL"}</span></div>`;
    }).join("");
    if (reduce()) { el.classList.add("done"); return; }
    el.classList.remove("done");
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); setTimeout(() => el.classList.add("done"), 60); } }, { threshold: 0.4 });
    io.observe(el);
  }

  // ---------- The broadcast: scoreboard + annotated FG% line ----------
  function broadcast(root) {
    let i = reduce() ? N : 0, timer = null; // rest state: tip-off, so the ending isn't spoiled
    const els = { clock: root.querySelector("#b-clock"), game: root.querySelector("#b-game"), pct: root.querySelector("#b-pct"), fg: root.querySelector("#b-fg"), status: root.querySelector("#b-status"), play: root.querySelector("#b-play"), lc: root.querySelector("#b-lc"), n: root.querySelector("#b-n") };
    const playBtn = root.querySelector("#cast-play");
    let lastPct = T.start.pct;
    const lastHolMiss = P.reduce((k, p, j) => (p.player === HOLIDAY && !p.made && p.period < 4 ? j : k), 0);
    const holLayup = P.findIndex((p, j) => j > 0 && p.player === HOLIDAY && p.made && p.period === 4);
    const cabLast = P.indexOf(cabMakes[cabMakes.length - 1]), cabFirst = P.indexOf(cabMakes[0]);

    const line = d3.select(root.querySelector("#fgline"));
    let L = null;
    const drawLine = () => {
      line.selectAll("*").remove();
      const Wl = App.w(line.node()), Hl = 300, m = { t: 30, r: 150, b: 30, l: 62 };
      const svg = line.append("svg").attr("viewBox", `0 0 ${Wl} ${Hl}`).attr("role", "img").attr("aria-label", "Skip's week field-goal percentage through the last game");
      const x = d3.scaleLinear().domain([0, 48]).range([m.l, Wl - m.r]);
      const y = d3.scaleLinear().domain(d3.extent([T.start.pct, ...P.map((p) => p.pct), T.target])).nice().range([Hl - m.b, m.t]);
      [1, 2, 3, 4].forEach((q) => { svg.append("rect").attr("x", x((q - 1) * 12)).attr("width", x(12) - x(0)).attr("y", m.t).attr("height", Hl - m.t - m.b).attr("fill", q % 2 ? "var(--panel-2)" : "transparent"); svg.append("text").attr("class", "lbl").attr("x", x((q - 0.5) * 12)).attr("y", Hl - 8).attr("text-anchor", "middle").text(`Q${q}`); });
      svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(pct4));
      svg.append("line").attr("x1", m.l).attr("x2", Wl - m.r).attr("y1", y(T.target)).attr("y2", y(T.target)).attr("stroke", "var(--gold)").attr("stroke-width", 2.5);
      svg.append("text").attr("class", "lbl-ink").attr("x", m.l + 6).attr("y", y(T.target) + 15).style("fill", "var(--gold)").text(`Klaw Leonard finished ${pct8(T.target)}`);
      svg.append("text").attr("class", "lbl").attr("x", m.l + 6).attr("y", m.t - 10).text("Above the gold line, Jacob wins the title");
      const series = [{ minute: 0, pct: T.start.pct }, ...P.map((p) => ({ minute: p.minute, pct: p.pct, p }))];
      const step = d3.line().x((d) => x(d.minute)).y((d) => y(d.pct)).curve(d3.curveStepAfter);
      const path = svg.append("path").attr("fill", "none").attr("stroke", "var(--ink)").attr("stroke-width", 2.2);
      const dots = svg.append("g").selectAll("circle").data(series.slice(1)).join("circle").attr("cx", (d) => x(d.minute)).attr("cy", (d) => y(d.pct))
        .attr("r", (d) => (d.p.player === BRUNO ? 7 : 4.5)).attr("fill", (d) => (d.p.made ? "var(--pos)" : "var(--neg)")).attr("stroke", (d) => (d.p.player === BRUNO ? "var(--ink)" : "var(--panel)")).attr("stroke-width", 2);
      App.hover(dots, (d) => App.tt(`Q${d.p.period} ${d.p.clock} · ${d.p.player}`, [["Play", d.p.description], ["Score (MEM–LAC)", d.p.score], [`${lose.teamName} FG%`, pct8(d.pct)]], d.p.leading ? "Jacob ahead" : "Jacob behind"));
      const pulse = svg.append("circle").attr("cx", x(last.minute)).attr("cy", y(last.pct)).attr("r", 15).attr("fill", "none").attr("stroke", "var(--neg)").attr("stroke-width", 2).attr("class", "pulse");
      // Annotations, revealed as play reaches them
      const notes = [
        { at: lastHolMiss, x: x(P[lastHolMiss].minute) - 8, y: y(P[lastHolMiss].pct) + 22, a: "end", t: `Holiday: ${holMiss} misses in ${hol.length} shots` },
        { at: cabLast, x: x(P[cabFirst].minute) + 14, y: y(P[cabFirst].pct) + 5, a: "start", t: `Bruno: ${cabMakes.length} straight`, hot: true },
        { at: holLayup, x: x(P[holLayup].minute) - 4, y: y(P[holLayup].pct) - 16, a: "end", t: `${P[holLayup].clock} Holiday layup: ahead` },
      ].filter((n) => n.at >= 0);
      const ann = svg.append("g").selectAll("text").data(notes).join("text").attr("class", (d) => (d.hot ? "lbl-ink ann hot" : "lbl-ink ann")).attr("x", (d) => d.x).attr("y", (d) => d.y).attr("text-anchor", (d) => d.a).text((d) => d.t);
      const endLbl = svg.append("text").attr("class", "lbl-ink");
      const endSub = svg.append("text").attr("class", "lbl");
      L = { path, dots, series, step, endLbl, endSub, ann, pulse, x, y };
    };

    const render = (animate) => {
      const p = i > 0 ? P[i - 1] : null;
      const cur = p ? p.pct : T.start.pct, lead = p ? p.leading : T.start.leading;
      const lc = P.slice(0, i).reduce((c, q, k) => c + ((k ? P[k - 1].leading : T.start.leading) !== q.leading ? 1 : 0), 0);
      els.clock.textContent = p ? `Q${p.period} · ${p.clock}` : "Tip-off";
      els.game.textContent = p ? `MEM ${p.score.split("-")[0]} – LAC ${p.score.split("-")[1]}` : "MEM 0 – LAC 0";
      els.fg.textContent = `${p ? p.fgm : T.start.fgm}/${p ? p.fga : T.start.fga}`;
      els.status.textContent = lead ? "AHEAD" : "BEHIND";
      els.status.className = `board-status ${lead ? "up" : "down"} ${animate ? "bump" : ""}`;
      els.play.innerHTML = p ? `<b>${esc(p.player)}</b> ${p.made ? "makes" : "misses"} ${esc(p.description.replace(/^(makes|misses) /, ""))}${i === N ? "<br><b>The last shot of the season.</b>" : ""}` : "Every other game is final. Jacob leads FG% going in. Only two of his players are left: Holiday and Caboclo.";
      els.lc.textContent = lc; els.n.textContent = i;
      if (animate && !reduce()) d3.select(els.pct).transition().duration(500).tween("t", () => { const f = d3.interpolateNumber(lastPct, cur); return (t) => (els.pct.textContent = pct8(f(t))); });
      else els.pct.textContent = pct8(cur);
      lastPct = cur;
      if (L) {
        const { path, dots, series, step, endLbl, endSub, ann, pulse, x, y } = L;
        path.attr("d", step(series.slice(0, i + 1)));
        dots.style("opacity", (d, k) => (k < i ? 1 : 0));
        ann.style("opacity", (d) => (i > d.at ? 1 : 0));
        pulse.style("opacity", i === N ? 1 : 0);
        const e = series[i], ahead = e.pct > T.target;
        endLbl.attr("x", x(e.minute) + 12).attr("y", y(e.pct)).attr("dy", ".35em").text(pct4(e.pct)).style("fill", ahead ? "var(--good-ink)" : "var(--bad-ink)");
        endSub.attr("x", x(e.minute) + 12).attr("y", y(e.pct) + 16).text(i === N ? `${last.clock}: the last shot` : "");
      }
    };
    const stop = () => { clearInterval(timer); timer = null; playBtn.innerHTML = `${App.icon("play")}<span>${i >= N ? "Play it again" : i ? "Resume" : "Play the final"}</span>`; };
    playBtn.addEventListener("click", () => {
      if (timer) return stop();
      if (i >= N) { i = 0; render(false); }
      playBtn.innerHTML = `${App.icon("pause")}<span>Pause</span>`;
      timer = setInterval(() => { if (!document.body.contains(playBtn)) return stop(); i++; render(true); if (i >= N) stop(); }, 1200);
    });
    root.querySelector("#cast-back").addEventListener("click", () => { stop(); i = Math.max(0, i - 1); render(true); });
    root.querySelector("#cast-fwd").addEventListener("click", () => { stop(); i = Math.min(N, i + 1); render(true); });
    const redraw = () => { drawLine(); render(false); };
    redraw();
    stop();
    return { redraw };
  }

  // ---------- Three options at 1:50 ----------
  function history(root) {
    const el = root.querySelector("#hist");
    const S = {
      miss: { pct: lose.yahooFgPct, pts: lose.pts, score: [win.categoriesWon, lose.categoriesWon], champ: W_ID,
        line: `Rims out. Jacob finishes ${pct8(lose.yahooFgPct)}, ${marginTxt} short.`, cup: "" },
      make: { pct: WI.made.pct, pts: WI.made.pts, score: WI.made.score, champ: L_ID,
        line: `It drops. ${WI.made.fgm}/${WI.made.fga} is ${pct4(WI.made.pct)}, and the two points flip Points too.`, cup: "A hero. Heroes don't get joke trophies." },
      pass: { pct: WI.skipped.pct, pts: WI.skipped.pts, score: WI.skipped.score, champ: L_ID,
        line: `He swings it. ${WI.skipped.fgm}/${WI.skipped.fga} is ${pct4(WI.skipped.pct)}, still above ${pct4(T.target)}. Doing nothing wins it.`, cup: "Nobody names a trophy after a guy who passed." },
    };
    let shown = S.miss.pct;
    const render = (k, animate) => {
      const s = S[k], champ = team(s.champ);
      el.innerHTML = `
        <div class="hist-grid">
          <div class="hist-box"><span>Jacob's FG%</span><b class="num" id="h-pct">${pct8(shown)}</b><small>vs ${pct8(T.target)} <span class="${s.pct > T.target ? "pos" : "neg"}">${s.pct > T.target ? "wins FG%" : "loses FG%"}</span></small></div>
          <div class="hist-box"><span>Points</span><b class="num">${win.pts}–${s.pts}</b><small class="${s.pts > win.pts ? "pos" : "neg"}">${s.pts > win.pts ? "Jacob wins points" : "Klaw wins points"}</small></div>
          <div class="hist-box"><span>Final</span><b class="num">${s.score[0]}–${s.score[1]}</b><small>${esc(win.teamName)} – ${esc(lose.teamName)}</small></div>
          <div class="hist-champ ${s.champ === W_ID ? "real" : "alt"}"><div class="trophy">${App.icon("trophy")}</div><div><span>2018–19 champion</span><b>${esc(champ.teamName)}</b><small>${esc(App.name(s.champ))}</small></div></div>
        </div>
        <p class="hist-line">${s.line}</p>
        <div class="hist-cup ${k === "miss" ? "" : "strike"}"><span class="cupname">The Caboclo Cup</span>${s.cup ? `<span class="alt">${esc(s.cup)}</span>` : ""}</div>`;
      const out = el.querySelector("#h-pct"), from = shown, to = s.pct;
      if (animate && !reduce()) d3.select(out).transition().duration(700).tween("t", () => { const f = d3.interpolateNumber(from, to); return (t) => (out.textContent = pct8(f(t))); });
      else out.textContent = pct8(to);
      shown = to;
    };
    render("miss", false);
    App.bindSeg(root, "hist-k", (k) => render(k, true));
  }
})();
