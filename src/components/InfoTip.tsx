/**
 * An "i" bubble whose note shows on hover and keyboard focus (and is read by screen readers).
 * `down` opens below, from the bubble rightwards; `end` opens leftwards instead (for tips near the right
 * edge); `box` spans the nearest positioned card, so it can't run off a narrow tile.
 */
export function InfoTip({ text, down = false, end = false, box = false }: { text: string; down?: boolean; end?: boolean; box?: boolean }) {
  const variant = [down && "down", end && "end", box && "box"].filter(Boolean).join(" ");
  return (
    <span tabIndex={0} role="note" aria-label={text} data-tip={text} className={`tip ${variant}`}>
      i
    </span>
  );
}
