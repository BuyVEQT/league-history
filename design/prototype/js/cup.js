/* The Cup: why the league is named after Bruno Caboclo. Numbers from window.FINAL (src/lib/analytics/cabocloFinal.ts). */
(function () {
  const { esc } = App;
  const F = window.FINAL;
  if (!F) return;
  const W_ID = "matt", L_ID = "jacob-g";
  const team = (id) => F.final.teams.find((t) => t.managerId === id);
  const win = team(W_ID), lose = team(L_ID);
  const T = F.timeline, WI = F.whatIf;
  const pct8 = (v) => v.toFixed(8).replace(/^0/, "");
  const et = (iso) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }).toLowerCase();
  const leadChanges = T.points.reduce((n, p, i) => n + ((i ? T.points[i - 1].leading : T.start.leading) !== p.leading ? 1 : 0), 0);
  const cabMakes = T.points.filter((p) => p.player === "Bruno Caboclo" && p.made);
  const last = T.points[T.points.length - 1], prev = T.points[T.points.length - 2];
  const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Highlighted 4th decimal: .4692|8|328
  const dec = (v) => { const s = pct8(v); return `${s.slice(0, 4)}<b>${s.slice(4, 5)}</b>${s.slice(5)}`; };

  App.register("cup", "The Cup", (root) => {
    root.innerHTML = `
      <section class="cup-hero">
        <div class="cup-hero-txt">
          <div class="eyebrow" style="color:var(--accent)">Why the league is named what it is</div>
          <h1 class="cup-title">The Caboclo Cup</h1>
          <p class="cup-sub">Named for Bruno Caboclo: drafted by the Raptors as <i>"two years away from being two years away,"</i> and, on the last night of our first season, <b>one six-foot jumper</b> away from a different league history.</p>
          <div class="cup-ticker">
            <div><span>Field-goal %</span><b class="num">${dec(win.yahooFgPct)}</b><i>vs</i><b class="num">${dec(lose.yahooFgPct)}</b></div>
            <div><span>Final score</span><b class="num">${win.categoriesWon}–${lose.categoriesWon}</b></div>
            <div><span>Points</span><b class="num">${win.pts}–${lose.pts}</b></div>
            <div><span>The shot</span><b class="num">Q4 ${last.clock}</b></div>
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
            <text x="20" y="288" class="cup-hoop-cap" id="hoop-cap">Q4 · 1:50 · 6 ft · no good</text>
          </svg>
          <button type="button" class="btn" id="hoop-again">${App.icon("reset")}<span>Replay the miss</span></button>
        </div>
      </section>

      <section>
        ${App.secHead("Meet Bruno", "Every Raptors fan knows the name. Here's how it ended up on our trophy.")}
        <ol class="bruno">
          <li><span class="by">June 2014</span><b>Raptors take him 20th overall</b><p>Fran Fraschilla on the broadcast: <i>"He's two years away from being two years away."</i> A Toronto meme is born.</p></li>
          <li><span class="by">2017</span><b>Leads Raptors 905 to the D-League title</b><p>Still in the system. Still two years away.</p></li>
          <li><span class="by">Jan 2019</span><b>A 10-day contract in Memphis</b><p>Then another, then a real deal. He's a Grizzly for the stretch run.</p></li>
          <li><span class="by">Mon, Mar 25 2019</span><b>Career-high 24 vs. OKC</b><p>The first day of championship week. Skip's line for the week has only Saturday and Sunday in it, so <b>none of the 24 counted</b>.</p></li>
          <li class="hot"><span class="by">Sun, Mar 31 2019</span><b>The last game of the fantasy season</b><p>Memphis at the Clippers, the only game still going. Caboclo and Justin Holiday are the last two players who can move the final.</p></li>
        </ol>
      </section>

      <section class="panel">
        ${App.secHead("The final, category by category", `Week ${F.final.week.number}: <b>${esc(win.teamName)}</b> (${esc(App.name(W_ID))}) vs <b>${esc(lose.teamName)}</b> (${esc(App.name(L_ID))}). Two categories were photo finishes.`, "", `<button type="button" class="btn" id="cats-again">${App.icon("reset")}<span>Flip them again</span></button>`)}
        <div class="cats" id="cats"></div>
        <div class="cats-score"><span>${App.mono(W_ID, "md")}<b>${esc(win.teamName)}</b></span><b class="num" id="cats-tally">${win.categoriesWon}–${lose.categoriesWon}</b><span><b>${esc(lose.teamName)}</b>${App.mono(L_ID, "md")}</span></div>
      </section>

      <section class="panel">
        ${App.secHead("Sunday night: the lights go out", "All seven NBA games on the last day of the fantasy season. By the fourth quarter in Los Angeles, every other arena was dark.")}
        <div class="night" id="night"></div>
      </section>

      <section class="panel cast">
        ${App.secHead("The last game, shot by shot", `Grizzlies at Clippers. Every other game of the week is final, so only Holiday and Caboclo can move ${esc(lose.teamName)}'s field-goal %. Press play.`, "Skip's week FG% after each Grizzlies shot, counting every other game as final (they were). The gold line is Klaw Leonard's finished FG%.",
          `<div class="cast-ctl"><button class="btn primary" type="button" id="cast-play">${App.icon("play")}<span>Play the final</span></button><button class="btn" type="button" id="cast-back" aria-label="Previous shot">‹</button><button class="btn" type="button" id="cast-fwd" aria-label="Next shot">›</button></div>`)}
        <div class="cast-grid">
          <div class="board">
            <div class="board-top"><span class="board-q num" id="b-clock">Tip-off</span><span class="board-g num" id="b-game">MEM 0 – LAC 0</span></div>
            <div class="board-row"><span>${esc(lose.teamName)} FG%</span><b class="num" id="b-pct">${pct8(T.start.pct)}</b><span class="num muted" id="b-fg">${T.start.fgm}/${T.start.fga}</span></div>
            <div class="board-row tgt"><span>${esc(win.teamName)} FG%</span><b class="num">${pct8(T.target)}</b><span class="num muted">${win.fgm}/${win.fga} · final</span></div>
            <div class="board-status" id="b-status">AHEAD</div>
            <div class="board-play" id="b-play">Every other game of the week is in. Skip leads FG% going into the last game.</div>
            <div class="board-meta"><span>Lead changes <b class="num" id="b-lc">0</b></span><span>Shot <b class="num" id="b-n">0</b>/${T.points.length}</span></div>
          </div>
          <div class="court-wrap"><div class="chart" id="court"></div>
            <div class="legend"><span><i class="dt" style="background:var(--pos)"></i>Make</span><span><i class="dt" style="background:var(--neg)"></i>Miss</span><span><i class="dt" style="background:transparent;box-shadow:inset 0 0 0 2.5px var(--ink)"></i>Caboclo (bigger)</span></div></div>
        </div>
        <div class="chart" id="fgline" style="margin-top:8px"></div>
        <div class="callouts">
          <div><b class="num">${leadChanges}</b><span>lead changes in one garbage-time game</span></div>
          <div><b class="num">${cabMakes.length} straight</b><span>Caboclo makes in the 4th (${cabMakes[0].clock} to ${cabMakes[cabMakes.length - 1].clock}), clawing Skip back to ${pct8(cabMakes[cabMakes.length - 1].pct).slice(0, 7)}</span></div>
          <div><b class="num">Q4 ${prev.clock}</b><span>Holiday's layup puts Skip <b>ahead</b>: ${pct8(prev.pct)}</span></div>
          <div class="hot"><b class="num">Q4 ${last.clock}</b><span>Caboclo misses from 6 ft. Behind by ${pct8(WI.margin).replace(/^\.0+/, ".000")}. Forever.</span></div>
        </div>
      </section>

      <section class="bench">
        <div class="bench-clock"><span class="num">1:50</span><small>left in the season</small></div>
        <div>
          <h2 class="sec" style="font-size:30px">Then he sat down.</h2>
          <p>That miss was the last shot anyone on either roster took that season. The way the league tells it, Caboclo went to the bench with the clock still running. Klaw Leonard won points <b>${win.pts}–${lose.pts}</b>: one more basket from Bruno and Skip takes points <i>and</i> field-goal % and wins it 6–3. One fewer shot and Skip wins 5–4.</p>
          <p class="note">Design note: the play-by-play shows his last attempt at 1:50 and no Grizzlies shots after it. Claude Code: add the substitution time from the play-by-play capture and state it here.</p>
        </div>
      </section>

      <section class="panel">
        ${App.secHead("Rewrite history", "Change the last shot and see who lifts the first trophy.", "", App.seg("hist-k", [["miss", "What happened"], ["make", "Bruno makes it"], ["pass", "Bruno doesn't shoot"]], "miss"))}
        <div class="hist" id="hist"></div>
      </section>

      <details class="panel how"><summary><b>How we know</b> <span class="muted small">Yahoo's tiebreaker to eight decimals, the play-by-play, and which days each player counted</span></summary>
        <div class="list" style="margin-top:10px">
          <div><div class="l"><div class="t1">The score</div><div class="t2">Yahoo's week ${F.final.week.number} page: ${win.fgm}/${win.fga} and ${lose.fgm}/${lose.fga}, tiebreaker values ${pct8(win.yahooFgPct)} and ${pct8(lose.yahooFgPct)}. The arithmetic matches to eight decimals.</div></div></div>
          <div><div class="l"><div class="t1">Who was playing</div><div class="t2">${F.final.activeDays.map((a) => `${esc(a.name)} (${a.yahoo.pts} pts, ${a.yahoo.fgPct}) = ${a.games.map((g) => g.date.slice(5)).join(" + ")}`).join("; ")}</div></div></div>
          <div><div class="l"><div class="t1">The shots</div><div class="t2">Every attempt from the play-by-play; counts match the box score.</div></div></div>
        </div>
        <ul class="small">${F.final.sources.map((s) => `<li>${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noreferrer">${esc(s.label)}</a>` : esc(s.label)}</li>`).join("")}</ul>
      </details>`;

    hoop(root.querySelector("#hoop"));
    root.querySelector("#hoop-again").addEventListener("click", () => hoop(root.querySelector("#hoop")));
    cats(root.querySelector("#cats"));
    root.querySelector("#cats-again").addEventListener("click", () => cats(root.querySelector("#cats")));
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

  // ---------- Category flip cards ----------
  function cats(el) {
    const C = [
      ["FG%", "FG%", (t) => pct8(t.yahooFgPct).slice(0, 7), true],
      ["FT%", "FT%", () => "—", false],
      ["3PTM", "3PM", (t) => t.tpm],
      ["PTS", "PTS", (t) => t.pts, true],
      ["REB", "REB", (t) => t.reb],
      ["AST", "AST", (t) => t.ast],
      ["ST", "STL", (t) => t.stl],
      ["BLK", "BLK", (t) => t.blk],
      ["TO", "TO", (t) => t.to],
    ];
    el.innerHTML = C.map(([k, label, v, close], i) => {
      const w = F.final.winners[k];
      return `<div class="cat ${close ? "close" : ""}" style="--d:${i * 140}ms"><div class="cat-in">
        <div class="cat-f"><span>${label}</span><b>?</b></div>
        <div class="cat-b ${w === W_ID ? "w" : "l"}"><span>${label}${close ? '<em>photo finish</em>' : ""}</span>
          <div class="cat-v"><b class="num">${v(win)}</b><i>vs</i><b class="num">${v(lose)}</b></div>
          <div class="cat-w">${App.mono(w)}<span>${esc(team(w).teamName)}</span></div></div></div></div>`;
    }).join("");
    const tally = document.getElementById("cats-tally");
    if (reduce()) { el.querySelectorAll(".cat").forEach((c) => c.classList.add("on")); return; }
    let a = 0, b = 0;
    tally.textContent = "0–0";
    C.forEach(([k], i) => setTimeout(() => { el.children[i].classList.add("on"); F.final.winners[k] === W_ID ? a++ : b++; tally.textContent = `${a}–${b}`; }, 300 + i * 260));
  }

  // ---------- Sunday night: arenas going dark ----------
  function night(el) {
    const games = F.final.sunday;
    el.innerHTML = games.map((g, i) => {
      const last = i === games.length - 1;
      const who = g.game === "MEM @ LAC" ? "Holiday & Caboclo (Skip)" : g.game === "CHA @ GS" ? "Miles Bridges (Skip)" : g.game === "WSH @ DEN" ? "Will Barton (Klaw)" : "";
      return `<div class="arena ${last ? "last" : ""}" style="--d:${i * 380}ms"><div class="lights"></div><span class="tip num">${et(g.tip)} ET</span><b>${esc(g.game)}</b><span class="who">${esc(who)}</span><span class="st">${last ? "LIVE · last game of the season" : "FINAL"}</span></div>`;
    }).join("");
    if (reduce()) { el.classList.add("done"); return; }
    el.classList.remove("done");
    requestAnimationFrame(() => setTimeout(() => el.classList.add("done"), 60));
  }

  // ---------- The broadcast: court + scoreboard + FG% line ----------
  function broadcast(root) {
    const pts = T.points, n = pts.length;
    let i = n, timer = null; // rest state: the whole game played
    const ftOf = (p) => +((p.description.match(/from (\d+) ft/) || [0, 2])[1]);
    const els = { clock: root.querySelector("#b-clock"), game: root.querySelector("#b-game"), pct: root.querySelector("#b-pct"), fg: root.querySelector("#b-fg"), status: root.querySelector("#b-status"), play: root.querySelector("#b-play"), lc: root.querySelector("#b-lc"), n: root.querySelector("#b-n") };
    const playBtn = root.querySelector("#cast-play");
    let lastPct = T.start.pct;

    const court = d3.select(root.querySelector("#court"));
    const drawCourt = () => {
      court.selectAll("*").remove();
      const Wc = 360, Hc = 300, s = Wc / 50, hx = 25 * s, hy = 5.25 * s; // feet → px; hoop at (25, 5.25)
      const svg = court.append("svg").attr("viewBox", `0 0 ${Wc} ${Hc}`).attr("role", "img").attr("aria-label", "Shot locations by distance");
      const lineC = "var(--line-2)";
      svg.append("rect").attr("width", Wc).attr("height", Hc).attr("rx", 10).attr("fill", "#f3e2c7");
      svg.append("rect").attr("x", (25 - 8) * s).attr("y", 0).attr("width", 16 * s).attr("height", 19 * s).attr("fill", "rgb(224 96 28 / .14)").attr("stroke", lineC);
      svg.append("circle").attr("cx", hx).attr("cy", 19 * s).attr("r", 6 * s).attr("fill", "none").attr("stroke", lineC);
      const arc = d3.path(); arc.moveTo(3 * s, 0); arc.lineTo(3 * s, 14 * s); arc.arc(hx, hy, 23.75 * s, Math.PI - Math.acos(22 / 23.75) + 0.0, Math.acos(22 / 23.75), true); arc.lineTo(47 * s, 0);
      svg.append("path").attr("d", arc.toString()).attr("fill", "none").attr("stroke", lineC).attr("stroke-width", 2);
      svg.append("line").attr("x1", 22 * s).attr("x2", 28 * s).attr("y1", 4 * s).attr("y2", 4 * s).attr("stroke", "var(--ink-2)").attr("stroke-width", 3);
      svg.append("circle").attr("cx", hx).attr("cy", hy).attr("r", 0.75 * s).attr("fill", "none").attr("stroke", "var(--accent)").attr("stroke-width", 2.5);
      // Angles aren't in the data: spread shots evenly by order, distance is real.
      const pos = pts.map((p, k) => { const a = (-62 + (k * 124) / (n - 1)) * (Math.PI / 180), d = Math.max(1.5, ftOf(p)); return [hx + Math.sin(a) * d * s, hy + Math.cos(a) * d * s]; });
      const g = svg.append("g").selectAll("g").data(pts).join("g").attr("transform", (p, k) => `translate(${pos[k][0]},${pos[k][1]})`);
      g.append("circle").attr("r", (p) => (p.player === "Bruno Caboclo" ? 9 : 6.5)).attr("fill", (p) => (p.made ? "var(--pos)" : "var(--neg)")).attr("stroke", (p) => (p.player === "Bruno Caboclo" ? "var(--ink)" : "var(--panel)")).attr("stroke-width", (p) => (p.player === "Bruno Caboclo" ? 2.5 : 1.5));
      g.append("text").attr("dy", ".35em").attr("text-anchor", "middle").style("font-size", "8px").style("font-weight", 800).style("fill", "#fff").text((p) => (p.made ? "✓" : "✕"));
      g.filter((p, k) => k === n - 1).append("circle").attr("r", 16).attr("fill", "none").attr("stroke", "var(--neg)").attr("stroke-width", 2).attr("class", "pulse");
      App.hover(g, (p) => App.tt(`Q${p.period} ${p.clock} · ${p.player}`, [["Play", p.description], ["Score (MEM–LAC)", p.score], [`${lose.teamName} FG%`, pct8(p.pct)]], p.leading ? "Skip ahead" : "Skip behind"));
      svg.append("text").attr("x", Wc - 10).attr("y", Hc - 10).attr("text-anchor", "end").attr("class", "lbl").text("distance is real; angle is illustrative");
      return g;
    };

    const line = d3.select(root.querySelector("#fgline"));
    let lineParts = null;
    const drawLine = () => {
      line.selectAll("*").remove();
      const Wl = App.w(line.node()), Hl = 220, m = { t: 16, r: 210, b: 30, l: 74 };
      const svg = line.append("svg").attr("viewBox", `0 0 ${Wl} ${Hl}`).attr("role", "img").attr("aria-label", "Skip's week field-goal percentage through the last game");
      const x = d3.scaleLinear().domain([0, 48]).range([m.l, Wl - m.r]);
      const all = [T.start.pct, ...pts.map((p) => p.pct), T.target];
      const y = d3.scaleLinear().domain(d3.extent(all)).nice().range([Hl - m.b, m.t]);
      [1, 2, 3, 4].forEach((q) => { svg.append("rect").attr("x", x((q - 1) * 12)).attr("width", x(12) - x(0)).attr("y", m.t).attr("height", Hl - m.t - m.b).attr("fill", q % 2 ? "var(--panel-2)" : "transparent"); svg.append("text").attr("class", "lbl").attr("x", x((q - 0.5) * 12)).attr("y", Hl - 8).attr("text-anchor", "middle").text(`Q${q}`); });
      svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat((v) => v.toFixed(4).replace(/^0/, "")));
      svg.append("line").attr("x1", m.l).attr("x2", Wl - m.r).attr("y1", y(T.target)).attr("y2", y(T.target)).attr("stroke", "var(--gold)").attr("stroke-width", 2.5);
      svg.append("text").attr("class", "lbl-ink").attr("x", m.l + 6).attr("y", y(T.target) + 14).text(`${win.teamName} finished ${pct8(T.target)}`).style("fill", "var(--gold)");
      svg.append("text").attr("class", "lbl").attr("x", m.l + 6).attr("y", y(T.target) + 30).text("above the gold line = Skip wins FG% and the title");
      const series = [{ minute: 0, pct: T.start.pct }, ...pts.map((p) => ({ minute: p.minute, pct: p.pct, p }))];
      const step = d3.line().x((d) => x(d.minute)).y((d) => y(d.pct)).curve(d3.curveStepAfter);
      const path = svg.append("path").attr("fill", "none").attr("stroke", "var(--ink)").attr("stroke-width", 2.2);
      const dots = svg.append("g").selectAll("circle").data(series.slice(1)).join("circle").attr("cx", (d) => x(d.minute)).attr("cy", (d) => y(d.pct))
        .attr("r", (d) => (d.p.player === "Bruno Caboclo" ? 6.5 : 4.5)).attr("fill", (d) => (d.p.made ? "var(--pos)" : "var(--neg)")).attr("stroke", (d) => (d.p.player === "Bruno Caboclo" ? "var(--ink)" : "var(--panel)")).attr("stroke-width", 2);
      App.hover(dots, (d) => App.tt(`Q${d.p.period} ${d.p.clock} · ${d.p.player}`, [["Play", d.p.description], [`${lose.teamName} FG%`, pct8(d.pct)]], d.p.leading ? "Skip ahead" : "Skip behind"));
      const endLbl = svg.append("text").attr("class", "lbl-ink");
      lineParts = { path, dots, series, step, endLbl, x, y, Wl, m };
    };

    let courtDots = null;
    const render = (animate) => {
      const p = i > 0 ? pts[i - 1] : null;
      const cur = p ? p.pct : T.start.pct, lead = p ? p.leading : T.start.leading;
      const lc = pts.slice(0, i).reduce((c, q, k) => c + ((k ? pts[k - 1].leading : T.start.leading) !== q.leading ? 1 : 0), 0);
      els.clock.textContent = p ? `Q${p.period} · ${p.clock}` : "Tip-off";
      els.game.textContent = p ? `MEM ${p.score.split("-")[0]} – LAC ${p.score.split("-")[1]}` : "MEM 0 – LAC 0";
      els.fg.textContent = `${p ? p.fgm : T.start.fgm}/${p ? p.fga : T.start.fga}`;
      els.status.textContent = lead ? "AHEAD" : "BEHIND";
      els.status.className = `board-status ${lead ? "up" : "down"} ${animate ? "bump" : ""}`;
      els.play.innerHTML = p ? `<b>${esc(p.player)}</b> ${p.made ? "makes" : "misses"} ${esc(p.description.replace(/^(makes|misses) /, ""))}${i === n ? "<br><b>The last shot of the season.</b>" : ""}` : "Every other game of the week is in. Skip leads FG% going into the last game.";
      els.lc.textContent = lc; els.n.textContent = i;
      // Rolling 8-decimal readout
      if (animate && !reduce()) d3.select(els.pct).transition().duration(500).tween("t", () => { const f = d3.interpolateNumber(lastPct, cur); return (t) => (els.pct.textContent = pct8(f(t))); });
      else els.pct.textContent = pct8(cur);
      lastPct = cur;
      courtDots?.style("opacity", (q, k) => (k < i ? 1 : 0.08));
      if (lineParts) {
        const { path, dots, series, step, endLbl, x, y } = lineParts;
        path.attr("d", step(series.slice(0, i + 1)));
        dots.style("opacity", (d, k) => (k < i ? 1 : 0));
        const e = series[i];
        endLbl.attr("x", x(e.minute) + 10).attr("y", y(e.pct)).attr("dy", ".35em").text(i === n ? `${pct8(e.pct)} · lost by ${pct8(WI.margin).replace(/^\.0+/, ".000")}` : pct8(e.pct)).style("fill", e.pct > T.target ? "var(--good-ink)" : "var(--bad-ink)");
      }
    };
    const stop = () => { clearInterval(timer); timer = null; playBtn.innerHTML = `${App.icon("play")}<span>${i >= n ? "Play the final" : "Resume"}</span>`; };
    playBtn.addEventListener("click", () => {
      if (timer) return stop();
      if (i >= n) { i = 0; render(false); }
      playBtn.innerHTML = `${App.icon("pause")}<span>Pause</span>`;
      timer = setInterval(() => { if (!document.body.contains(playBtn)) return stop(); i++; render(true); if (i >= n) stop(); }, i === n - 1 ? 2200 : 1300);
    });
    root.querySelector("#cast-back").addEventListener("click", () => { stop(); i = Math.max(0, i - 1); render(true); });
    root.querySelector("#cast-fwd").addEventListener("click", () => { stop(); i = Math.min(n, i + 1); render(true); });
    const redraw = () => { courtDots = drawCourt(); drawLine(); render(false); };
    redraw();
    return { redraw };
  }

  // ---------- Rewrite history ----------
  function history(root) {
    const el = root.querySelector("#hist");
    const S = {
      miss: { pct: lose.yahooFgPct, pts: lose.pts, score: [win.categoriesWon, lose.categoriesWon], champ: W_ID, line: `Caboclo misses. ${lose.teamName} finishes ${pct8(lose.yahooFgPct)}, ${pct8(WI.margin).replace(/^\.0+/, ".000")} short.`, cup: "The Caboclo Cup" },
      make: { pct: WI.made.pct, pts: WI.made.pts, score: WI.made.score, champ: L_ID, line: `The six-footer drops: ${WI.made.fgm}/${WI.made.fga}. ${lose.teamName} takes field-goal % and, with the two points, points too.`, cup: "Probably not the Caboclo Cup" },
      pass: { pct: WI.skipped.pct, pts: WI.skipped.pts, score: WI.skipped.score, champ: L_ID, line: `He swings it instead. ${WI.skipped.fgm}/${WI.skipped.fga} is still ahead of ${pct8(T.target)}. Not shooting at all wins it.`, cup: "Probably not the Caboclo Cup" },
    };
    let shownPct = S.miss.pct;
    const render = (k, animate) => {
      const s = S[k], champ = team(s.champ);
      el.innerHTML = `
        <div class="hist-grid">
          <div class="hist-box"><span>${esc(lose.teamName)} FG%</span><b class="num" id="h-pct">${pct8(shownPct)}</b><small>vs ${pct8(T.target)} <span class="${s.pct > T.target ? "pos" : "neg"}">${s.pct > T.target ? "wins FG%" : "loses FG%"}</span></small></div>
          <div class="hist-box"><span>Points</span><b class="num">${win.pts}–${s.pts}</b><small class="${s.pts > win.pts ? "pos" : "neg"}">${s.pts > win.pts ? `${esc(lose.teamName)} wins points` : `${esc(win.teamName)} wins points`}</small></div>
          <div class="hist-box"><span>Final</span><b class="num">${s.score[0]}–${s.score[1]}</b><small>${esc(win.teamName)} – ${esc(lose.teamName)}</small></div>
          <div class="hist-champ ${s.champ === W_ID ? "real" : "alt"}"><div class="trophy">${App.icon("trophy")}</div><div><span>2018-19 champion</span><b>${esc(champ.teamName)}</b><small>${esc(App.name(s.champ))}</small></div></div>
        </div>
        <p class="hist-line">${s.line}</p>
        <div class="hist-cup ${k === "miss" ? "" : "strike"}">${esc(S.miss.cup)}${k === "miss" ? "" : `<span>${esc(s.cup)}</span>`}</div>`;
      const target = s.pct, from = shownPct, out = el.querySelector("#h-pct");
      if (animate && !reduce()) d3.select(out).transition().duration(700).tween("t", () => { const f = d3.interpolateNumber(from, target); return (t) => (out.textContent = pct8(f(t))); });
      else out.textContent = pct8(target);
      shownPct = target;
    };
    render("miss", false);
    App.bindSeg(root, "hist-k", (k) => render(k, true));
  }
})();
