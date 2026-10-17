import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BrandMark } from "@/components/BrandMark";
import { SiteFooter } from "@/components/SiteFooter";
import { configuredPassword, PRIVATE_LEAGUES } from "@/lib/leagueAuth";
import { unlockLeague } from "./actions";

export const metadata = { title: "League members only" };

export function generateStaticParams() {
  return PRIVATE_LEAGUES.map((league) => ({ league }));
}

export default function UnlockPage(props: PageProps<"/unlock/[league]">) {
  return (
    <>
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
        <BrandMark />
        <Suspense>
          <UnlockForm {...props} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

async function UnlockForm({ params, searchParams }: PageProps<"/unlock/[league]">) {
  const { league } = await params;
  if (!(PRIVATE_LEAGUES as readonly string[]).includes(league)) notFound();
  const query = await searchParams;
  const next = typeof query.next === "string" ? query.next : `/${league}`;
  const error = query.error === "1";

  if (!configuredPassword()) {
    return <p className="text-muted">This league isn&apos;t open yet. Ask the commissioner.</p>;
  }

  return (
    <form action={unlockLeague} className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">League members only</h1>
        <p className="mt-1 text-sm text-muted">Enter the league password your commissioner shared.</p>
      </div>
      <input type="hidden" name="league" value={league} />
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="sr-only">Password</span>
        <input
          type="password"
          name="password"
          required
          autoFocus
          autoComplete="current-password"
          placeholder="Password"
          aria-invalid={error || undefined}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-accent"
        />
      </label>
      {error && <p className="text-sm text-negative">That password didn&apos;t work.</p>}
      <button type="submit" className="w-full rounded-lg bg-accent px-4 py-2 font-medium text-white hover:opacity-90">
        Enter
      </button>
    </form>
  );
}
