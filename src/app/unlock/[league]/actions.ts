"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { configuredPassword, cookieName, leagueToken, PRIVATE_LEAGUES } from "@/lib/leagueAuth";

export async function unlockLeague(formData: FormData) {
  const slug = String(formData.get("league") ?? "");
  if (!(PRIVATE_LEAGUES as readonly string[]).includes(slug)) redirect("/");
  const nextRaw = String(formData.get("next") ?? "");
  // Only ever return to a page inside this league.
  const next = nextRaw === `/${slug}` || nextRaw.startsWith(`/${slug}/`) || nextRaw.startsWith(`/${slug}?`) ? nextRaw : `/${slug}`;

  const password = configuredPassword();
  const attempt = String(formData.get("password") ?? "").trim();
  if (!password || attempt !== password) {
    redirect(`/unlock/${slug}?error=1&next=${encodeURIComponent(next)}`);
  }

  (await cookies()).set(cookieName(slug), await leagueToken(slug, password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/${slug}`,
    maxAge: 60 * 60 * 24 * 180,
  });
  redirect(next);
}
