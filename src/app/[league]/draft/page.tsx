import Link from "next/link";
import { notFound } from "next/navigation";
import { PickLine, rankLabel, signed } from "@/components/draft";
import { Avatar, Card, ManagerLink, PageTitle, Section, StatCard, TableWrap, td, th, tr } from "@/components/ui";
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
  type PickValue,
} from "@/lib/analytics/draft";
import { formatNumber, formatPct } from "@/lib/analytics/format";
import { InfoTip } from "@/components/InfoTip";

const SLOT_LUCK_RULE =
  "Slot luck = what a draft slot is worth: the value of every pick it gets across a 13-round snake draft, minus the average slot's, averaged over their drafts. + means lucky (early slots), − unlucky. Picking 1st is worth about +4.6 a draft in a 12-team league, picking last about −1.8. Draft value already compares each pick with its slot, so this is the luck that value doesn't count.";
import { colorForManager } from "@/lib/colors";
import { getLeague } from "@/lib/data";

export const metadata = { title: "Draft history" };

/** Late-round gems shown before "Show all". */
const GEMS_SHOWN = 15;

export default async function DraftPage(props: PageProps<"/[league]/draft">) {
  const { league: slug } = await props.params;
  const league = await getLeague(slug);
  if (!league || !hasDraftData(league)) notFound();

  const nameOf = (id: string) => league.managers.find((m) => m.id === id)?.name ?? id;
  const picks = leaguePicks(league);
  const grades = managerDraftStats(league);
  const history = draftSlotHistory(league);
  const bySlot = finishByDraftSlot(league);
  const gems = lateGems(picks);
  const draftSeasons = league.seasons.filter((s) => s.draft?.length);
  const positions = draftPositions(league);
  const positionOf = new Map(positions.map((p) => [p.managerId, p]));
  const impact = draftImpact(league);
  const reach = reachStats(league);
  const keep = keepRates(league);
  const favourites = favouritePlayers(league);
  const away = gotAway(league);
  const reachOf = new Map(reach?.rows.map((r) => [r.managerId, r]));
  const keepOf = new Map(keep.rows.map((r) => [r.managerId, r]));
  const favOf = (id: string) => favourites.find((f) => f.managerId === id);
  const [reaches, steady, fallers] = reach?.groups ?? [];
  // keepRates correlates with finish percentile (0 = first), so flip it: positive = keepers finish higher.
  const keepLink = keep.correlation === null ? null : -keep.correlation;
  const relation = (r: number | null) =>
    r === null ? "not enough data" : Math.abs(r) < 0.1 ? "no real relationship" : `${Math.abs(r) < 0.3 ? "a weak" : "a clear"} link (r = ${r.toFixed(2)})`;

  return (
    <>
      <PageTitle
        eyebrow="Draft history"
        title="Who drafts well?"
        subtitle="Every pick compared with where the player actually finished that season (the end-of-season rank). Value = what the finish was worth minus what the draft slot was expected to be worth, in 9-category z-score points above a replacement-level player. The scale drops steeply at the top, so a first-round flop costs far more than a late-round surprise gains: +3.6 is a pick taken 100th finishing 30th; −10 is a top-5 pick finishing outside the top 150."
      />

      <nav aria-label="Draft boards by season" className="flex flex-wrap gap-2">
        {draftSeasons.map((s) => (
          <Link
            key={s.year}
            href={`/${slug}/draft/${s.year}`}
            className="pill"
          >
            {s.label} board
          </Link>
        ))}
        {league.upcoming?.draft?.length ? (
          <Link href={`/${slug}/draft/${league.upcoming.year}`} className="pill !border-accent !text-accent">
            {league.upcoming.label} board · new
          </Link>
        ) : null}
      </nav>

      <Section title="Draft report card">
        <TableWrap>
          <table className="w-full text-sm">
            <caption className="sr-only">Draft performance by manager, all seasons</caption>
            <thead>
              <tr>
                <th className={th}>Manager</th>
                <th className={th}>Drafts</th>
                <th className={th}>Value vs avg</th>
                <th className={th}>
                  <span className="inline-flex items-center gap-1.5">
                    Slot luck <InfoTip down text={SLOT_LUCK_RULE} />
                  </span>
                </th>
                <th className={th}>Hit rate</th>
                <th className={th}>Rds 1-3: slot → finish</th>
                <th className={th}>Late gems</th>
                <th className={th}>Best pick</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {grades.map((g) => (
                <tr key={g.managerId} className={tr}>
                  <td className={td}>
                    <span className="flex items-center gap-2">
                      <Avatar size="sm" name={nameOf(g.managerId)} color={colorForManager(league, g.managerId)} />
                      <ManagerLink id={g.managerId} name={nameOf(g.managerId)} />
                    </span>
                  </td>
                  <td className={`${td} tabular-nums`}>{g.drafts}</td>
                  <td className={`${td} tabular-nums ${g.vsLeague >= 0 ? "text-positive" : "text-negative"}`}>{signed(g.vsLeague, 1)}</td>
                  <td className={`${td} tabular-nums`}>{positionOf.get(g.managerId) ? `${signed(positionOf.get(g.managerId)!.slotLuck, 1)} · avg slot ${formatNumber(positionOf.get(g.managerId)!.avgSlot)}` : "—"}</td>
                  <td className={`${td} tabular-nums`}>{formatPct(g.hitRate, 0)}</td>
                  <td className={`${td} tabular-nums`}>
                    #{formatNumber(g.coreAvgSlot, 0)} → #{formatNumber(g.coreAvgRank, 0)}
                  </td>
                  <td className={`${td} tabular-nums`}>{g.gems}</td>
                  <td className={td}>
                    {g.best.playerName} <span className="text-muted">({g.best.label}, {signed(g.best.value, 1)})</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <p className="text-xs text-muted">
          Value vs avg = average value per pick compared with the league as a whole (0 = average drafter; drafted players finish below their slot on average). Hit rate = share of picks that finished at or better than their draft slot. Late gems = round 8+ picks who finished top 75.
          The value scale was fitted to this league&apos;s own seasons: the end-of-season ranks match a 9-category z-score ranking almost exactly, and z-score value falls off like the logarithm of rank.
          Ranks are for the full NBA season, so an injury or a trade away counts against the pick.
        </p>
      </Section>

      <Section title="Draft position: who got the early picks?">
        <TableWrap>
          <table className="w-full text-sm">
            <caption className="sr-only">How often each manager picked first, second or in the top three</caption>
            <thead>
              <tr>
                <th className={th}>Manager</th>
                <th className={th}>Drafts</th>
                <th className={th}>#1 pick</th>
                <th className={th}>#2 pick</th>
                <th className={th}>Top 3</th>
                <th className={th}>Avg slot</th>
                <th className={th}>Top-3 finisher drafted</th>
                <th className={th}>Slot luck</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {positions.map((r) => (
                <tr key={r.managerId} className={tr}>
                  <td className={td}>
                    <span className="flex items-center gap-2">
                      <Avatar size="sm" name={nameOf(r.managerId)} color={colorForManager(league, r.managerId)} />
                      <ManagerLink id={r.managerId} name={nameOf(r.managerId)} />
                    </span>
                  </td>
                  <td className={`${td} tabular-nums`}>{r.drafts}</td>
                  <td className={`${td} tabular-nums ${r.firstPicks ? "font-semibold" : "text-muted"}`}>{r.firstPicks}</td>
                  <td className={`${td} tabular-nums ${r.secondPicks ? "font-semibold" : "text-muted"}`}>{r.secondPicks}</td>
                  <td className={`${td} tabular-nums`}>{r.topThreePicks}</td>
                  <td className={`${td} tabular-nums`}>
                    {formatNumber(r.avgSlot)} <span className="text-xs text-muted">(top {formatPct(r.avgSlotShare, 0)})</span>
                  </td>
                  <td className={`${td} tabular-nums`}>{r.topThreeFinishers || <span className="text-muted">0</span>}</td>
                  <td className={`${td} tabular-nums ${r.slotLuck > 0.25 ? "text-positive" : r.slotLuck < -0.25 ? "text-negative" : ""}`}>{signed(r.slotLuck, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <p className="text-xs text-muted">
          Round-one draft slot each season{league.upcoming?.draft?.length ? `, including the ${league.upcoming.label} draft` : ""}; earliest average slot first. {SLOT_LUCK_RULE} &quot;Top&quot; = position as a share of the league (0% = always picking
          first), so 10- and 12-team drafts compare fairly. The last column counts players they drafted who finished the season ranked 1st, 2nd or
          3rd. Draft value already compares each pick with its slot, so an early pick doesn&apos;t inflate it, but early slots are where the surest
          stars go; see &quot;Does draft slot matter?&quot; below.
        </p>
      </Section>

      <Section title="How much does draft day decide?">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {impact && (
            <StatCard
              label="Explained by the draft"
              value={formatPct(impact.correlation ** 2, 0)}
              detail={`of the variation in regular-season win % (r = ${impact.correlation.toFixed(2)}, ${impact.teamSeasons} team-seasons). The rest is decided after draft day.`}
            />
          )}
          {reaches && (
            <StatCard
              label="Reaches that beat the rankings"
              value={formatPct(reaches.beatRate, 0)}
              detail={`of ${reaches.picks} picks taken ${reach!.threshold}+ spots ahead of pre-season rank finished better than that rank — vs ${formatPct(steady.beatRate, 0)} of other picks`}
            />
          )}
          {fallers && (
            <StatCard label="Fallers that beat the rankings" value={formatPct(fallers.beatRate, 0)} detail={`of ${fallers.picks} players taken ${reach!.threshold}+ spots after their pre-season rank`} />
          )}
          <StatCard
            label="Keeping your picks"
            value={keepLink === null ? "—" : signed(keepLink, 2)}
            detail={`correlation between the share of their own picks a team kept all season and finishing higher: ${relation(keepLink)}`}
          />
        </div>
        <p className="text-xs text-muted">
          Pre-season ranks come from the same top-300 list as the final ranks, so players who finished outside the top 300 have none: the worst
          busts ({reach?.missingPreseason ?? 0} picks in rounds 1-{reach?.maxRound ?? 8}) are missing from every reach group alike.
        </p>
      </Section>

      <Section title="Draft habits">
        <TableWrap>
          <table className="w-full text-sm">
            <caption className="sr-only">How each manager drafts</caption>
            <thead>
              <tr>
                <th className={th}>Manager</th>
                <th className={th}>Spots early</th>
                <th className={th}>Reaches</th>
                <th className={th}>Picks kept</th>
                <th className={th}>Favourite player</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {grades.map((g) => {
                const r = reachOf.get(g.managerId);
                const k = keepOf.get(g.managerId);
                const f = favOf(g.managerId);
                return (
                  <tr key={g.managerId} className={tr}>
                    <td className={td}>
                      <span className="flex items-center gap-2">
                        <Avatar size="sm" name={nameOf(g.managerId)} color={colorForManager(league, g.managerId)} />
                        <ManagerLink id={g.managerId} name={nameOf(g.managerId)} />
                      </span>
                    </td>
                    <td className={`${td} tabular-nums`}>{r ? signed(r.avgEarly, 1) : "—"}</td>
                    <td className={`${td} tabular-nums`}>{r ? formatPct(r.reachShare, 0) : "—"}</td>
                    <td className={`${td} tabular-nums`}>{k ? `${k.avgKept.toFixed(1)} (${formatPct(k.keptShare, 0)})` : "—"}</td>
                    <td className={td}>{f ? `${f.playerName} ×${f.picks.length}` : <span className="text-muted">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
        <p className="text-xs text-muted">
          Spots early = how far ahead of the pre-season rank a manager drafts on average in rounds 1-{reach?.maxRound ?? 8} (negative = lets players
          fall). Reaches = share of those picks taken {reach?.threshold ?? 15}+ spots early. Picks kept = own draft picks still on the roster when the
          season ended (players outside the top 300 count as gone). Favourite = most-drafted player, 3+ seasons.
        </p>
      </Section>

      <div className="grid gap-3 lg:grid-cols-2">
        <Section title="Biggest steals, all time">
          <Card className="py-1">
            <ul className="divide-y divide-border">
              {topSteals(picks, 10).map((p) => (
                <PickLine key={`${p.year}-${p.overall}`} p={p} manager={nameOf(p.managerId)} />
              ))}
            </ul>
          </Card>
        </Section>
        <Section title="Biggest busts, rounds 1-3">
          <Card className="py-1">
            <ul className="divide-y divide-border">
              {topBusts(picks, 10).map((p) => (
                <PickLine key={`${p.year}-${p.overall}`} p={p} manager={nameOf(p.managerId)} />
              ))}
            </ul>
          </Card>
        </Section>
      </div>

      <Section title={`Late-round gems (${gems.length})`}>
        <TableWrap>
          <GemTable rows={gems.slice(0, GEMS_SHOWN)} nameOf={nameOf} />
        </TableWrap>
        {gems.length > GEMS_SHOWN && (
          <details className="text-sm">
            <summary className="cursor-pointer text-accent">Show all {gems.length}</summary>
            <div className="mt-3">
              <TableWrap>
                <GemTable rows={gems.slice(GEMS_SHOWN)} nameOf={nameOf} />
              </TableWrap>
            </div>
          </details>
        )}
      </Section>

      <div className="grid gap-3 lg:grid-cols-2">
        <Section title={`Favourite players (${favourites.length})`}>
          <Card className="py-1">
            {favourites.length ? (
              <ul className="divide-y divide-border">
                {favourites.slice(0, 10).map((f) => (
                  <li key={`${f.managerId}-${f.playerId}`} className="flex items-start justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{f.playerName}</span>
                      <span className="block truncate text-xs text-muted">
                        {nameOf(f.managerId)} · {f.picks.map((p) => `${p.label} rd ${p.round}`).join(", ")}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums">×{f.picks.length}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-2 text-sm text-muted">No manager has drafted the same player in three seasons yet.</p>
            )}
          </Card>
        </Section>
        <Section title={`The ones that got away (${away.length})`}>
          <Card className="py-1">
            <ul className="divide-y divide-border">
              {away.slice(0, 10).map((g) => (
                <li key={`${g.year}-${g.overall}`} className="flex items-start justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{g.playerName}</span>
                    <span className="block truncate text-xs text-muted">
                      {g.label} · drafted by {nameOf(g.drafterManagerId)} (rd {g.round}) · {g.how} ·{" "}
                      {g.endManagerId ? `ended with ${nameOf(g.endManagerId)}` : "a free agent at season end"}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums text-positive">{rankLabel(g.actualRank)}</span>
                </li>
              ))}
            </ul>
          </Card>
          <p className="text-xs text-muted">Drafted players who finished in the top 40 on someone else&apos;s roster, or nobody&apos;s. Traded = dealt away by the drafting team; otherwise dropped.</p>
        </Section>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Section title="First overall picks">
          <TableWrap>
            <table className="w-full text-sm">
              <caption className="sr-only">First overall pick each season and how it went</caption>
              <thead>
                <tr>
                  <th className={th}>Season</th>
                  <th className={th}>Pick</th>
                  <th className={th}>Player finished</th>
                  <th className={th}>Team finished</th>
                  <th className={th}>Champ drafted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...history].reverse().map((h) => (
                  <tr key={h.year} className={tr}>
                    <td className={td}>
                      <Link href={`/${slug}/draft/${h.year}`} className="text-accent hover:underline">
                        {h.label}
                      </Link>
                    </td>
                    <td className={td}>
                      {h.firstPick.playerName} <span className="text-muted">· {nameOf(h.firstPick.managerId)}</span>
                    </td>
                    <td className={`${td} tabular-nums`}>{rankLabel(h.firstPick.actualRank)}</td>
                    <td className={`${td} tabular-nums`}>
                      {h.firstPickTeamFinish} of {h.teamCount}
                    </td>
                    <td className={`${td} tabular-nums`}>{h.championSlot ? `#${h.championSlot}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Section>

        <Section title="Does draft slot matter?">
          <Card>
            <ul className="space-y-1.5">
              {bySlot.map((s) => {
                const width = Math.max(4, 100 - ((s.avgFinish - 1) / 11) * 100);
                return (
                  <li key={s.slot} className="flex items-center gap-3 text-sm">
                    <span className="w-14 shrink-0 text-muted">Slot {s.slot}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${width}%` }} />
                    </div>
                    <span className="w-28 shrink-0 text-right tabular-nums text-muted">
                      avg {formatNumber(s.avgFinish)} · {s.titles} 🏆
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-muted">
              Average final finish by round-one draft position (longer bar = better finish). Slots 11-12 only exist in 12-team seasons.
            </p>
          </Card>
        </Section>
      </div>
    </>
  );
}

function GemTable({ rows, nameOf }: { rows: PickValue[]; nameOf: (id: string) => string }) {
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Round 8 or later picks who finished in the top 75</caption>
      <thead>
        <tr>
          <th className={th}>Player</th>
          <th className={th}>Season</th>
          <th className={th}>Picked</th>
          <th className={th}>Finished</th>
          <th className={th}>Drafted by</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.map((p) => (
          <tr key={`${p.year}-${p.overall}`} className={tr}>
            <td className={`${td} font-medium`}>{p.playerName}</td>
            <td className={td}>{p.label}</td>
            <td className={`${td} tabular-nums`}>
              Rd {p.round} · #{p.overall}
            </td>
            <td className={`${td} tabular-nums text-positive`}>{rankLabel(p.actualRank)}</td>
            <td className={td}>
              <ManagerLink id={p.managerId} name={nameOf(p.managerId)} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
