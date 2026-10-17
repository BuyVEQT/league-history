import Link from "next/link";
import { notFound } from "next/navigation";
import { PickLine, rankLabel, signed } from "@/components/draft";
import { Avatar, Card, ManagerLink, PageTitle, Section, TableWrap, td, th, tr } from "@/components/ui";
import {
  draftSlotHistory,
  finishByDraftSlot,
  hasDraftData,
  lateGems,
  leaguePicks,
  managerDraftStats,
  topBusts,
  topSteals,
  UNRANKED,
} from "@/lib/analytics/draft";
import { formatNumber, formatPct } from "@/lib/analytics/format";
import { colorForManager } from "@/lib/colors";
import { getLeague } from "@/lib/data";

export const metadata = { title: "Draft history" };

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

  return (
    <>
      <PageTitle
        eyebrow="Draft history"
        title="Who drafts well?"
        subtitle={`Every pick compared with where the player actually finished that season (Yahoo's end-of-season rank). Value = draft slot − finish: +40 means a player taken 50th finished 10th. Players outside the top 300 count as rank ${UNRANKED}.`}
      />

      <nav aria-label="Draft boards by season" className="flex flex-wrap gap-2">
        {draftSeasons.map((s) => (
          <Link
            key={s.year}
            href={`/${slug}/draft/${s.year}`}
            className="rounded-full border border-border px-3 py-1 text-sm text-muted hover:border-accent/50 hover:text-foreground"
          >
            {s.label} board
          </Link>
        ))}
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
                  <td className={`${td} tabular-nums`}>{formatPct(g.hitRate, 0)}</td>
                  <td className={`${td} tabular-nums`}>
                    #{formatNumber(g.coreAvgSlot, 0)} → #{formatNumber(g.coreAvgRank, 0)}
                  </td>
                  <td className={`${td} tabular-nums`}>{g.gems}</td>
                  <td className={td}>
                    {g.best.playerName} <span className="text-muted">({g.best.label}, {signed(g.best.value)})</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <p className="text-xs text-muted">
          Value vs avg = average value per pick compared with the league as a whole (0 = average drafter; drafted players finish below their slot on average). Hit rate = share of picks that finished at or better than their draft slot. Late gems = round 8+ picks who finished top 75.
          Ranks are for the full NBA season, so an injury or a trade away counts against the pick.
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
              {gems.map((p) => (
                <tr key={`${p.year}-${p.overall}`} className={tr}>
                  <td className={`${td} font-medium`}>{p.playerName}</td>
                  <td className={td}>{p.label}</td>
                  <td className={`${td} tabular-nums`}>Rd {p.round} · #{p.overall}</td>
                  <td className={`${td} tabular-nums text-positive`}>{rankLabel(p.actualRank)}</td>
                  <td className={td}>
                    <ManagerLink id={p.managerId} name={nameOf(p.managerId)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Section>

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
