/**
 * Shared-password gate for private leagues. The cookie holds a SHA-256 of the
 * league slug and the configured password, so changing LEAGUE_PASSWORD signs
 * everyone out. Runs in both the proxy and server actions (Web Crypto only).
 */

/** Leagues that require the shared password. */
export const PRIVATE_LEAGUES = ["caboclo"] as const;

export const cookieName = (slug: string) => `league_${slug}`;

export async function leagueToken(slug: string, password: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${slug}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Null when no password is configured: private leagues then stay locked. */
export function configuredPassword(): string | null {
  return process.env.LEAGUE_PASSWORD?.trim() || null;
}
