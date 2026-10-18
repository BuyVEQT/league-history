import type { ReactNode } from "react";
import { InfoTip } from "./InfoTip";

/** Section heading inside a panel, as on the prototype's Trades page: title + ⓘ, a one-line subtitle, optional aside. */
export function TradePanelHead({ title, sub, tip, aside }: { title: string; sub?: ReactNode; tip?: string; aside?: ReactNode }) {
  return (
    <div className="tx-tp-head">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="sec-title">{title}</h2>
          {tip && <InfoTip down text={tip} />}
        </div>
        {sub && <p>{sub}</p>}
      </div>
      {aside}
    </div>
  );
}
