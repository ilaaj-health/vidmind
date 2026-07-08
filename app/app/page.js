"use client";
import { useEffect, useRef, useState } from "react";

// "" in dev (Next.js proxies /api -> backend). In prod set NEXT_PUBLIC_API_BASE
// to the backend URL so the browser calls it directly (no serverless timeout).
const API = process.env.NEXT_PUBLIC_API_BASE || "";

async function post(path, body) {
  const r = await fetch(API + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [est, setEst] = useState(null);
  const [job, setJob] = useState(null);
  const [stats, setStats] = useState(null);
  const [q, setQ] = useState("");
  const [msgs, setMsgs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const pollRef = useRef(null);
  const end = useRef(null);

  const loadStats = async () => {
    try { setStats(await (await fetch(API + "/api/stats")).json()); } catch {}
  };
  useEffect(() => { loadStats(); return () => clearInterval(pollRef.current); }, []);
  // In the desktop app, stream live download/upload progress from Electron.
  useEffect(() => {
    const el = typeof window !== "undefined" ? window.electronAPI : null;
    if (el?.onProgress) {
      el.onProgress((d) => setJob((j) => ({ ...(j || {}), status: "running", step: d.step, progress: d.pct })));
    }
  }, []);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const estimate = async () => {
    if (!url.trim()) return;
    setEst({ loading: true });
    setEst(await post("/api/estimate", { url }));
  };

  const track = async (jid) => {
    const j = await (await fetch(API + "/api/progress/" + jid)).json();
    if (j.error && !j.status) return;   // API-level error (unknown job) — not a job that failed
    setJob(j);
    if (j.status === "done" || j.status === "error") {
      clearInterval(pollRef.current); pollRef.current = null; setSubmitting(false); loadStats();
    }
  };

  const submit = async () => {
    const link = url.trim();
    if (!link) return;
    const el = typeof window !== "undefined" ? window.electronAPI : null;

    if (el?.isElectron) {
      // Desktop app: download locally (user's own IP -> no YouTube block), upload, process.
      setSubmitting(true);
      setJob({ status: "running", step: "Starting…", progress: 0, log: [] });
      try {
        const result = await el.processYouTube(link);
        setJob({ ...result, status: "done", progress: 100, step: "Done" });
        loadStats();
      } catch (e) {
        setJob({ status: "error", step: "Failed", error: String(e?.message || e) });
      }
      setSubmitting(false);
      return;
    }

    // Browser: the server can't download YouTube. Point users to the desktop app.
    setJob({
      status: "error",
      step: "Desktop app needed to add videos",
      error: "To add videos, install the VidMind desktop app — a browser can't download from YouTube. (Chat works right here in the browser.)",
    });
  };

  const ask = async () => {
    const question = q.trim();
    if (!question || busy) return;
    setQ(""); setBusy(true);
    setMsgs((m) => [...m, { who: "user", text: question }, { who: "ai", typing: true }]);
    const r = await post("/api/chat", { question });
    setMsgs((m) => {
      const c = m.slice(0, -1);
      c.push({ who: "ai", text: r.error ? "⚠️ " + r.error : r.answer, refs: r.references || [] });
      return c;
    });
    setBusy(false);
  };

  const status = job?.status;

  return (
    <div className="wrap">
      <div className="nav">
        <div className="brand">
          <span className="logo">
            <svg width="20" height="20" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="#fff" /></svg>
          </span>
          VidMind
        </div>
        {stats && (
          <div className="badge"><span className="dot" /> {Number(stats.points).toLocaleString()} chunks · {stats.lang}</div>
        )}
      </div>

      <h1 className="h-title">
        Turn any <span className="grad">YouTube video</span> into a chattable knowledge base.
      </h1>
      <p className="h-sub">
        Paste a video or channel link — we transcribe it, index it, and let you ask questions
        in any language with cited answers.
      </p>

      <div className="card fade">
        <div className="card-h"><span className="ic">➕</span> Add content</div>
        <div className="field">
          <input className="input" value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=…   or a channel / @handle" />
          <button className="btn ghost" onClick={estimate}>Estimate</button>
          <button className="btn" onClick={submit} disabled={submitting}>
            {submitting ? "Processing…" : "Process"}
          </button>
        </div>
        {est && !est.loading && !est.error && (
          <div className="estimate fade">
            <div className="stat"><b>{est.count}</b><span>video(s)</span></div>
            <div className="stat"><b>{est.total_minutes}</b><span>minutes</span></div>
            <div className="stat cost"><b>${est.est_cost_usd}</b><span>est. transcription</span></div>
          </div>
        )}
        {est?.loading && <div className="estimate fade" style={{ color: "var(--mut)" }}>Scanning…</div>}
        {est?.error && <div className="estimate fade" style={{ color: "var(--danger)" }}>⚠️ {est.error}</div>}
      </div>

      {job && (
        <div className="card fade">
          <div className="step-row">
            {status === "done" ? <span style={{ color: "var(--ok)" }}>✓</span>
              : status === "error" ? <span style={{ color: "var(--danger)" }}>✕</span>
              : <span className="spinner" />}
            <span>{job.step || status}</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: (job.progress || 0) + "%" }} />
          </div>
          <div style={{ color: "var(--mut)", fontSize: 13 }}>
            {job.total > 1 ? `Video ${job.current}/${job.total} · ${(job.videos || []).length} done` : ""}
            {status === "done" ? "  ✓ Ready to chat 🎉" : ""}
          </div>
          {status === "error" && job.error && (
            <div style={{ color: "var(--danger)", fontSize: 13, marginTop: 8 }}>{job.error}</div>
          )}
          {job.log?.length > 0 && <div className="log">{job.log.slice(-8).join("\n")}</div>}
        </div>
      )}

      <div className="card fade">
        <div className="card-h"><span className="ic">💬</span> Chat</div>
        <div className="chat">
          {msgs.length === 0 && (
            <div className="empty">
              <div className="big">🧠</div>
              Ask anything about your indexed videos — English, Roman Urdu, or Urdu.
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={"msg fade " + (m.who === "user" ? "user" : "ai")}>
              <span className={"av " + (m.who === "user" ? "user" : "ai")}>{m.who === "user" ? "🧑" : "🤖"}</span>
              <div>
                <div className="bubble">
                  {m.typing ? <span className="typing"><i /><i /><i /></span> : m.text}
                </div>
                {m.refs?.length > 0 && (
                  <div className="refs">
                    {m.refs.map((r) => (
                      <span key={r.n} className="ref"><b>[{r.n}]</b> {(r.source || "").slice(0, 44)} · {r.idx}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={end} />
        </div>
        <div className="field">
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()} placeholder="Ask a question…" />
          <button className="btn" onClick={ask} disabled={busy}>Send</button>
        </div>
      </div>
    </div>
  );
}
