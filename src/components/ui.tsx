import Link from "next/link";
import type { ReactNode } from "react";

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </div>
  );
}

export function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-medium">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function StatCard({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {detail && <div className="mt-1 text-sm text-muted">{detail}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-border bg-surface p-4 ${className}`}>{children}</div>;
}

export function ManagerLink({ id, name }: { id: string; name: string }) {
  return (
    <Link href={`/demo/managers/${id}`} className="font-medium text-foreground hover:text-accent hover:underline">
      {name}
    </Link>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">{children}</div>
  );
}

/** Horizontally scrolling wrapper so wide tables stay usable on phones. */
export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto rounded-lg border border-border bg-surface">{children}</div>;
}

export const th = "px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted whitespace-nowrap";
export const td = "px-3 py-2 whitespace-nowrap";
