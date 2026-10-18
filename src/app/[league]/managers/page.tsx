import { monograms } from "@/components/viz/monograms";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Sparkline } from "@/components/Sparkline";
import { Avatar, PageTitle } from "@/components/ui";
import { careerStats, managerSeasons } from "@/lib/analytics/career";
import { formatNumber, formatPct } from "@/lib/analytics/format";
import { getLeague } from "@/lib/data";
import { TIPS } from "@/lib/explain";
import { tt } from "@/components/viz/tt";
import { CountUp } from "@/components/CountUp";
import { managerBadges } from "./managerBadges";

export const metadata = { title: "Managers" };

const NUMBERS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen"];

export default async function ManagersPage(props: PageProps<"/[league]/managers">) {
  const { league: slug } = await props.params;
  const league = await getLeague(slug);
  if (!league) notFound();
  const careers = careerStats(league).sort((a, b) => b.titles - a.titles || (b.catWins / (b.catWins + b.catLosses || 1)) - (a.catWins / (a.catWins + a.catLosses || 1)));
  const label = (year: number) => `${year - 1}-${String(year).slice(2)}`;

  const badges = managerBadges(league);

  return (
    <>
      <PageTitle
        eyebrow="The managers"
        title={`${NUMBERS[careers.length] ?? careers.length} managers, one ${league.source === "yahoo" ? "cup" : "league"}`}
        subtitle="Every manager who has played in the league. Badges are earned from the numbers; hover one to see the rule."
      />
      <div className="mcards">
        {careers.map((c) => {
          const seasons = managerSeasons(league, c.managerId);
          // One point per league season (gaps where they sat out), higher = better finish.
          const finishes = league.seasons.map((s) => seasons.find((x) => x.year === s.year)?.finalRank ?? null);
          const titles = league.seasons.map((s, i) => (seasons.find((x) => x.year === s.year)?.finalRank === 1 ? i : -1)).filter((i) => i >= 0);
          const catPct = (c.catWins + c.catTies / 2) / Math.max(1, c.catWins + c.catLosses + c.catTies);
          return (
            <Link key={c.managerId} href={`/${slug}/managers/${c.managerId}`} className="mcard" data-m={c.managerId} data-m-card>
              <div className="flex items-center gap-2.5">
                <Avatar name={c.name} initials={monograms(league.managers).get(c.managerId)} />
                <div className="min-w-0">
                  <div className="mcard-nm truncate">{c.name}</div>
                  <div className="text-[12.5px] text-muted">
                    {c.seasons} season{c.seasons === 1 ? "" : "s"} · {label(c.firstYear!)}
                    {c.lastYear !== c.firstYear && ` – ${label(c.lastYear!)}`}
                  </div>
                </div>
              </div>
              <Sparkline values={finishes} width={200} height={30} invert color="var(--ink-2)" marks={titles} />
              <div className="grid grid-cols-3 gap-1.5 text-xs text-muted">
                <div>
                  <b className="block text-base text-foreground tabular-nums"><CountUp value={c.titles} /></b>titles
                </div>
                <div>
                  <b className="block text-base text-foreground tabular-nums">{formatPct(catPct)}</b>cat. win
                </div>
                <div>
                  <b className="block text-base text-foreground tabular-nums">{formatNumber(c.avgFinish)}</b>avg finish
                </div>
              </div>
              {badges.get(c.managerId) && (
                <div className="flex flex-wrap gap-1.5">
                  {badges.get(c.managerId)!.map((b) => (
                    <span key={b.name} data-tt={tt(b.name, [], b.rule)} className={`badge ${b.tone ? `badge-${b.tone}` : ""}`}>
                      {b.name}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          );
        })}
      </div>
      <p className="-mt-3 text-xs text-muted">The line on each card is final finish by season (higher = better); gold dots are titles. {TIPS.managerCards}</p>
    </>
  );
}
