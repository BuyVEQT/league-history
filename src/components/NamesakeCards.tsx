import { rankLabel } from "@/components/draft";
import { ShowMore } from "@/components/ShowMore";
import { ordinal } from "@/lib/analytics/format";
import type { NamesakeRow } from "@/lib/analytics/players";
import { namesakeOwnership, type NamesakeOwnership } from "@/lib/analytics/recordsView";
import { tt } from "./viz/tt";

const CHIP: Record<NamesakeOwnership, string> = { kept: "badge-gold", later: "badge-gold", rival: "badge-orange", lost: "", never: "" };

/** Cards for teams named after a player: the player's finish, the team's finish, and whether they had him. 8, then "Show all". */
export function NamesakeCards({ rows, names, initial = 8 }: { rows: NamesakeRow[]; names: Record<string, string>; initial?: number }) {
  const who = (id: string) => names[id] ?? id;
  const chip = (r: NamesakeRow) => {
    const k = namesakeOwnership(r);
    const text = { kept: "Drafted & kept him", lost: "Drafted him, lost him", later: "Got him later", rival: `${who(r.draftedBy as string)} had him`, never: "Never had him" }[k];
    return { k, text };
  };
  return (
    <ShowMore initial={initial} className="rec-ncards" noun="teams">
      {rows.map((r) => {
        const c = chip(r);
        return (
          <div key={`${r.year}-${r.managerId}`} className="rec-ncard">
            <div className="nt">{r.teamName}</div>
            <div className="text-[13px] text-muted">
              {who(r.managerId)} · {r.label}
            </div>
            <div className="nrow">
              <div data-tt={tt(r.playerName, [["Finished the season", r.actualRank === null ? "outside the top 300" : rankLabel(r.actualRank)]])}>
                <span className="l2">{r.playerName}</span>
                <b className="tabular-nums">{rankLabel(r.actualRank)}</b>
              </div>
              <div data-tt={tt(r.teamName, [["Team finished", `${ordinal(r.finalRank)} of ${r.teamCount}`]])}>
                <span className="l2">Team</span>
                <b className="tabular-nums">{r.finalRank === 1 ? "🏆 1st" : `${ordinal(r.finalRank)}/${r.teamCount}`}</b>
              </div>
            </div>
            <span className={`badge ${CHIP[c.k]} justify-self-start`}>{c.text}</span>
          </div>
        );
      })}
    </ShowMore>
  );
}
