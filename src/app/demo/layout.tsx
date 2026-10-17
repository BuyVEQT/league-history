import Link from "next/link";
import { Nav } from "@/components/Nav";
import { SITE_NAME } from "@/lib/config";
import { provider } from "@/lib/data";

export default async function DemoLayout({ children }: LayoutProps<"/demo">) {
  const league = await provider.getLeague();
  const first = league.seasons[0].year;
  const last = league.seasons.at(-1)!.year;
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-border p-3 md:w-56 md:shrink-0 md:border-r md:border-b-0 md:p-4">
        <Link href="/" className="mb-3 block px-3 text-lg font-semibold md:mb-6">
          {SITE_NAME}
        </Link>
        <Nav />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border px-4 py-3 md:px-8">
          <span className="font-medium">{league.name}</span>
          <span className="text-sm text-muted">
            {first - 1}-{String(first).slice(2)} to {last - 1}-{String(last).slice(2)}
          </span>
          <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-xs text-accent">
            Demonstration data — fictional, not from Yahoo
          </span>
        </header>
        <main className="flex-1 space-y-8 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
