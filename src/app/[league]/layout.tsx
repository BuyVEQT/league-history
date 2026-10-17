import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { Nav } from "@/components/Nav";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_NAME } from "@/lib/config";
import { hasDraftData } from "@/lib/analytics/draft";
import { hasTradeData } from "@/lib/analytics/trades";
import { getLeague, leagueSlugs } from "@/lib/data";

// Every league page is prerendered per slug; opt out of the dev-only instant-navigation check
// (https://nextjs.org/docs/messages/instant-shell-url-data) until pages stream their params behind Suspense.
export const instant = false;

export function generateStaticParams() {
  return leagueSlugs.map((league) => ({ league }));
}

export default async function LeagueLayout({ children, params }: LayoutProps<"/[league]">) {
  const league = await getLeague((await params).league);
  if (!league) notFound();
  const first = league.seasons[0];
  const last = league.seasons.at(-1)!;
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-border bg-background/60 p-3 backdrop-blur md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-r md:border-b-0 md:p-4">
        <Link href="/" className="mb-3 flex items-center gap-2.5 px-2 font-semibold tracking-tight md:mb-8">
          <BrandMark />
          {SITE_NAME}
        </Link>
        <div className="mb-2 hidden px-3 text-[11px] font-medium uppercase tracking-wider text-muted/70 md:block">
          League
        </div>
        <Nav features={{ draft: hasDraftData(league), trades: hasTradeData(league) }} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border px-4 py-3 md:px-8">
          <span className="font-medium">{league.name}</span>
          <span className="text-sm text-muted">
            {first.label} – {last.label}
          </span>
          {league.source === "demo" && (
            <span className="ml-auto rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-xs text-accent">
              Demo data · fictional, not from Yahoo
            </span>
          )}
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 space-y-10 px-4 py-8 md:px-8">{children}</main>
        <SiteFooter source={league.source} />
      </div>
    </div>
  );
}
