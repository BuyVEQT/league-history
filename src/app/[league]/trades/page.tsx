import { monograms } from "@/components/viz/monograms";
import { notFound } from "next/navigation";
import { CountUp } from "@/components/CountUp";
import { signed } from "@/components/draft";
import { InfoTip } from "@/components/InfoTip";
import { PlayerName } from "@/components/panel/PlayerName";
import { ShowMore } from "@/components/ShowMore";
import { TradeLog, type TradeLogEntry } from "@/components/TradeLog";
import { TradePanelHead } from "@/components/TradePanelHead";
import { Avatar, ManagerLink, PageTitle, StatCard, td, th, tr } from "@/components/ui";
import { TradeNetwork } from "@/components/viz/TradeNetwork";
import { tt } from "@/components/viz/tt";
import { UnownedTrack } from "@/components/viz/UnownedTrack";
import { WireCharts } from "@/components/viz/WireCharts";
import { formatNumber } from "@/lib/analytics/format";
import { playerIdLookup } from "@/lib/analytics/panelView";
import { unownedStars } from "@/lib/analytics/players";
import { activityVsFinish, hasTradeData, leagueTrades, managerActivity, tradeEdges, undraftedGems, wireSeasons } from "@/lib/analytics/trades";
import { activityBars, tradeLogSeasons, tradeSideShares } from "@/lib/analytics/tradesView";
import { getLeague } from "@/lib/data";
import { TIPS } from "@/lib/explain";
import { TRADE_TIPS } from "@/lib/explain/trades";

export const metadata = { title: "Trades & moves" };

