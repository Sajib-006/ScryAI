<div align="center">

# 🛡️ Vetted

### Before you trust it, *vet it.*

**A due-diligence agent that fact-checks anything you're about to trust — and shows its sources.**

Real-time **You.com** search · **InsForge** Database + Auth + Model Gateway · Claude reasoning

[Live Demo](https://31a702b6-5b55-458f-8c81-fef92aa5e3ef-00-2gup0090zek4g.worf.replit.dev/) · Built at Wizard Hackathon 🧙‍♂️ · Track: 🧪 Potion Lab

</div>

---

## The problem

Every day, people make high-stakes decisions based on things they read online — and they
have no reliable way to know what's true.

- *Is this crypto token a rug-pull?*
- *Is this rental listing a scam?*
- *Did this startup actually raise money, or is it just hype?*
- *Is this viral claim real, or fabricated?*

The only options today are to open a dozen tabs, wade through conflicting and outdated
results, and ultimately **guess.** The result is predictable: people get scammed, misled,
and burned — not because the truth isn't out there, but because **verifying it is slow,
fragmented, and hard.**

> **"Vet"** *(verb)* — to examine something carefully before trusting it. Vetted automates
> that examination, end to end.

## The solution

Paste anything — a company, product, person, listing, token, or claim. Vetted:

1. **Classifies** what you're checking (company / product / person / crypto / listing / service).
2. **Investigates** it with **4 targeted real-time You.com searches**, each hunting a different
   failure mode (reputation, risk/fraud, recent news, and a category-specific angle).
3. **Reasons** over all the evidence with Claude (via InsForge's Model Gateway) to produce a
   **0–100 trust score**, color-coded **red/yellow/green flags**, and a verdict.
4. **Cites everything** — every claim links to a live source. No ungrounded statements.
5. **Remembers** — each report is saved to your private history (InsForge Auth + DB).

**No hallucinations. Just sourced answers.**

---

## Results

A few real verdicts from the live app (scores reflect real-time evidence at run time):

| Input | Score | Verdict | Why it's right |
|---|---|---|---|
| `PEPE coin` | **15** | 🔴 High Risk | Surfaces rug-pull / volatility / scam-pattern coverage |
| `OpenAI` | **52** | 🟡 Mixed | Legitimate, but real lawsuits & complaints exist |
| `Stripe` | **72** | 🟢 Mixed–Trustworthy | Established, with normal business-level concerns |
| `Apple Inc` | **72** | 🟢 Mixed–Trustworthy | Reputable; not punished for routine critical press |

The scoring is **calibrated**: established entities aren't nuked just because critical articles
exist, while genuine scam signals push the score low. That calibration is what separates a
demo from a usable product.

---

## Why this is hard (and what we built)

A naïve version is "one search + summarize." That hallucinates and misses risk. Vetted is an
**agent**, not a lookup:

**1 — Adaptive search planning.** The search angles change based on *what* you're vetting. A
crypto token is investigated for rug-pulls; a rental for listing-scam patterns; a person for
background and credibility.

```ts
// lib/agent.ts — category-aware search planning
const byCat = {
  crypto:  [{ angle: "Rug-pull / scam signals", query: `${n} crypto rug pull scam audit token` }],
  product: [{ angle: "Safety & efficacy",       query: `${n} safety side effects does it work evidence` }],
  listing: [{ angle: "Listing scam patterns",   query: `${n} rental listing scam fake too good` }],
  // …reputation, risk, and recent-news angles run for every subject
};
```

**2 — Parallel, deduplicated evidence gathering.** All four searches run concurrently, then
results are merged and de-duplicated by URL so the model reasons over the richest possible
evidence set.

```ts
const results = await Promise.all(plan.map((p) => youSearch(p.query)));
// → dedupe by URL, keep best-ranked first → up to 12 unique sources
```

**3 — Structured, cited verdicts.** The model is forced to return strict JSON — a score, a
label, and an array of flags — with calibration rules that prevent alarmism, and inline
citations on every claim.

**4 — Graceful degradation.** Every external call has a fallback (stub search, heuristic
verdict, in-memory store), so the app never hard-fails during a demo.

---

## 🏆 How we use the sponsors

### You.com — the engine of truth (Best Use of You.com)

You.com isn't a feature in Vetted — it **is** the product. Every verdict is grounded in
real-time, citation-backed web results, with **4 searches per vet** for depth no single query
could reach.

```ts
// lib/youcom.ts — real-time, no-cache search; citations must be fresh
const url = `https://ydc-index.io/v1/search?query=${encodeURIComponent(query)}&count=8`;
const res = await fetch(url, { headers: { "X-API-Key": apiKey }, cache: "no-store" });
const web = (await res.json()).results.web; // → { url, title, description, snippets[] }
```

The UI surfaces this live: as a vet runs, the user watches all four You.com searches execute,
and every citation in the result is a clickable link to a real source.

### InsForge — the agent-native backbone (Best Use of InsForge)

We use InsForge **three ways**. Remove it and Vetted has no memory, no users, and no brain.

**🗄️ Database** — every report persisted to Postgres:
```ts
await insforge.database.from("reports").insert({
  subject, category, trust_score, label, summary,
  flags,    // jsonb
  sources,  // jsonb
  user_id,  // owner — scopes history per user
});
```

**🔐 Auth** — full email sign-up / sign-in; each user gets a private history:
```ts
await insforge.auth.signUp({ email, password, name });
await insforge.auth.signInWithPassword({ email, password });
const { data } = await insforge.auth.getCurrentUser(); // data.user.id
```

**🧠 Model Gateway** — Claude runs *through* InsForge for classification + verdict:
```ts
const key = await fetch(`${BASE}/api/ai/openrouter/api-key`, {
  headers: { Authorization: `Bearer ${INSFORGE_API_KEY}` },
}).then(r => r.json());
// → Claude Haiku 4.5 via the gateway, usage tracked by InsForge
```

**Data + Identity + AI, on one platform** — exactly what agent-native cloud is for.

---

## Architecture

```
User input
   │
   ▼
classify (Claude via InsForge Gateway)      ── what am I vetting?
   │
   ▼
plan 4 searches  ──►  You.com Web Search ×4 (parallel, real-time)
   │                        │
   │                  dedupe by URL → up to 12 cited sources
   ▼                        │
buildVerdict (Claude via InsForge Gateway)  ── score + flags + cited summary
   │
   ▼
saveReport → InsForge Postgres (scoped to InsForge Auth user)
   │
   ▼
Trust gauge · flags · evidence · per-user history
```

| Path | Responsibility |
|---|---|
| `app/page.tsx` | UI — input, search trace, trust gauge, flags, evidence, auth, history sidebar |
| `app/api/vet/route.ts` | Pipeline: classify → multi-search → verdict → persist |
| `app/api/history/route.ts` | Per-user report history |
| `lib/agent.ts` | Subject classification + adaptive multi-angle search planning |
| `lib/youcom.ts` | You.com Web Search client |
| `lib/gateway.ts` | InsForge Model Gateway → Claude |
| `lib/verdict.ts` | Structured, calibrated, cited risk report |
| `lib/insforge.ts` | InsForge Postgres persistence |
| `lib/authClient.ts` | InsForge Auth (browser) |

**Stack:** Next.js 14 · TypeScript · You.com Web Search API · InsForge (Postgres + Auth + Model Gateway → Claude Haiku 4.5)

---

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
```

Set these (`.env.local` or host secrets):

| Variable | Purpose |
|---|---|
| `YOU_API_KEY` | You.com Web Search |
| `INSFORGE_BASE_URL` / `INSFORGE_ANON_KEY` | InsForge DB + Auth client |
| `INSFORGE_API_KEY` | InsForge Model Gateway (provisions Claude) |
| `NEXT_PUBLIC_INSFORGE_BASE_URL` / `NEXT_PUBLIC_INSFORGE_ANON_KEY` | Browser auth client |

The app runs in a safe stub mode with no keys, so it always boots for a demo.

---

<div align="center">

**Don't get scammed. Don't get misled. Vet it first.** 🛡️

</div>
