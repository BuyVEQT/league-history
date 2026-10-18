import type { ReactNode } from "react";
import { InfoTip } from "./InfoTip";

/** A Records-page panel: display title with an optional info tip, a one-line description, then the content. */
export function RecordsPanel({
  title,
  sub,
  tip,
  children,
  className = "",
  aside,
  id,
}: {
  id?: string;
  title: string;
  sub?: ReactNode;
  tip?: string;
  children: ReactNode;
  className?: string;
  aside?: ReactNode;
}) {
  return (
    <section id={id} className={`panel rec-panel ${className}`}>
      <div className="rec-head">
        <div>
          <h3 className="sec-title flex items-center gap-2">
            {title}
            {tip && <InfoTip down text={tip} />}
          </h3>
          {sub && <p>{sub}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** A group heading on the Records page (the jump bar's targets): orange caps with a rule to the right. */
export function RecordsGroup({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="rec-group">
      {children}
    </h2>
  );
}
