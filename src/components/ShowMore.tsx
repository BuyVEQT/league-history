"use client";

import { Children, useState, type ReactNode } from "react";

/**
 * Shows the first `initial` children, then a "Show all N" button. Pass list items (or cards) as children;
 * `as` is the wrapping element so lists stay valid HTML.
 */
export function ShowMore({
  children,
  initial = 10,
  as: Tag = "div",
  className = "",
  noun = "",
}: {
  children: ReactNode;
  initial?: number;
  as?: "div" | "ul" | "ol";
  className?: string;
  noun?: string;
}) {
  const [open, setOpen] = useState(false);
  const items = Children.toArray(children);
  const hidden = items.length - initial;
  return (
    <>
      <Tag className={className}>{open || hidden <= 0 ? items : items.slice(0, initial)}</Tag>
      {hidden > 0 && (
        <button type="button" className="show-more" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? "Show fewer" : `Show all ${items.length}${noun ? ` ${noun}` : ""}`}
        </button>
      )}
    </>
  );
}
