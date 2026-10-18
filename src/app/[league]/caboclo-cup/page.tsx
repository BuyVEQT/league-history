import Link from "next/link";
import { notFound } from "next/navigation";
import { InfoTip } from "@/components/InfoTip";
import { Avatar, Card, PageTitle, Section } from "@/components/ui";
import { FinalShotChart } from "@/components/viz/FinalShotChart";
import { monograms } from "@/components/viz/monograms";
import { fgPct, finalTimeline, lastShotWhatIf, type FinalTeam } from "@/lib/analytics/cabocloFinal";
import { cabocloFinalFor } from "@/lib/data/cabocloFinal";
import { getLeague } from "@/lib/data";

export const metadata = { title: "Why the Caboclo Cup" };

const pct8 = (v: number) => v.toFixed(8).replace(/^0/, "");
const pct4 = (v: number) => v.toFixed(4).replace(/^0/, "");
const et = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }).toLowerCase();
const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

const WINNER = "matt";
const LOSER = "jacob-g";
const CATEGORIES: { key: string; label: string; value: (t: FinalTeam) => string }[] = [
  { key: "FG%", label: "FG%", value: (t) => `${pct4(fgPct(t.fgm, t.fga))} (${t.fgm}/${t.fga})` },
  { key: "FT%", label: "FT%", value: () => "—" },
  { key: "3PTM", label: "3PM", value: (t) => String(t.tpm) },
  { key: "PTS", label: "PTS", value: (t) => String(t.pts) },
  { key: "REB", label: "REB", value: (t) => String(t.reb) },
  { key: "AST", label: "AST", value: (t) => String(t.ast) },
  { key: "ST", label: "STL", value: (t) => String(t.stl) },
  { key: "BLK", label: "BLK", value: (t) => String(t.blk) },
  { key: "TO", label: "TO", value: (t) => String(t.to) },
];

