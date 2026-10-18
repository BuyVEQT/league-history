import { notFound } from "next/navigation";
import { InfoTip } from "@/components/InfoTip";
import { CupBroadcast } from "@/components/cup/CupBroadcast";
import { CupCategories, type CupCategory } from "@/components/cup/CupCategories";
import { CupHoop } from "@/components/cup/CupHoop";
import { CupNight } from "@/components/cup/CupNight";
import { CupOptions, type CupOption } from "@/components/cup/CupOptions";
import { day, et, pct4, pct8 } from "@/components/cup/shared";
import { monograms } from "@/components/viz/monograms";
import { finalTimeline, lastShotWhatIf, type FinalTeam } from "@/lib/analytics/cabocloFinal";
import { ordinal } from "@/lib/analytics/format";
import { getLeague } from "@/lib/data";
import { cabocloFinalFor } from "@/lib/data/cabocloFinal";

export const metadata = { title: "The Caboclo Cup" };

const WINNER = "matt";
const LOSER = "jacob-g";
const BRUNO = "Bruno Caboclo";
const HOLIDAY = "Justin Holiday";
const ORDINAL_WORD: Record<number, string> = { 8: "eighth", 9: "ninth", 10: "tenth", 11: "eleventh", 12: "twelfth", 13: "thirteenth", 14: "fourteenth", 15: "fifteenth" };

/** 4 decimals with the deciding digit highlighted; all 8 in the title. */
const Dec4 = ({ v }: { v: number }) => {
  const s = pct4(v);
  return (
    <b className="num" title={pct8(v)}>
      {s.slice(0, 4)}
      <b>{s.slice(4)}</b>
    </b>
  );
};

