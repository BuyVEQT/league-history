import Link from "next/link";
import { notFound } from "next/navigation";
import { PickLine, rankLabel, signed, valueTone } from "@/components/draft";
import { Card, PageTitle, Section } from "@/components/ui";
import { seasonPicks, topBusts, topSteals } from "@/lib/analytics/draft";
import { getLeague } from "@/lib/data";

export async function generateStaticParams({ params }: { params: { league: string } }) {
  const league = await getLeague(params.league);
  const years = (league?.seasons ?? []).filter((s) => s.draft?.length).map((s) => ({ year: String(s.year) }));
  // Cache Components requires at least one param per league; leagues without
  // drafts (the demo) get a placeholder that the page turns into a 404.
  return years.length ? years : [{ year: "none" }];
}

export default async function DraftBoardPage(props: PageProps<"/[league]/draft/[year]">) {
  const { league: slug, year } = await props.params;
  const league = await getLeague(slug);
  if (!league) notFound();
  const season = league.seasons.find((s) => String(s.year) === year);
  if (!season?.draft?.length) notFound();

  const nameOf = (id: string) => league.managers.find((m) => m.id === id)?.name ?? id;
  const picks = seasonPicks(season);
  const rounds = Math.max(...picks.map((p) => p.round));
  // Columns follow round-one order; snake drafts reverse each even round.
  const columns = picks.filter((p) => p.round === 1).sort((a, b) => a.pick - b.pick);
  const cell = (teamId: string, round: number) => picks.find((p) => p.teamId === teamId && p.round === round);
  const draftSeasons = league.seasons.filter((s) => s.draft?.length);

  return (
    <>
      <PageTitle
        eyebrow="Draft board"
        title={`${season.label} draft`}
        subtitle={`${season.teams.length} teams · ${rounds} rounds · each cell shows the player's end-of-season rank and value vs his draft slot (z-score points above replacement; see the draft overview).`}
      />

      <nav aria-label="Select draft" className="flex flex-wrap gap-2">
        <Link href={`/${slug}/draft`} className="rounded-full border border-border px-3 py-1 text-sm text-muted hover:text-foreground">
          ← All drafts
        </Link>
        {draftSeasons.map((s) => (
          <Link
            key={s.year}
            href={`/${slug}/draft/${s.year}`}
            aria-current={s.year === season.year ? "page" : undefined}
            className={`rounded-full border px-3 py-1 text-sm ${
              s.year === season.year ? "border-accent bg-accent/10 text-accent" : "border-border text-muted hover:text-foreground"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </nav>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface/80">
        <table className="w-full min-w-[960px] table-fixed border-collapse text-xs">
          <caption className="sr-only">{season.label} draft board by round and team</caption>
          <thead>
            <tr>
              <th className="w-10 border-b border-border px-2 py-2 text-left text-muted">Rd</th>
              {columns.map((c) => (
                <th key={c.teamId} className="border-b border-border px-1.5 py-2 text-left font-medium">
                  <div className="truncate">{c.teamName}</div>
                  <div className="truncate font-normal text-muted">{nameOf(c.managerId)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rounds }, (_, i) => i + 1).map((round) => (
              <tr key={round}>
                <td className="border-b border-border px-2 py-1.5 text-muted">{round}</td>
                {columns.map((c) => {
                  const p = cell(c.teamId, round);
                  return (
                    <td key={c.teamId} className={`border-b border-l border-border px-1.5 py-1.5 align-top ${p ? valueTone(p.value) : ""}`}>
                      {p && (
                        <div title={`${p.playerName}: pick #${p.overall}, finished ${rankLabel(p.actualRank)} (${signed(p.value, 1)})`}>
                          <div className="truncate font-medium">{p.playerName}</div>
                          <div className="flex justify-between gap-1 tabular-nums text-muted">
                            <span>{rankLabel(p.actualRank)}</span>
                            <span>{signed(p.value, 1)}</span>
                          </div>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="-mt-6 text-xs text-muted">Green = finished better than drafted, red = worse. Hover a cell for details.</p>

      <div className="grid gap-3 lg:grid-cols-2">
        <Section title="Steals of the draft">
          <Card className="py-1">
            <ul className="divide-y divide-border">
              {topSteals(picks, 5).map((p) => (
                <PickLine key={p.overall} p={p} manager={nameOf(p.managerId)} />
              ))}
            </ul>
          </Card>
        </Section>
        <Section title="Busts, rounds 1-3">
          <Card className="py-1">
            <ul className="divide-y divide-border">
              {topBusts(picks, 5).map((p) => (
                <PickLine key={p.overall} p={p} manager={nameOf(p.managerId)} />
              ))}
            </ul>
          </Card>
        </Section>
      </div>
    </>
  );
}
