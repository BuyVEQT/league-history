import Link from "next/link";
import { notFound } from "next/navigation";
import { Mono, PickLine } from "@/components/draft";
import { DraftReplay } from "@/components/DraftReplay";
import { Card, PageTitle, Section } from "@/components/ui";
import { monograms } from "@/components/viz/monograms";
import { tt } from "@/components/viz/tt";
import { seasonPicks, topBusts, topSteals } from "@/lib/analytics/draft";
import { ordinal } from "@/lib/analytics/format";
import { seasonOutcome } from "@/lib/analytics/season";
import { getLeague } from "@/lib/data";
import type { League } from "@/lib/types";
import { TIPS } from "@/lib/explain";
import { InfoTip } from "@/components/InfoTip";

/**
 * The next season's board (drafted, not yet played). Hidden for now; flip to true to bring it back.
 * Its round-one order still feeds the draft-position section on the draft page.
 */
const SHOW_UPCOMING_BOARD = false;
const boardSeasons = (league: League) => [...league.seasons, ...(SHOW_UPCOMING_BOARD && league.upcoming ? [league.upcoming] : [])];

export async function generateStaticParams({ params }: { params: { league: string } }) {
  const league = await getLeague(params.league);
  const drafted = league ? boardSeasons(league) : [];
  const years = drafted.filter((s) => s.draft?.length).map((s) => ({ year: String(s.year) }));
  // Cache Components requires at least one param per league; leagues without
  // drafts (the demo) get a placeholder that the page turns into a 404.
  return years.length ? years : [{ year: "none" }];
}

export default async function DraftBoardPage(props: PageProps<"/[league]/draft/[year]">) {
  const { league: slug, year } = await props.params;
  const league = await getLeague(slug);
  if (!league) notFound();
  const season = boardSeasons(league).find((s) => String(s.year) === year);
  if (!season?.draft?.length) notFound();
  // A drafted season with no games yet: show the picks, values come once it's played.
  const live = season === league.upcoming;

  const nameOf = (id: string) => league.managers.find((m) => m.id === id)?.name ?? id;
  const mono = monograms(league.managers);
  const picks = seasonPicks(season);
  const rounds = Math.max(...picks.map((p) => p.round));
  // Columns follow round-one order; snake drafts reverse each even round.
  const columns = picks.filter((p) => p.round === 1).sort((a, b) => a.pick - b.pick);
  // Final finish per team, for the column headers; a live draft has none yet.
  const finish = live ? null : seasonOutcome(season).finalRank;
  const draftSeasons = boardSeasons(league).filter((s) => s.draft?.length);

  return (
    <>
      {live ? (
        <section className="dr-coming" aria-labelledby="dr-coming-title">
          <div className="k">{season.label} draft · first look</div>
          <h1 id="dr-coming-title" className="big">
            Draft night is coming
          </h1>
          <p className="sub">
            The order is set: here&apos;s round one, {season.teams.length} teams. {rounds} round{rounds === 1 ? "" : "s"} captured so far; ranks and draft value appear once the season is played.
          </p>
          <ol className="dr-order" aria-label="Round-one draft order">
            {columns.map((c, i) => (
              <li
                key={c.teamId}
                className={c.pick === 1 ? "first" : ""}
                style={{ animationDelay: `${i * 50}ms` }}
                tabIndex={0}
                data-tt={tt(`Pick #${c.pick}: ${nameOf(c.managerId)}`, [
                  ["Team", c.teamName],
                  ["Took", c.playerName],
                ])}
              >
                <Mono text={mono.get(c.managerId) ?? nameOf(c.managerId).slice(0, 2).toUpperCase()} />
                <span className="no">#{c.pick}</span>
                <span>{nameOf(c.managerId)}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <PageTitle
          eyebrow="Draft board"
          title={`${season.label} draft`}
          subtitle={`${season.teams.length} teams · ${rounds} rounds · each cell shows the player's end-of-season rank and value vs his draft slot (z-score points above replacement; see the draft overview).`}
        />
      )}

      <nav aria-label="Select draft" className="flex flex-wrap gap-2">
        <Link href={`/${slug}/draft`} className="pill">
          ← All drafts
        </Link>
        {draftSeasons.map((s) => (
          <Link
            key={s.year}
            href={`/${slug}/draft/${s.year}`}
            aria-current={s.year === season.year ? "page" : undefined}
            className="pill"
          >
            {s.label}
          </Link>
        ))}
      </nav>

      <DraftReplay
        picks={picks}
        label={season.label}
        live={live}
        managerNames={Object.fromEntries(league.managers.map((m) => [m.id, m.name]))}
        colSub={Object.fromEntries(columns.map((c) => [c.teamId, finish?.get(c.teamId) ? `${ordinal(finish.get(c.teamId)!)} place` : c.teamName]))}
      >
        {!live && (
          <div className="viz-legend mt-3 px-1">
            <span>
              <i style={{ background: "var(--pos)" }} />
              Big steal
            </span>
            <span>
              <i style={{ background: "var(--pos-wash)" }} />
              Beat the slot
            </span>
            <span>
              <i style={{ background: "var(--neg-wash)" }} />
              Below the slot
            </span>
            <span>
              <i style={{ background: "var(--neg)" }} />
              Big bust
            </span>
            <span className="inline-flex items-center gap-1.5">Hover a pick for the details. <InfoTip text={TIPS.draftBoard} end /></span>
          </div>
        )}
      </DraftReplay>

      {!live && <div className="grid gap-3 lg:grid-cols-2">
        <Section title="Steals of the draft" tip={TIPS.draftValue}>
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
      </div>}
    </>
  );
}
