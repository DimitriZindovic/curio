import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { refreshActiveSources } from "@/app/lib/rss";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const provided =
    authHeader?.replace(/^Bearer\s+/i, "") ??
    request.nextUrl.searchParams.get("secret") ??
    "";

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await refreshActiveSources();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "error" },
      { status: 500 },
    );
  }
}
