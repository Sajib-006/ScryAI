// ── Verdict synthesis ────────────────────────────────────────────
// Turns gathered evidence into a STRUCTURED trust report:
//   trustScore (0-100), verdict label, color-coded flags, cited summary.
// Falls back to a heuristic verdict if the gateway is unavailable so the
// demo never breaks.

import type { Evidence } from "./agent";
import { gatewayChat, gatewayLive } from "./gateway";

export type Flag = {
  level: "red" | "yellow" | "green";
  text: string;
  citation?: number; // index into sources (1-based)
};

export type Verdict = {
  trustScore: number; // 0-100
  label: "Trustworthy" | "Mixed" | "Caution" | "High Risk";
  summary: string; // cited prose
  flags: Flag[];
};

export async function buildVerdict(ev: Evidence): Promise<Verdict> {
  if (gatewayLive() && ev.hits.length > 0) {
    try {
      return await llmVerdict(ev);
    } catch (e) {
      console.error("LLM verdict failed, using heuristic:", e);
    }
  }
  return heuristicVerdict(ev);
}

async function llmVerdict(ev: Evidence): Promise<Verdict> {
  const sources = ev.hits
    .map((h, i) => `[${i + 1}] ${h.title}\n${h.url}\n${h.snippet}`)
    .join("\n\n");

  const sys =
    "You are Vetted, a fair but careful due-diligence analyst. The user is about to TRUST " +
    `something (a ${ev.subject.category}): "${ev.subject.name}". Using ONLY the sources, produce a ` +
    "risk assessment for an ordinary person deciding whether to engage.\n\n" +
    "SCORING PRINCIPLES (critical — be calibrated, not alarmist):\n" +
    "- Score reflects RISK TO A NORMAL USER, weighing SEVERITY and PREVALENCE, not the mere " +
    "existence of negative news. Every large, legitimate organization has some lawsuits, " +
    "complaints, and critical press — that alone is NOT high risk.\n" +
    "- 80-100: Well-established, widely trusted, no disqualifying issues (most major real brands/companies).\n" +
    "- 60-79: Legitimate but with real, notable concerns a user should know.\n" +
    "- 40-59: Genuinely mixed or unproven; proceed carefully.\n" +
    "- 20-39: Strong warning signs (pattern of fraud reports, regulatory action, many scam reports).\n" +
    "- 0-19: Clear scam / dangerous / fake.\n" +
    "- If evidence is THIN or the subject is obscure, score near 50 (unknown), not low.\n" +
    "- A known reputable entity should NOT score below 60 just because critical articles exist.\n\n" +
    "Return STRICT JSON only, no prose:\n" +
    "{\n" +
    '  "trustScore": <0-100 integer, higher = safer>,\n' +
    '  "label": "Trustworthy" | "Mixed" | "Caution" | "High Risk",\n' +
    '  "summary": "<2-4 balanced sentences. Every claim ends with an inline citation like [1].>",\n' +
    '  "flags": [ {"level":"red|yellow|green","text":"<short specific finding>","citation":<source number>} ]\n' +
    "}\n" +
    "Include 3-6 flags and BALANCE them: surface genuine positives as green, not just negatives. " +
    "Red = serious/disqualifying only. Yellow = real but manageable concerns.";

  const raw = await gatewayChat(
    [
      { role: "system", content: sys },
      { role: "user", content: `Subject: ${ev.subject.name}\n\nSources:\n${sources}` },
    ],
    { maxTokens: 900 }
  );

  const parsed = JSON.parse(extractJson(raw)) as Verdict;
  // Clamp + sanity-default.
  parsed.trustScore = Math.max(0, Math.min(100, Math.round(parsed.trustScore ?? 50)));
  parsed.flags = (parsed.flags ?? []).slice(0, 8);
  if (!parsed.label) parsed.label = labelFor(parsed.trustScore);
  return parsed;
}

// No-LLM fallback: keyword scan of snippets for risk/positive signals.
function heuristicVerdict(ev: Evidence): Verdict {
  const text = ev.hits.map((h) => h.snippet.toLowerCase()).join(" ");
  const risky = ["scam", "fraud", "lawsuit", "complaint", "warning", "fake", "rug pull", "banned"];
  const good = ["trusted", "legitimate", "verified", "accredited", "award", "reputable", "safe"];

  const riskHits = risky.filter((w) => text.includes(w)).length;
  const goodHits = good.filter((w) => text.includes(w)).length;
  let score = 55 + goodHits * 8 - riskHits * 12;
  score = Math.max(5, Math.min(95, score));

  const flags: Flag[] = [];
  if (riskHits > 0) flags.push({ level: "red", text: `Risk keywords found across sources (${riskHits}).`, citation: 1 });
  if (goodHits > 0) flags.push({ level: "green", text: `Positive-trust signals found (${goodHits}).`, citation: 1 });
  if (ev.hits.length < 3) flags.push({ level: "yellow", text: "Limited public information available." });

  return {
    trustScore: score,
    label: labelFor(score),
    summary:
      ev.hits.length > 0
        ? `${ev.hits[0].snippet.replace(/\s+/g, " ").trim().slice(0, 200)}… [1]`
        : "Not enough public information was found to assess this confidently.",
    flags,
  };
}

function labelFor(score: number): Verdict["label"] {
  if (score >= 75) return "Trustworthy";
  if (score >= 55) return "Mixed";
  if (score >= 35) return "Caution";
  return "High Risk";
}

function extractJson(s: string): string {
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  return start >= 0 && end > start ? s.slice(start, end + 1) : s;
}
