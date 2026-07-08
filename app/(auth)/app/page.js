"use client";
import { useEffect, useRef, useState } from "react";
import { UserButton, useAuth } from "@clerk/nextjs";

// "" in dev (Next.js proxies /api -> backend). In prod set NEXT_PUBLIC_API_BASE
// to the backend URL so the browser calls it directly (no serverless timeout).
const API = process.env.NEXT_PUBLIC_API_BASE || "";

function Icon({ name, size = 18 }) {
  const paths = {
    plus: <path d="M12 5v14M5 12h14" />,
    chat: <path d="M4 5.5h16v10H8.5L4 19.5z" />,
    spark: <path d="M12 3.5l1.8 5.7 5.7 1.8-5.7 1.8L12 18.5l-1.8-5.7L4.5 11l5.7-1.8z" />,
    user: <><circle cx="12" cy="8" r="3.3" /><path d="M5.8 19.5a6.2 6.2 0 0 1 12.4 0" /></>,
    bot: <><rect x="4.5" y="7.5" width="15" height="11" rx="3.2" /><path d="M12 7.5V4.5M8.8 12.5h.01M15.2 12.5h.01M9.5 15.5h5" /></>,
    check: <path d="M4.5 12.5l4.5 4.5L19.5 6.5" />,
    alert: <><path d="M12 3.5l9 15.5H3z" /><path d="M12 9.5v4M12 16.5v.4" /></>,
  }[name] || null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths}</svg>
  );
}

export default function Home() {
  const { getToken } = useAuth();
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

  // Every backend call carries the Clerk session token so the API knows the user.
  const authHeaders = async () => {
    const t = await getToken().catch(() => null);
    return t ? { Authorization: `Bearer ${t}` } : {};
  };
  const apost = async (path, body) => {
    const r = await fetch(API + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify(body),
    });
    return r.json();
  };
  const aget = async (path) => {
    const r = await fetch(API + path, { headers: await authHeaders() });
    return r.json();
  };

  const loadStats = async () => {
    try { setStats(await aget("/api/stats")); } catch {}
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
    setEst(await apost("/api/estimate", { url }));
  };

  const track = async (jid) => {
    const j = await aget("/api/progress/" + jid);
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
        const token = await getToken().catch(() => null);
        const result = await el.processYouTube(link, token);
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
    const r = await apost("/api/chat", { question });
    setMsgs((m) => {
      const c = m.slice(0, -1);
      c.push({ who: "ai", text: r.error ? r.error : r.answer, refs: r.references || [] });
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
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {stats && (
            <div className="badge"><span className="dot" /> {Number(stats.points).toLocaleString()} chunks · {stats.lang}</div>
          )}
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>

      <div style={{ margin: "6px 0 22px" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.02em", margin: "0 0 4px" }}>
          Your knowledge base
        </h2>
        <p style={{ color: "var(--mut)", fontSize: 14, margin: 0 }}>
          Add a YouTube video or channel, then chat with it — cited answers in any language.
        </p>
      </div>

      <div className="card fade">
        <div className="card-h"><span className="ic"><Icon name="plus" /></span> Add content</div>
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
        {est?.error && <div className="estimate fade" style={{ color: "var(--danger)", display: "flex", alignItems: "center", gap: 8 }}><Icon name="alert" size={16} /> {est.error}</div>}
      </div>

      {job && (
        <div className="card fade">
          <div className="step-row">
            {status === "done" ? <span style={{ color: "var(--ok)", display: "inline-flex" }}><Icon name="check" size={17} /></span>
              : status === "error" ? <span style={{ color: "var(--danger)", display: "inline-flex" }}><Icon name="alert" size={17} /></span>
              : <span className="spinner" />}
            <span>{job.step || status}</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: (job.progress || 0) + "%" }} />
          </div>
          <div style={{ color: "var(--mut)", fontSize: 13 }}>
            {job.total > 1 ? `Video ${job.current}/${job.total} · ${(job.videos || []).length} done` : ""}
            {status === "done" ? "  Ready to chat" : ""}
          </div>
          {status === "error" && job.error && (
            <div style={{ color: "var(--danger)", fontSize: 13, marginTop: 8 }}>{job.error}</div>
          )}
          {job.log?.length > 0 && <div className="log">{job.log.slice(-8).join("\n")}</div>}
        </div>
      )}

      <div className="card fade">
        <div className="card-h"><span className="ic"><Icon name="chat" /></span> Chat</div>
        <div className="chat">
          {msgs.length === 0 && (
            <div className="empty">
              <div className="big" style={{ display: "flex", justifyContent: "center", color: "var(--acc)" }}>
                <Icon name="spark" size={30} />
              </div>
              Ask anything about your indexed videos — English, Roman Urdu, or Urdu.
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={"msg fade " + (m.who === "user" ? "user" : "ai")}>
              <span className={"av " + (m.who === "user" ? "user" : "ai")} style={{ color: "#fff" }}>
                <Icon name={m.who === "user" ? "user" : "bot"} size={16} />
              </span>
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
