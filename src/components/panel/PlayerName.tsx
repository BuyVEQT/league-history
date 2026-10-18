import { panelAttr } from "./openPanel";

/** A player's name that opens his side panel (plain text when there is no player id). */
export function PlayerName({ id, name, className = "" }: { id: string | null | undefined; name: string; className?: string }) {
  if (!id) return <span className={className}>{name}</span>;
  return (
    <button type="button" className={`plink ${className}`} data-panel={panelAttr("player", id)}>
      {name}
    </button>
  );
}
