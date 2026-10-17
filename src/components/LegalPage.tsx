import Link from "next/link";
import type { ReactNode } from "react";
import { CONTACT_EMAIL, LEGAL_UPDATED, SITE_NAME } from "@/lib/config";
import { SiteFooter } from "./SiteFooter";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <Link href="/" className="text-sm text-muted hover:text-foreground">← {SITE_NAME}</Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted">Last updated {LEGAL_UPDATED}</p>
        <div className="mt-8 space-y-6 leading-relaxed [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-medium [&_li]:ml-5 [&_li]:list-disc [&_p]:text-foreground/90 [&_ul]:space-y-1">
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

export function ContactLine() {
  return CONTACT_EMAIL ? (
    <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent underline">{CONTACT_EMAIL}</a>
  ) : (
    <span>the contact email that will be listed here before Yahoo sign-in launches</span>
  );
}
