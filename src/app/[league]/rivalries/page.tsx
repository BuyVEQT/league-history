import { notFound } from "next/navigation";
import { Card, PageTitle, Section } from "@/components/ui";
import { rivalryPairs, type RivalryPair } from "@/lib/analytics/headToHead";
import { coreLeague, getLeague } from "@/lib/data";
import { RivalryExplorer } from "./RivalryExplorer";

export const metadata = { title: "Rivalries" };

/** Meetings a pair needs before it counts as lopsided or dead even. */
const MIN_MEETINGS = 10;

export default async function RivalriesPage(props: PageProps<"/[league]/rivalries">) {
  const { league: slug } = await props.params;
  const league = await getLeague(slug);
  if (!league) notFound();
  const nameOf = (id: string) => league.managers.find((m) => m.id === id)?.name ?? id;
  const pairs = rivalryPairs(league);
  const mostPlayed = [...pairs].sort((x, y) => y.games - x.games)[0];
  const enough = pairs.filter((p) => p.games >= MIN_MEETINGS);
  // Lopsided rows read from the leader's side.
  const lopsided = enough
    .map((p) => (p.pct >= 0.5 ? p : { ...p, a: p.b, b: p.a, wins: p.losses, losses: p.wins, pct: 1 - p.pct }))
    .sort((x, y) => y.pct - x.pct || y.games - x.games)
    .slice(0, 5);
  const even = [...enough].sort((x, y) => Math.abs(x.pct - 0.5) - Math.abs(y.pct - 0.5) || y.games - x.games).slice(0, 5);
  const playoff = pairs
    .filter((p) => p.playoffMeetings > 0)
    .sort((x, y) => y.playoffMeetings - x.playoffMeetings || y.finalMeetings - x.finalMeetings || y.games - x.games)
    .slice(0, 5);
  const rec = (p: RivalryPair) => `${p.wins}-${p.losses}-${p.ties}`;

  return (
    <>
      <PageTitle
        eyebrow="Head-to-head"
        title="Settle the debate"
        subtitle="Pick any two managers. Everything comes from the weeks they actually played each other, regular season and playoffs — never inferred from standings. Playoff ties are decided by seed."
      />
      <RivalryExplorer league={coreLeague(league)} defaultA={mostPlayed?.a ?? league.managers[0].id} defaultB={mostPlayed?.b ?? league.managers[1].id}>
        <div className="grid gap-3 lg:grid-cols-3">
        <PairList title="Most lopsided" note={`Minimum ${MIN_MEETINGS} meetings.`} nameOf={nameOf} rows={lopsided.map((p) => ({ p, value: rec(p), detail: `${Math.round(p.pct * 100)}% for ${nameOf(p.a)} · ${p.games} meetings` }))} />
        <PairList title="Dead even" note={`Closest to .500, minimum ${MIN_MEETINGS} meetings.`} nameOf={nameOf} rows={even.map((p) => ({ p, value: rec(p), detail: `${p.games} meetings` }))} />
        <PairList
          title="Playoff rivals"
          note="Most postseason meetings."
         
          nameOf={nameOf}
          rows={playoff.map((p) => ({ p, value: `${p.playoffMeetings}×`, detail: `${p.finalMeetings ? `${p.finalMeetings} in the final · ` : ""}${rec(p)} overall` }))}
        />
        </div>
      </RivalryExplorer>
    </>
  );
}

function PairList({
  title,
  note,
  rows,
  nameOf,
}: {
  title: string;
  note: string;
  rows: { p: RivalryPair; value: string; detail: string }[];
  nameOf: (id: string) => string;
}) {
  return (
    <Section title={title}>
      <Card className="py-1">
        {rows.length === 0 ? (
          <p className="py-3 text-sm text-muted">Not enough meetings yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map(({ p, value, detail }) => (
              <li key={`${p.a}|${p.b}`}>
                <a href={`#a=${p.a}&b=${p.b}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-accent">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {nameOf(p.a)} <span className="font-normal text-muted">vs</span> {nameOf(p.b)}
                    </span>
                    <span className="block text-xs text-muted">{detail}</span>
                  </span>
                  <span className="shrink-0 font-bold tabular-nums">{value}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="text-xs text-muted">{note}</p>
    </Section>
  );
}