export default async function CabocloCupPage(props: PageProps<"/[league]/caboclo-cup">) {
  const { league: slug } = await props.params;
  const league = await getLeague(slug);
  const final = cabocloFinalFor(slug);
  if (!league || !final) notFound();
  const teamOf = (id: string) => final.teams.find((t) => t.managerId === id)!;
  const nameOf = (id: string) => league.managers.find((m) => m.id === id)?.name ?? id;
  const mono = monograms(league.managers);
  const winner = teamOf(WINNER);
  const loser = teamOf(LOSER);
  const timeline = finalTimeline(final, WINNER, LOSER);
  const whatIf = lastShotWhatIf(final, WINNER, LOSER);
  const winPct = fgPct(winner.fgm, winner.fga);
  const losePct = fgPct(loser.fgm, loser.fga);
  const sundayGames = final.sunday;
  const lastTip = sundayGames.at(-1)!;
  const grizzlies = final.activeDays.filter((a) => a.games.some((g) => g.date === final.week.to && g.game.includes("LAC")));
  const before = timeline.start;
  const penultimate = timeline.points.at(-2)!;
  const lastShot = timeline.points.at(-1)!;

  return (
    <>
      <PageTitle
        eyebrow="The name"
        title="Why it's the Caboclo Cup"
        subtitle={`The first championship, in ${league.seasons[0].label}, came down to field-goal percentage, a tie to three decimals, and one shot by Bruno Caboclo in the last NBA game of the fantasy season.`}
      />

      <div className="cf-hero">
        <div>
          <div className="cf-eyebrow">2018-19 final · week {final.week.number}</div>
          <div className="cf-big">
            {pct4(winPct)} <span>vs</span> {pct4(losePct)}
          </div>
          <p>
            <b>{winner.teamName}</b> ({nameOf(WINNER)}) beat <b>{loser.teamName}</b> ({nameOf(LOSER)}) <b>{winner.categoriesWon}–{loser.categoriesWon}</b>. Both
            teams shot <b>.469</b> for the week; field-goal percentage, and the title, went to {nameOf(WINNER)} at the fourth decimal, by{" "}
            <b>{whatIf.margin.toFixed(8).replace(/^0/, "")}</b>.
          </p>
        </div>
        <div className="cf-ball" aria-hidden>
          <div className="cf-ball-n">{pct8(winPct).slice(0, 5)}<b>{pct8(winPct).slice(5, 6)}</b>{pct8(winPct).slice(6)}</div>
          <div className="cf-ball-n">{pct8(losePct).slice(0, 5)}<b>{pct8(losePct).slice(5, 6)}</b>{pct8(losePct).slice(6)}</div>
          <div className="cf-ball-l">same to three decimals, split at the fourth</div>
        </div>
      </div>

      <Section title="The story">
        <Card className="cf-story space-y-3 p-5 text-[15.5px] leading-7">
          <p>
            It was the league&apos;s first season. {nameOf(WINNER)}&apos;s <b>{winner.teamName}</b> met {nameOf(LOSER)}&apos;s <b>{loser.teamName}</b> in the final, week{" "}
            {final.week.number}: {longDate(final.week.from)} to {longDate(final.week.to)}, 2019. Categories, nine of them, most wins takes the title.
          </p>
          <p>
            For the final weekend {nameOf(LOSER)} slotted two Memphis Grizzlies into his lineup: <b>Justin Holiday</b> and <b>Bruno Caboclo</b>. On Sunday night,
            Memphis played the Clippers in Los Angeles, tipping at {et(lastTip.tip)} Eastern: the last of {sundayGames.length} NBA games that day, and the last game of the
            fantasy season. By the fourth quarter every other game was over. Only those two could still move the scoreboard.
          </p>
          <p>
            Going into that game, {loser.teamName} was shooting {before.fgm}/{before.fga} (<b>{pct4(before.pct)}</b>) for the week, ahead of {winner.teamName}&apos;s
            finished {pct4(winPct)}. Then every Grizzlies shot moved it. Holiday&apos;s misses dropped {loser.teamName} behind in the second quarter and it see-sawed from
            there; Caboclo missed a three and had a layup blocked, then caught fire with three straight makes in the fourth. With {penultimate.clock} left, Holiday&apos;s
            layup put {loser.teamName} back in front: {penultimate.fgm}/{penultimate.fga}, <b>{pct8(penultimate.pct)}</b>. Then, with {lastShot.clock} left, down 14 in a
            game that no longer mattered to anyone in Memphis, Caboclo took one more shot, a six-footer, and missed.
          </p>
          <p>
            That miss was the last field-goal attempt of the week by anyone on either roster. It dropped {loser.teamName} to {loser.fgm}/{loser.fga}:{" "}
            <b>{pct8(losePct)}</b>, against {pct8(winPct)}. {nameOf(WINNER)} won FG%, five categories to four, and the first championship. The trophy has been the
            Caboclo Cup ever since.
          </p>
        </Card>
      </Section>

      <Section title="Every shot that decided it" aside={<InfoTip text="Counting every other game of the week as final, which they were by the fourth quarter: the line is Skip's week FG% after each of Holiday's and Caboclo's shots in the last game. Hover a dot for the play." />}>
        <Card className="space-y-3 p-5">
          <FinalShotChart timeline={timeline} winnerLabel={winner.teamName} loserLabel={loser.teamName} />
          <div className="viz-legend">
            <span><i className="dot" style={{ background: "var(--pos)" }} />Make</span>
            <span><i className="dot" style={{ background: "var(--neg)" }} />Miss</span>
            <span><i className="dot" style={{ boxShadow: "inset 0 0 0 2px var(--foreground)" }} />Caboclo (bigger dots)</span>
            <span><i className="line" style={{ background: "var(--gold)" }} />{winner.teamName}&apos;s finished FG%</span>
          </div>
          <div className="overflow-x-auto">
            <table className="cf-shots w-full text-sm">
              <caption className="sr-only">Every field-goal attempt by {loser.teamName}&apos;s players in the last game, with the team&apos;s week FG% after it</caption>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Player</th>
                  <th>Play</th>
                  <th>MEM–LAC</th>
                  <th className="text-right">{loser.teamName} FG</th>
                  <th className="text-right">FG%</th>
                  <th>vs {winner.teamName}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="cf-start">
                  <td>Tip-off</td>
                  <td colSpan={3} className="text-muted">Every other game of the week, counted as final</td>
                  <td className="text-right tabular-nums">{before.fgm}/{before.fga}</td>
                  <td className="text-right tabular-nums">{pct8(before.pct)}</td>
                  <td><span className="cf-chip ahead">ahead</span></td>
                </tr>
                {timeline.points.map((p, i) => {
                  const isLast = i === timeline.points.length - 1;
                  return (
                    <tr key={i} className={isLast ? "cf-last" : p.player === "Bruno Caboclo" ? "cf-cab" : ""}>
                      <td className="whitespace-nowrap tabular-nums">Q{p.period} {p.clock}</td>
                      <td className="whitespace-nowrap font-semibold">{p.player}</td>
                      <td>
                        <span className={p.made ? "text-positive" : "text-negative"}>{p.made ? "Makes" : "Misses"}</span> {p.description.replace(/^(makes|misses) /, "")}
                      </td>
                      <td className="tabular-nums">{p.score}</td>
                      <td className="text-right tabular-nums">{p.fgm}/{p.fga}</td>
                      <td className="text-right tabular-nums">{pct8(p.pct)}</td>
                      <td>
                        <span className={`cf-chip ${p.leading ? "ahead" : "behind"}`}>{p.leading ? "ahead" : "behind"}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>

      <Section title="What if">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="tile cf-whatif">
            <div className="cf-k">If the last shot drops</div>
            <div className="cf-v">{whatIf.made.score[1]}–{whatIf.made.score[0]} {loser.teamName}</div>
            <p>
              {whatIf.made.fgm}/{whatIf.made.fga} = <b>{pct8(whatIf.made.pct)}</b> takes FG%, and the two points make it {whatIf.made.pts}–{winner.pts} in points too.{" "}
              {nameOf(LOSER)} wins the first title.
            </p>
          </div>
          <div className="tile cf-whatif">
            <div className="cf-k">If he passes instead</div>
            <div className="cf-v">{whatIf.skipped.score[1]}–{whatIf.skipped.score[0]} {loser.teamName}</div>
            <p>
              {whatIf.skipped.fgm}/{whatIf.skipped.fga} = <b>{pct8(whatIf.skipped.pct)}</b>, still ahead of {pct8(winPct)}. Not shooting at all would have won it.
            </p>
          </div>
          <div className="tile cf-whatif">
            <div className="cf-k">Points, too</div>
            <div className="cf-v">
              {winner.pts}–{loser.pts}
            </div>
            <p>{winner.teamName} also won points by a single point. Two categories decided by the width of a rim.</p>
          </div>
        </div>
      </Section>

      <Section title="The final, category by category">
        <Card className="overflow-x-auto p-0">
          <table className="cf-score w-full text-sm">
            <caption className="sr-only">Week {final.week.number} category totals</caption>
            <thead>
              <tr>
                <th>Team</th>
                {CATEGORIES.map((c) => (
                  <th key={c.key} className="text-center">{c.label}</th>
                ))}
                <th className="text-center">Won</th>
              </tr>
            </thead>
            <tbody>
              {[winner, loser].map((t) => (
                <tr key={t.managerId}>
                  <td className="whitespace-nowrap">
                    <span className="flex items-center gap-2">
                      <Avatar size="sm" name={nameOf(t.managerId)} initials={mono.get(t.managerId)} />
                      <span>
                        <b>{t.teamName}</b> <span className="text-muted">· {nameOf(t.managerId)}</span>
                      </span>
                    </span>
                  </td>
                  {CATEGORIES.map((c) => (
                    <td key={c.key} className={`text-center tabular-nums ${final.winners[c.key] === t.managerId ? "cf-won" : ""} ${c.key === "FG%" || c.key === "PTS" ? "cf-close" : ""}`}>
                      {c.value(t)}
                    </td>
                  ))}
                  <td className="text-center font-bold tabular-nums">{t.categoriesWon}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <p className="text-xs text-muted">
          Shaded = won the category. FT% went to {loser.teamName}; its value isn&apos;t in our capture. FG% and points, outlined, were decided by .00015 and by one point.
        </p>
      </Section>

      <Section title="Sunday, March 31: the last night of the season">
        <Card className="p-5">
          <ol className="cf-night">
            {sundayGames.map((g) => {
              const last = g === lastTip;
              const players =
                g.game === "MEM @ LAC"
                  ? `${nameOf(LOSER)}'s Holiday and Caboclo`
                  : g.game === "CHA @ GS"
                    ? `${nameOf(LOSER)}'s Miles Bridges (4/10)`
                    : g.game === "WSH @ DEN"
                      ? `${nameOf(WINNER)}'s Will Barton (4/15)`
                      : "";
              return (
                <li key={g.espnId} className={last ? "last" : ""}>
                  <span className="t tabular-nums">{et(g.tip)} ET</span>
                  <span className="g">{g.game}</span>
                  <span className="p">
                    {players}
                    {g.lengthMin && !last ? ` · over by about ${et(new Date(new Date(g.tip).getTime() + g.lengthMin * 60000).toISOString())}` : ""}
                    {last ? " · the last game of the fantasy season" : ""}
                  </span>
                </li>
              );
            })}
          </ol>
        </Card>
      </Section>

      <Section title="How we know">
        <Card className="space-y-2 p-5 text-sm leading-6">
          <p>
            <b>The score:</b> Yahoo&apos;s matchup page for week {final.week.number} shows both teams&apos; FGM/FGA ({winner.fgm}/{winner.fga} and {loser.fgm}/{loser.fga})
            and its own tiebreaker values, {pct8(winner.yahooFgPct)} and {pct8(loser.yahooFgPct)}; the arithmetic here matches them to eight decimals.
          </p>
          <p>
            <b>Who was playing:</b> Yahoo only shows weekly lines, so each player&apos;s active days are the one set of that week&apos;s games that adds up to his line.{" "}
            {grizzlies.map((a) => `${a.name} (${a.yahoo.pts} pts, ${a.yahoo.fgPct}) = ${a.games.map((g) => longDate(g.date)).join(" + ")}`).join("; ")}. Nothing else adds up.
          </p>
          <p>
            <b>The shots:</b> every attempt comes from the play-by-play, and the counts match the box score. The other late games were over before the fourth quarter in
            Los Angeles began.
          </p>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            {final.sources.map((s) => (
              <li key={s.label}>{s.url ? <a className="text-accent hover:underline" href={s.url} target="_blank" rel="noreferrer">{s.label}</a> : s.label}</li>
            ))}
          </ul>
        </Card>
        <p className="text-sm">
          <Link href={`/${slug}/seasons/2019`} className="font-semibold text-accent hover:underline">
            The 2018-19 season →
          </Link>
        </p>
      </Section>
    </>
  );
}
