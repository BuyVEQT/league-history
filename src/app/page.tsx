import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/config";

export default function Home() {
  return (
    <>
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">{SITE_NAME}</h1>
      <p className="text-lg text-muted">
        {SITE_TAGLINE} Championships, rivalries, all-time rankings and season-by-season history for Yahoo Fantasy
        Basketball leagues.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/demo"
          className="rounded-md bg-accent px-4 py-2 font-medium text-black hover:opacity-90"
        >
          Explore the demo league
        </Link>
        <button
          disabled
          className="cursor-not-allowed rounded-md border border-border px-4 py-2 text-muted"
          aria-describedby="yahoo-note"
        >
          Connect Yahoo — coming soon
        </button>
      </div>
      <p id="yahoo-note" className="text-sm text-muted">
        The demo uses a fictional league with generated data. Connecting a real Yahoo league is not available yet.
      </p>
    </main>
    <SiteFooter />
    </>
  );
}
