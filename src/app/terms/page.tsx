import { ContactLine, LegalPage } from "@/components/LegalPage";
import { SITE_NAME } from "@/lib/config";

export const metadata = { title: "Terms of use" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use">
      <p>By using {SITE_NAME}, you agree to these terms.</p>

      <section>
        <h2>What this is</h2>
        <p>
          {SITE_NAME} is a free, personal, non-commercial project for viewing fantasy basketball league history. It is
          not affiliated with, endorsed by, or sponsored by Yahoo. Yahoo and Yahoo Fantasy are trademarks of Yahoo.
        </p>
      </section>

      <section>
        <h2>Yahoo data</h2>
        <p>
          Fantasy data shown from a connected Yahoo league is provided by Yahoo Fantasy and remains subject to
          Yahoo&apos;s own terms. {SITE_NAME} accesses it read-only, and only for leagues you belong to.
        </p>
      </section>

      <section>
        <h2>Acceptable use</h2>
        <ul>
          <li>Use the site only for your own leagues and personal, non-commercial purposes.</li>
          <li>Do not try to access other people&apos;s leagues or data, or disrupt or overload the service.</li>
          <li>Do not scrape, resell, or redistribute data from the site.</li>
        </ul>
      </section>

      <section>
        <h2>No warranty</h2>
        <p>
          The site is provided &quot;as is&quot;. Statistics are calculated automatically and may contain errors. We may
          change or discontinue the site, or any feature, at any time.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about these terms: <ContactLine />.
        </p>
      </section>
    </LegalPage>
  );
}
