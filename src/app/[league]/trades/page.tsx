import { notFound } from "next/navigation";
import { rankLabel, signed } from "@/components/draft";
import { Avatar, Card, cardClass, ManagerLink, PageTitle, Section, StatCard, TableWrap, td, th, tr } from "@/components/ui";
import { formatNumber } from "@/lib/analytics/format";
import { unownedStars } from "@/lib/analytics/players";
import { activityVsFinish, hasTradeData, leagueTrades, managerActivity, tradeEdges, undraftedGems, wireSeasons } from "@/lib/analytics/trades";
import { colorForManager } from "@/lib/colors";
import { getLeague } from "@/lib/data";
import { TradeNetwork } from "@/components/viz/TradeNetwork";
import { WireCharts } from "@/components/viz/WireCharts";

export const metadata = { title: "Trades & moves" };

const dateLabel = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export default async function TradesPage(props: PageProps<"/[league]/trades">) {
  const { league: slug } = await props.params;
  const league = await getLeague(slug);
  if (!league || !hasTradeData(league)) notFound();

  const nameOf = (id: string) => league.managers.find((m) => m.id === id)?.name ?? id;
  const trades = leagueTrades(league);
  const completed = trades.filter((t) => t.status === "completed");
  const vetoed = trades.filter((t) => t.status === "vetoed");
  const activity = managerActivity(league);
  const gems = undraftedGems(league);
  const unowned = unownedStars(league);
  const vsFinish = activityVsFinish(league);
  const edges = tradeEdges(league);
  // Circle order follows the league's manager list; only managers with a completed trade get a seat.
  const traders = league.managers.map((m) => m.id).filter((id) => edges.some((e) => e.a === id || e.b === id));
  const names = Object.fromEntries(league.managers.map((m) => [m.id, m.name]));
  const mostTrades = activity[0];
  const busiestSeason = league.seasons
    .flatMap((s) =>
      Object.entries(s.activity ?? {}).map(([teamId, a]) => ({
        label: s.label,
        moves: a.moves,
        team: s.teams.find((t) => t.id === teamId)!,
      })),
    )
    .sort((a, b) => b.moves - a.moves)[0];
  const lopsided = [...completed].sort((a, b) => b.margin - a.margin)[0];
  const seasonsWithTrades = [...new Set(trades.map((t) => t.year))].sort((a, b) => b - a);

  return (
    <>
      <PageTitle
        eyebrow="Trades & moves"
        title="Wheeling and dealing"
        subtitle="Every trade and veto, who got the better end, and whether working the waiver wire pays off."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Trades completed" value={completed.length} detail={`${vetoed.length} more vetoed`} />
        <StatCard label="Most trades, all time" value={mostTrades.trades} detail={nameOf(mostTrades.managerId)} />
        <StatCard
          label="Most moves, one season"
          value={busiestSeason.moves}
          detail={`${busiestSeason.team.name} · ${nameOf(busiestSeason.team.managerId)}, ${busiestSeason.label}`}
        />
        <StatCard
          label="Most lopsided trade"
          value={signed(lopsided.margin, 1)}
          detail={`${nameOf(lopsided.winnerManagerId!)} won, ${lopsided.label}`}
        />
      </div>

      {(traders.length > 1 || vsFinish) && (
        <div className="grid gap-3 lg:grid-cols-2">
          {traders.length > 1 && (
            <Section title="Who trades with whom">
              <Card className="space-y-2">
                <p className="text-sm text-muted">Hover a manager to see their trade partners; click to open their page. Wider line = more trades.</p>
                <TradeNetwork ids={traders} edges={edges} names={names} slug={slug} />
              </Card>
            </Section>
          )}
          {vsFinish && (
            <Section title="Does working the wire pay off?">
              <Card className="space-y-2">
                <p className="text-sm text-muted">Average adds/drops per team-season across {vsFinish.seasons} seasons, by how the team finished.</p>
                <WireCharts vf={vsFinish} rows={wireSeasons(league)} nameOf={nameOf} />
              </Card>
            </Section>
          )}
        </div>
      )}

      <Section title="Activity by manager">
        <TableWrap>
          <table className="w-full text-sm">
            <caption className="sr-only">Moves and trades by manager, all seasons</caption>
            <thead>
              <tr>
                <th className={th}>Manager</th>
                <th className={th}>Moves</th>
                <th className={th}>Per season</th>
                <th className={th}>Trades</th>
                <th className={th}>Trade W-L</th>
                <th className={th}>Net value</th>
                <th className={th}>Vetoed</th>
                <th className={th}>Favorite partner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {activity.map((r) => (
                <tr key={r.managerId} className={tr}>
                  <td className={td}>
                    <span className="flex items-center gap-2">
                      <Avatar size="sm" name={nameOf(r.managerId)} color={colorForManager(league, r.managerId)} />
                      <ManagerLink id={r.managerId} name={nameOf(r.managerId)} />
                    </span>
                  </td>
                  <td className={`${td} tabular-nums`}>{r.moves}</td>
                  <td className={`${td} tabular-nums`}>{formatNumber(r.movesPerSeason, 0)}</td>
                  <td className={`${td} tabular-nums`}>{r.trades}</td>
                  <td className={`${td} tabular-nums`}>{r.trades ? `${r.tradeWins}-${r.tradeLosses}` : "—"}</td>
                  <td className={`${td} tabular-nums ${r.netValue > 0 ? "text-positive" : r.netValue < 0 ? "text-negative" : ""}`}>
                    {r.trades ? signed(r.netValue, 1) : "—"}
                  </td>
                  <td className={`${td} tabular-nums`}>{r.vetoed || "—"}</td>
                  <td className={td}>
                    {r.favoritePartner ? `${nameOf(r.favoritePartner.managerId)} (${r.favoritePartner.count})` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <p className="text-xs text-muted">
          Trade value uses the same scale as the draft: each player&apos;s end-of-season rank in 9-category z-score points above a
          replacement-level player (roughly the last rostered player, teams × draft rounds, about 156 in a 12-team league). The scale is
          steep at the top, so one star outweighs several solid players, and fringe players add nothing: getting more bodies doesn&apos;t
          win a trade. Where game logs are available, each player is re-ranked on only the games played after the trade (to the end
          of the regular season), so a trade is judged on what each side actually got; the card shows that rank and games played
          (hover for the season rank). Otherwise it falls back to full-season ranks. Moves are the season count of adds and drops.
        </p>
      </Section>

      <Section title="Trade log">
        <div className="space-y-6">
          {seasonsWithTrades.map((year) => {
            const list = trades.filter((t) => t.year === year);
            return (
              <div key={year} className="space-y-2">
                <h3 className="text-sm font-medium text-muted">
                  {list[0].label} · {list.filter((t) => t.status === "completed").length} trade{list.filter((t) => t.status === "completed").length === 1 ? "" : "s"}
                  {list.some((t) => t.status === "vetoed") && `, ${list.filter((t) => t.status === "vetoed").length} vetoed`}
                </h3>
                <div className="grid gap-3 lg:grid-cols-2">
                  {list.map((t, i) => (
                    <div key={i} className={`${cardClass} p-4 ${t.status === "vetoed" ? "opacity-70" : ""}`}>
                      <div className="mb-3 flex items-center justify-between text-xs text-muted">
                        <span>
                          {dateLabel(t.date)}
                          {t.status === "completed" && <span> · {t.basis === "after" ? "rated on games after the trade" : "rated on full-season ranks"}</span>}
                        </span>
                        {t.status === "vetoed" ? (
                          <span className="rounded-full border border-negative/40 px-2 py-0.5 text-negative">Vetoed</span>
                        ) : t.winnerManagerId ? (
                          <span>
                            Edge: {nameOf(t.winnerManagerId)} ({signed(t.margin, 1)})
                          </span>
                        ) : (
                          <span>Even</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {t.sides.map((s) => (
                          <div key={s.teamId}>
                            <div className="mb-1.5 flex items-center gap-2 text-sm">
                              <Avatar size="sm" name={nameOf(s.managerId)} color={colorForManager(league, s.managerId)} />
                              <span className="min-w-0">
                                <span className={`block truncate font-medium ${t.winnerManagerId === s.managerId && t.status === "completed" ? "text-positive" : ""}`}>
                                  {s.teamName}
                                </span>
                                <span className="block text-xs text-muted">gets · worth {s.value.toFixed(1)}</span>
                              </span>
                            </div>
                            <ul className="space-y-0.5 text-sm">
                              {s.players.map((p) => (
                                <li key={p.playerId ?? p.name} className="flex justify-between gap-2">
                                  <span className="truncate">{p.name}</span>
                                  {t.basis === "after" ? (
                                    <span className="shrink-0 tabular-nums" title={`Season rank ${rankLabel(p.actualRank)}; ${p.afterGames} games after the trade`}>
                                      {p.afterRank ? `#${p.afterRank}` : "—"}
                                      <span className="text-xs text-muted"> · {p.afterGames}g</span>
                                    </span>
                                  ) : (
                                    <span className="shrink-0 tabular-nums text-muted">{rankLabel(p.actualRank)}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title={`Undrafted gems (${gems.length})`}>
        <Card className="space-y-2">
          <p className="text-xs text-muted">
            Players nobody drafted who finished in the top 75 — and who had them on their roster at season end (not necessarily who
            picked them up first).
          </p>
          <TableWrap>
            <table className="w-full text-sm">
              <caption className="sr-only">Undrafted players who finished in the top 75</caption>
              <thead>
                <tr>
                  <th className={th}>Player</th>
                  <th className={th}>Season</th>
                  <th className={th}>Finished</th>
                  <th className={th}>Owned at season end</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {gems.map((g) => (
                  <tr key={`${g.year}-${g.playerName}`} className={tr}>
                    <td className={`${td} font-medium`}>{g.playerName}</td>
                    <td className={td}>{g.label}</td>
                    <td className={`${td} tabular-nums text-positive`}>#{g.actualRank}</td>
                    <td className={td}>
                      {g.teamName} · <ManagerLink id={g.managerId} name={nameOf(g.managerId)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Card>
      </Section>

      {unowned.length > 0 && (
        <Section title={`Stars nobody owned (${unowned.length})`}>
          <Card className="space-y-2">
            <p className="text-xs text-muted">
              Top-60 players who were free agents when the season ended: usually injured stars who were dropped, or late-season breakouts
              nobody picked up in time.
            </p>
            <TableWrap>
              <table className="w-full text-sm">
                <caption className="sr-only">Top-60 players unowned at season end</caption>
                <thead>
                  <tr>
                    <th className={th}>Player</th>
                    <th className={th}>Season</th>
                    <th className={th}>Finished</th>
                    <th className={th}>Drafted by</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {unowned.map((u) => (
                    <tr key={`${u.year}-${u.playerName}`} className={tr}>
                      <td className={`${td} font-medium`}>{u.playerName}</td>
                      <td className={td}>{u.label}</td>
                      <td className={`${td} tabular-nums`}>#{u.actualRank}</td>
                      <td className={td}>{u.draftedBy ? <ManagerLink id={u.draftedBy} name={nameOf(u.draftedBy)} /> : <span className="text-muted">Undrafted</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </Card>
        </Section>
      )}
    </>
  );
}
