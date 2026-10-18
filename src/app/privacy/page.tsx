import { ContactLine, LegalPage } from "@/components/LegalPage";
import { SITE_NAME } from "@/lib/config";

export const metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy">
      <p>
        {SITE_NAME} is a small, independent, non-commercial project that shows Yahoo Fantasy Basketball managers the
        history of their own leagues. This page explains what data it handles.
      </p>

      <section>
        <h2>Today: the demo</h2>
        <p>
          The site currently shows only a fictional demo league. It has no accounts, sets no tracking cookies, runs no
          analytics or ads, and collects no personal information. Our host (Vercel) keeps standard server logs, such as
          IP addresses, to operate and secure the site.
        </p>
      </section>

      <section>
        <h2>When you connect Yahoo (not yet available)</h2>
        <p>If you choose to sign in with Yahoo, {SITE_NAME} will:</p>
        <ul>
          <li>Use Yahoo&apos;s OAuth 2.0 sign-in, with read-only access. We never see your Yahoo password.</li>
          <li>
            Read only fantasy data for leagues you belong to: league settings, teams and managers, standings, weekly
            matchups, and draft results.
          </li>
          <li>Never post, trade, or change anything in your Yahoo account.</li>
          <li>Keep access tokens on the server only, never in your browser, and protect them with encryption.</li>
          <li>Show league data only to signed-in members of that league.</li>
          <li>
            Store what it reads from Yahoo (league results and the names your league uses) only to show that league&apos;s
            history, and refresh it from Yahoo rather than keep it longer than Yahoo&apos;s API terms allow. Personal
            data that Yahoo does not mark as storable is deleted within 24 hours.
          </li>
          <li>Never share your Yahoo account ID (GUID) or other Yahoo data with anyone else.</li>
        </ul>
        <p>
          In other words, {SITE_NAME} is a third party that collects, stores and uses data from your Yahoo account, with
          your permission, for this one purpose.
        </p>
      </section>

      <section>
        <h2>Who can use it</h2>
        <p>{SITE_NAME} is not for children under 13, and we do not knowingly collect data from them.</p>
      </section>

      <section>
        <h2>Other sources</h2>
        <p>
          Some NBA player statistics (games played, season totals) come from Sleeper&apos;s public NBA data. They are
          about NBA players, not about you.
        </p>
      </section>

      <section>
        <h2>What we never do</h2>
        <ul>
          <li>Sell, rent, or share your data with anyone.</li>
          <li>Use your data for advertising.</li>
          <li>Access leagues you are not a member of.</li>
        </ul>
      </section>

      <section>
        <h2>Deleting your data</h2>
        <p>
          You can disconnect at any time by removing {SITE_NAME}&apos;s access in your Yahoo account settings. To have
          any stored data about you or your leagues deleted, email <ContactLine />. We will delete it within 30 days.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>If this policy changes, we will update the date at the top of this page.</p>
      </section>
    </LegalPage>
  );
}
