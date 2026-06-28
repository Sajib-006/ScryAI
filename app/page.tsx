"use client";

import { useState, useEffect, useCallback } from "react";

type Flag = { level: "red" | "yellow" | "green"; text: string; citation?: number };
type Verdict = {
  trustScore: number;
  label: "Trustworthy" | "Mixed" | "Caution" | "High Risk";
  summary: string;
  flags: Flag[];
};
type Source = { title: string; url: string; snippet: string };
type Plan = { angle: string; query: string };
type Report = {
  subject: { name: string; category: string };
  plan: Plan[];
  verdict: Verdict;
  sources: Source[];
  live: boolean;
};

const EXAMPLES = [
  "OpenAI",
  "Is this rental: $900 luxury 2BR downtown SF",
  "Creatine monohydrate supplement",
  "PEPE coin",
];

type HistoryItem = {
  id: string;
  subject: string;
  category: string;
  trustScore: number;
  label: string;
  summary: string;
  flags: Flag[];
  sources: { title: string; url: string }[];
  createdAt: string;
};

export default function Home() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      setHistory(data.history ?? []);
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function vet(input: string) {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch("/api/vet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setReport(data);
      loadHistory(); // refresh sidebar — shows InsForge persistence live
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Re-display a saved report from history (reconstruct the Report shape).
  function showHistory(h: HistoryItem) {
    setReport({
      subject: { name: h.subject, category: h.category },
      plan: [],
      verdict: { trustScore: h.trustScore, label: h.label as Verdict["label"], summary: h.summary, flags: h.flags ?? [] },
      sources: (h.sources ?? []).map((s) => ({ ...s, snippet: "" })),
      live: true,
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="layout">
      <main className="wrap">
        <div className="brand">
          <span className="logo">🛡️</span>
          <h1>Vetted</h1>
        </div>
        <p className="tagline">
          Before you trust it, <b>vet it.</b> Paste any company, product, person, listing, or token —
          get a real-time, citation-backed trust report.
        </p>

        <div className="askbar">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && vet(q)}
            placeholder="What are you about to trust?"
          />
          <button onClick={() => vet(q)} disabled={loading || !q.trim()}>
            {loading ? "Vetting…" : "Vet it"}
          </button>
        </div>

        <div className="examples">
          {EXAMPLES.map((ex) => (
            <button key={ex} onClick={() => { setQ(ex); vet(ex); }}>
              {ex}
            </button>
          ))}
        </div>

        {loading && (
          <div className="loading">
            🔍 Investigating across the web — reputation, risk, legal, news…
          </div>
        )}
        {error && <p className="error">⚠️ {error}</p>}

        {report && <ReportCard report={report} />}

        <p className="footer">
          Vetted · You.com Web Search + InsForge (DB + Model Gateway) · Wizard Hackathon 🧙‍♂️
        </p>
      </main>

      <aside className="sidebar">
        <div className="sidebar-title">
          Recent vettings
          <span className="sidebar-sub">saved in InsForge</span>
        </div>
        {history.length === 0 && <div className="sidebar-empty">No reports yet. Vet something →</div>}
        {history.map((h) => {
          const tone = h.trustScore >= 75 ? "green" : h.trustScore >= 55 ? "amber" : h.trustScore >= 35 ? "orange" : "red";
          return (
            <button key={h.id} className="history-item" onClick={() => showHistory(h)}>
              <span className={`mini-score ${tone}`}>{h.trustScore}</span>
              <span className="history-meta">
                <span className="history-subject">{h.subject}</span>
                <span className="history-cat">{h.category}</span>
              </span>
            </button>
          );
        })}
      </aside>
    </div>
  );
}

function ReportCard({ report }: { report: Report }) {
  const { verdict } = report;
  const tone =
    verdict.trustScore >= 75 ? "green" : verdict.trustScore >= 55 ? "amber" : verdict.trustScore >= 35 ? "orange" : "red";

  return (
    <>
      <div className={`verdict-card ${tone}`}>
        <div className="gauge">
          <Gauge score={verdict.trustScore} tone={tone} />
        </div>
        <div className="verdict-main">
          <div className="subject-name">{report.subject.name}</div>
          <div className="subject-cat">{report.subject.category}</div>
          <div className={`verdict-label ${tone}`}>{verdict.label}</div>
          <div className="verdict-summary">
            {renderWithCitations(verdict.summary, report.sources)}
          </div>
        </div>
      </div>

      {verdict.flags?.length > 0 && (
        <div className="flags">
          {verdict.flags.map((f, i) => (
            <div key={i} className={`flag ${f.level}`}>
              <span className="flag-dot" />
              <span className="flag-text">
                {f.text}{" "}
                {f.citation && report.sources[f.citation - 1] && (
                  <a className="cite" href={report.sources[f.citation - 1].url} target="_blank" rel="noreferrer">
                    [{f.citation}]
                  </a>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      <details className="agent-trace">
        <summary>🤖 How Vetted investigated ({report.plan.length} searches)</summary>
        <ul>
          {report.plan.map((p, i) => (
            <li key={i}>
              <b>{p.angle}:</b> <span className="q">{p.query}</span>
            </li>
          ))}
        </ul>
      </details>

      <div className="sources-title">Evidence ({report.sources.length} sources)</div>
      {report.sources.map((s, i) => (
        <a className="source" key={i} href={s.url} target="_blank" rel="noreferrer">
          <div>
            <span className="num">[{i + 1}]</span>
            <span className="stitle">{s.title}</span>
          </div>
          <div className="surl">{s.url}</div>
          <div className="ssnip">{s.snippet}</div>
        </a>
      ))}
    </>
  );
}

function Gauge({ score, tone }: { score: number; tone: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const filled = (score / 100) * c;
  const color =
    tone === "green" ? "#3ddc84" : tone === "amber" ? "#f0c36c" : tone === "orange" ? "#f0934a" : "#f0524a";
  return (
    <svg width="130" height="130" viewBox="0 0 130 130">
      <circle cx="65" cy="65" r={r} stroke="#262d3d" strokeWidth="12" fill="none" />
      <circle
        cx="65" cy="65" r={r} stroke={color} strokeWidth="12" fill="none"
        strokeDasharray={`${filled} ${c}`} strokeLinecap="round"
        transform="rotate(-90 65 65)"
      />
      <text x="65" y="60" textAnchor="middle" fontSize="34" fontWeight="700" fill="#e8ecf4">{score}</text>
      <text x="65" y="82" textAnchor="middle" fontSize="11" fill="#8a93a8">TRUST</text>
    </svg>
  );
}

function renderWithCitations(text: string, sources: Source[]) {
  const parts = text.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const m = part.match(/^\[(\d+)\]$/);
    if (m) {
      const n = parseInt(m[1], 10);
      const s = sources[n - 1];
      if (s) {
        return (
          <a key={i} className="cite" href={s.url} target="_blank" rel="noreferrer" title={s.title}>
            [{n}]
          </a>
        );
      }
    }
    return <span key={i}>{part}</span>;
  });
}