export default async function TradesPage(props: PageProps<"/[league]/trades">) {
  const { league: slug } = await props.params;
  const league = await getLeague(slug);
  if (!league || !hasTradeData(league)) notFound();

  const nameOf = (id: string) => league.managers.find((m) => m.id === id)?.name ?? id;
  const mono = monograms(league.managers);
  const trades = leagueTrades(league);
  const completed = trades.filter((t) => t.status === "completed");
  const vetoed = trades.filter((t) => t.status === "vetoed");
  const activity = activityBars(managerActivity(league));
  const gems = undraftedGems(league);
  const pid = playerIdLookup(league);
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
  const anyAfter = completed.some((t) => t.basis === "after");

  const log: TradeLogEntry[] = trades.map((t) => {
    const shares = tradeSideShares(t);
    return {
      year: t.year,
      label: t.label,
      date: t.date,
      status: t.status,
      basis: t.basis,
      winnerManagerId: t.winnerManagerId,
      margin: t.margin,
      sides: t.sides.map((s, i) => ({
        managerId: s.managerId,
        teamName: s.teamName,
        value: s.value,
        share: shares[i],
        players: s.players.map((p, j) => ({
          key: `${p.playerId ?? p.name}-${j}`,
          name: p.name,
          id: p.playerId,
          actualRank: p.actualRank,
          afterRank: p.afterRank ?? null,
          afterGames: p.afterGames ?? null,
        })),
      })),
    };
  });

  return (
    <>
      <PageTitle
        eyebrow="Trades & moves"
        title="Wheeling and dealing"
        subtitle="Every trade and veto, who got the better end, and whether working the waiver wire pays off."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Trades completed" value={<CountUp value={completed.length} />} detail={`${vetoed.length} more vetoed`} />
        {mostTrades && <StatCard label="Most trades, all time" value={<CountUp value={mostTrades.trades} />} detail={nameOf(mostTrades.managerId)} />}
        {busiestSeason && (
          <StatCard
            label="Most moves, one season"
            tip={TRADE_TIPS.moves}
            value={<CountUp value={busiestSeason.moves} />}
            detail={`${busiestSeason.team.name} · ${nameOf(busiestSeason.team.managerId)}, ${busiestSeason.label}`}
          />
        )}
        {lopsided && (
          <StatCard
            label="Most lopsided trade"
            tip={TIPS.tradeMargin}
            value={<CountUp value={lopsided.margin} decimals={1} prefix={lopsided.margin > 0 ? "+" : ""} />}
            detail={`${nameOf(lopsided.winnerManagerId!)} won it, ${lopsided.label}`}
          />
        )}
      </div>

      {(traders.length > 1 || vsFinish) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {traders.length > 1 && (
            <section className="panel tx-tp-panel">
              <TradePanelHead title="Who trades with whom" sub="Hover a manager to see their trade partners; click to open their page." tip={TRADE_TIPS.network} />
              <TradeNetwork ids={traders} edges={edges} names={names} slug={slug} />
            </section>
          )}
          {vsFinish && (
            <section className="panel tx-tp-panel">
              <TradePanelHead
                title="Does grinding the wire pay off?"
                sub={`Average adds/drops per team-season across ${vsFinish.seasons} seasons, by how the team finished.`}
                tip={TRADE_TIPS.wire}
              />
              <WireCharts vf={vsFinish} rows={wireSeasons(league)} nameOf={nameOf} />
            </section>
          )}
        </div>
      )}

      <section className="panel overflow-hidden">
        <div className="tx-tp-panel pb-0">
          <TradePanelHead
            title="Activity by manager"
            sub={`Trade wins compare the value of what each side received${anyAfter ? " over the games after the trade" : ""}.`}
            tip={TIPS.netTrade}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Moves and trades by manager, all seasons</caption>
            <thead>
              <tr>
                <th className={th}>Manager</th>
                <th className={th}>
                  <span className="inline-flex items-center gap-1.5">
                    Moves <InfoTip down text={TRADE_TIPS.moves} />
                  </span>
                </th>
                <th className={`${th} text-right`}>Per season</th>
                <th className={`${th} text-right`}>Trades</th>
                <th className={`${th} text-right`}>
                  <span className="inline-flex items-center gap-1.5">
                    Trade W-L <InfoTip down text={TIPS.tradeRecord} />
                  </span>
                </th>
                <th className={th}>
                  <span className="inline-flex items-center gap-1.5">
                    Net value <InfoTip down end text={TIPS.netTrade} />
                  </span>
                </th>
                <th className={`${th} text-right`}>Vetoed</th>
                <th className={th}>Favorite partner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {activity.map((r, i) => (
                <tr key={r.managerId} data-m={r.managerId} className={tr}>
                  <td className={td}>
                    <span className="flex items-center gap-2">
                      <Avatar size="sm" name={nameOf(r.managerId)} initials={mono.get(r.managerId)} />
                      <ManagerLink id={r.managerId} name={nameOf(r.managerId)} />
                    </span>
                  </td>
                  <td className={td}>
                    <div className="tx-inbar" data-tt={tt(nameOf(r.managerId), [["Moves", r.moves], ["Seasons", r.seasons], ["Per season", formatNumber(r.movesPerSeason, 0)]])}>
                      <span className="tx-inbar-n">{r.moves}</span>
                      <div className="tx-inbar-tr">
                        <div className="tx-inbar-fl" style={{ width: `${r.movesShare * 100}%`, animationDelay: `${i * 30}ms` }} />
                      </div>
                    </div>
                  </td>
                  <td className={`${td} text-right`}>{formatNumber(r.movesPerSeason, 0)}</td>
                  <td className={`${td} text-right`}>{r.trades}</td>
                  <td className={`${td} text-right`}>{r.trades ? `${r.tradeWins}-${r.tradeLosses}` : "—"}</td>
                  <td className={td}>
                    {r.trades ? (
                      <div
                        className="tx-inbar"
                        data-tt={tt(nameOf(r.managerId), [["Net trade value", signed(r.netValue, 1)], ["Trade record", `${r.tradeWins}-${r.tradeLosses}`]], "Value received minus value given, all trades")}
                      >
                        <span className={`tx-inbar-n wide ${r.netValue > 0 ? "text-positive" : r.netValue < 0 ? "text-negative" : "text-muted"}`}>{signed(r.netValue, 1)}</span>
                        <div className="tx-inbar-tr div">
                          <div
                            className={`tx-inbar-fl ${r.netShare >= 0 ? "pos" : "neg"}`}
                            style={
                              r.netShare >= 0
                                ? { left: "50%", width: `${r.netShare * 50}%`, animationDelay: `${i * 30}ms` }
                                : { right: "50%", width: `${-r.netShare * 50}%`, animationDelay: `${i * 30}ms` }
                            }
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className={`${td} text-right`}>{r.vetoed || "—"}</td>
                  <td className={td}>
                    {r.favoritePartner ? (
                      <>
                        {nameOf(r.favoritePartner.managerId)} <span className="text-muted">({r.favoritePartner.count})</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details className="tx-tp-note">
          <summary>How trade value works</summary>
          <p>
            Trade value uses the same scale as the draft: each player&apos;s rank in 9-category z-score points above a replacement-level
            player (roughly the last rostered player, teams × draft rounds, about 156 in a 12-team league). The scale is steep at the top,
            so one star outweighs several solid players, and fringe players add nothing: getting more bodies doesn&apos;t win a trade.
            Where game logs are available, each player is re-ranked on only the games played after the trade (to the end of the regular
            season), so a trade is judged on what each side actually got; the trade log shows that rank and games played (hover for the
            season rank). Otherwise it falls back to full-season ranks. Moves are the season count of adds and drops.
          </p>
        </details>
      </section>

      {log.length > 0 && (
        <section className="panel tx-tp-panel">
          <TradePanelHead
            title="Trade log"
            sub={
              <span className="inline-flex flex-wrap items-center gap-1.5">
                {anyAfter
                  ? "Bars show the value each side received over the games after the trade. Bigger bar won it."
                  : "Bars show the value each side received. Bigger bar won it."}
                <InfoTip text={anyAfter ? TRADE_TIPS.afterTrade : TRADE_TIPS.tradeLog} />
              </span>
            }
            tip={TIPS.tradeMargin}
          />
          <TradeLog trades={log} seasons={tradeLogSeasons(trades)} names={names} />
        </section>
      )}

      {(gems.length > 0 || unowned.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {gems.length > 0 && (
            <section className="panel tx-tp-panel">
              <TradePanelHead title={`Undrafted gems (${gems.length})`} sub="Nobody drafted them; they finished top 75." tip={TRADE_TIPS.undrafted} />
              <ShowMore initial={12} className="tx-und-grid" noun="gems">
                {gems.map((g) => (
                  <div key={`${g.year}-${g.playerName}`} className="tx-und-card">
                    <div className="tx-und-rk num" aria-label={`Finished number ${g.actualRank}`}>
                      #{g.actualRank}
                    </div>
                    <div className="min-w-0">
                      <div className="tx-und-nm">
                        <PlayerName id={pid(g.year, g.playerName)} name={g.playerName} />
                      </div>
                      <div className="tx-und-d">
                        {g.label} · on {g.teamName} (<ManagerLink id={g.managerId} name={nameOf(g.managerId)} />) at season end
                      </div>
                    </div>
                  </div>
                ))}
              </ShowMore>
            </section>
          )}
          {unowned.length > 0 && (
            <section className="panel tx-tp-panel">
              <TradePanelHead
                title={`Stars nobody owned (${unowned.length})`}
                sub="Finished top 60, but sat on the waiver wire when the season ended."
                tip={TRADE_TIPS.unowned}
              />
              <UnownedTrack
                rows={unowned.map((u) => ({
                  playerName: u.playerName,
                  label: u.label,
                  actualRank: u.actualRank,
                  draftedBy: u.draftedBy ? nameOf(u.draftedBy) : null,
                }))}
              />
            </section>
          )}
        </div>
      )}
    </>
  );
}
