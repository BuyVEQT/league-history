import type { ReactNode } from "react";

export function PageTitle({ title, subtitle, eyebrow }: { title: string; subtitle?: string; eyebrow?: string }) {
  return (
    <div>
      {eyebrow && <div className="eyebrow-accent">{eyebrow}</div>}
      <h1 className="title-display">{title}</h1>
      {subtitle && <p className="mt-2.5 max-w-[68ch] text-[color:var(--ink-2)]">{subtitle}</p>}
    </div>
  );
}

export function Section({ title, children, aside, id }: { title: string; children: ReactNode; aside?: ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-32 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-2">
        <h2 className="sec-title">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export const cardClass =
  "panel";

export function StatCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="tile">
      <div className="flex items-center justify-between gap-2 text-[12.5px] font-semibold text-[color:var(--ink-2)]">
        {label}
        {icon && <span className="text-accent [&_svg]:size-4">{icon}</span>}
      </div>
      <div className="tile-val tabular-nums">{value}</div>
      {detail && <div className="mt-0.5 text-[13px] leading-5 text-muted">{detail}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`${cardClass} p-4 ${className}`}>{children}</div>;
}

/**
 * Navy monogram with the manager's initials. Identity is the name beside it, not a color, so `color` is
 * accepted for compatibility and ignored.
 */
export function Avatar({ name, size = "md" }: { name: string; color?: string; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const dims = { sm: "size-7 text-[12px]", md: "size-10 text-[17px]", lg: "size-16 text-[28px] shadow-[inset_0_0_0_3px_var(--accent)]" }[size];
  return (
    <span aria-hidden className={`mono ${dims}`}>
      {initials.length === 1 ? name.slice(0, 2).toUpperCase() : initials}
    </span>
  );
}

export { ManagerLink } from "./ManagerLink";

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">{children}</div>
  );
}

/** Horizontally scrolling wrapper so wide tables stay usable on phones. */
export function TableWrap({ children }: { children: ReactNode }) {
  return <div className={`${cardClass} overflow-x-auto`}>{children}</div>;
}

export const th =
  "px-2.5 py-2.5 text-left text-[11.5px] font-bold uppercase tracking-[.06em] text-muted whitespace-nowrap border-b border-[color:var(--border-2)] bg-surface";
export const td = "px-2.5 py-[9px] whitespace-nowrap tabular-nums";
export const tr = "transition-colors hover:bg-surface-2";
