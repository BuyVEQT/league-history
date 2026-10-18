/* Leaderboard: sortable all-time table with season range, inline bars and finish sparklines. */
(function () {
  const { D, esc } = App;

  const COLS = [
    { k: "titles", l: "Titles", tip: App.TIP.titles, best: "high", v: (r) => r.titles, r: (r) => `${r.titles}${r.titles ? " " + App.trophies(r.titles) : ""}` },
    { k: "finals", l: "Finals", tip: App.TIP.finals, best: "high", v: (r) => r.finals, r: (r) => r.finals },
    { k: "seasons", l: "Seasons", best: "high", v: (r) => r.seasons, r: (r) => r.seasons },
    { k: "catPct", l: "Category win %", tip: App.TIP.catPct, best: "high", v: (r) => r.catPct, r: (r, max) => `<div class="inbar"><span style="width:50px">${App.pct(r.catPct)}</span><div class="tr"><div class="fl" style="width:${Math.max(2, ((r.catPct - 0.4) / (max - 0.4)) * 100)}%"></div></div></div>` },
    { k: "cats", l: "Category W-L-T", tip: App.TIP.catRec, best: "high", v: (r) => r.cw, r: (r) => App.rec(r.cw, r.cl, r.ct) },
    { k: "winPct", l: "Matchup win %", tip: App.TIP.matchPct, best: "high", v: (r) => r.winPct, r: (r) => App.pct(r.winPct) },
    { k: "rec", l: "Matchup W-L-T", tip: App.TIP.matchPct, best: "high", v: (r) => r.w, r: (r) => App.rec(r.w, r.l, r.t) },
    { k: "avgFinish", l: "Avg finish", tip: App.TIP.avgFinish, best: "low", v: (r) => r.avgFinish, r: (r) => r.avgFinish.toFixed(1) },
    { k: "playoffs", l: "Playoffs", tip: App.TIP.playoffs, best: "high", v: (r) => r.playoffPct, r: (r) => `${r.po}/${r.seasons} <span class="muted">(${App.pct(r.playoffPct, 0)})</span>` },
  ];

  function aggregate(from, to) {
    return D.careers.map((c) => {
      const ss = c.seasonsList.filter((s) => s.year >= from && s.year <= to);
      if (!ss.length) return null;
      const sum = (f) => ss.reduce((a, s) => a + f(s), 0);
      const cw = sum((s) => s.cw), cl = sum((s) => s.cl), ct = sum((s) => s.ct), w = sum((s) => s.w), l = sum((s) => s.l), t = sum((s) => s.t);
      const titles = ss.filter((s) => s.final === 1).length, ru = ss.filter((s) => s.final === 2).length, po = ss.filter((s) => s.result !== "Missed playoffs").length;
      return {
        id: c.managerId, seasons: ss.length, titles, ru, finals: titles + ru, po, playoffPct: po / ss.length,
        cw, cl, ct, catPct: (cw + ct / 2) / (cw + cl + ct), w, l, t, winPct: (w + t / 2) / (w + l + t),
        avgFinish: sum((s) => s.final) / ss.length, list: ss,
      };
    }).filter(Boolean);
  }
  const defaultCmp = (a, b) => b.titles - a.titles || b.ru - a.ru || b.catPct - a.catPct;

  function spark(r, years, maxN) {
    const w = 16 * years.length, h = 30, y = (f) => 3 + ((f - 1) / (maxN - 1)) * (h - 6);
    const pts = years.map((yr, i) => { const s = r.list.find((x) => x.year === yr); return s ? { x: 8 + i * 16, y: y(s.final), s } : null; });
    let path = "", prev = null;
    pts.forEach((p) => { if (p) { path += `${prev ? "L" : "M"}${p.x},${p.y}`; } prev = p; });
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true" style="display:block"><line x1="0" x2="${w}" y1="${y(1)}" y2="${y(1)}" stroke="var(--line)"/>
      <path d="${path}" fill="none" stroke="var(--line-2)" stroke-width="1.5"/>
      ${pts.map((p) => (p ? `<circle cx="${p.x}" cy="${p.y}" r="${p.s.final === 1 ? 4 : 2.6}" fill="${p.s.final === 1 ? "var(--gold)" : p.s.final <= 3 ? "var(--s1)" : "var(--muted)"}"><title>${esc(App.label(p.s.year))}: ${App.ord(p.s.final)}</title></circle>` : "")).join("")}</svg>`;
  }

  App.register("leaderboard", "Leaderboard", (root) => {
    const years = D.seasons.map((s) => s.year);
    let from = years[0], to = years[years.length - 1], sort = null;
    const opts = (sel) => years.map((y) => `<option value="${y}" ${y === sel ? "selected" : ""}>${esc(App.label(y))}</option>`).join("");

    root.innerHTML = `
      <div><div class="eyebrow">All-time</div><h1 class="title">Leaderboard</h1>
        <p class="lede">Default order is titles, then runner-ups, then category win %, the number the league's standings actually use. Click any column to sort, any name to open their profile.</p></div>
      <div class="callout"><b>Why two win percentages?</b> This league is Yahoo "Head-to-Head – Categories", so standings count every category, not just who won the week. Category win % is the official measure; matchup win % (weeks won) is shown for bragging.</div>
      <div class="panel" style="padding:0">
        <div class="controls" style="padding:14px 16px;border-bottom:1px solid var(--line)">
          <label class="field" for="lb-from">From season<select id="lb-from">${opts(from)}</select></label>
          <label class="field" for="lb-to">To season<select id="lb-to">${opts(to)}</select></label>
          <span class="small muted" id="lb-count" style="margin-left:auto"></span>
        </div>
        <div class="scroll-x"><table class="t" id="lb"></table></div>
      </div>
      <p class="note">Finish history: one dot per season, higher = better finish; gold = champion, blue = podium. Records are regular season only.</p>`;

    const table = root.querySelector("#lb");
    const draw = () => {
      const lo = Math.min(from, to), hi = Math.max(from, to);
      let rows = aggregate(lo, hi);
      const col = sort && COLS.find((c) => c.k === sort.k);
      rows.sort(col ? (a, b) => ((col.v(a) - col.v(b)) * (sort.dir === "asc" ? 1 : -1)) || defaultCmp(a, b) : defaultCmp);
      const maxPct = d3.max(rows, (r) => r.catPct);
      const ys = years.filter((y) => y >= lo && y <= hi);
      const maxN = d3.max(D.seasons, (s) => s.teamCount);
      root.querySelector("#lb-count").textContent = `${rows.length} managers · ${ys.length} season${ys.length > 1 ? "s" : ""}`;
      table.innerHTML = `<thead><tr><th>#</th><th>Manager</th>${COLS.map((c) => {
        const on = sort?.k === c.k;
        return `<th aria-sort="${on ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}"><span style="display:inline-flex;gap:5px;align-items:center"><button type="button" class="sort" data-k="${c.k}">${esc(c.l)}${on ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}</button>${c.tip ? App.info(c.tip) : ""}</span></th>`;
      }).join("")}<th>Finish history</th></tr></thead>
      <tbody>${rows.map((r, i) => `<tr><td class="muted">${i + 1}</td><td>${App.who(r.id)}</td>${COLS.map((c) => `<td>${c.r(r, maxPct)}</td>`).join("")}<td>${spark(r, ys, maxN)}</td></tr>`).join("")}</tbody>`;
    };
    table.addEventListener("click", (e) => {
      const b = e.target.closest("button.sort");
      if (!b) return;
      const c = COLS.find((x) => x.k === b.dataset.k);
      sort = sort?.k === c.k ? { k: c.k, dir: sort.dir === "asc" ? "desc" : "asc" } : { k: c.k, dir: c.best === "high" ? "desc" : "asc" };
      draw();
    });
    root.querySelector("#lb-from").addEventListener("change", (e) => { from = +e.target.value; draw(); });
    root.querySelector("#lb-to").addEventListener("change", (e) => { to = +e.target.value; draw(); });
    draw();
  });
})();
