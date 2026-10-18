import Link from "next/link";
import { notFound } from "next/navigation";
import { DivBar, FillBar, Mono, signed } from "@/components/draft";
import { InfoTip } from "@/components/InfoTip";
import { PlayerName } from "@/components/panel/PlayerName";
import { ShowMore } from "@/components/ShowMore";
import { ManagerLink, PageTitle, Section, StatCard } from "@/components/ui";
import { HealthHeat } from "@/components/viz/HealthHeat";
import { monograms } from "@/components/viz/monograms";
import { tt } from "@/components/viz/tt";
import { hasDraftData } from "@/lib/analytics/draft";
import { formatNumber, formatPct } from "@/lib/analytics/format";
import {
  biggestLosses,
  EARLY_ROUNDS,
  healthGrid,
  healthVsFinish,
  ironMen,
  managerHealth,
  MIN_DRAFTS_FOR_HEALTH,
  pickHealth,
  repeatRisks,
  type PickHealth,
} from "@/lib/analytics/injuryView";
import { getLeague } from "@/lib/data";
import { INJURY_TIPS } from "@/lib/explain/injuries";

export const metadata = { title: "Injury luck" };

const pct = (share: number) => `${Math.round(share * 100)}%`;
const maxAbs = (xs: number[]) => Math.max(0, ...xs.map(Math.abs));

