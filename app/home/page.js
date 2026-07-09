"use client";
import { useEffect, useRef, useState } from "react";
import { UserButton, useAuth, SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";

const API = process.env.NEXT_PUBLIC_API_BASE || "";

function Icon({ name, size = 16 }) {
  const p = {
    chat: <path d="M4 5.5h16v10H8.5L4 19.5z" />,
    video: <><rect x="3.5" y="5" width="17" height="13" rx="2" /><path d="M10 9.5v4l3.5-2z" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    user: <><circle cx="12" cy="8" r="3.3" /><path d="M5.8 19.5a6.2 6.2 0 0 1 12.4 0" /></>,
    bot: <><rect x="4.5" y="7.5" width="15" height="11" rx="3.2" /><path d="M12 7.5V4.5M8.8 12.5h.01M15.2 12.5h.01M9.5 15.5h5" /></>,
    check: <path d="M4.5 12.5l4.5 4.5L19.5 6.5" />,
    alert: <><path d="M12 3.5l9 15.5H3z" /><path d="M12 9.5v4M12 16.5v.4" /></>,
    wallet: <><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 10h18M16 14.5h2.5" /></>,
    send: <path d="M4.5 11.5l15-7-6.5 15-2.8-5.7z" />,
    close: <path d="M6 6l12 12M18 6L6 18" />,
    refresh: <><path d="M20 11a8 8 0 1 0-.7 4.5" /><path d="M20 5v6h-6" /></>,
    clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
    link: <><path d="M9.5 14.5l5-5" /><path d="M11 6.5l1-1a3.5 3.5 0 0 1 5 5l-2 2" /><path d="M13 17.5l-1 1a3.5 3.5 0 0 1-5-5l2-2" /></>,
  }[name] || null;
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{p}</svg>;
}

const STAGES = ["Fetching video", "Uploading audio", "Transcribing", "Chunking", "Feeding to AI"];
function stageIndex(job) {
  if (!job) return -1;
  if (job.status === "done") return STAGES.length;
  if (job.status === "error") return -2;
  const p = job.progress || 0;
  if (p < 25) return 0;
  if (p < 55) return 1;
  if (p < 72) return 2;
  if (p < 92) return 3;
  return 4;
}
function timeAgo(iso) {
  try {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  } catch { return ""; }
}

export default function App() {
  const { getToken } = useAuth();
  const [spaces, setSpaces] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [view, setView] = useState("chat");
  const [videos, setVideos] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [newP, setNewP] = useState(null);
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
    method: "POST", headers: { "Content-Type": "application/json", ...(await headers()) }, body: JSON.stringify(b),
  })).json();

  const active = spaces.find((s) => s.id === activeId);

  const loadSpaces = async () => {
    const r = await apiGet("/api/spaces").catch(() => ({}));
    if (r.spaces) { setSpaces(r.spaces); setActiveId((id) => id || r.spaces[0]?.id || null); }
  };
  const loadWallet = async () => { const r = await apiGet("/api/wallet").catch(() => ({})); if (r.balance_pkr != null) setWallet(r.balance_pkr); };
  const loadVideos = async (sid) => { const r = await apiGet(`/api/spaces/${sid}/videos`).catch(() => ({})); setVideos(r.videos || []); };

  useEffect(() => { loadSpaces(); loadWallet(); }, []);
  useEffect(() => {
    const el = typeof window !== "undefined" ? window.electronAPI : null;
    if (el?.onProgress) el.onProgress((d) => setJob((j) => ({ ...(j || {}), status: "running", step: d.step, progress: d.pct })));
  }, []);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  useEffect(() => { setMsgs([]); if (activeId) loadVideos(activeId); }, [activeId]);

  const createPersonality = async () => {
    const name = (newP?.name || "").trim();
    if (!name) return;
    const s = await apiPost("/api/spaces", { name, persona: newP.persona || null, image_url: newP.image_url || null, status: newP.status || "alive" });
    if (s.id) { setSpaces((x) => [...x, s]); setActiveId(s.id); }
    setNewP(null);
  };

  const estimate = async () => { if (!url.trim()) return; setEst({ loading: true }); setEst(await apiPost("/api/estimate", { url })); };

  const process = async (link, reprocess) => {
    link = (link || url).trim();
    if (!link) return;
    const el = typeof window !== "undefined" ? window.electronAPI : null;
    if (el?.isElectron) {
      setAddOpen(true); setSubmitting(true);
      setJob({ status: "running", step: "Starting…", progress: 0 });
      try {
        const token = await getToken().catch(() => null);
        const result = await el.processYouTube(link, token, activeId);
        setJob({ ...result, status: "done", progress: 100, step: "Done" });
        if (!reprocess) { setUrl(""); setEst(null); }
        loadWallet(); loadSpaces(); loadVideos(activeId);
      } catch (e) { setJob({ status: "error", step: "Failed", error: String(e?.message || e) }); }
      setSubmitting(false);
      return;
    }
    setJob({ status: "error", step: "Desktop app needed", error: "Adding videos needs the VidMind desktop app — a browser can't download from YouTube." });
    setAddOpen(true);
  };

  const ask = async () => {
    const question = q.trim();
    if (!question || busy) return;
    setQ(""); setBusy(true);
    setMsgs((m) => [...m, { who: "user", text: question }, { who: "ai", typing: true }]);
    const r = await apiPost("/api/chat", { question, space_id: activeId });
    setMsgs((m) => { const c = m.slice(0, -1); c.push({ who: "ai", text: r.error ? r.error : r.answer, refs: r.references || [] }); return c; });
    setBusy(false);
  };

  const initial = (s) => (s?.name || "?").trim().charAt(0).toUpperCase();
  const stage = stageIndex(job);

  return (
    <>
      <SignedOut><RedirectToSignIn /></SignedOut>
      <SignedIn>
    <div className="shell">
      <aside className="side">
        <div className="brand"><span className="logo"><svg width="15" height="15" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="#fff" /></svg></span>VidMind</div>

        <div className="lbl">Personalities</div>
        <div className="plist">
          {spaces.map((s) => (
            <button key={s.id} className={"prow " + (s.id === activeId ? "on" : "")} onClick={() => setActiveId(s.id)}>
              <span className="pav">{s.image_url ? <img src={s.image_url} alt="" /> : initial(s)}</span>
              <span className="pinfo"><span className="pn">{s.name}</span><span className="pm">{s.status === "deceased" ? "In memory" : "Alive"} · {s.videos} videos</span></span>
            </button>
          ))}
          {newP ? (
            <div className="npbox">
              <input autoFocus className="in" placeholder="Name (e.g. Sahil Adeem)" value={newP.name} onChange={(e) => setNewP({ ...newP, name: e.target.value })} onKeyDown={(e) => e.key === "Enter" && createPersonality()} />
              <input className="in" placeholder="Image URL (optional)" value={newP.image_url} onChange={(e) => setNewP({ ...newP, image_url: e.target.value })} />
              <input className="in" placeholder="Persona / tone (optional)" value={newP.persona} onChange={(e) => setNewP({ ...newP, persona: e.target.value })} />
              <div className="seg">
                <button className={newP.status === "alive" ? "on" : ""} onClick={() => setNewP({ ...newP, status: "alive" })}>Alive</button>
                <button className={newP.status === "deceased" ? "on" : ""} onClick={() => setNewP({ ...newP, status: "deceased" })}>Deceased</button>
              </div>
              <div className="nprow"><button className="btn sm" onClick={createPersonality}>Create</button><button className="btn sm ghost" onClick={() => setNewP(null)}>Cancel</button></div>
            </div>
          ) : (
            <button className="prow add" onClick={() => setNewP({ name: "", image_url: "", persona: "", status: "alive" })}><Icon name="plus" size={14} /> New personality</button>
          )}
        </div>

        <div className="lbl">View</div>
        <nav className="nav">
          <button className={"ni " + (view === "chat" ? "on" : "")} onClick={() => setView("chat")}><Icon name="chat" size={15} /> Chat</button>
          <button className={"ni " + (view === "videos" ? "on" : "")} onClick={() => setView("videos")}><Icon name="video" size={15} /> Videos</button>
        </nav>

        <div className="foot">
          <div className="wal"><Icon name="wallet" size={14} /><span>{wallet == null ? "Rs —" : `Rs ${Number(wallet).toLocaleString()}`}</span><button className="tu">Top up</button></div>
          <div className="ur"><UserButton afterSignOutUrl="/" /><span>Account</span></div>
        </div>
      </aside>

      <main className="main">
        <header className="top">
          <div className="th">
            <span className="thav">{active?.image_url ? <img src={active.image_url} alt="" /> : initial(active)}</span>
            <div><div className="tn">{active ? active.name : "…"}{active?.status === "deceased" && <span className="mem">In memory</span>}</div><div className="tp">{active?.persona || "Chat with this personality's videos"}</div></div>
          </div>
          <button className="btn" onClick={() => { setJob(null); setAddOpen(true); }}><Icon name="plus" size={15} /> Add video</button>
        </header>

        {view === "chat" ? (
          <section className="pane">
            <div className="chat">
              {msgs.length === 0 && <div className="empty"><span className="eav">{active?.image_url ? <img src={active.image_url} alt="" /> : initial(active)}</span><div className="et">Chat with {active?.name || "personality"}</div><div className="es">Ask anything about their videos — cited answers in any language.</div></div>}
              {msgs.map((m, i) => (
                <div key={i} className={"msg " + m.who}>
                  <span className={"av " + m.who}>{m.who === "ai" ? <Icon name="bot" size={14} /> : <Icon name="user" size={14} />}</span>
                  <div className="mw"><div className="bub">{m.typing ? <span className="typ"><i /><i /><i /></span> : m.text}</div>{m.refs?.length > 0 && <div className="refs">{m.refs.slice(0, 4).map((r) => <span key={r.n} className="ref">[{r.n}] {(r.source || "").slice(0, 36)}</span>)}</div>}</div>
                </div>
              ))}
              <div ref={end} />
            </div>
            <div className="comp"><input className="cin" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} placeholder={`Message ${active?.name || "personality"}…`} /><button className="cs" onClick={ask} disabled={busy}><Icon name="send" size={15} /></button></div>
          </section>
        ) : (
          <section className="pane">
            <div className="vhead">Videos in {active?.name} <span>{videos.length}</span></div>
            {videos.length === 0 ? (
              <div className="empty"><Icon name="video" size={30} /><div className="et" style={{ marginTop: 12 }}>No videos yet</div><div className="es">Add a YouTube video to this personality.</div><button className="btn" style={{ marginTop: 16 }} onClick={() => { setJob(null); setAddOpen(true); }}><Icon name="plus" size={15} /> Add video</button></div>
            ) : (
              <div className="vlist">
                {videos.map((v) => (
                  <div key={v.id} className="vrow">
                    <span className="vth"><Icon name="video" size={16} /></span>
                    <div className="vi"><div className="vt">{v.title}</div><div className="vm"><Icon name="clock" size={12} /> {timeAgo(v.created_at)} · {v.chunks} chunks</div></div>
                    {v.url && <a className="vlk" href={v.url} target="_blank" rel="noreferrer" title="Open source"><Icon name="link" size={15} /></a>}
                    <button className="vre" title="Re-process (fix alignment)" onClick={() => process(v.url, true)}><Icon name="refresh" size={15} /></button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {addOpen && (
        <div className="mbg" onClick={() => setAddOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="mh"><b>Add a video</b><button className="x" onClick={() => setAddOpen(false)}><Icon name="close" size={17} /></button></div>
            <input className="in big" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=…  or a channel" />
            <div className="mrow"><button className="btn ghost" onClick={estimate}>Estimate</button><button className="btn" onClick={() => process()} disabled={submitting}>{submitting ? "Processing…" : "Process"}</button></div>
            {est && !est.loading && !est.error && <div className="mest"><span><b>{est.count}</b> video</span><span><b>{est.total_minutes}</b> min</span><span className="c"><b>${est.est_cost_usd}</b> cost</span></div>}
            {est?.loading && <div className="mest mut">Scanning…</div>}
            {est?.error && <div className="mest err"><Icon name="alert" size={14} /> {est.error}</div>}
            {job && (
              <div className="steps">
                {STAGES.map((s, i) => {
                  const st = stage === STAGES.length ? "done" : stage === -2 ? (i === 0 ? "err" : "pend") : i < stage ? "done" : i === stage ? "active" : "pend";
                  return (
                    <div key={s} className={"stp " + st}>
                      <span className="sdot">{st === "done" ? <Icon name="check" size={12} /> : st === "err" ? <Icon name="alert" size={12} /> : st === "active" ? <span className="sp" /> : <span className="pd" />}</span>
                      <span className="slb">{s}</span>
                    </div>
                  );
                })}
                {job.status === "done" && <div className="sdone"><Icon name="check" size={13} /> Ready to chat</div>}
                {job.status === "error" && <div className="serr">{job.error}</div>}
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{STYLES}</style>
    </div>
      </SignedIn>
    </>
  );
}

const STYLES = `
  * { box-sizing: border-box; }
  .shell { display: grid; grid-template-columns: 232px 1fr; min-height: 100vh; background: #fff; color: #1f2430;
    font: 13px/1.55 -apple-system, "Segoe UI", Roboto, Inter, sans-serif; }
  .side { background: #fafbfc; border-right: 1px solid #edeef2; padding: 14px 10px; display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; }
  .brand { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 15px; padding: 4px 6px 6px; }
  .logo { width: 26px; height: 26px; border-radius: 7px; display: grid; place-items: center; background: linear-gradient(135deg, #7c5cff, #5b8cff); }
  .lbl { font-size: 10.5px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: #9aa0ac; padding: 12px 8px 6px; }
  .plist { display: flex; flex-direction: column; gap: 2px; }
  .prow { display: flex; align-items: center; gap: 9px; width: 100%; text-align: left; border: 0; background: transparent; cursor: pointer; color: #384152; padding: 7px 8px; border-radius: 7px; font: inherit; }
  .prow:hover { background: #f0f1f5; }
  .prow.on { background: #efeaff; color: #5b3df5; }
  .pav { width: 26px; height: 26px; border-radius: 50%; flex: 0 0 26px; display: grid; place-items: center; font-size: 11px; font-weight: 700; color: #fff; background: linear-gradient(135deg, #a78bfa, #7c5cff); overflow: hidden; }
  .pav img, .thav img, .eav img { width: 100%; height: 100%; object-fit: cover; }
  .pinfo { min-width: 0; display: flex; flex-direction: column; }
  .pn { font-size: 13px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pm { font-size: 11px; color: #9aa0ac; }
  .prow.add { color: #8b90a0; font-size: 12.5px; }
  .prow.add:hover { color: #7c5cff; }
  .npbox { padding: 8px; background: #fff; border: 1px solid #e8e9ee; border-radius: 8px; margin: 4px 0; display: flex; flex-direction: column; gap: 6px; }
  .in { width: 100%; background: #fff; border: 1px solid #e2e4ea; border-radius: 6px; padding: 7px 9px; font: inherit; font-size: 12.5px; color: #1f2430; }
  .in:focus { outline: none; border-color: #7c5cff; box-shadow: 0 0 0 2px rgba(124,92,255,.12); }
  .in.big { font-size: 13.5px; padding: 9px 11px; }
  .seg { display: flex; background: #f0f1f5; border-radius: 6px; padding: 2px; }
  .seg button { flex: 1; border: 0; background: transparent; padding: 5px; font: inherit; font-size: 12px; border-radius: 5px; cursor: pointer; color: #6b7180; }
  .seg button.on { background: #fff; color: #5b3df5; box-shadow: 0 1px 2px rgba(0,0,0,.06); font-weight: 600; }
  .nprow { display: flex; gap: 6px; }
  .nav { display: flex; flex-direction: column; gap: 2px; }
  .ni { display: flex; align-items: center; gap: 9px; border: 0; background: transparent; cursor: pointer; color: #384152; padding: 7px 8px; border-radius: 7px; font: inherit; font-size: 13px; }
  .ni:hover { background: #f0f1f5; }
  .ni.on { background: #f0f1f5; font-weight: 600; }
  .foot { margin-top: auto; padding-top: 12px; border-top: 1px solid #edeef2; display: flex; flex-direction: column; gap: 8px; }
  .wal { display: flex; align-items: center; gap: 7px; font-size: 12.5px; background: #fff; border: 1px solid #e8e9ee; border-radius: 8px; padding: 7px 9px; }
  .wal span { flex: 1; font-weight: 600; }
  .tu { border: 0; background: #efeaff; color: #5b3df5; font: inherit; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 6px; cursor: pointer; }
  .ur { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: #6b7180; padding: 2px; }
  .btn { display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 7px; padding: 8px 13px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; color: #fff; background: #7c5cff; }
  .btn:hover { background: #6c4ce8; }
  .btn.ghost { background: #f0f1f5; color: #384152; }
  .btn.sm { padding: 6px 10px; font-size: 12px; flex: 1; justify-content: center; }
  .btn:disabled { opacity: .55; }
  .main { display: flex; flex-direction: column; min-width: 0; }
  .top { display: flex; align-items: center; justify-content: space-between; padding: 14px 22px; border-bottom: 1px solid #edeef2; gap: 14px; }
  .th { display: flex; align-items: center; gap: 11px; min-width: 0; }
  .thav { width: 38px; height: 38px; border-radius: 50%; flex: 0 0 38px; display: grid; place-items: center; font-size: 15px; font-weight: 700; color: #fff; background: linear-gradient(135deg, #a78bfa, #7c5cff); overflow: hidden; }
  .tn { font-size: 15px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
  .mem { font-size: 10.5px; font-weight: 600; color: #8b90a0; background: #f0f1f5; padding: 2px 7px; border-radius: 999px; }
  .tp { font-size: 12px; color: #9aa0ac; max-width: 460px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pane { flex: 1; display: flex; flex-direction: column; min-height: 0; padding: 18px 22px; max-width: 820px; width: 100%; margin: 0 auto; }
  .chat { flex: 1; display: flex; flex-direction: column; gap: 13px; overflow-y: auto; }
  .empty { margin: auto; text-align: center; max-width: 360px; color: #9aa0ac; }
  .eav { width: 52px; height: 52px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 14px; font-size: 20px; font-weight: 700; color: #fff; background: linear-gradient(135deg, #a78bfa, #7c5cff); overflow: hidden; }
  .empty :global(svg) { color: #c3c7d0; }
  .et { font-size: 15px; font-weight: 600; color: #1f2430; }
  .es { font-size: 12.5px; margin-top: 5px; }
  .msg { display: flex; gap: 9px; max-width: 90%; }
  .msg.user { align-self: flex-end; flex-direction: row-reverse; }
  .av { width: 26px; height: 26px; border-radius: 7px; flex: 0 0 26px; display: grid; place-items: center; color: #fff; }
  .av.ai { background: linear-gradient(135deg, #7c5cff, #5b8cff); }
  .av.user { background: #cfd3dc; color: #4b5162; }
  .mw { min-width: 0; }
  .bub { padding: 9px 12px; border-radius: 11px; white-space: pre-wrap; font-size: 13px; line-height: 1.55; }
  .msg.ai .bub { background: #f4f5f8; border: 1px solid #ebedf1; border-top-left-radius: 3px; }
  .msg.user .bub { background: #7c5cff; color: #fff; border-top-right-radius: 3px; }
  .refs { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px; }
  .ref { font-size: 11px; color: #6b7180; background: #f4f5f8; border: 1px solid #ebedf1; border-radius: 5px; padding: 2px 7px; }
  .typ { display: inline-flex; gap: 3px; } .typ i { width: 5px; height: 5px; border-radius: 50%; background: #b3b8c4; animation: bl 1s infinite; }
  .typ i:nth-child(2) { animation-delay: .2s; } .typ i:nth-child(3) { animation-delay: .4s; }
  @keyframes bl { 0%,100% { opacity: .3 } 50% { opacity: 1 } }
  .comp { display: flex; gap: 8px; margin-top: 12px; }
  .cin { flex: 1; background: #fff; border: 1px solid #e2e4ea; border-radius: 9px; padding: 10px 13px; font: inherit; font-size: 13.5px; }
  .cin:focus { outline: none; border-color: #7c5cff; box-shadow: 0 0 0 2px rgba(124,92,255,.12); }
  .cs { width: 40px; border: 0; border-radius: 9px; cursor: pointer; color: #fff; background: #7c5cff; display: grid; place-items: center; }
  .cs:disabled { opacity: .5; }
  .vhead { font-size: 13px; font-weight: 600; color: #6b7180; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
  .vhead span { background: #f0f1f5; color: #6b7180; border-radius: 999px; padding: 1px 8px; font-size: 12px; }
  .vlist { display: flex; flex-direction: column; gap: 7px; }
  .vrow { display: flex; align-items: center; gap: 11px; padding: 11px 13px; background: #fff; border: 1px solid #ebedf1; border-radius: 10px; }
  .vrow:hover { border-color: #d9dce3; }
  .vth { width: 34px; height: 34px; border-radius: 8px; flex: 0 0 34px; display: grid; place-items: center; color: #7c5cff; background: #efeaff; }
  .vi { flex: 1; min-width: 0; }
  .vt { font-size: 13px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .vm { font-size: 11.5px; color: #9aa0ac; display: flex; align-items: center; gap: 5px; margin-top: 2px; }
  .vlk, .vre { width: 30px; height: 30px; border-radius: 7px; border: 1px solid #e8e9ee; background: #fff; color: #6b7180; display: grid; place-items: center; cursor: pointer; text-decoration: none; }
  .vlk:hover, .vre:hover { color: #7c5cff; border-color: #d3c9ff; background: #faf9ff; }
  .mbg { position: fixed; inset: 0; background: rgba(28,32,42,.4); backdrop-filter: blur(2px); display: grid; place-items: center; z-index: 50; padding: 20px; }
  .modal { width: 100%; max-width: 480px; background: #fff; border-radius: 14px; padding: 20px; box-shadow: 0 24px 60px -16px rgba(28,32,42,.35); }
  .mh { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; } .mh b { font-size: 15px; }
  .x { border: 0; background: transparent; color: #9aa0ac; cursor: pointer; }
  .mrow { display: flex; gap: 8px; margin-top: 10px; }
  .mest { display: flex; gap: 16px; margin-top: 12px; font-size: 12.5px; color: #6b7180; align-items: center; }
  .mest b { color: #1f2430; font-size: 14px; margin-right: 3px; } .mest .c b { color: #7c5cff; }
  .mest.mut { color: #9aa0ac; } .mest.err { color: #e5484d; gap: 7px; }
  .steps { margin-top: 16px; display: flex; flex-direction: column; gap: 2px; }
  .stp { display: flex; align-items: center; gap: 11px; padding: 5px 0; }
  .sdot { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; flex: 0 0 22px; }
  .stp.done .sdot { background: #7c5cff; color: #fff; } .stp.err .sdot { background: #e5484d; color: #fff; }
  .stp.active .sdot { background: #efeaff; } .stp.pend .sdot { background: #f0f1f5; }
  .pd { width: 6px; height: 6px; border-radius: 50%; background: #c3c7d0; }
  .sp { width: 12px; height: 12px; border: 2px solid #d6ccff; border-top-color: #7c5cff; border-radius: 50%; animation: sp .7s linear infinite; }
  @keyframes sp { to { transform: rotate(360deg) } }
  .slb { font-size: 13px; }
  .stp.done .slb, .stp.active .slb { color: #1f2430; font-weight: 500; } .stp.pend .slb { color: #b3b8c4; }
  .sdone { margin-top: 10px; display: flex; align-items: center; gap: 7px; color: #16a34a; font-size: 13px; font-weight: 600; }
  .serr { margin-top: 10px; color: #e5484d; font-size: 12.5px; }
  @media (max-width: 800px) { .shell { grid-template-columns: 1fr; } .side { display: none; } }
`;
