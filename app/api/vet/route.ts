// ── POST /api/vet ────────────────────────────────────────────────
// The full Vetted pipeline: input → classify → multi-search (You.com)
// → structured verdict (risk score + flags) → persist to InsForge.

import { NextRequest, NextResponse } from "next/server";
import { gatherEvidence } from "@/lib/agent";
import { buildVerdict } from "@/lib/verdict";
import { saveReport } from "@/lib/insforge";
import { isLive } from "@/lib/youcom";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json();
    if (!input || typeof input !== "string") {
      return NextResponse.json({ error: "Missing 'input'." }, { status: 400 });
    }

    const evidence = await gatherEvidence(input);
    const verdict = await buildVerdict(evidence);

    await saveReport({
      subject: evidence.subject.name,
      category: evidence.subject.category,
      trustScore: verdict.trustScore,
      label: verdict.label,
      summary: verdict.summary,
      flags: verdict.flags,
      sources: evidence.hits.map((h) => ({ title: h.title, url: h.url })),
    });

    return NextResponse.json({
      subject: evidence.subject,
      plan: evidence.plan, // shows the agent's search angles in the UI
      verdict,
      sources: evidence.hits,
      live: isLive(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
