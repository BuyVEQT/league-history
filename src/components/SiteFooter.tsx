import Link from "next/link";
import { SITE_NAME, YAHOO_ATTRIBUTION } from "@/lib/config";
import type { League } from "@/lib/types";

/**
 * Site-wide footer. Shows Yahoo's required attribution only when the page is
 * displaying Yahoo-sourced data; the demo league is fictional and says so.
 */
export function SiteFooter({ source }: { source?: League["source"] }) {
  return (
    <footer className="border-t border-border px-4 py-6 text-xs text-muted md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          {source === "yahoo" && (
            <p>
              <a href={YAHOO_ATTRIBUTION.href} className="underline hover:text-foreground" target="_blank" rel="noreferrer">
                {YAHOO_ATTRIBUTION.text}
              </a>
            </p>
          )}
          {source === "yahoo" && (
            <p>
              Additional NBA player stats from{" "}
              <a href="https://sleeper.com" className="underline hover:text-foreground" target="_blank" rel="noreferrer">
                Sleeper
              </a>
              .
            </p>
          )}
          {source === "demo" && <p>Demo league is fictional and was not retrieved from Yahoo.</p>}
          <p>
            {SITE_NAME} is an independent project and is not affiliated with or endorsed by Yahoo.
          </p>
        </div>
        <nav aria-label="Legal" className="flex gap-4">
          <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link href="/terms" className="hover:text-foreground">Terms</Link>
        </nav>
      </div>
    </footer>
  );
}
