// ── GET /api/history ─────────────────────────────────────────────
// Returns past trust reports (from InsForge in live mode).

import { NextResponse } from "next/server";
import { getHistory } from "@/lib/insforge";

export const runtime = "nodejs";

export async function GET() {
  const history = await getHistory();
  return NextResponse.json({ history });
}
