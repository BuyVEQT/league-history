/* Core: data access, formatting, tooltips, router, shared components. */
(function () {
  const D = window.DATA;
  const App = (window.App = { D, pages: {}, order: [] });

  // ---------- Data helpers ----------
  const mgr = new Map(D.managers.map((m) => [m.id, m]));
  const career = new Map(D.careers.map((c) => [c.managerId, c]));
  App.name = (id) => mgr.get(id)?.name ?? id;
  App.career = (id) => career.get(id);
  App.seasonByYear = (y) => D.seasons.find((s) => s.year === +y);
  App.latest = D.seasons[D.seasons.length - 1];
  App.played = D.careers.map((c) => c.managerId);
  App.label = (y) => App.seasonByYear(y)?.label ?? String(y);

  /** Resolved value of a CSS color token, for d3 color interpolation (which can't read var()). */
  App.css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  // ---------- Formatting ----------
  const esc = (App.esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]));
  App.pct = (v, d = 1) => (v == null ? "—" : `${(v * 100).toFixed(d)}%`);
  App.rec = (w, l, t) => `${w}-${l}-${t}`;
  App.signed = (n, d = 0) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n).toFixed(d)}`;
  App.ord = (n) => { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
  /** Draft/trade value points (site: src/lib/analytics/value.ts), one decimal. */
  App.val = (v) => App.signed(v, 1);
  App.rankLabel = (r) => (r == null ? "300+" : `#${r}`);
  App.wkLabel = (tag) => { const [y, w] = tag.split(":"); return `${App.label(y)} wk ${w}`; };
  // Two-letter monograms: "Jacob G." → JG; single names take the first two letters,
  // unless that collides (Michael / Mitchell), then first letter + first letter where they differ (MC / MT).
  const mono = new Map();
  (() => {
    const base = (n) => { const p = n.split(/[\s.]+/).filter(Boolean); return (p.length > 1 ? p[0][0] + p[1][0] : n.slice(0, 2)).toUpperCase(); };
    const groups = d3.group(D.managers, (m) => base(m.name));
    for (const [k, ms] of groups) {
      if (ms.length === 1) { mono.set(ms[0].id, k); continue; }
      ms.forEach((m) => {
        const others = ms.filter((o) => o !== m).map((o) => o.name.toLowerCase());
        const n = m.name.toLowerCase();
        let i = 1; while (i < n.length && others.every((o) => o[i] === n[i])) i++;
        mono.set(m.id, (m.name[0] + (n[i] ?? n[1])).toUpperCase());
      });
    }
  })();
  App.initials = (id) => mono.get(id) ?? App.name(id).slice(0, 2).toUpperCase();

  // ---------- Icons (simple strokes, currentColor) ----------
  const P = {
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>',
    crown: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8Z"/>',
    swap: '<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
    clip: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM9 11h6M9 15h4"/>',
    road: '<path d="M6 21 10 3M18 21 14 3M12 7v2M12 13v2M12 19v1"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/><path d="m12 8-1.5 4 3 1L12 17"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
    rocket: '<path d="M5 15c-1 1-1.5 4-1.5 4.5s3.5-.5 4.5-1.5M9 15l-3-3c1.5-4 5-8 13-9-1 8-5 11.5-9 13l-1-1Z"/><circle cx="14.5" cy="9.5" r="1.5"/>',
    basement: '<path d="M4 4v16h16M8 16l4-4 3 3 5-6"/>',
    flame: '<path d="M12 22a7 7 0 0 0 7-7c0-5-5-6-4-12-4 2-8 6-8 11a7 7 0 0 0 5 8"/><path d="M12 22a3 3 0 0 1-3-3c0-2 3-3 3-6 2 2 3 4 3 6a3 3 0 0 1-3 3Z"/>',
    play: '<path d="M7 4v16l13-8L7 4Z" fill="currentColor"/>',
    pause: '<path d="M7 4h4v16H7zM13 4h4v16h-4z" fill="currentColor"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3Z"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    wave: '<path d="M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/>',
    court: '<rect x="2" y="2" width="96" height="96" rx="2"/><circle cx="50" cy="50" r="14"/><path d="M50 2v96M2 34h22v32H2M98 34H76v32h22M24 50a12 12 0 0 1 0 0"/><path d="M2 20c30 0 40 12 40 30S32 80 2 80M98 20c-30 0-40 12-40 30s10 30 40 30"/>',
  };
  App.icon = (n, cls = "") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;
  App.courtSvg = () => `<svg class="court" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true">${P.court}</svg>`;
  App.trophies = (n) => (n ? `<span class="trophies" title="${n} title${n > 1 ? "s" : ""}">${App.icon("trophy").repeat(n)}</span>` : "");

  // ---------- Components ----------
  App.mono = (id, size = "") => `<span class="mono ${size}" aria-hidden="true">${esc(App.initials(id))}</span>`;
  App.who = (id, size = "") => `<a class="who" href="#m-${id}">${App.mono(id, size)}<span class="nm">${esc(App.name(id))}</span></a>`;
  App.info = (text) => `<button type="button" class="info" data-tip="${esc(text)}" aria-label="How this is calculated: ${esc(text)}">i</button>`;
  App.tile = (label, value, detail = "", tip = "") =>
    `<div class="tile"><div class="lab">${esc(label)}${tip ? App.info(tip) : ""}</div><div class="val">${value}</div>${detail ? `<div class="det">${detail}</div>` : ""}</div>`;
  App.secHead = (title, sub = "", tip = "", right = "") =>
    `<div class="sec-head"><div><h2 class="sec">${esc(title)}${tip ? App.info(tip) : ""}</h2>${sub ? `<p>${sub}</p>` : ""}</div>${right}</div>`;
  App.seg = (id, options, current) =>
    `<div class="seg" role="group" id="${id}">${options.map(([v, l]) => `<button type="button" data-v="${esc(v)}" aria-pressed="${v === current}">${esc(l)}</button>`).join("")}</div>`;
  App.bindSeg = (root, id, fn) => {
    const el = root.querySelector("#" + id);
    el.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-v]");
      if (!b) return;
      el.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      fn(b.dataset.v);
    });
  };

  // ---------- Explainers (one source of truth for "how is this calculated") ----------
  App.TIP = {
    catPct: "Category win % = (categories won + ½ × categories tied) ÷ all categories played, regular season only. This is how Yahoo ranks this league's standings (Head-to-Head – Categories: every category counts).",
    matchPct: "Matchup win % = weeks won ÷ weeks played, with a tied week worth half. A week is won by taking more of the 9 categories than your opponent (6-3 is one matchup win). Regular season only. Useful context, but the standings use category win %.",
    catRec: "Categories won-lost-tied over the regular season, summed across every weekly matchup. Matches Yahoo's standings page exactly.",
    finish: "Final finish: Yahoo's official final placement for the season. Playoffs decide the top spots; everyone else is ranked by the consolation results / regular-season order Yahoo publishes.",
    avgFinish: "Average of final finishes across seasons played. Lower is better. Mixes 10-team and 12-team seasons, so 'Typical finish' on Records adjusts for league size.",
    playoffs: "Playoff appearances ÷ seasons played. 6 teams made the playoffs in 10-team seasons, 8 in 12-team seasons.",
    titles: "Championships: won the final in the playoff bracket.",
    finals: "Finals = titles + runner-up finishes.",
    streak: "Consecutive regular-season matchups won (or lost) within one season. A tied week ends the streak (Yahoo record-book rule).",
    sweep: "A 9-0 week: winning all nine categories (FG%, FT%, 3PM, PTS, REB, AST, STL, BLK, TO) in one matchup.",
    avgCats: "Average number of the 9 categories won per weekly matchup, regular season and playoffs.",
    closeGame: "A close game is decided by exactly one category (for example 5-4, or 4-3 with 2 tied). Playoffs included.",
    blowout: "A blowout is won by 7 or more categories (for example 8-1). Playoffs included.",
    overSeed: "Average places gained (+) or lost (−) between playoff seed and final finish, in seasons that made the playoffs. +1.5 means finishing 1.5 spots better than seeded on average.",
    drought: "Seasons played since this manager's last title (or since joining, if they've never won).",
    consistency: "Finish is converted to a share of the league (0% = first, 100% = last) so 10- and 12-team seasons compare fairly. Swing is the standard deviation of that share: lower means steadier. Minimum 3 seasons.",
    sos: "Strength of schedule: the average regular-season category win % of the opponents a team actually played that season.",
    draftValue: "Pick value = what the player's finish was worth minus what the draft slot was expected to be worth, in 9-category value points above a replacement-level player. Value drops steeply at the top, so an early flop costs more than a late gem gains.",
    vsLeague: "Average value per pick compared with the league average. 0 = an average drafter.",
    hitRate: "Share of picks that finished at or better than where they were drafted.",
    gems: "Late gems: picks from round 8 or later who finished inside the top 75.",
    tradeValue: "Each side's received players valued on the same curve as the draft, from end-of-season rank. Only players good enough to be rostered count. Ranks cover the whole season, so treat winners as a rough guide.",
    moves: "Yahoo's season count of adds and drops for each team.",
    h2h: "Built only from matchups the two managers actually played (regular season and playoffs). Seasons where they weren't both in the league add nothing. Playoff ties are decided by the higher seed, as Yahoo does.",
    race: "Running totals at the end of each season. Category wins are regular-season categories won; titles are championships; podiums are top-3 final finishes.",
    replay: "Standings rebuilt week by week from every regular-season matchup: categories won-lost-tied so far, ranked by category win % (Yahoo's order). Ties in the table use category differential.",
    bump: "Each line is one manager's final finish by season (1 = champion). Gaps are seasons they didn't play.",
    weekGrid: "Each cell is one weekly matchup: the number is categories won. Blue = won the week, red = lost, gray = tied. Darker = bigger margin.",
    unluckyOne: "Weekly matchups lost by a single category during the regular season.",
    scatter: "Every draft pick: where they were taken (across) against where they finished (down). Points above the diagonal finished better than their slot (steals); below it, worse (busts).",
    network: "Each line is a completed trade between two managers; thicker = more trades. Vetoed trades are not drawn.",
    elo: "Power rating (Elo): updated every week from the share of categories won versus what the ratings expected. Ratings drift halfway back to 1500 between seasons. A guide to current form, not a forecast.",
    luck: "Matchup luck = matchups actually won minus matchups expected from both teams' category win %. Positive = won more weeks than their category totals deserved.",
    whatIf: "The same results re-ranked by matchup wins (weeks won) instead of category win %, the method this league uses.",
    raceStory: "Comeback = made the playoffs after sitting outside a playoff spot after midseason. Collapse = missed after sitting in the top half of the playoff field after midseason.",
    seeds: "Seed = regular-season rank. The third-place game is left out of the higher-seed count.",
    parity: "Spread of the standings win % in each season. Lower = a more even league.",
    scorelines: "How often each final score happens, regular season and playoffs. 5-3-1 means one category tied.",
    dominant: "Average categories won by, in matchups won (5+ wins, playoffs included).",
    namesake: "Teams named after a player: did they have him, and how did both do?",
    roster: "Approximate team builds from season-end rosters and players' full-season totals. Each cell is a standard score against the league; a punt is a category far below both the league and the team's own average.",
    position: "Round-one draft slot each season. Early slots get the surest stars.",
    reach: "Spots taken ahead of the pre-season rank (rounds 1-8). Negative = waits for players to fall.",
    keep: "Draft picks still on the roster when the season ended.",
    impact: "How strongly the value of a team's drafted players lines up with its regular-season win %. The share shown is how much of the standings the draft explains.",
    gotAway: "Drafted players who finished in the top 40 on someone else's roster, or nobody's. Traded = dealt away by the drafting team; otherwise dropped.",
    unowned: "Top-60 finishers who were free agents when the season ended.",
    undrafted: "Players nobody drafted who finished in the top 75, shown with the team that had them at season end (not necessarily who added them first).",
  };

  // ---------- Tooltip ----------
  const tip = document.getElementById("tip");
  let tipFor = null;
  App.showTip = (html, x, y) => {
    tip.innerHTML = html;
    tip.classList.add("on");
    const r = tip.getBoundingClientRect();
    let left = x + 14, top = y + 14;
    if (left + r.width > window.innerWidth - 8) left = x - r.width - 14;
    if (top + r.height > window.innerHeight - 8) top = y - r.height - 14;
    tip.style.left = Math.max(8, left) + "px";
    tip.style.top = Math.max(8, top) + "px";
  };
  App.hideTip = () => { tip.classList.remove("on"); tipFor = null; };
  const tipFromEl = (el) => {
    const r = el.getBoundingClientRect();
    App.showTip(esc(el.dataset.tip), r.left + r.width / 2 - 6, r.bottom - 6);
    tipFor = el;
  };
  document.addEventListener("pointerover", (e) => { const el = e.target.closest("[data-tip]"); if (el) tipFromEl(el); });
  document.addEventListener("pointerout", (e) => { const el = e.target.closest("[data-tip]"); if (el && el === tipFor && !el.contains(e.relatedTarget)) App.hideTip(); });
  document.addEventListener("focusin", (e) => { const el = e.target.closest("[data-tip]"); if (el) tipFromEl(el); });
  document.addEventListener("focusout", (e) => { if (e.target.closest("[data-tip]")) App.hideTip(); });
  document.addEventListener("click", (e) => { const el = e.target.closest(".info"); if (el) { e.preventDefault(); tipFor === el ? App.hideTip() : tipFromEl(el); } else if (!e.target.closest("svg")) App.hideTip(); });
  window.addEventListener("scroll", () => { if (tipFor) App.hideTip(); }, { passive: true });

  /** Chart tooltip rows: [[label, value], ...] */
  App.tt = (title, rows = [], foot = "") =>
    `<div class="tt-h">${esc(title)}</div>${rows.map(([k, v]) => `<div class="tt-row"><span class="tt-m">${esc(k)}</span><span>${esc(v)}</span></div>`).join("")}${foot ? `<div class="tt-m" style="margin-top:4px">${esc(foot)}</div>` : ""}`;
  /** Attach hover/focus tooltip to d3 selection of marks. */
  App.hover = (sel, html) =>
    sel
      .on("pointerenter pointermove", (e, d) => App.showTip(html(d), e.clientX, e.clientY))
      .on("pointerleave", App.hideTip);

  // ---------- Count-up (only after the first page is shown) ----------
  App.animateNumbers = (root) => {
    if (!App.booted || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    root.querySelectorAll("[data-count]").forEach((el) => {
      const end = +el.dataset.count, dec = +(el.dataset.dec || 0), suf = el.dataset.suf || "";
      const t0 = performance.now(), dur = 700;
      const step = (t) => {
        const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        el.textContent = (end * e).toFixed(dec) + suf;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  };
  App.count = (v, dec = 0, suf = "") => `<span data-count="${v}" data-dec="${dec}" data-suf="${suf}">${(+v).toFixed(dec)}${suf}</span>`;

  // ---------- Chart sizing ----------
  /** Width of a container, for viewBox sizing. */
  App.w = (el, min = 300) => Math.max(min, Math.floor(el.clientWidth || 600));
  const redraws = new Set();
  App.onResize = (fn) => { redraws.add(fn); };
  let rt;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => redraws.forEach((f) => f()), 150); });

  // ---------- Router ----------
  App.register = (key, label, render, opts = {}) => { App.pages[key] = { label, render, ...opts }; if (!opts.hidden) App.order.push(key); };
  App.go = (hash) => { location.hash = hash; };
  const route = () => {
    const h = (location.hash || "#overview").slice(1);
    let key = h, arg = null;
    if (h.startsWith("m-")) { key = "managers"; arg = h.slice(2); }
    else if (h.startsWith("season-")) { key = "seasons"; arg = h.slice(7); }
    else if (h.startsWith("draft-")) { key = "draft"; arg = h.slice(6); }
    else if (h.startsWith("awards-")) { key = "awards"; arg = h.slice(7); }
    if (!App.pages[key]) key = "overview";
    redraws.clear();
    App.hideTip();
    document.querySelectorAll("#tabs a").forEach((a) => a.setAttribute("aria-current", a.dataset.k === key ? "page" : "false"));
    const app = document.getElementById("app");
    app.innerHTML = "";
    const page = document.createElement("div");
    page.className = "page";
    app.appendChild(page);
    App.pages[key].render(page, arg);
    App.animateNumbers(page);
    document.title = `${App.pages[key].label} · Caboclo Cup History`;
    if (App.booted) window.scrollTo({ top: 0, behavior: "instant" });
    App.booted = true;
  };
  App.start = () => {
    document.getElementById("brand-sub").textContent = `${D.league.firstLabel} – ${D.league.lastLabel} · ${D.seasons.length} seasons · ${App.played.length} managers`;
    document.getElementById("tabs").innerHTML = App.order
      .map((k) => `<a href="#${k}" data-k="${k}">${App.pages[k].label}${App.pages[k].isNew ? '<span class="new">New</span>' : ""}</a>`)
      .join("");
    window.addEventListener("hashchange", route);
    route();
  };
})();
