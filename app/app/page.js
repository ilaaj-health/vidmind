"use client";
import { useEffect, useRef, useState } from "react";
import { UserButton, useAuth } from "@clerk/nextjs";

const API = process.env.NEXT_PUBLIC_API_BASE || "";

function Icon({ name, size = 18 }) {
  const p = {
    chat: <path d="M4 5.5h16v10H8.5L4 19.5z" />,
    library: <><rect x="3.5" y="4.5" width="17" height="14" rx="2.5" /><path d="M10 9.5v4l3.5-2z" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    user: <><circle cx="12" cy="8" r="3.3" /><path d="M5.8 19.5a6.2 6.2 0 0 1 12.4 0" /></>,
    bot: <><rect x="4.5" y="7.5" width="15" height="11" rx="3.2" /><path d="M12 7.5V4.5M8.8 12.5h.01M15.2 12.5h.01M9.5 15.5h5" /></>,
    check: <path d="M4.5 12.5l4.5 4.5L19.5 6.5" />,
    alert: <><path d="M12 3.5l9 15.5H3z" /><path d="M12 9.5v4M12 16.5v.4" /></>,
    wallet: <><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 10h18M16 14.5h2.5" /></>,
    send: <path d="M4.5 11.5l15-7-6.5 15-2.8-5.7z" />,
    hash: <path d="M6 9h13M5 15h13M10 4l-2 16M16 4l-2 16" />,
    close: <path d="M6 6l12 12M18 6L6 18" />,
    sparkles: <path d="M12 3l1.6 4.9L18.5 9l-4.9 1.6L12 15.5l-1.6-4.9L5.5 9l4.9-1.6z" />,
  }[name] || null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{p}</svg>
  );
}

const DOTS = ["#7c5cff", "#5b8cff", "#22d3ee", "#34d399", "#fbbf24", "#fb7185", "#a78bfa"];

