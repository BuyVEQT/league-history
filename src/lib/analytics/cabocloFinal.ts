/**
 * The 2018-19 final, the one the league is named after: decided by field-goal percentage at the 4th decimal,
 * on Bruno Caboclo's last shot of the fantasy season. Data comes from data/leagues/caboclo/caboclo-final.json
 * (scripts/capture-caboclo-final.mjs). Everything here is arithmetic on that capture: no estimates.
 */

export interface FinalTeam {
  managerId: string;
  teamName: string;
  fgm: number;
  fga: number;
  /** Yahoo's own tiebreaker value, to 8 decimals. */
  yahooFgPct: number;
  /** Yahoo's FT% for the week, as displayed (3 decimals). Optional: added by hand from the matchup page. */
  yahooFtPct?: number;
  tpm: number;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  to: number;
  categoriesWon: number;
}

export interface FinalShot {
  period: number;
  clock: string;
  player: string;
  made: boolean;
  points: number;
  description: string;
  score: string;
}

export interface CabocloFinal {
  week: { number: number; from: string; to: string };
  teams: FinalTeam[];
  winners: Record<string, string>;
  activeDays: { name: string; yahoo: { fgPct: string; pts: number; tpm: number }; games: { date: string; game: string; fgm: number; fga: number; pts: number }[] }[];
  sunday: { tip: string; game: string; espnId: string; lengthMin: number | null }[];
  lastGame: { id: string; game: string; pbpUrl: string; shots: FinalShot[] };
  sources: { label: string; url: string | null }[];
}

export const fgPct = (fgm: number, fga: number) => (fga ? fgm / fga : 0);

/** Minutes into the game when a play happened (12-minute quarters). */
export function elapsed(period: number, clock: string): number {
  const [m, s] = clock.split(":").map(Number);
  return (period - 1) * 12 + (12 - m - s / 60);
}

export interface TimelinePoint extends FinalShot {
  minute: number;
  /** Skip's season-ending FG% after this shot, counting every other game of the week as final. */
  fgm: number;
  fga: number;
  pct: number;
  leading: boolean;
}

/**
 * Skip's FG% shot by shot through the last game. Before the first shot it is the final total minus every
 * Skip attempt in that game; each shot then adds itself back, ending on Yahoo's final number.
 */
export function finalTimeline(f: CabocloFinal, winnerId: string, loserId: string) {
  const winner = f.teams.find((t) => t.managerId === winnerId)!;
  const loser = f.teams.find((t) => t.managerId === loserId)!;
  const target = fgPct(winner.fgm, winner.fga);
  let fgm = loser.fgm - f.lastGame.shots.filter((s) => s.made).length;
  let fga = loser.fga - f.lastGame.shots.length;
  const start = { fgm, fga, pct: fgPct(fgm, fga), leading: fgPct(fgm, fga) > target };
  const points: TimelinePoint[] = f.lastGame.shots.map((s) => {
    fga++;
    if (s.made) fgm++;
    const pct = fgPct(fgm, fga);
    return { ...s, minute: elapsed(s.period, s.clock), fgm, fga, pct, leading: pct > target };
  });
  return { target, start, points };
}

/** What the last shot was worth: Skip's line if it had dropped, or if it had never been taken. */
export function lastShotWhatIf(f: CabocloFinal, winnerId: string, loserId: string) {
  const winner = f.teams.find((t) => t.managerId === winnerId)!;
  const loser = f.teams.find((t) => t.managerId === loserId)!;
  const last = f.lastGame.shots.at(-1)!;
  const target = fgPct(winner.fgm, winner.fga);
  const made = { fgm: loser.fgm + 1, fga: loser.fga, pts: loser.pts + last.points };
  const skipped = { fgm: loser.fgm, fga: loser.fga - 1, pts: loser.pts };
  // Categories that flip: FG% always; PTS when the extra points pass the winner's total.
  const flips = (x: { fgm: number; fga: number; pts: number }) => (fgPct(x.fgm, x.fga) > target ? 1 : 0) + (x.pts > winner.pts ? 1 : 0);
  return {
    last,
    margin: target - fgPct(loser.fgm, loser.fga),
    made: { ...made, pct: fgPct(made.fgm, made.fga), score: [winner.categoriesWon - flips(made), loser.categoriesWon + flips(made)] as const },
    skipped: { ...skipped, pct: fgPct(skipped.fgm, skipped.fga), score: [winner.categoriesWon - flips(skipped), loser.categoriesWon + flips(skipped)] as const },
  };
}