export default async function InjuriesPage(props: PageProps<"/[league]/injuries">) {
  const { league: slug } = await props.params;
  const league = await getLeague(slug);
  if (!league || !hasDraftData(league)) notFound();
  const picks = pickHealth(league);
  if (!picks.length) notFound();

  const nameOf = (id: string) => league.managers.find((m) => m.id === id)?.name ?? id;
  const mono = monograms(league.managers);
  const monoOf = (id: string) => mono.get(id) ?? nameOf(id).slice(0, 2).toUpperCase();
  const summary = managerHealth(picks);
  const ranked = summary.rows.filter((r) => r.ranked);
  const grid = healthGrid(picks);
  const losses = biggestLosses(picks, 10);
  const iron = ironMen(picks);
  const risks = repeatRisks(picks);
  const buckets = healthVsFinish(league, picks);
  const vsMax = maxAbs(ranked.map((r) => r.vsLeague));
  const worstDraft = [...grid.seasons].flatMap((s) => (s.hardestHit ? [s.hardestHit] : [])).sort((a, b) => b.missed - a.missed)[0];
  const healthiest = ranked[0];
  const unluckiest = ranked.at(-1);
  const ironLeader = [...ranked].sort((a, b) => b.ironMen - a.ironMen || b.earlyAvailability - a.earlyAvailability)[0];
  const hitCount = new Map<string, number>();
  for (const s of grid.seasons) if (s.hardestHit) hitCount.set(s.hardestHit.managerId, (hitCount.get(s.hardestHit.managerId) ?? 0) + 1);

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
  const pickTip = (p: PickHealth) =>
    tt(`${p.playerName} · ${p.label}`, [
      ["Pick", `Rd ${p.round}, #${p.overall} overall`],
      ["Drafted by", nameOf(p.managerId)],
      ["Games played", `${p.games} of ${p.scheduled}`],
      ["Finished", p.actualRank === null ? "outside the top 300" : `#${p.actualRank}`],
    ]);
  const pickLine = (p: PickHealth, good: boolean) => (
    <li key={`${p.year}-${p.overall}`} data-tt={pickTip(p)}>
      <div className="l">
        <div className="t1">
          <PlayerName id={p.playerId} name={p.playerName} />
        </div>
        <span className="t2">
          {p.label} · Rd {p.round} (#{p.overall}) · {nameOf(p.managerId)}
        </span>
      </div>
      <div className="rv">
        <b className={good ? "dr-pos" : "dr-neg"}>
          {p.games}/{p.scheduled}
        </b>
        <span className="t2">{good ? "games played" : `${p.missed} missed`}</span>
      </div>
    </li>
  );

  return (
    <>
      <PageTitle
        eyebrow="Draft · health"
        title="Injury luck"
        subtitle={`Whose early picks got hurt, and whose played all 82. Every draft pick's games played, all ${grid.years.length} drafts. A pick who sits can't help you, and you can't take the pick back.`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={`League: rounds 1-${EARLY_ROUNDS} played`}
          value={pct(summary.leagueEarly)}
          detail={`of possible games. That's ${Math.round(summary.leagueEarlyMissedPerDraft)} games lost per manager, per draft.`}
          tip={INJURY_TIPS.played}
        />
        {healthiest && (
          <StatCard
            label="Healthiest picks"
            value={nameOf(healthiest.managerId)}
            detail={`${pct(healthiest.earlyAvailability)} of games from rounds 1-${EARLY_ROUNDS} · ${Math.round(healthiest.earlyMissedPerDraft)} lost a draft`}
            tip={INJURY_TIPS.vsLeague}
          />
        )}
        {unluckiest && (
          <StatCard
            label="Most games lost"
            value={nameOf(unluckiest.managerId)}
            detail={`${pct(unluckiest.earlyAvailability)} of games · ${Math.round(unluckiest.earlyMissedPerDraft)} lost a draft${hitCount.get(unluckiest.managerId) ? ` · hardest hit in ${hitCount.get(unluckiest.managerId)} drafts` : ""}`}
            tip={INJURY_TIPS.lost}
          />
        )}
        {worstDraft && (
          <StatCard
            label="Worst draft for injuries"
            value={`${worstDraft.missed} games`}
            detail={`${nameOf(worstDraft.managerId)}, ${worstDraft.label}: ${worstDraft.picks.map((p) => `${p.playerName.split(" ").at(-1)} ${p.games}`).join(", ")}`}
            tip="The most games a single manager's round 1-3 picks missed in one draft."
          />
        )}
      </div>

      <Section title={`Who's had the healthiest early picks?`} tip={INJURY_TIPS.page}>
        <div className="panel overflow-x-auto">
          <p className="dr-sub px-4 pt-3">
            Rounds 1-{EARLY_ROUNDS} only: the picks a season is built on. Sorted from the healthiest to the most banged-up.
          </p>
          <table className="dr-t mt-2">
            <caption className="sr-only">Games played by each manager&apos;s draft picks</caption>
            <thead>
              <tr>
                <th>Manager</th>
                <th className="r">Drafts</th>
                <th>{head(`Rds 1-${EARLY_ROUNDS} played`, INJURY_TIPS.played)}</th>
                <th>{head("vs league", INJURY_TIPS.vsLeague)}</th>
                <th className="r">{head("Lost / draft", INJURY_TIPS.lost)}</th>
                <th className="r">{head("Iron men", INJURY_TIPS.ironMen)}</th>
                <th className="r">{head("All picks", INJURY_TIPS.all)}</th>
                <th>{head("Worst blow", undefined, true)}</th>
              </tr>
            </thead>
            <tbody>
              {summary.rows.map((r) => (
                <tr key={r.managerId} data-m={r.managerId}>
                  <td>{who(r.managerId)}</td>
                  <td className="r">{r.drafts}</td>
                  <td>
                    <FillBar
                      label={pct(r.earlyAvailability)}
                      share={r.earlyAvailability}
                      color={r.ranked ? "var(--s1)" : "var(--border-2)"}
                      tt={tt(nameOf(r.managerId), [
                        [`Rounds 1-${EARLY_ROUNDS} played`, formatPct(r.earlyAvailability, 1)],
                        ["Early picks", r.earlyPicks],
                        ["League average", formatPct(summary.leagueEarly, 1)],
                      ])}
                    />
                  </td>
                  <td>
                    {r.ranked ? (
                      <DivBar value={r.vsLeague} max={vsMax} minWidth={130} numWidth={40} tt={tt(nameOf(r.managerId), [["vs league", `${signed(r.vsLeague, 1)} pts`]])} />
                    ) : (
                      <span className="text-muted" data-tt={tt(nameOf(r.managerId), [["Drafts", r.drafts]], `Not ranked: one draft is too few to call lucky or unlucky (needs ${MIN_DRAFTS_FOR_HEALTH}).`)}>
                        —
                      </span>
                    )}
                  </td>
                  <td className="r">{formatNumber(r.earlyMissedPerDraft, 0)}</td>
                  <td className="r">
                    {r.ironMen}
                    <span className="text-muted">/{r.earlyPicks}</span>
                  </td>
                  <td className="r">{pct(r.allAvailability)}</td>
                  <td className="min-w-[170px] !whitespace-normal leading-tight">
                    {r.worst && r.worst.missed > 0 ? (
                      <>
                        <PlayerName id={r.worst.playerId} name={r.worst.playerName} />{" "}
                        <span className="whitespace-nowrap text-[12.5px] text-muted">
                          {r.worst.label} · {r.worst.games}/{r.worst.scheduled}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="dr-note px-4 pb-3 pt-2">
            Played = games their round 1-{EARLY_ROUNDS} picks played out of every game those players could have played. Lost / draft = games those picks missed, averaged per draft. Iron men = early picks who played 95%+ of the schedule. All picks = the same share for every pick they made, all rounds. Managers with one draft are listed last, unranked. {INJURY_TIPS.page}
          </p>
        </div>
      </Section>

      <Section title="Draft by draft" tip={INJURY_TIPS.grid}>
        <div className="panel space-y-3 p-4">
          <p className="dr-sub !mt-0">
            The share of games each manager&apos;s round 1-{EARLY_ROUNDS} picks played, every draft. Blue = healthier than the league&apos;s {pct(summary.leagueEarly)}, red = more games lost.
          </p>
          <HealthHeat managers={summary.rows.map((r) => r.managerId)} years={grid.years} cell={grid.cell} league={summary.leagueEarly} managerName={nameOf} />
          <ul className="inj-seasons">
            {grid.seasons.map((s) =>
              s.hardestHit ? (
                <li key={s.year}>
                  <Link href={`/${slug}/draft/${s.year}`} className="k hover:text-accent">
                    {s.label}
                  </Link>
                  <span>
                    Hardest hit: <b>{nameOf(s.hardestHit.managerId)}</b>, {s.hardestHit.missed} games lost
                    <span className="text-muted"> ({s.hardestHit.picks.filter((p) => p.missed >= 20).map((p) => `${p.playerName} ${p.games}/${p.scheduled}`).join(", ") || "spread across all three"})</span>
                  </span>
                </li>
              ) : null,
            )}
          </ul>
        </div>
      </Section>

      <div className="grid gap-3 lg:grid-cols-2">
        <Section title={`Biggest losses, rounds 1-${EARLY_ROUNDS}`} tip={INJURY_TIPS.losses}>
          <div className="panel px-4 py-2">
            <ul className="dr-list">{losses.map((p) => pickLine(p, false))}</ul>
          </div>
        </Section>
        <Section title={`Iron men (${iron.length})`} tip={INJURY_TIPS.ironList}>
          <div className="panel px-4 py-2">
            <p className="dr-sub !mt-1 mb-1">
              Round 1-{EARLY_ROUNDS} picks who played 95%+ of the games.{ironLeader ? ` Most: ${nameOf(ironLeader.managerId)}, ${ironLeader.ironMen} of ${ironLeader.earlyPicks}.` : ""}
            </p>
            <ShowMore as="ul" initial={10} className="dr-list" noun="players">
              {iron.map((p) => pickLine(p, true))}
            </ShowMore>
          </div>
        </Section>
      </div>

      {risks.length > 0 && (
        <Section title="Known risks: drafted again and again" tip={INJURY_TIPS.risks}>
          <div className="panel p-4">
            <p className="dr-sub !mt-0 mb-3">Players taken in three or more drafts who were available least. Each chip is one season: who took him and the games he played.</p>
            <div className="dr-favs">
              {risks.map((r) => (
                <div key={r.playerId} className="dr-fav">
                  <div className="min-w-0">
                    <b className="block truncate">
                      <PlayerName id={r.playerId} name={r.name} />
                    </b>
                    <div className="truncate text-[12.5px] text-muted">
                      Drafted {r.times} times · played {pct(r.availability)} of games · {r.missed} missed
                    </div>
                  </div>
                  <div className="dr-fav-yrs">
                    {r.drafts.map((p) => (
                      <span key={p.year} tabIndex={0} className={`dr-fy ${p.availability >= 0.75 ? "up" : "down"}`} data-tt={pickTip(p)}>
                        <span>{p.label}</span>
                        <b>{monoOf(p.managerId)}</b>
                        <i>
                          {p.games}/{p.scheduled}
                        </i>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      {buckets.length > 0 && (
        <Section title="Does it actually matter?" tip={INJURY_TIPS.matter}>
          <div className="panel space-y-3 p-4">
            <p className="dr-sub !mt-0">Every finished manager-season, split into thirds by how much their round 1-{EARLY_ROUNDS} picks played.</p>
            <div className="inj-buckets">
              {buckets.map((b) => (
                <div key={b.label} className="inj-bucket">
                  <div className="k">{b.label}</div>
                  <div className="text-[12.5px] text-muted">
                    Early picks played {pct(b.min)}-{pct(b.max)} · {b.seasons} seasons
                  </div>
                  <dl>
                    <div>
                      <dt>Avg place</dt>
                      <dd>{formatNumber(b.avgFinish, 1)}</dd>
                    </div>
                    <div>
                      <dt>Made playoffs</dt>
                      <dd>{formatPct(b.playoffRate, 0)}</dd>
                    </div>
                    <div>
                      <dt>Titles</dt>
                      <dd>{b.titles ? `🏆 ${b.titles}` : "0"}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
            <p className="dr-note">{verdict(buckets)}</p>
          </div>
        </Section>
      )}
    </>
  );
}

/** One plain-language line on what the thirds show. */
function verdict(buckets: ReturnType<typeof healthVsFinish>): string {
  const [top, , bottom] = buckets;
  const finishGap = top.avgFinish !== null && bottom.avgFinish !== null ? bottom.avgFinish - top.avgFinish : 0;
  const playoffGap = (top.playoffRate ?? 0) - (bottom.playoffRate ?? 0);
  const titles = `The healthiest third won ${top.titles} title${top.titles === 1 ? "" : "s"}; the most hurt third won ${bottom.titles}.`;
  if (Math.abs(finishGap) < 1 && Math.abs(playoffGap) < 0.15)
    return `Less than you'd think. The healthiest and most hurt thirds finish within a place of each other on average, and make the playoffs about as often. ${titles} Losing a star hurts, but the waiver wire, trades and weekly matchups decide more.`;
  return finishGap > 0
    ? `Yes: the healthiest third finished ${finishGap.toFixed(1)} places higher on average and made the playoffs ${Math.round(playoffGap * 100)} points more often. ${titles}`
    : `Not the way you'd expect: the most hurt third actually finished ${(-finishGap).toFixed(1)} places higher on average. ${titles}`;
}
