import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Tout sauf : /login, /signup, /api/auth (Better Auth), /api/cron, internes Next et assets.
  matcher: [
    "/((?!login|signup|api/auth|api/cron|_next/static|_next/image|favicon.ico|.*\\.svg$).*)",
  ],
};
