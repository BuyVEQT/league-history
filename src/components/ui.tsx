import Link from "next/link";
import type { ReactNode } from "react";

export function PageTitle({ title, subtitle, eyebrow }: { title: string; subtitle?: string; eyebrow?: string }) {
  return (
    <div>
      {eyebrow && <div className="mb-1 text-xs font-medium uppercase tracking-widest text-accent">{eyebrow}</div>}
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
      {subtitle && <p className="mt-1.5 max-w-3xl text-sm text-muted">{subtitle}</p>}
    </div>
  );
}

export function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export const cardClass =
  "rounded-xl border border-border bg-surface/80 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.03)] backdrop-blur-sm";

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
    <div className={`${cardClass} p-4`}>
      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted">
        {label}
        {icon && <span className="text-muted/70 [&_svg]:size-4">{icon}</span>}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
      {detail && <div className="mt-1 truncate text-sm text-muted">{detail}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`${cardClass} p-4 ${className}`}>{children}</div>;
}

/** Initials in a colored circle; color comes from the manager's chart color. */
export function Avatar({ name, color, size = "md" }: { name: string; color: string; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  const dims = { sm: "size-6 text-[10px]", md: "size-8 text-xs", lg: "size-12 text-base" }[size];
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-black/80 ${dims}`}
      style={{ background: color }}
    >
      {initials}
    </span>
  );
}

export function ManagerLink({ id, name }: { id: string; name: string }) {
  return (
    <Link href={`/demo/managers/${id}`} className="font-medium text-foreground hover:text-accent">
      {name}
    </Link>
  );
}

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
  "px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted whitespace-nowrap border-b border-border";
export const td = "px-3 py-2.5 whitespace-nowrap";
export const tr = "transition-colors hover:bg-surface-2/60";
