// ── You.com Web Search integration ───────────────────────────────
// This is the heart of Oracle's prize pitch: every answer is grounded
// in real-time, citation-backed results from You.com's Search API.
//
// If YOU_API_KEY is unset, we fall back to STUB results so the app
// runs and demos instantly. Set the key to go live — no other change.

export type SearchHit = {
  title: string;
  url: string;
  snippet: string;
  // You.com returns multiple snippets per result; we keep them for richer grounding.
  description?: string;
};

const YOU_SEARCH_ENDPOINT = "https://ydc-index.io/v1/search";

export function isLive(): boolean {
  return Boolean(process.env.YOU_API_KEY);
}

export async function youSearch(query: string): Promise<SearchHit[]> {
  const apiKey = process.env.YOU_API_KEY;

  // ── STUB MODE ──────────────────────────────────────────────
  if (!apiKey) {
    return stubResults(query);
  }

  // ── LIVE MODE: You.com Web Search API ──────────────────────
  const url = `${YOU_SEARCH_ENDPOINT}?query=${encodeURIComponent(query)}&count=8`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "X-API-Key": apiKey },
    // Search must be fresh for citations to be trustworthy.
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`You.com API error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  // Response shape: { results: { web: [{ url, title, description, snippets[] }] } }
  const web = (data?.results?.web ?? []) as any[];
  return web.slice(0, 8).map((h) => ({
    title: h.title ?? h.url ?? "Untitled",
    url: h.url,
    snippet: Array.isArray(h.snippets) ? h.snippets.join(" ") : h.description ?? "",
    description: h.description,
  }));
}

// Deterministic, realistic-looking stub so demos work without a key.
function stubResults(query: string): SearchHit[] {
  return [
    {
      title: `Overview: ${query}`,
      url: "https://example.com/overview",
      snippet:
        "A neutral overview summarizing the current consensus. (Stub result — set YOU_API_KEY for live, citation-backed You.com search.)",
    },
    {
      title: `Latest reporting on ${query}`,
      url: "https://example.com/news",
      snippet:
        "Recent coverage with dates and figures. In live mode these are real-time results from You.com's web index.",
    },
    {
      title: `Primary source / official page for ${query}`,
      url: "https://example.com/official",
      snippet:
        "Authoritative primary source. Oracle prioritizes these for high-confidence claims.",
    },
  ];
}
