# 🛡️ Vetted — before you trust it, vet it

**Paste any company, product, person, listing, or token. Vetted runs real-time,
citation-backed due diligence and returns a trust score with color-coded red flags.**

Built for **Wizard Hackathon** 🧙‍♂️ (🧪 Potion Lab track) — targeting the
**You.com ($1,000)** and **InsForge ($500)** prizes with one project.

---

## The problem

Everyone has been burned — a fake rental, a rug-pull token, a "startup" that doesn't
exist, a supplement that doesn't work. Checking is slow and scattered. **Vetted does the
due diligence for you in seconds, and shows its sources.**

## How it works (agentic, multi-search)

1. **Classify** — Claude figures out *what* you're vetting (company / product / person / crypto / listing / service).
2. **Plan & search** — fires **4 targeted You.com searches** per subject (reputation, red-flags/risk, recent news, category-specific) — not one lookup.
3. **Synthesize** — Claude (via InsForge Model Gateway) reads all the evidence and returns a **structured verdict**: `trustScore 0-100`, label, color-coded flags, cited summary.
4. **Persist** — every report is saved to **InsForge Postgres** for an auditable history.

The whole answer is grounded in **real-time, cited sources** — exactly what You.com rewards.

---

## 🏆 Best Use of InsForge — we use it THREE ways

Vetted isn't a static app that just *happens* to sit on InsForge — InsForge is the
backbone that makes the whole product work:

| InsForge feature | How Vetted depends on it |
|---|---|
| 🗄️ **Database** (Postgres) | Every trust report is persisted to the `reports` table — subject, score, flags, sources, and the owning user. |
| 🔐 **Auth** | Full email sign-up / sign-in. Each user gets a **private, scoped** due-diligence history (`user_id` on every report). |
| 🧠 **Model Gateway** | Claude Haiku 4.5 runs **through InsForge's gateway** for both subject classification and the final cited verdict. |

**Data + Identity + AI, all on one agent-native cloud.** Remove InsForge and Vetted
has no memory, no users, and no brain. That's *best use*, not bolt-on.

## You.com — the search engine of truth (🏆 $1,000)

| | |
|---|---|
| **You.com Web Search** | The core. Each vet fires **4 targeted real-time searches** (reputation, risk, news, category-specific). Every claim in the verdict links to a live You.com source. Search *is* the product. |

---

## ▶️ Run it

Runs in **stub mode** with no keys. Add keys to go fully live.

### On Replit (recommended)
1. New Repl → import this folder. It auto-runs `npm install && npm run dev`.
2. Add **Secrets** (below). No code changes.

### Locally
```bash
npm install
npm run dev    # http://localhost:3000
```

> ⚠️ **Behind a corporate TLS proxy?** (e.g. Roche network) Node won't trust the cert.
> Run with: `NODE_EXTRA_CA_CERTS=/path/to/system-ca.pem npm run dev`.
> Not needed on Replit.

---

## 🔑 Secrets

| Variable | Where to get it |
|---|---|
| `YOU_API_KEY` | https://api.you.com → API Keys |
| `INSFORGE_BASE_URL` | InsForge project → e.g. `https://xxxx.us-east.insforge.app` |
| `INSFORGE_ANON_KEY` | InsForge project → anon key (DB client) |
| `INSFORGE_API_KEY` | InsForge project → `ik_…` admin key (provisions Model Gateway) |

---

## 🗂️ Structure

```
app/
  page.tsx              UI — input, trust gauge, flags, agent trace, evidence
  api/vet/route.ts      pipeline: classify → multi-search → verdict → persist
  api/history/route.ts  past reports
lib/
  agent.ts              classify subject + plan/run multi-angle You.com searches
  youcom.ts             You.com Web Search (live + stub)   ← prize core
  gateway.ts            InsForge Model Gateway → Claude (classify + verdict)
  verdict.ts            structured risk report (score + flags + cited summary)
  insforge.ts           Postgres persistence (reports table + fallback)
```

DB tables (auto-create `id`/`created_at`): **`reports`** (subject, category,
trust_score, label, summary, flags jsonb, sources jsonb).

---

## 🎤 Demo script (60 sec)

1. Type a real startup or token — e.g. **"PEPE coin"**. Hit **Vet it**.
2. Watch the **trust gauge** fill to a score, with a **High Risk** label.
3. Read the **color-coded flags** — each links to a real source.
4. Expand **"How Vetted investigated"** — show the **4 live You.com searches** the agent ran.
5. Scroll the **Evidence** — 12 real, dated sources.
6. "Every report is saved to **InsForge** — your personal due-diligence trail."
7. Close: *"Don't get scammed. Vet it first."* 🛡️