export default async function CabocloCupPage(props: PageProps<"/[league]/caboclo-cup">) {
  const { league: slug } = await props.params;
  const league = await getLeague(slug);
  const final = cabocloFinalFor(slug);
  if (!league || !final) notFound();
  const teamOf = (id: string) => final.teams.find((t) => t.managerId === id)!;
  const nameOf = (id: string) => league.managers.find((m) => m.id === id)?.name ?? id;
  const mono = monograms(league.managers);
  const win = teamOf(WINNER);
  const lose = teamOf(LOSER);
  const T = finalTimeline(final, WINNER, LOSER);
  const WI = lastShotWhatIf(final, WINNER, LOSER);
  const last = T.points.at(-1)!;
  const brunoRank = league.seasons[0].players?.find((p) => p.name === BRUNO)?.actualRank ?? null;
  // Display facts only: counts and ratios of values the analytics already computed.
  const oneBasket = WI.made.pct - lose.yahooFgPct; // what one more make was worth (1/FGA)
  const nth = Math.round(oneBasket / WI.margin);
  const fraction = ORDINAL_WORD[nth] ? `one-${ORDINAL_WORD[nth]}` : `1/${nth}`;
  const adds = final.adds ?? [];
  const brunoAdd = adds.find((a) => a.player === BRUNO);
  const holAdd = adds.find((a) => a.player === HOLIDAY);
  const addGap = brunoAdd && holAdd ? Math.round((new Date(holAdd.time).getTime() - new Date(brunoAdd.time).getTime()) / 60000) : null;
  const sat = final.activeDays.find((a) => a.name === BRUNO)?.games.find((g) => g.date === "2019-03-30");

  const cat = (key: string, label: string, v: (t: FinalTeam) => string | number, decidedBy?: string): CupCategory => {
    const w = final.winners[key];
    return {
      key,
      label,
      winnerValue: String(v(win)),
      loserValue: String(v(lose)),
      winner: w === WINNER ? "w" : "l",
      winnerName: teamOf(w).teamName,
      winnerInitials: mono.get(w) ?? w.slice(0, 2).toUpperCase(),
      decidedBy,
    };
  };
  const cats = [
    cat("FT%", "FT%", (t) => (t.yahooFtPct == null ? "—" : t.yahooFtPct.toFixed(3).replace(/^0/, ""))),
    cat("3PTM", "3PM", (t) => t.tpm),
    cat("REB", "REB", (t) => t.reb),
    cat("AST", "AST", (t) => t.ast),
    cat("BLK", "BLK", (t) => t.blk),
    cat("TO", "TO", (t) => t.to),
    cat("ST", "Steals", (t) => t.stl, "one steal"),
    cat("PTS", "Points", (t) => t.pts, "one point"),
    cat("FG%", "Field-goal %", (t) => pct8(t.yahooFgPct), "one shot"),
  ];
  const champ = (id: string, real: boolean) => ({ teamName: teamOf(id).teamName, manager: nameOf(id), real });
  const options: CupOption[] = [
    { key: "miss", label: "Miss it (what happened)", pct: lose.yahooFgPct, pts: lose.pts, score: [win.categoriesWon, lose.categoriesWon], champion: champ(WINNER, true), line: `Rims out. Jacob finishes ${pct8(lose.yahooFgPct)}, ${pct8(WI.margin)} short.`, cup: "" },
    { key: "make", label: "Make it", pct: WI.made.pct, pts: WI.made.pts, score: WI.made.score, champion: champ(LOSER, false), line: `It drops. ${WI.made.fgm}/${WI.made.fga} is ${pct4(WI.made.pct)}, and the two points flip Points too.`, cup: "A hero. Heroes don't get joke trophies." },
    { key: "pass", label: "Pass it", pct: WI.skipped.pct, pts: WI.skipped.pts, score: WI.skipped.score, champion: champ(LOSER, false), line: `He swings it. ${WI.skipped.fgm}/${WI.skipped.fga} is ${pct4(WI.skipped.pct)}, still above ${pct4(T.target)}. Doing nothing wins it.`, cup: "Nobody names a trophy after a guy who passed." },
  ];

  return (
    <div className="cup grid gap-7">
      <section className="cup-hero">
        <div>
          <div className="eyebrow-accent !text-accent">2018–19 · Week {final.week.number} · Our first final</div>
          <h1 className="cup-title">The Caboclo Cup</h1>
          <p className="cup-sub">
            Our first championship was decided by the <b>{brunoRank ? `${ordinal(brunoRank)}-ranked player` : "a waiver pickup"}</b> in fantasy basketball, on{" "}
            <b>the last shot anyone took all season</b>.
          </p>
          <div className="cup-ticker">
            <div className="fg">
              <span>Field-goal %</span>
              <Dec4 v={win.yahooFgPct} />
              <i>vs</i>
              <Dec4 v={lose.yahooFgPct} />
            </div>
            <div>
              <span>Final</span>
              <b className="num">
                {win.categoriesWon}–{lose.categoriesWon}
              </b>
            </div>
          </div>
        </div>
        <CupHoop />
      </section>

      <section className="space-y-3">
        <h2 className="sec-title">Meet Bruno</h2>
        <p className="-mt-1 text-sm text-[color:var(--ink-2)]">Every Raptors fan knows the name. Here&apos;s how it ended up on our trophy.</p>
        <ol className="bruno">
          <li>
            <span className="by">June 2014</span>
            <b>Two years away from being two years away</b>
            <p>The Raptors take him 20th overall, and Fran Fraschilla delivers the line on the broadcast. Toronto never lets it go.</p>
          </li>
          <li>
            <span className="by">Mon, Mar 25 2019</span>
            <b>Season-high 24. Wrong day.</b>
            <p>Now a Grizzly, he drops 24 on OKC on the first day of championship week. He isn&apos;t on Jacob&apos;s roster yet.</p>
          </li>
          <li className="hot">
            <span className="by">{brunoAdd ? `${day(brunoAdd.time)}, Mar 30 · ${et(brunoAdd.time)}` : "Sat, Mar 30"}</span>
            <b>Jacob clicks Add</b>
            <p>
              He had options. He took Bruno{addGap ? `, then Justin Holiday ${addGap} minutes later: the two Grizzlies who decide the final` : ""}.
              {sat ? ` Bruno gives him ${sat.pts} that night.` : ""}
            </p>
            {adds.length > 0 && (
              <div className="addlog">
                {adds.map((a, i) => (
                  <div key={a.time + a.player} className={a.managerId === LOSER ? "" : "other"} style={{ ["--d" as string]: `${0.5 + i * 0.25}s` }}>
                    <span className="plus">+</span>
                    <b>{a.player}</b>
                    <span className="t num">
                      {day(a.time)} {et(a.time)}
                    </span>
                    <span className="by2">{a.teamName}</span>
                  </div>
                ))}
              </div>
            )}
          </li>
        </ol>
      </section>

      <section className="panel space-y-3 p-5">
        <div>
          <h2 className="sec-title">
            The final: {win.categoriesWon}–{lose.categoriesWon}
          </h2>
          <p className="mt-1 text-sm text-[color:var(--ink-2)]">Nine categories. Three came down to one: one steal, one point, one shot.</p>
        </div>
        <CupCategories cats={cats} final={[win.categoriesWon, lose.categoriesWon]} names={[win.teamName, lose.teamName]} />
      </section>

      <section className="panel cast space-y-3 p-5">
        <div>
          <h2 className="sec-title flex items-center gap-2">
            Garbage time in LA{" "}
            <InfoTip down text={`${lose.teamName}'s week FG% after each Grizzlies shot, with every other game already final. The gold line is ${win.teamName}'s finished FG%.`} />
          </h2>
          <p className="mt-1 text-sm text-[color:var(--ink-2)]">
            Grizzlies at Clippers, the last game of the night. Memphis was playing out the string. In our league, it was the whole season.
          </p>
        </div>
        <CupNight games={final.sunday} />
        <CupBroadcast start={T.start} points={T.points} target={T.target} winner={win} loserName={lose.teamName} />
      </section>

      <section className="panel opts space-y-3 p-5">
        <div>
          <h2 className="sec-title">Bruno had three options at {last.clock}</h2>
          <p className="mt-1 text-sm text-[color:var(--ink-2)]">Two of them made Jacob a champion.</p>
        </div>
        <CupOptions options={options} target={T.target} winnerPts={win.pts} names={[win.teamName, lose.teamName]} clock={last.clock} />
        <p className="opts-foot">
          He never took another shot, and neither did anyone else on either roster. Jacob lost the first Caboclo Cup by about <b>{fraction} of a basket</b>.
        </p>
      </section>

      <details className="panel how p-5">
        <summary>
          <b>How we know</b> <span className="text-sm text-muted">Yahoo&apos;s tiebreaker to eight decimals, the play-by-play, the add log, and which days each player counted</span>
        </summary>
        <div className="list mt-2.5">
          <div>
            <div className="t1">The score</div>
            <div className="t2">
              Yahoo&apos;s week {final.week.number} page: {win.fgm}/{win.fga} and {lose.fgm}/{lose.fga}, tiebreaker values {pct8(win.yahooFgPct)} and {pct8(lose.yahooFgPct)}. The
              arithmetic matches to eight decimals.
            </div>
          </div>
          <div>
            <div className="t1">Who was playing</div>
            <div className="t2">
              {final.activeDays.map((a) => `${a.name} (${a.yahoo.pts} pts, ${a.yahoo.fgPct}) = ${a.games.map((g) => g.date.slice(5)).join(" + ")}`).join("; ")}. Yahoo only shows
              weekly lines; each is the one set of that week&apos;s games that adds up to it.
            </div>
          </div>
          <div>
            <div className="t1">The shots</div>
            <div className="t2">
              Every attempt from the play-by-play; counts match the box score. &quot;{fraction} of a basket&quot; = the losing margin ({pct8(WI.margin)}) divided by what one more make was
              worth ({pct8(oneBasket)}).
            </div>
          </div>
        </div>
        <ul className="mt-2.5 list-disc space-y-1 pl-5 text-sm text-muted">
          {final.sources.map((s) => (
            <li key={s.label}>
              {s.url ? (
                <a className="text-accent hover:underline" href={s.url} target="_blank" rel="noreferrer">
                  {s.label}
                </a>
              ) : (
                s.label
              )}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
