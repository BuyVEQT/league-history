/** An "i" bubble whose note shows on hover and keyboard focus (and is read by screen readers). */
export function InfoTip({ text, down = false }: { text: string; down?: boolean }) {
  return (
    <span tabIndex={0} role="note" aria-label={text} data-tip={text} className={`tip ${down ? "down" : ""}`}>
      i
    </span>
  );
}
