import Link from "next/link";
import { notFound } from "next/navigation";
import { Mono, PickLine, pickTone, rankLabel, signed } from "@/components/draft";
import { Card, PageTitle, Section } from "@/components/ui";
import { monograms } from "@/components/viz/monograms";
import { tt } from "@/components/viz/tt";
import { seasonPicks, topBusts, topSteals } from "@/lib/analytics/draft";
import { ordinal } from "@/lib/analytics/format";
import { seasonOutcome } from "@/lib/analytics/season";
import { getLeague } from "@/lib/data";
import { TIPS } from "@/lib/explain";
import { InfoTip } from "@/components/InfoTip";

export async function generateStaticParams({ params }: { params: { league: string } }) {
  const league = await getLeague(params.league);
  const drafted = [...(league?.seasons ?? []), ...(league?.upcoming ? [league.upcoming] : [])];
  const years = drafted.filter((s) => s.draft?.length).map((s) => ({ year: String(s.year) }));
  // Cache Components requires at least one param per league; leagues without
  // drafts (the demo) get a placeholder that the page turns into a 404.
  return years.length ? years : [{ year: "none" }];
}

export default async function DraftBoardPage(props: PageProps<"/[league]/draft/[year]">) {
  const { league: slug, year } = await props.params;
  const league = await getLeague(slug);
  if (!league) notFound();
  const season = [...league.seasons, ...(league.upcoming ? [league.upcoming] : [])].find((s) => String(s.year) === year);
  if (!season?.draft?.length) notFound();
  // A drafted season with no games yet: show the picks, values come once it's played.
  const live = season === league.upcoming;

  const nameOf = (id: string) => league.managers.find((m) => m.id === id)?.name ?? id;
  const mono = monograms(league.managers);
  const picks = seasonPicks(season);
  const rounds = Math.max(...picks.map((p) => p.round));
  // Columns follow round-one order; snake drafts reverse each even round.
  const columns = picks.filter((p) => p.round === 1).sort((a, b) => a.pick - b.pick);
  const cell = (teamId: string, round: number) => picks.find((p) => p.teamId === teamId && p.round === round);
  // Final finish per team, for the column headers; a live draft has none yet.
  const finish = live ? null : seasonOutcome(season).finalRank;
  const draftSeasons = [...league.seasons, ...(league.upcoming ? [league.upcoming] : [])].filter((s) => s.draft?.length);

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

      <div className="panel overflow-x-auto p-3">
        <table className="w-full table-fixed border-separate border-spacing-[3px] text-xs" style={{ minWidth: columns.length * 104 + 40 }}>
          <caption className="sr-only">{season.label} draft board by round and team</caption>
          <thead>
            <tr>
              <th className="w-9 px-1 pb-2 text-left align-bottom text-[11px] font-bold uppercase tracking-wider text-muted">Rd</th>
              {columns.map((c) => {
                const place = finish?.get(c.teamId);
                return (
                  <th key={c.teamId} className="px-1 pb-2 text-left align-bottom font-normal" title={c.teamName}>
                    <div className="truncate text-[12.5px] font-bold text-foreground">{nameOf(c.managerId)}</div>
                    <div className="truncate text-[11px] text-muted">{place ? `${ordinal(place)} place` : c.teamName}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rounds }, (_, i) => i + 1).map((round) => (
              <tr key={round}>
                <td className="px-1 text-muted tabular-nums">{round}</td>
                {columns.map((c) => {
                  const p = cell(c.teamId, round);
                  if (!p) return <td key={c.teamId} />;
                  return (
                    <td key={c.teamId} className="p-0 align-top">
                      {live ? (
                        <div className="pick plain" tabIndex={0} data-panel={`player:${p.playerId}`} data-tt={tt(p.playerName, [["Pick", `Rd ${p.round}, #${p.overall} overall`], ["Drafted by", nameOf(p.managerId)]])}>
                          <div className="pn">{p.playerName}</div>
                          <div className="pm">#{p.overall}</div>
                        </div>
                      ) : (
                        <div
                          className={`pick ${pickTone(p.value)}`}
                          tabIndex={0}
                          data-panel={`player:${p.playerId}`}
                          data-tt={tt(p.playerName, [
                            ["Pick", `Rd ${p.round}, #${p.overall} overall`],
                            ["Drafted by", nameOf(p.managerId)],
                            ["Finished", rankLabel(p.actualRank)],
                            ["Preseason rank", p.preseasonRank === null ? "—" : `#${p.preseasonRank}`],
                            ["Value", signed(p.value, 1)],
                          ])}
                        >
                          <div className="pn">{p.playerName}</div>
                          <div className="pm">
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
      </div>

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
