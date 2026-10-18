import Link from "next/link";
import { notFound } from "next/navigation";
import { DivBar, FillBar, Mono, PickLine, rankLabel, signed } from "@/components/draft";
import { DraftExplorer } from "@/components/DraftExplorer";
import { InfoTip } from "@/components/InfoTip";
import { PlayerName } from "@/components/panel/PlayerName";
import { ShowMore } from "@/components/ShowMore";
import { Card, ManagerLink, PageTitle, Section } from "@/components/ui";
import { DraftGauge } from "@/components/viz/DraftGauge";
import { DraftPositionStrip } from "@/components/viz/DraftPositionStrip";
import { DraftSlotBars } from "@/components/viz/DraftSlotBars";
import { monograms } from "@/components/viz/monograms";
import type { ScatterPick } from "@/components/viz/PickScatter";
import { ReachBars } from "@/components/viz/ReachBars";
import { tt } from "@/components/viz/tt";
import {
  draftImpact,
  draftPositions,
  draftSlotHistory,
  favouritePlayers,
  finishByDraftSlot,
  gotAway,
  hasDraftData,
  keepRates,
  lateGems,
  leaguePicks,
  managerDraftStats,
  reachStats,
  topBusts,
  topSteals,
} from "@/lib/analytics/draft";
import { draftGrade, impactShare, roundOneSlots } from "@/lib/analytics/draftView";
import { playerIdLookup } from "@/lib/analytics/panelView";
import { formatNumber, formatPct, ordinal } from "@/lib/analytics/format";
import { getLeague } from "@/lib/data";
import { TIPS } from "@/lib/explain";
import { DRAFT_TIPS } from "@/lib/explain/draft";

export const metadata = { title: "Draft history" };

/** Largest magnitude, for scaling diverging bars (0 when empty). */
const maxAbs = (xs: number[]) => Math.max(0, ...xs.map(Math.abs));