export default function App() {
  const { getToken } = useAuth();
  const [spaces, setSpaces] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [stats, setStats] = useState(null);
  const [view, setView] = useState("chat");
  const [addOpen, setAddOpen] = useState(false);
  const [newSpace, setNewSpace] = useState(null);
  const [url, setUrl] = useState("");
  const [est, setEst] = useState(null);
  const [job, setJob] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [q, setQ] = useState("");
  const [msgs, setMsgs] = useState([]);
  const [busy, setBusy] = useState(false);
  const end = useRef(null);

  const headers = async () => {
    const t = await getToken().catch(() => null);
    return t ? { Authorization: `Bearer ${t}` } : {};
  };
  const apiGet = async (p) => (await fetch(API + p, { headers: await headers() })).json();
  const apiPost = async (p, b) => (await fetch(API + p, {
    method: "POST", headers: { "Content-Type": "application/json", ...(await headers()) },
    body: JSON.stringify(b),
  })).json();

  const active = spaces.find((s) => s.id === activeId);

  const loadSpaces = async () => {
    const r = await apiGet("/api/spaces").catch(() => ({}));
    if (r.spaces) { setSpaces(r.spaces); setActiveId((id) => id || r.spaces[0]?.id || null); }
  };
  const loadWallet = async () => {
    const r = await apiGet("/api/wallet").catch(() => ({}));
    if (r.balance_pkr != null) setWallet(r.balance_pkr);
  };
  const loadStats = async () => { setStats(await apiGet("/api/stats").catch(() => ({}))); };

  useEffect(() => { loadSpaces(); loadWallet(); loadStats(); }, []);
  useEffect(() => {
    const el = typeof window !== "undefined" ? window.electronAPI : null;
    if (el?.onProgress) el.onProgress((d) =>
      setJob((j) => ({ ...(j || {}), status: "running", step: d.step, progress: d.pct })));
  }, []);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  useEffect(() => { setMsgs([]); setView("chat"); }, [activeId]);

  const createSpace = async () => {
    const name = (newSpace?.name || "").trim();
    if (!name) return;
    const s = await apiPost("/api/spaces", { name, persona: newSpace.persona || null });
    if (s.id) { setSpaces((x) => [...x, s]); setActiveId(s.id); }
    setNewSpace(null);
  };

  const estimate = async () => {
    if (!url.trim()) return;
    setEst({ loading: true });
    setEst(await apiPost("/api/estimate", { url }));
  };

  const submit = async () => {
    const link = url.trim();
    if (!link) return;
    const el = typeof window !== "undefined" ? window.electronAPI : null;
    if (el?.isElectron) {
      setSubmitting(true);
      setJob({ status: "running", step: "Starting…", progress: 0 });
      try {
        const token = await getToken().catch(() => null);
        const result = await el.processYouTube(link, token, activeId);
        setJob({ ...result, status: "done", progress: 100, step: "Done" });
        setUrl(""); setEst(null); loadStats(); loadSpaces();
      } catch (e) {
        setJob({ status: "error", step: "Failed", error: String(e?.message || e) });
      }
      setSubmitting(false);
      return;
    }
    setJob({
      status: "error", step: "Desktop app needed",
      error: "Adding videos needs the VidMind desktop app (a browser can't download from YouTube). Chat works here.",
    });
  };

  const ask = async () => {
    const question = q.trim();
    if (!question || busy) return;
    setQ(""); setBusy(true);
    setMsgs((m) => [...m, { who: "user", text: question }, { who: "ai", typing: true }]);
    const r = await apiPost("/api/chat", { question, space_id: activeId });
    setMsgs((m) => {
      const c = m.slice(0, -1);
      c.push({ who: "ai", text: r.error ? r.error : r.answer, refs: r.references || [] });
      return c;
    });
    setBusy(false);
  };

  const jobStatus = job?.status;

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <span className="logo"><svg width="18" height="18" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="#fff" /></svg></span>
          VidMind
        </div>

        <div className="side-lbl">Spaces</div>
        <div className="spaces">
          {spaces.map((s, i) => (
            <button key={s.id} className={"space " + (s.id === activeId ? "on" : "")} onClick={() => setActiveId(s.id)}>
              <span className="sdot" style={{ background: DOTS[i % DOTS.length] }} />
              <span className="sname">{s.name}</span>
              <span className="scount">{s.videos}</span>
            </button>
          ))}
          {newSpace ? (
            <div className="newspace">
              <input autoFocus className="ns-in" placeholder="Space name" value={newSpace.name}
                onChange={(e) => setNewSpace({ ...newSpace, name: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && createSpace()} />
              <input className="ns-in" placeholder="Persona / tone (optional)" value={newSpace.persona}
                onChange={(e) => setNewSpace({ ...newSpace, persona: e.target.value })} />
              <div className="ns-row">
                <button className="mini" onClick={createSpace}>Create</button>
                <button className="mini ghost" onClick={() => setNewSpace(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className="space add" onClick={() => setNewSpace({ name: "", persona: "" })}>
              <Icon name="plus" size={15} /> New space
            </button>
          )}
        </div>

        <div className="side-lbl">Workspace</div>
        <nav className="nav">
          <button className={"nav-i " + (view === "chat" ? "on" : "")} onClick={() => setView("chat")}><Icon name="chat" size={17} /> Chat</button>
          <button className={"nav-i " + (view === "library" ? "on" : "")} onClick={() => setView("library")}><Icon name="library" size={17} /> Library</button>
        </nav>

        <div className="side-foot">
          <div className="wallet"><Icon name="wallet" size={16} /><span>{wallet == null ? "—" : `Rs ${Number(wallet).toLocaleString()}`}</span><button className="topup">Top up</button></div>
          <div className="user-row"><UserButton afterSignOutUrl="/" /><span className="ur-t">Account</span></div>
        </div>
      </aside>

      <main className="main">
        <header className="top">
          <div className="top-l">
            <h1>{active ? active.name : "Loading…"}</h1>
            <p>{active?.persona || "Your private knowledge space"}</p>
          </div>
          <div className="top-r">
            {stats && <span className="chip"><Icon name="hash" size={14} /> {Number(stats.points || 0).toLocaleString()} chunks</span>}
            <button className="btn" onClick={() => setAddOpen(true)}><Icon name="plus" size={16} /> Add video</button>
          </div>
        </header>

        {view === "chat" ? (
          <section className="pane">
            <div className="chat">
              {msgs.length === 0 && (
                <div className="empty">
                  <div className="e-ic"><Icon name="sparkles" size={34} /></div>
                  <div className="e-t">Chat with <b>{active?.name || "your space"}</b></div>
                  <div className="e-s">Ask anything about the videos in this space — English, Roman Urdu, or Urdu, with cited sources.</div>
                </div>
              )}
              {msgs.map((m, i) => (
                <div key={i} className={"msg " + m.who}>
                  <span className={"av " + m.who}><Icon name={m.who === "user" ? "user" : "bot"} size={15} /></span>
                  <div className="mwrap">
                    <div className="bubble">{m.typing ? <span className="typing"><i /><i /><i /></span> : m.text}</div>
                    {m.refs?.length > 0 && (
                      <div className="refs">{m.refs.slice(0, 5).map((r) => (
                        <span key={r.n} className="ref">[{r.n}] {(r.source || "").slice(0, 40)}</span>
                      ))}</div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={end} />
            </div>
            <div className="composer">
              <input className="c-in" value={q} onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && ask()} placeholder={`Message ${active?.name || "space"}…`} />
              <button className="c-send" onClick={ask} disabled={busy}><Icon name="send" size={16} /></button>
            </div>
          </section>
        ) : (
          <section className="pane">
            {active?.videos ? (
              <div className="lib-note">This space has <b>{active.videos}</b> video(s) indexed. Sources appear as citations in your chat answers.</div>
            ) : (
              <div className="empty">
                <div className="e-ic"><Icon name="library" size={34} /></div>
                <div className="e-t">No videos yet</div>
                <div className="e-s">Add a YouTube video to this space to start chatting with it.</div>
                <button className="btn" style={{ marginTop: 18 }} onClick={() => setAddOpen(true)}><Icon name="plus" size={16} /> Add video</button>
              </div>
            )}
          </section>
        )}
      </main>

      {addOpen && (
        <div className="modal-bg" onClick={() => setAddOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="m-h">
              <div><b>Add a video</b><span>to {active?.name}</span></div>
              <button className="x" onClick={() => setAddOpen(false)}><Icon name="close" size={18} /></button>
            </div>
            <input className="m-in" value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=…  or a channel / @handle" />
            <div className="m-row">
              <button className="btn ghost" onClick={estimate}>Estimate</button>
              <button className="btn" onClick={submit} disabled={submitting}>{submitting ? "Processing…" : "Process"}</button>
            </div>
            {est && !est.loading && !est.error && (
              <div className="m-est">
                <span><b>{est.count}</b> video(s)</span><span><b>{est.total_minutes}</b> min</span><span className="cost"><b>${est.est_cost_usd}</b> transcription</span>
              </div>
            )}
            {est?.loading && <div className="m-est mut">Scanning…</div>}
            {est?.error && <div className="m-est err"><Icon name="alert" size={15} /> {est.error}</div>}
            {job && (
              <div className="m-job">
                <div className="mj-row">
                  {jobStatus === "done" ? <span className="ok"><Icon name="check" size={16} /></span>
                    : jobStatus === "error" ? <span className="er"><Icon name="alert" size={16} /></span>
                    : <span className="spin" />}
                  <span>{job.step || jobStatus}</span>
                </div>
                <div className="track"><div className="fill" style={{ width: (job.progress || 0) + "%" }} /></div>
                {jobStatus === "error" && job.error && <div className="mj-err">{job.error}</div>}
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .shell { display: grid; grid-template-columns: 264px 1fr; min-height: 100vh; color: #eceef4; background: #07080c; }
        .side { border-right: 1px solid rgba(255,255,255,.07); padding: 18px 14px; display: flex; flex-direction: column;
          background: linear-gradient(180deg, rgba(20,22,29,.6), rgba(10,11,15,.4)); position: sticky; top: 0; height: 100vh; }
        .brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 18px; letter-spacing: -.02em; padding: 4px 6px 8px; }
        .logo { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center;
          background: linear-gradient(135deg, #7c5cff, #5b8cff); box-shadow: 0 6px 16px -5px rgba(124,92,255,.7); }
        .side-lbl { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #6b7186; padding: 16px 8px 8px; }
        .spaces { display: flex; flex-direction: column; gap: 3px; }
        .space { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; border: 0; cursor: pointer;
          background: transparent; color: #b7bccb; padding: 9px 10px; border-radius: 9px; font: inherit; font-size: 14px; transition: .12s; }
        .space:hover { background: rgba(255,255,255,.04); color: #fff; }
        .space.on { background: rgba(124,92,255,.15); color: #fff; box-shadow: inset 0 0 0 1px rgba(124,92,255,.3); }
        .sdot { width: 8px; height: 8px; border-radius: 50%; flex: 0 0 8px; }
        .sname { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .scount { font-size: 12px; color: #6b7186; }
        .space.add { color: #8b90a2; }
        .space.add:hover { color: #c4b5fd; }
        .newspace { padding: 8px; background: rgba(255,255,255,.03); border-radius: 10px; margin-top: 4px; display: flex; flex-direction: column; gap: 6px; }
        .ns-in { background: #0b0d12; border: 1px solid rgba(255,255,255,.12); border-radius: 8px; color: #fff; padding: 8px 10px; font: inherit; font-size: 13px; }
        .ns-in:focus { outline: none; border-color: #7c5cff; }
        .ns-row { display: flex; gap: 6px; }
        .mini { flex: 1; border: 0; border-radius: 8px; padding: 7px; font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer;
          color: #fff; background: linear-gradient(135deg, #7c5cff, #5b8cff); }
        .mini.ghost { background: rgba(255,255,255,.06); }
        .nav { display: flex; flex-direction: column; gap: 3px; }
        .nav-i { display: flex; align-items: center; gap: 11px; border: 0; background: transparent; cursor: pointer; color: #b7bccb;
          padding: 9px 10px; border-radius: 9px; font: inherit; font-size: 14px; transition: .12s; }
        .nav-i:hover { background: rgba(255,255,255,.04); color: #fff; }
        .nav-i.on { background: rgba(255,255,255,.06); color: #fff; }
        .side-foot { margin-top: auto; padding-top: 14px; border-top: 1px solid rgba(255,255,255,.07); display: flex; flex-direction: column; gap: 10px; }
        .wallet { display: flex; align-items: center; gap: 8px; font-size: 13.5px; color: #cdd2e0; background: rgba(255,255,255,.03);
          border: 1px solid rgba(255,255,255,.08); border-radius: 10px; padding: 8px 11px; }
        .wallet span { flex: 1; font-weight: 600; }
        .topup { border: 0; background: rgba(124,92,255,.2); color: #c4b5fd; font: inherit; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 7px; cursor: pointer; }
        .user-row { display: flex; align-items: center; gap: 10px; padding: 2px; }
        .ur-t { font-size: 13px; color: #8b90a2; }
        .main { display: flex; flex-direction: column; min-width: 0; background: radial-gradient(900px 500px at 80% -10%, rgba(124,92,255,.1), transparent 60%); }
        .top { display: flex; align-items: center; justify-content: space-between; padding: 20px 28px; border-bottom: 1px solid rgba(255,255,255,.06); gap: 16px; }
        .top-l { min-width: 0; }
        .top h1 { font-size: 20px; font-weight: 800; letter-spacing: -.02em; margin: 0 0 3px; }
        .top p { font-size: 13px; color: #8b90a2; margin: 0; max-width: 520px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .top-r { display: flex; align-items: center; gap: 12px; flex: 0 0 auto; }
        .chip { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; color: #9aa0b2; border: 1px solid rgba(255,255,255,.1); border-radius: 999px; padding: 6px 12px; }
        .btn { display: inline-flex; align-items: center; gap: 7px; border: 0; border-radius: 10px; padding: 10px 16px; font: inherit; font-weight: 650; font-size: 14px; cursor: pointer;
          color: #fff; background: linear-gradient(135deg, #7c5cff, #5b8cff); box-shadow: 0 8px 22px -8px rgba(124,92,255,.7); transition: .15s; }
        .btn:hover { transform: translateY(-1px); }
        .btn.ghost { background: rgba(255,255,255,.06); box-shadow: none; }
        .btn:disabled { opacity: .6; }
        .pane { flex: 1; display: flex; flex-direction: column; min-height: 0; padding: 22px 28px; max-width: 900px; width: 100%; margin: 0 auto; }
        .chat { flex: 1; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; padding-bottom: 8px; }
        .empty { margin: auto; text-align: center; max-width: 420px; padding: 30px; }
        .e-ic { color: #7c5cff; display: flex; justify-content: center; margin-bottom: 16px; }
        .e-t { font-size: 18px; font-weight: 700; margin-bottom: 7px; }
        .e-s { color: #8b90a2; font-size: 14px; line-height: 1.6; }
        .msg { display: flex; gap: 11px; max-width: 88%; }
        .msg.user { align-self: flex-end; flex-direction: row-reverse; }
        .av { width: 30px; height: 30px; border-radius: 9px; flex: 0 0 30px; display: grid; place-items: center; color: #fff; }
        .av.ai { background: linear-gradient(135deg, #7c5cff, #5b8cff); }
        .av.user { background: #2a3040; }
        .mwrap { min-width: 0; }
        .bubble { padding: 11px 15px; border-radius: 14px; white-space: pre-wrap; font-size: 14.5px; line-height: 1.6; }
        .msg.ai .bubble { background: #14161d; border: 1px solid rgba(255,255,255,.08); border-top-left-radius: 4px; }
        .msg.user .bubble { background: linear-gradient(135deg, rgba(124,92,255,.26), rgba(91,140,255,.2)); border-top-right-radius: 4px; }
        .refs { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .ref { font-size: 11.5px; color: #9aa0b2; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 6px; padding: 3px 8px; }
        .typing { display: inline-flex; gap: 4px; }
        .typing i { width: 6px; height: 6px; border-radius: 50%; background: #7c5cff; animation: bl 1s infinite; }
        .typing i:nth-child(2) { animation-delay: .2s; } .typing i:nth-child(3) { animation-delay: .4s; }
        @keyframes bl { 0%,100% { opacity: .3; } 50% { opacity: 1; } }
        .composer { display: flex; gap: 10px; margin-top: 14px; }
        .c-in { flex: 1; background: #0b0d12; border: 1px solid rgba(255,255,255,.12); border-radius: 12px; color: #fff; padding: 13px 16px; font: inherit; font-size: 14.5px; }
        .c-in:focus { outline: none; border-color: #7c5cff; box-shadow: 0 0 0 3px rgba(124,92,255,.16); }
        .c-send { width: 46px; border: 0; border-radius: 12px; cursor: pointer; color: #fff; background: linear-gradient(135deg, #7c5cff, #5b8cff); display: grid; place-items: center; }
        .c-send:disabled { opacity: .5; }
        .lib-note { color: #9aa0b2; font-size: 14px; padding: 20px; background: #14161d; border: 1px solid rgba(255,255,255,.08); border-radius: 14px; }
        .modal-bg { position: fixed; inset: 0; background: rgba(4,5,8,.7); backdrop-filter: blur(4px); display: grid; place-items: center; z-index: 50; padding: 20px; }
        .modal { width: 100%; max-width: 520px; background: #14161d; border: 1px solid rgba(255,255,255,.1); border-radius: 18px; padding: 22px; box-shadow: 0 30px 80px -20px rgba(0,0,0,.8); }
        .m-h { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
        .m-h b { font-size: 17px; } .m-h span { color: #8b90a2; font-size: 13px; margin-left: 7px; }
        .x { border: 0; background: transparent; color: #8b90a2; cursor: pointer; }
        .m-in { width: 100%; background: #0b0d12; border: 1px solid rgba(255,255,255,.12); border-radius: 11px; color: #fff; padding: 12px 14px; font: inherit; font-size: 14px; }
        .m-in:focus { outline: none; border-color: #7c5cff; }
        .m-row { display: flex; gap: 10px; margin-top: 12px; }
        .m-est { display: flex; gap: 18px; margin-top: 14px; font-size: 13px; color: #9aa0b2; align-items: center; }
        .m-est b { color: #fff; font-size: 15px; margin-right: 4px; } .m-est .cost b { color: #c4b5fd; }
        .m-est.mut { color: #6b7186; } .m-est.err { color: #fb7185; gap: 8px; }
        .m-job { margin-top: 16px; }
        .mj-row { display: flex; align-items: center; gap: 9px; font-size: 14px; font-weight: 600; margin-bottom: 10px; }
        .mj-row .ok { color: #34d399; display: inline-flex; } .mj-row .er { color: #fb7185; display: inline-flex; }
        .spin { width: 15px; height: 15px; border: 2px solid rgba(255,255,255,.2); border-top-color: #7c5cff; border-radius: 50%; animation: sp .7s linear infinite; }
        @keyframes sp { to { transform: rotate(360deg); } }
        .track { height: 6px; background: rgba(255,255,255,.08); border-radius: 999px; overflow: hidden; }
        .fill { height: 100%; background: linear-gradient(90deg, #7c5cff, #5b8cff); transition: width .3s; }
        .mj-err { color: #fb7185; font-size: 13px; margin-top: 8px; }
        @media (max-width: 820px) { .shell { grid-template-columns: 1fr; } .side { display: none; } }
      `}</style>
    </div>
  );
}
