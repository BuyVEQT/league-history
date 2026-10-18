import { Trophy } from "lucide-react";
import { matchupWinner, seasonOutcome, teamIndex } from "@/lib/analytics/season";
import type { Matchup, Season, Stage } from "@/lib/types";

const ROUNDS: { stage: Stage; label: string }[] = [
  { stage: "quarterfinal", label: "Quarterfinals" },
  { stage: "semifinal", label: "Semifinals" },
  { stage: "final", label: "Final" },
];

/** The championship bracket as columns of games, with the third-place game under the final. */
export function Bracket({ season, managerName }: { season: Season; managerName: (id: string) => string }) {
  const outcome = seasonOutcome(season);
  const teams = teamIndex(season);
  const seed = new Map(outcome.standings.map((r) => [r.teamId, r.rank]));
  const games = season.matchups.filter((m) => m.stage !== "regular");
  if (!games.length) return <p className="text-sm text-muted">No playoff games recorded for this season.</p>;

  const game = (m: Matchup) => {
    const winner = matchupWinner(m);
    // Higher seed on top, like the source's bracket.
    const sides = [m.homeTeamId, m.awayTeamId].sort((a, b) => seed.get(a)! - seed.get(b)!);
    const cats = (id: string) => (id === m.homeTeamId ? m.homeCats : m.awayCats);
    return (
      <div key={`${m.stage}-${m.homeTeamId}`} className={`game ${m.stage === "final" ? "final" : ""}`}>
        {sides.map((id) => (
          <div key={id} className={`side ${id === winner ? "w" : "l"}`}>
            <span className="seed">{seed.get(id)}</span>
            <span className="tmn" title={`${teams.get(id)!.name} · ${managerName(teams.get(id)!.managerId)}`}>
              {teams.get(id)!.name}
            </span>
            <span className="tabular-nums">{cats(id)}</span>
          </div>
        ))}
        {m.tiebreakWinnerTeamId && <div className="px-2.5 pb-1.5 text-[11px] text-muted">Tied on categories; higher seed advances</div>}
      </div>
    );
  };
  const third = games.filter((m) => m.stage === "third_place");
  const champ = outcome.championTeamId ? teams.get(outcome.championTeamId)! : null;
  return (
    <div className="bracket">
      {ROUNDS.map(({ stage, label }) => {
        const list = games.filter((m) => m.stage === stage);
        if (!list.length) return null;
        return (
          <div key={stage} className="round">
            <h4>{label}</h4>
            {list.map(game)}
            {stage === "final" && third.length > 0 && (
              <>
                <h4 className="mt-3">Third place</h4>
                {third.map(game)}
              </>
            )}
          </div>
        );
      })}
      {champ && (
        <div className="round">
          <h4>Champion</h4>
          <div className="grid justify-items-center gap-1.5 rounded-[10px] bg-[color:var(--gold-wash)] p-5 text-center">
            <Trophy className="size-6 text-[color:var(--gold)]" aria-hidden />
            <div className="font-display text-2xl font-extrabold uppercase leading-none">{champ.name}</div>
            <div className="text-[13px] text-[color:var(--ink-2)]">
              {managerName(champ.managerId)} · {seed.get(champ.id)}
              {seed.get(champ.id) === 1 ? "st" : seed.get(champ.id) === 2 ? "nd" : seed.get(champ.id) === 3 ? "rd" : "th"} seed
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