export default async function DraftPage(props: PageProps<"/[league]/draft">) {
  const { league: slug } = await props.params;
  const league = await getLeague(slug);
  if (!league || !hasDraftData(league)) notFound();

  const nameOf = (id: string) => league.managers.find((m) => m.id === id)?.name ?? id;
  const mono = monograms(league.managers);
  const monoOf = (id: string) => mono.get(id) ?? nameOf(id).slice(0, 2).toUpperCase();
  const picks = leaguePicks(league);
  const grades = managerDraftStats(league);
  const history = draftSlotHistory(league);
  const bySlot = finishByDraftSlot(league);
  const gems = lateGems(picks);
  const draftSeasons = league.seasons.filter((s) => s.draft?.length);
  const positions = draftPositions(league);
  const positionOf = new Map(positions.map((p) => [p.managerId, p]));
  const slots = roundOneSlots(league);
  const impact = draftImpact(league);
  const reach = reachStats(league);
  const keep = keepRates(league);
  const favourites = favouritePlayers(league);
  const away = gotAway(league);
  const pid = playerIdLookup(league);
  const keepOf = new Map(keep.rows.map((r) => [r.managerId, r]));
  const favOf = (id: string) => favourites.find((f) => f.managerId === id);
  // keepRates correlates with finish percentile (0 = first), so flip it: positive = keepers finish higher.
  const keepLink = keep.correlation === null ? null : -keep.correlation;
  const upcoming = league.upcoming?.draft?.length ? league.upcoming : null;
  const maxTeams = Math.max(...[...league.seasons, ...(upcoming ? [upcoming] : [])].map((s) => s.teams.length));

  // The scatter is a client component: hand it only the fields it draws.
  const scatterPicks: ScatterPick[] = picks.map((p) => ({
    y: p.year,
    ov: p.overall,
    rd: p.round,
    ar: p.actualRank,
    pr: p.preseasonRank,
    v: Math.round(p.value * 10) / 10,
    m: p.managerId,
    p: p.playerName,
    id: p.playerId,
  }));
  const names = Object.fromEntries(league.managers.map((m) => [m.id, m.name]));
  const relation = (r: number | null) =>
    r === null ? "not enough data" : Math.abs(r) < 0.1 ? "no real relationship" : `${Math.abs(r) < 0.3 ? "a weak" : "a clear"} link (r = ${r.toFixed(2)})`;

  const vsMax = maxAbs(grades.map((g) => g.vsLeague));
  const luckMax = maxAbs(positions.map((p) => p.slotLuck));
  const habitRows = reach ? reach.rows.map((r) => r.managerId) : grades.map((g) => g.managerId);
  const reachOf = new Map(reach?.rows.map((r) => [r.managerId, r]));
  const earlyMax = maxAbs(reach?.rows.map((r) => r.avgEarly) ?? []);
  const who = (id: string) => (
    <span className="dr-who">
      <Mono text={monoOf(id)} />
      <ManagerLink id={id} name={nameOf(id)} />
    </span>
  );
  const head = (label: string, tip?: string, end = false) => (
    <span className="inline-flex items-center gap-1.5">
      {label}
      {tip && <InfoTip down end={end} text={tip} />}
    </span>
  );

  const reportCard = (
    <Section title="Draft report card" tip={TIPS.draftVsAvg}>
      <div className="panel overflow-x-auto">
        <p className="dr-sub px-4 pt-3">Graded against the league average. Click a manager to light up their picks in the chart below.</p>
        <table className="dr-t mt-2">
          <caption className="sr-only">Draft performance by manager, all seasons</caption>
          <thead>
            <tr>
              <th>{head("Grade", DRAFT_TIPS.grade)}</th>
              <th>Manager</th>
              <th className="r">Drafts</th>
              <th>{head("Value vs avg", TIPS.draftVsAvg)}</th>
              <th>{head("Slot luck", `${TIPS.slotLuck} ${DRAFT_TIPS.slotLuckRule}`)}</th>
              <th className="r">{head("Hit rate", TIPS.hitRate)}</th>
              <th>{head("Rds 1-3: slot → finish", TIPS.coreSlotFinish)}</th>
              <th className="r">{head("Late gems", DRAFT_TIPS.gems, true)}</th>
              <th>Best pick</th>
            </tr>
          </thead>
          <tbody>
            {grades.map((g) => {
              const grade = draftGrade(g.vsLeague);
              const pos = positionOf.get(g.managerId);
              return (
                <tr key={g.managerId} data-m={g.managerId}>
                  <td>
                    <button type="button" data-hl className={`dr-grade g-${grade}`} aria-pressed="false" aria-label={`Grade ${grade}. Highlight ${nameOf(g.managerId)}'s picks in the chart`}>
                      {grade}
                    </button>
                  </td>
                  <td>{who(g.managerId)}</td>
                  <td className="r">{g.drafts}</td>
                  <td>
                    <DivBar
                      value={g.vsLeague}
                      max={vsMax}
                      digits={2}
                      minWidth={150}
                      tt={tt(nameOf(g.managerId), [
                        ["Value per pick vs league", signed(g.vsLeague, 2)],
                        ["Picks", g.picks],
                        ["Grade", grade],
                      ])}
                    />
                  </td>
                  <td>
                    {pos ? (
                      <DivBar
                        value={pos.slotLuck}
                        max={luckMax}
                        minWidth={120}
                        numWidth={36}
                        tt={tt(`${nameOf(g.managerId)}: slot luck`, [
                          ["Per draft", signed(pos.slotLuck, 1)],
                          ["Average slot", `#${formatNumber(pos.avgSlot)}`],
                        ])}
                      />
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="r">{formatPct(g.hitRate, 0)}</td>
                  <td>
                    #{formatNumber(g.coreAvgSlot, 0)} → #{formatNumber(g.coreAvgRank, 0)}
                  </td>
                  <td className="r">{g.gems}</td>
                  <td className="min-w-[170px] !whitespace-normal leading-tight">
                    <PlayerName id={g.best.playerId} name={g.best.playerName} />{" "}
                    <span className="whitespace-nowrap text-[12.5px] text-muted">
                      {g.best.label} · {signed(g.best.value, 1)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="dr-note px-4 pb-3 pt-2">
          Value vs avg = average value per pick compared with the league as a whole (0 = average drafter; drafted players finish below their slot on average). In everyday terms, +0.5 a pick adds up to about +6 a draft: like turning two mid-round picks into 2nd-round-quality players. Hit rate = share of picks that finished at or better than their draft slot. Late gems = round 8+ picks who finished top 75. Grades: A = +0.30 or more, B = +0.10, C = within ±0.10, D = −0.10 or worse, F = −0.30 or worse (placeholder cut-offs).
          The value scale was fitted to this league&apos;s own seasons: the end-of-season ranks match a 9-category z-score ranking almost exactly, and z-score value falls off like the logarithm of rank. Ranks are for the full NBA season, so an injury or a trade away counts against the pick.
        </p>
      </div>
    </Section>
  );

  const between = (
    <>
      <div className="dr-impact">
        <div className="panel space-y-2 p-4">
          <h2 className="sec-title flex items-center gap-2">
            How much does draft day decide? <InfoTip down text={TIPS.explainedByDraft} />
          </h2>
          {impact ? (
            <>
              <DraftGauge share={impactShare(impact)} correlation={impact.correlation} teamSeasons={impact.teamSeasons} />
              <p className="dr-note">
                Across {impact.teamSeasons} team-seasons (r = {impact.correlation.toFixed(2)}). The rest comes down to the waiver wire, trades, injuries and weekly luck.
              </p>
            </>
          ) : (
            <p className="dr-note">Not enough seasons with season-end rosters yet.</p>
          )}
        </div>
        {reach && (
          <div className="panel space-y-2 p-4">
            <h2 className="sec-title flex items-center gap-2">
              Does reaching pay off? <InfoTip down end text={TIPS.reaches} />
            </h2>
            <p className="dr-sub">
              Picks in rounds 1-{reach.maxRound} grouped by how far ahead of the pre-season rankings they were taken. Bars show how often each group finished better than its pre-season rank.
            </p>
            <ReachBars groups={reach.groups} />
            <p className="dr-note">
              Pre-season ranks come from the same top-300 list as the final ranks, so players who finished outside the top 300 have none: the worst busts ({reach.missingPreseason} picks) are missing from every group alike.{" "}
              <span className="inline-flex items-center gap-1.5">
                Keeping your own picks: {keepLink === null ? "—" : signed(keepLink, 2)}, {relation(keepLink)}. <InfoTip end text={TIPS.keepPicks} />
              </span>
            </p>
          </div>
        )}
      </div>

      <Section title="Draft position: who got the early picks?" tip={DRAFT_TIPS.position}>
        <div className="panel space-y-3 p-4">
          <p className="dr-sub !mt-0">
            Every first-round slot each manager has drawn{upcoming ? `, including the ${upcoming.label} draft` : ""}. The ring is their average; chips count #1 and #2 picks and top-3 finishers they drafted; slot luck is what those slots were worth.
          </p>
          <DraftPositionStrip
            rows={positions.map((p) => ({
              managerId: p.managerId,
              name: nameOf(p.managerId),
              drafts: p.drafts,
              firstPicks: p.firstPicks,
              secondPicks: p.secondPicks,
              topThreeFinishers: p.topThreeFinishers,
              avgSlot: p.avgSlot,
              slotLuck: p.slotLuck,
            }))}
            slots={slots.map((s) => ({ managerId: s.managerId, label: s.label, slot: s.slot, playerName: s.playerName, actualRank: s.actualRank, next: s.next }))}
            maxSlot={maxTeams}
          />
          <div className="viz-legend">
            <span>
              <i className="dot" style={{ background: "var(--gold)" }} />
              #1 overall pick
            </span>
            <span>
              <i className="dot" style={{ background: "var(--s1)", opacity: 0.75 }} />
              Other round-one slots
            </span>
            {upcoming && (
              <span>
                <i className="dot" style={{ background: "var(--surface)", boxShadow: "inset 0 0 0 2px var(--accent)" }} />
                {upcoming.label} slot (next season)
              </span>
            )}
            <span>
              <i className="dot" style={{ background: "transparent", boxShadow: "inset 0 0 0 2px var(--foreground)" }} />
              Average slot
            </span>
            <span className="inline-flex items-center gap-1.5">
              Slot luck <InfoTip end text={`${TIPS.slotLuck} ${DRAFT_TIPS.slotLuckRule}`} />
            </span>
          </div>
        </div>
      </Section>
    </>
  );

  return (
    <>
      <PageTitle
        eyebrow="Draft night"
        title="Who actually drafts well?"
        subtitle="Every pick compared with where the player actually finished that season (the end-of-season rank). Value = what the finish was worth minus what the draft slot was expected to be worth, in 9-category z-score points above a replacement-level player. The scale drops steeply at the top, so a first-round flop costs far more than a late-round surprise gains: +3.6 is a pick taken 100th finishing 30th; −10 is a top-5 pick finishing outside the top 150."
      />

      <nav aria-label="Draft boards by season" className="flex flex-wrap gap-2">
        {draftSeasons.map((s) => (
          <Link key={s.year} href={`/${slug}/draft/${s.year}`} className="pill">
            {s.label} board
          </Link>
        ))}
        {upcoming ? (
          <Link href={`/${slug}/draft/${upcoming.year}`} className="pill !border-accent !text-accent">
            {upcoming.label} board · new
          </Link>
        ) : null}
      </nav>

      <DraftExplorer card={reportCard} between={between} picks={scatterPicks} names={names} seasons={draftSeasons.map((s) => ({ year: s.year, label: s.label }))} scatterTip={DRAFT_TIPS.scatter} />

      <div className="grid gap-3 lg:grid-cols-2">
        <Section title="Biggest steals, all time" tip={TIPS.draftValue}>
          <Card className="py-1">
            <ul className="divide-y divide-border">
              {topSteals(picks, 10).map((p) => (
                <PickLine key={`${p.year}-${p.overall}`} p={p} manager={nameOf(p.managerId)} />
              ))}
            </ul>
          </Card>
        </Section>
        <Section title="Biggest busts, rounds 1-3" tip="Early picks (rounds 1-3) who fell furthest short of their draft slot, by draft value. A first-round flop costs far more than a late-round miss: −10 ≈ a top-5 pick who finished outside the top 150.">
          <Card className="py-1">
            <ul className="divide-y divide-border">
              {topBusts(picks, 10).map((p) => (
                <PickLine key={`${p.year}-${p.overall}`} p={p} manager={nameOf(p.managerId)} />
              ))}
            </ul>
          </Card>
        </Section>
      </div>

      <Section title="Draft habits">
        <div className="panel overflow-x-auto">
          <p className="dr-sub px-4 pt-3">How each manager drafts: ahead of or behind the rankings, and how many of their picks they keep.</p>
          <table className="dr-t mt-2">
            <caption className="sr-only">How each manager drafts</caption>
            <thead>
              <tr>
                <th>Manager</th>
                <th>{head("Spots early", TIPS.spotsEarly)}</th>
                <th className="r">Reaches ({reach?.threshold ?? 15}+)</th>
                <th>{head("Picks kept", TIPS.picksKept)}</th>
                <th>Favourite player</th>
              </tr>
            </thead>
            <tbody>
              {habitRows.map((id) => {
                const r = reachOf.get(id);
                const k = keepOf.get(id);
                const f = favOf(id);
                return (
                  <tr key={id} data-m={id}>
                    <td>{who(id)}</td>
                    <td>
                      {r ? (
                        <DivBar
                          value={r.avgEarly}
                          max={earlyMax}
                          tone={false}
                          pos="var(--accent)"
                          neg="var(--s1)"
                          numWidth={44}
                          minWidth={180}
                          tt={tt(nameOf(id), [
                            ["Spots early, on average", signed(r.avgEarly, 1)],
                            ["Picks counted", r.picks],
                          ])}
                        />
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="r">{r ? formatPct(r.reachShare, 0) : "—"}</td>
                    <td>
                      {k ? (
                        <FillBar
                          label={`${k.avgKept.toFixed(1)}/draft`}
                          share={k.keptShare}
                          tt={tt(nameOf(id), [
                            ["Own picks kept per draft", k.avgKept.toFixed(1)],
                            ["Share kept", formatPct(k.keptShare, 0)],
                            ["Drafts", k.drafts],
                          ])}
                        />
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>
                      {f ? (
                        <>
                          <PlayerName id={f.playerId} name={f.playerName} /> <span className="text-[12.5px] text-muted">×{f.picks.length}</span>
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="dr-note px-4 pb-3 pt-2">
            Orange = drafts ahead of the pre-season rankings (reaches); blue = waits for players to fall. Spots early covers rounds 1-{reach?.maxRound ?? 8}; reaches = share of those picks taken {reach?.threshold ?? 15}+ spots early. Picks kept = own draft picks still on the roster when the season ended (players outside the top 300 count as gone). Favourite = most-drafted player, 3+ seasons.
          </p>
        </div>
      </Section>

      <Section title={`Favourite players (${favourites.length})`} tip={DRAFT_TIPS.favourites}>
        <div className="panel p-4">
          <p className="dr-sub !mt-0 mb-3">Players one manager keeps coming back to: drafted in three or more seasons. Blue = beat the slot that year, red = fell short.</p>
          {favourites.length ? (
            <ShowMore initial={8} className="dr-favs" noun="players">
              {favourites.map((f) => (
                <div key={`${f.managerId}-${f.playerId}`} className="dr-fav">
                  <div className="dr-fav-h">
                    <Mono text={monoOf(f.managerId)} />
                    <div className="min-w-0">
                      <b className="block truncate">
                        <PlayerName id={f.playerId} name={f.playerName} />
                      </b>
                      <div className="truncate text-[12.5px] text-muted">
                        {nameOf(f.managerId)} · drafted {f.picks.length} times
                      </div>
                    </div>
                  </div>
                  <div className="dr-fav-yrs">
                    {f.picks.map((p) => (
                      <span
                        key={p.year}
                        tabIndex={0}
                        className={`dr-fy ${p.value >= 0 ? "up" : "down"}`}
                        data-tt={tt(`${f.playerName} · ${p.label}`, [
                          ["Pick", `Rd ${p.round}, #${p.overall} overall`],
                          ["Finished", rankLabel(p.actualRank)],
                          ["Value", signed(p.value, 1)],
                        ])}
                      >
                        <span>{p.label}</span>
                        <b>Rd {p.round}</b>
                        <i>{signed(p.value, 1)}</i>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </ShowMore>
          ) : (
            <p className="text-sm text-muted">No manager has drafted the same player in three seasons yet.</p>
          )}
        </div>
      </Section>

      <Section title={`The ones that got away (${away.length})`} tip={DRAFT_TIPS.gotAway}>
        <div className="panel px-4 py-2">
          <p className="dr-sub !mt-1 mb-1">Drafted, then finished top 40 on someone else&apos;s roster (or nobody&apos;s).</p>
          <ShowMore initial={10} as="ul" className="dr-list" noun="players">
            {away.map((g) => (
              <li key={`${g.year}-${g.overall}`}>
                <div className="l">
                  <div className="t1">
                    <PlayerName id={pid(g.year, g.playerName)} name={g.playerName} />
                    <span className={`badge ${g.how === "traded" ? "badge-orange" : ""}`}>{g.how}</span>
                  </div>
                  <span className="t2">
                    {nameOf(g.drafterManagerId)} took him #{g.overall} (rd {g.round}), {g.label} → {g.endManagerId ? `ended on ${g.endTeam} (${nameOf(g.endManagerId)})` : "a free agent at season end"}
                  </span>
                </div>
                <div className="rv">
                  <b>{rankLabel(g.actualRank)}</b>
                  <span className="t2">finished</span>
                </div>
              </li>
            ))}
          </ShowMore>
          <div className="pb-2" />
        </div>
      </Section>

      <Section title="First overall picks" tip={DRAFT_TIPS.firstPicks}>
        <div className="panel p-4">
          <p className="dr-sub !mt-0 mb-3">Who held #1 each season, how the player did, and how the team finished.</p>
          <div className="dr-firsts">
            {history.map((h) => (
              <Link
                key={h.year}
                href={`/${slug}/draft/${h.year}`}
                className="dr-first"
                data-tt={tt(`${h.label}: ${h.firstPick.playerName}`, [
                  ["Drafted by", nameOf(h.firstPick.managerId)],
                  ["Player finished", rankLabel(h.firstPick.actualRank)],
                  ["Team finished", `${ordinal(h.firstPickTeamFinish)} of ${h.teamCount}`],
                  ["Value", signed(h.firstPick.value, 1)],
                  ["Champion drafted from", h.championSlot ? `#${h.championSlot}` : "—"],
                ])}
              >
                <span className="k">{h.label}</span>
                <span className="fp plink" data-panel={`player:${h.firstPick.playerId}`}>
                  {h.firstPick.playerName}
                </span>
                <span className="text-[12.5px] text-muted">
                  {nameOf(h.firstPick.managerId)} · {h.teamCount} teams
                </span>
                <span className="st">
                  <span>
                    <span>Player finished</span>
                    <b className={h.firstPick.actualRank !== null && h.firstPick.actualRank <= 12 ? "dr-pos" : "dr-neg"}>{rankLabel(h.firstPick.actualRank)}</b>
                  </span>
                  <span>
                    <span>Team finished</span>
                    <b className={h.firstPickTeamFinish === 1 ? "text-gold" : ""}>{h.firstPickTeamFinish === 1 ? "🏆 1st" : ordinal(h.firstPickTeamFinish)}</b>
                  </span>
                </span>
                <span className="text-[12.5px] text-muted">Champion drafted from {h.championSlot ? `#${h.championSlot}` : "—"}</span>
              </Link>
            ))}
          </div>
        </div>
      </Section>

      <div className="grid gap-3 lg:grid-cols-2">
        <Section title="Does draft slot matter?" tip={DRAFT_TIPS.slotMatter}>
          <div className="panel space-y-2 p-4">
            <p className="dr-sub !mt-0">Average final finish by first-round pick position (taller = better). Gold trophies = titles won from that slot; blue = better than the average slot.</p>
            <DraftSlotBars rows={bySlot} teams={Math.max(...league.seasons.map((s) => s.teams.length))} />
          </div>
        </Section>
        <Section title={`Late-round gems (${gems.length})`} tip={DRAFT_TIPS.gems}>
          <div className="panel px-4 py-2">
            <p className="dr-sub !mt-1 mb-1">Round 8 or later, finished top 75.</p>
            <ul className="dr-list dr-gems">
              {gems.map((p) => (
                <li key={`${p.year}-${p.overall}`}>
                  <div className="l">
                    <div className="t1">
                      <PlayerName id={p.playerId} name={p.playerName} />
                    </div>
                    <span className="t2">
                      {p.label} · Rd {p.round} (#{p.overall}) · {nameOf(p.managerId)}
                    </span>
                  </div>
                  <div className="rv">
                    <b>{rankLabel(p.actualRank)}</b>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      </div>
    </>
  );
}
