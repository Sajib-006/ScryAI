// ── GET /api/history?userId=... ──────────────────────────────────
// Returns past trust reports. Scoped to the signed-in user when a
// userId is provided (per-user history via InsForge Auth + DB).

import { NextRequest, NextResponse } from "next/server";
import { getHistory } from "@/lib/insforge";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const history = await getHistory(userId);
  return NextResponse.json({ history });
}
