// ── Vetted agent ─────────────────────────────────────────────────
// The "due diligence" brain. Given anything the user is about to trust,
// it (1) classifies the subject, (2) plans several TARGETED You.com
// searches (reviews, legal/scam, news, official), (3) runs them, and
// (4) hands the combined evidence to the verdict synthesizer.
//
// This multi-search design is what makes Vetted agentic rather than a
// single lookup — and it drives heavy, meaningful You.com usage.

import { youSearch, type SearchHit } from "./youcom";
import { gatewayChat } from "./gateway";

export type Subject = {
  name: string;
  category:
    | "company"
    | "product"
    | "person"
    | "crypto"
    | "listing"
    | "service"
    | "other";
};

export type SearchPlan = { angle: string; query: string };

export type Evidence = {
  subject: Subject;
  plan: SearchPlan[];
  hits: SearchHit[]; // deduped, all angles combined
};

// Heuristic + LLM classification of what the user pasted.
export async function classify(input: string): Promise<Subject> {
  const sys =
    "Classify what the user is about to trust. Return STRICT JSON only: " +
    '{"name": "<clean canonical name>", "category": "company|product|person|crypto|listing|service|other"}. ' +
    "No prose.";
  try {
    const raw = await gatewayChat(
      [
        { role: "system", content: sys },
        { role: "user", content: input },
      ],
      { maxTokens: 120 }
    );
    const json = JSON.parse(extractJson(raw));
    if (json?.name && json?.category) return json as Subject;
  } catch {
    /* fall through to heuristic */
  }
  return { name: input.trim().slice(0, 80), category: "other" };
}

// Plan targeted searches based on category. Each angle hunts a different
// failure mode, so the combined evidence is far richer than one query.
export function planSearches(s: Subject): SearchPlan[] {
  const n = s.name;
  const base: SearchPlan[] = [
    { angle: "Reputation & reviews", query: `${n} reviews complaints reputation` },
    { angle: "Red flags & risk", query: `${n} scam fraud lawsuit warning problems` },
    { angle: "Recent news", query: `${n} news 2026` },
  ];
  const byCat: Record<Subject["category"], SearchPlan[]> = {
    company: [{ angle: "Legitimacy & funding", query: `${n} company funding legitimacy is it real` }],
    crypto: [{ angle: "Rug-pull / scam signals", query: `${n} crypto rug pull scam audit token` }],
    product: [{ angle: "Safety & efficacy", query: `${n} safety side effects does it work evidence` }],
    person: [{ angle: "Background & credibility", query: `${n} background controversy credibility` }],
    listing: [{ angle: "Listing scam patterns", query: `${n} rental listing scam fake too good` }],
    service: [{ angle: "Trustworthiness", query: `${n} trustworthy legit BBB rating` }],
    other: [{ angle: "Legitimacy", query: `${n} legit or scam` }],
  };
  return [...base, ...byCat[s.category]];
}

export async function gatherEvidence(input: string): Promise<Evidence> {
  const subject = await classify(input);
  const plan = planSearches(subject);

  // Run all angle searches in parallel.
  const results = await Promise.all(
    plan.map((p) => youSearch(p.query).catch(() => [] as SearchHit[]))
  );

  // Dedupe by URL, keep order (so earlier angles rank first).
  const seen = new Set<string>();
  const hits: SearchHit[] = [];
  for (const set of results) {
    for (const h of set) {
      if (!h.url || seen.has(h.url)) continue;
      seen.add(h.url);
      hits.push(h);
    }
  }

  return { subject, plan, hits: hits.slice(0, 12) };
}

function extractJson(s: string): string {
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  return start >= 0 && end > start ? s.slice(start, end + 1) : s;
}
