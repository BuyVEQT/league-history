import { NextResponse, type NextRequest } from "next/server";
import { configuredPassword, cookieName, leagueToken } from "@/lib/leagueAuth";

/** Sends visitors without the league cookie to the unlock page. */
export async function proxy(request: NextRequest) {
  const slug = request.nextUrl.pathname.split("/")[1];
  const password = configuredPassword();
  const cookie = request.cookies.get(cookieName(slug))?.value;
  if (password && cookie && cookie === (await leagueToken(slug, password))) {
    return NextResponse.next();
  }
  const unlock = new URL(`/unlock/${slug}`, request.url);
  // Keep the query (e.g. ?panel=player:…) so shared links survive unlocking.
  unlock.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(unlock);
}

export const config = {
  // Keep in sync with PRIVATE_LEAGUES in src/lib/leagueAuth.ts.
  matcher: ["/caboclo", "/caboclo/:path*"],
};
