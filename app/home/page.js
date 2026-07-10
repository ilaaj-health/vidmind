"use client";
import { useEffect, useRef, useState } from "react";
import { UserButton, useAuth, useUser, SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";
import { MatIcon, Avatar, UserMsg, AiMsg, Composer } from "../components/ui";

const API = process.env.NEXT_PUBLIC_API_BASE || "";

const STAGES = ["Fetching", "Uploading", "Transcribing", "Chunking", "Feeding to AI"];
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

/* --------------------------------------------------- shared modal chrome */
function Modal({ onClose, wide, children }) {
  return (
    <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm grid place-items-center z-50 p-5" onClick={onClose}>
      <div
        className={`w-full ${wide ? "max-w-3xl" : "max-w-xl"} max-h-[86vh] flex flex-col bg-surface-container-lowest border border-outline-variant editorial-shadow`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
function ModalHead({ kicker, title, onClose }) {
  return (
    <div className="flex justify-between items-start px-8 pt-8 pb-4 shrink-0">
      <div>
        {kicker && (
          <p className="font-mono-label text-mono-label uppercase tracking-widest text-on-surface-variant mb-2">{kicker}</p>
        )}
        <h2 className="font-display-lg text-display-lg-mobile text-primary leading-tight">{title}</h2>
      </div>
      <button className="text-on-surface-variant hover:text-primary transition-colors p-1" onClick={onClose} aria-label="Close">
        <MatIcon name="close" />
      </button>
    </div>
  );
}
function MonoLabel({ children, className = "" }) {
  return <span className={`font-mono-label text-mono-label uppercase tracking-widest ${className}`}>{children}</span>;
}

export default function App() {
  const { getToken } = useAuth();
  const { user, isLoaded } = useUser();
  const [spaces, setSpaces] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [videosOpen, setVideosOpen] = useState(false);
  const [videos, setVideos] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [pOpen, setPOpen] = useState(false);
  const [pForm, setPForm] = useState({ name: "", image_url: "", persona: "", status: "alive" });
  const [creating, setCreating] = useState(false);
  const [cm, setCm] = useState(null);            // chunk modal: { video, chunks, busyId }
  const [search, setSearch] = useState("");
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupBusy, setTopupBusy] = useState(false);
  const [custom, setCustom] = useState("");
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

  const apiDelete = async (p) => (await fetch(API + p, { method: "DELETE", headers: await headers() })).json();

  // Name the auto-created default personality after the signed-in user.
  const displayName = () => {
    const e = user?.primaryEmailAddress?.emailAddress || "";
    return (user?.firstName || user?.username || user?.fullName || e.split("@")[0] || "").trim();
  };
  const loadSpaces = async () => {
    const r = await apiGet(`/api/spaces?name=${encodeURIComponent(displayName())}`).catch(() => ({}));
    if (r.spaces) { setSpaces(r.spaces); setActiveId((id) => id || r.spaces[0]?.id || null); }
  };
  const loadWallet = async () => { const r = await apiGet("/api/wallet").catch(() => ({})); if (r.balance_pkr != null) setWallet(r.balance_pkr); };
  const loadVideos = async (sid) => { const r = await apiGet(`/api/spaces/${sid}/videos`).catch(() => ({})); setVideos(r.videos || []); };

  useEffect(() => { if (isLoaded) { loadSpaces(); loadWallet(); } }, [isLoaded]);
  // Returning from Stripe Checkout: credit the wallet (idempotent) + clean the URL.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("topup") === "ok" && p.get("sid")) {
      (async () => {
        const r = await apiGet(`/api/stripe/confirm?sid=${p.get("sid")}`).catch(() => ({}));
        if (r.balance_pkr != null) setWallet(r.balance_pkr);
        window.history.replaceState({}, "", "/home");
      })();
    }
  }, []);

  const startTopup = async (amount) => {
    if (!amount || amount < 50) return;
    setTopupBusy(true);
    const r = await apiPost("/api/stripe/checkout", { amount_pkr: Number(amount) });
    if (r.url) window.location.href = r.url;
    else { setTopupBusy(false); alert(r.error || "Top-up failed"); }
  };
  useEffect(() => {
    const el = typeof window !== "undefined" ? window.electronAPI : null;
    if (el?.onProgress) el.onProgress((d) => setJob((j) => ({ ...(j || {}), status: "running", step: d.step, progress: d.pct })));
  }, []);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  useEffect(() => { setMsgs([]); if (activeId) loadVideos(activeId); }, [activeId]);

  const createPersonality = async () => {
    const name = (pForm.name || "").trim();
    if (!name || creating) return;                 // guard: block double-submit
    setCreating(true);
    try {
      const s = await apiPost("/api/spaces", { name, persona: pForm.persona || null, image_url: pForm.image_url || null, status: pForm.status });
      if (s.id) { setSpaces((x) => [...x, s]); setActiveId(s.id); }
      setPForm({ name: "", image_url: "", persona: "", status: "alive" }); setPOpen(false);
    } finally {
      setCreating(false);
    }
  };

  const publishPersonality = async () => {
    if (!active || active.publish_status === "pending" || active.publish_status === "published") return;
    await apiPost(`/api/spaces/${active.id}/publish`, {}).catch(() => ({}));
    setSpaces((x) => x.map((p) => (p.id === active.id ? { ...p, publish_status: "pending" } : p)));
  };

  const deletePersonality = async (s) => {
    if (!confirm(`Delete personality "${s.name}"? Iske saare videos aur knowledge hamesha ke liye hat jayenge.`)) return;
    await apiDelete(`/api/spaces/${s.id}`).catch(() => ({}));
    setSpaces((x) => {
      const rest = x.filter((p) => p.id !== s.id);
      if (activeId === s.id) setActiveId(rest[0]?.id || null);
      return rest;
    });
  };

  // Chunk viewer/editor for one video.
  const openChunks = async (v) => {
    setCm({ video: v, chunks: null });
    const r = await apiGet(`/api/spaces/${activeId}/videos/${v.yt_id}/chunks`).catch(() => ({}));
    setCm({ video: v, chunks: r.chunks || [] });
  };
  const editChunkText = (id, text) =>
    setCm((c) => ({ ...c, chunks: c.chunks.map((k) => (k.id === id ? { ...k, text, dirty: true } : k)) }));
  const saveChunk = async (v, k) => {
    setCm((c) => ({ ...c, busyId: k.id }));
    await apiPost("/api/chunks/reembed", { point_id: k.id, text: k.text });
    const r = await apiGet(`/api/spaces/${activeId}/videos/${v.yt_id}/chunks`).catch(() => ({}));
    setCm((c) => ({ ...c, chunks: r.chunks || [], busyId: null }));
  };
  const deleteChunk = async (v, k) => {
    if (!confirm("Is chunk ko delete karein?")) return;
    setCm((c) => ({ ...c, busyId: k.id }));
    await apiPost("/api/chunks/delete", { point_id: k.id, space_id: activeId, yt_id: v.yt_id });
    setCm((c) => ({ ...c, chunks: c.chunks.filter((x) => x.id !== k.id), busyId: null }));
    loadVideos(activeId);
  };

  // Read an image file, resize to a 140px square, store as a compact data URL (no upload server).
  const pickImage = (file) => {
    if (!file) return;
    const rd = new FileReader();
    rd.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const S = 140, c = document.createElement("canvas"); c.width = c.height = S;
        const ctx = c.getContext("2d");
        const sc = Math.max(S / img.width, S / img.height), w = img.width * sc, h = img.height * sc;
        ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
        setPForm((f) => ({ ...f, image_url: c.toDataURL("image/jpeg", 0.82) }));
      };
      img.src = e.target.result;
    };
    rd.readAsDataURL(file);
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
    setJob({ status: "error", step: "Desktop app needed", error: "Adding videos needs the Persona desktop app — a browser can't download from YouTube." });
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

  const stage = stageIndex(job);
  const totalChunks = videos.reduce((n, v) => n + (Number(v.chunks) || 0), 0);
  const maxChunks = Math.max(1, ...videos.map((v) => Number(v.chunks) || 0));

  return (
    <>
      <SignedOut><RedirectToSignIn /></SignedOut>
      <SignedIn>
        <div className="flex h-screen overflow-hidden bg-surface text-on-surface font-body-md selection:bg-primary-fixed">
          {/* ------------------------------------------------ Side Nav */}
          <aside className="hidden md:flex flex-col h-screen py-8 px-4 bg-surface border-r border-outline-variant w-80 shrink-0">
            <div className="mb-6 px-2">
              <h1 className="font-headline-md text-headline-md font-bold text-primary">Persona AI</h1>
              <p className="font-citation text-citation text-secondary">Modern Archive</p>
            </div>

            {/* Wallet */}
            <div className="mb-6 px-2">
              <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant">
                <div className="flex justify-between items-center mb-2">
                  <MonoLabel className="text-on-surface-variant">Wallet Balance</MonoLabel>
                  <MatIcon name="account_balance_wallet" className="text-primary text-sm" />
                </div>
                <div className="text-headline-sm font-headline-sm font-bold mb-3">
                  {wallet == null ? "PKR —" : `PKR ${Number(wallet).toLocaleString()}`}
                </div>
                <button
                  className="w-full py-2 bg-primary text-on-primary font-mono-label text-mono-label uppercase tracking-widest hover:opacity-90 transition-opacity"
                  onClick={() => setTopupOpen(true)}
                >
                  Top Up PKR
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-4 px-2">
              <MatIcon name="search" className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]" />
              <input
                className="w-full pl-10 pr-4 py-2 bg-surface-container rounded-lg border-none outline-none focus:ring-1 focus:ring-primary font-body-md text-sm"
                placeholder="Search Personalities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Personalities */}
            <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 py-1">
              <MonoLabel className="text-on-surface-variant mb-2 block">Personalities</MonoLabel>
              {spaces.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())).map((s) => {
                const dead = s.status === "deceased";
                const on = s.id === activeId;
                return (
                  <div
                    key={s.id}
                    className={`${on ? "active-persona" : "hover:bg-surface-container-low"} group flex items-center gap-3 p-3 cursor-pointer transition-colors duration-200`}
                    onClick={() => setActiveId(s.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <Avatar name={s.name} image={s.image_url} grayscale={dead} className={`w-10 h-10 ${dead ? "opacity-80" : ""}`} textClass="text-base" />
                    <div className="flex-1 min-w-0">
                      <p className={`truncate ${on ? "font-bold text-primary" : "font-medium text-secondary"}`}>{s.name}</p>
                      <p className={`text-xs text-on-surface-variant ${dead ? "italic" : ""}`}>
                        {dead ? "In Memory" : "Alive"} · {s.videos} {s.videos === 1 ? "video" : "videos"}
                      </p>
                    </div>
                    {!dead && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />}
                    <button
                      className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error transition-all p-1 shrink-0"
                      title="Delete personality"
                      onClick={(e) => { e.stopPropagation(); deletePersonality(s); }}
                    >
                      <MatIcon name="delete" className="text-[18px]" />
                    </button>
                  </div>
                );
              })}
              <button
                className="w-full flex items-center gap-3 p-3 mt-1 border border-dashed border-outline-variant text-secondary hover:text-primary hover:border-primary transition-colors"
                onClick={() => setPOpen(true)}
              >
                <MatIcon name="person_add" className="text-[20px]" />
                <span className="font-body-md text-sm">New Personality</span>
              </button>
            </nav>

            {/* Footer */}
            <div className="mt-auto pt-4 border-t border-outline-variant px-2 space-y-1">
              <a href="/explore" className="flex items-center gap-3 p-2 text-secondary hover:text-primary cursor-pointer transition-all no-underline">
                <MatIcon name="language" />
                <span className="font-body-md text-sm">Explore the Archive</span>
              </a>
              <div className="flex items-center gap-3 p-2 text-secondary">
                <UserButton afterSignOutUrl="/" />
                <span className="font-body-md text-sm">Account</span>
              </div>
            </div>
          </aside>

          {/* ------------------------------------------------ Main */}
          <main className="flex-1 flex flex-col relative overflow-hidden bg-white min-w-0">
            {/* Top bar */}
            <header className="flex justify-between items-center w-full px-6 lg:px-margin-desktop h-16 bg-surface-container-lowest border-b border-outline-variant shadow-sm z-10 shrink-0 gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <Avatar name={active?.name} image={active?.image_url} grayscale={active?.status === "deceased"} className="w-8 h-8" textClass="text-sm" />
                <div className="min-w-0">
                  <h2 className="font-headline-sm text-headline-sm text-primary leading-none truncate">{active ? active.name : "…"}</h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${active?.status === "deceased" ? "bg-outline" : "bg-emerald-500"}`} />
                    <span className="text-[10px] font-mono-label uppercase tracking-widest text-on-surface-variant truncate">
                      {active?.status === "deceased" ? "In Memory / Archive" : "Alive / Streaming"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="flex gap-2">
                  <button
                    className="px-4 py-1.5 border border-outline-variant hover:bg-surface-container-low transition-all text-sm font-medium flex items-center gap-2 active:scale-95"
                    onClick={() => { setJob(null); setAddOpen(true); }}
                  >
                    <MatIcon name="video_call" className="text-sm" />
                    <span className="hidden sm:inline">Add Video</span>
                  </button>
                  <button
                    className="px-4 py-1.5 border border-outline-variant hover:bg-surface-container-low transition-all text-sm font-medium flex items-center gap-2 active:scale-95"
                    onClick={() => { loadVideos(activeId); setVideosOpen(true); }}
                  >
                    <MatIcon name="library_books" className="text-sm" />
                    <span className="hidden sm:inline">Knowledge{videos.length ? ` · ${videos.length}` : ""}</span>
                  </button>
                  {active && (active.publish_status === "published" ? (
                    <span className="px-4 py-1.5 border border-outline-variant text-sm font-medium flex items-center gap-2 text-secondary">
                      <MatIcon name="check_circle" className="text-sm" /> <span className="hidden sm:inline">Published</span>
                    </span>
                  ) : active.publish_status === "pending" ? (
                    <span className="px-4 py-1.5 border border-outline-variant text-sm font-medium flex items-center gap-2 text-secondary">
                      <MatIcon name="hourglass_empty" className="text-sm" /> <span className="hidden sm:inline">Pending Review</span>
                    </span>
                  ) : (
                    <button
                      className="px-5 py-1.5 bg-primary text-on-primary hover:opacity-90 transition-all text-sm font-medium flex items-center gap-2 active:scale-95"
                      onClick={publishPersonality}
                      title="Submit for review to appear in the public gallery"
                    >
                      <MatIcon name="publish" className="text-sm" />
                      <span className="hidden sm:inline">Publish</span>
                    </button>
                  ))}
                </div>
              </div>
            </header>

            {/* Chat canvas */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-margin-desktop">
              <div className="max-w-[800px] mx-auto space-y-12">
                {msgs.length === 0 && (
                  <div className="pt-16 text-center">
                    <Avatar name={active?.name} image={active?.image_url} className="w-16 h-16 mx-auto mb-6" textClass="text-2xl" />
                    <p className="font-display-lg text-display-lg-mobile text-primary mb-3">
                      Inquire of {active?.name || "the archive"}.
                    </p>
                    <p className="font-body-md text-body-md text-on-surface-variant max-w-md mx-auto">
                      {active?.persona || "Ask anything about their videos — cited answers in any language."}
                    </p>
                  </div>
                )}
                {msgs.map((m, i) =>
                  m.who === "user"
                    ? <UserMsg key={i} text={m.text} />
                    : <AiMsg key={i} text={m.text} refs={m.refs} typing={m.typing} />
                )}
                <div ref={end} />
              </div>
            </div>

            {/* Composer */}
            <Composer
              value={q}
              onChange={setQ}
              onSend={ask}
              busy={busy}
              placeholder={`Ask ${active?.name || "the archive"}...`}
            />
          </main>

          {/* ------------------------------------------------ Knowledge modal */}
          {videosOpen && (
            <Modal wide onClose={() => setVideosOpen(false)}>
              <ModalHead kicker={active?.name} title="Knowledge Base" onClose={() => setVideosOpen(false)} />
              <div className="px-8 pb-2 flex items-end justify-between gap-6 shrink-0">
                <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
                  Every chunk is a vetted fragment that informs the <span className="italic">{active?.name}</span> persona.
                </p>
                <div className="flex gap-6 shrink-0">
                  <div className="text-right">
                    <MonoLabel className="block text-on-surface-variant opacity-60">Total Chunks</MonoLabel>
                    <span className="text-headline-sm font-headline-sm text-primary">{totalChunks.toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <MonoLabel className="block text-on-surface-variant opacity-60">Source Videos</MonoLabel>
                    <span className="text-headline-sm font-headline-sm text-primary">{videos.length}</span>
                  </div>
                </div>
              </div>
              {videos.length === 0 ? (
                <div className="px-8 py-14 text-center">
                  <MatIcon name="library_books" className="text-4xl text-outline" />
                  <p className="font-headline-sm text-headline-sm mt-4 mb-1">The archive is empty</p>
                  <p className="font-body-md text-body-md text-on-surface-variant mb-6">Ingest a YouTube video to give this personality knowledge.</p>
                  <button
                    className="bg-primary text-on-primary px-6 py-2 font-bold hover:opacity-90 active:scale-95 transition-all text-sm inline-flex items-center gap-2"
                    onClick={() => { setVideosOpen(false); setJob(null); setAddOpen(true); }}
                  >
                    <MatIcon name="upload" className="text-sm" /> INGEST NEW SOURCE
                  </button>
                </div>
              ) : (
                <>
                  <div className="mx-8 mt-4 mb-2 overflow-y-auto custom-scrollbar border border-outline-variant bg-surface-container-lowest">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="bg-surface-container-low border-b border-outline-variant">
                          <th className="px-6 py-4 font-mono-label text-on-surface-variant uppercase tracking-widest text-[10px] font-semibold">Source Identity &amp; Title</th>
                          <th className="px-6 py-4 font-mono-label text-on-surface-variant uppercase tracking-widest text-[10px] font-semibold">Archived</th>
                          <th className="px-6 py-4 font-mono-label text-on-surface-variant uppercase tracking-widest text-[10px] font-semibold">Semantic Chunks</th>
                          <th className="px-6 py-4 font-mono-label text-on-surface-variant uppercase tracking-widest text-[10px] font-semibold text-right">Laboratory Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/30">
                        {videos.map((v) => (
                          <tr key={v.id} className="hover:bg-surface-container-low/50 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                <div className="w-16 h-10 bg-surface-container-high relative overflow-hidden flex-shrink-0 flex items-center justify-center">
                                  <MatIcon name="smart_display" className="text-on-surface-variant" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-headline-sm text-base text-primary truncate max-w-[260px]">{v.title}</p>
                                  <p className="font-citation text-citation text-on-surface-variant opacity-60">Source ID: {v.yt_id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 align-middle">
                              <span className="text-on-surface-variant font-mono-label text-mono-label uppercase">{timeAgo(v.created_at)}</span>
                            </td>
                            <td className="px-6 py-4 align-middle">
                              <div className="flex items-center gap-2">
                                <span className="text-primary font-bold">{v.chunks}</span>
                                <div className="h-1 w-24 bg-surface-container-high rounded-full overflow-hidden">
                                  <div className="h-full bg-primary" style={{ width: `${Math.round(((Number(v.chunks) || 0) / maxChunks) * 100)}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <button className="opacity-60 hover:opacity-100 hover:bg-surface-container text-on-surface p-2 transition-all" title="View & edit chunks" onClick={() => openChunks(v)}>
                                <MatIcon name="segment" className="text-[20px]" />
                              </button>
                              {v.url && (
                                <a className="inline-block opacity-60 hover:opacity-100 hover:bg-surface-container text-on-surface p-2 transition-all" href={v.url} target="_blank" rel="noreferrer" title="Open source">
                                  <MatIcon name="open_in_new" className="text-[20px]" />
                                </a>
                              )}
                              <button className="opacity-60 hover:opacity-100 hover:bg-surface-container text-primary p-2 transition-all" title="Re-process whole video" onClick={() => process(v.url, true)}>
                                <MatIcon name="refresh" className="text-[20px]" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-8 py-4 flex justify-end shrink-0">
                    <button
                      className="bg-primary text-on-primary px-6 py-2 font-bold hover:opacity-90 active:scale-95 transition-all text-sm flex items-center gap-2"
                      onClick={() => { setVideosOpen(false); setJob(null); setAddOpen(true); }}
                    >
                      <MatIcon name="upload" className="text-sm" /> INGEST NEW SOURCE
                    </button>
                  </div>
                </>
              )}
            </Modal>
          )}

          {/* ------------------------------------------------ Add video modal */}
          {addOpen && (
            <Modal onClose={() => setAddOpen(false)}>
              <ModalHead kicker="Expand the archive" title="Ingest Source Material" onClose={() => setAddOpen(false)} />
              <div className="px-8 pb-8 overflow-y-auto custom-scrollbar">
                <p className="font-body-md text-body-md text-on-surface-variant mb-6">
                  Feed this Persona high-quality video content — a single video or a whole channel.
                </p>
                <label className="block font-mono-label text-mono-label text-secondary mb-2 uppercase tracking-widest">
                  YouTube Playlist or Video URL
                </label>
                <div className="relative flex items-center mb-4">
                  <MatIcon name="link" className="absolute left-4 text-outline" />
                  <input
                    className="w-full bg-white border border-outline-variant pl-12 pr-28 py-4 outline-none focus:ring-1 focus:ring-primary focus:border-primary font-body-md text-sm"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=…  or a channel"
                  />
                  <button
                    className="absolute right-2 bg-primary text-on-primary px-5 py-2 font-bold hover:opacity-90 transition-opacity text-sm"
                    onClick={estimate}
                  >
                    Analyze
                  </button>
                </div>

                {est?.loading && <p className="font-citation text-citation text-on-surface-variant mb-4">Scanning the source…</p>}
                {est?.error && (
                  <div className="flex items-center gap-3 mb-4">
                    <span className="bg-error-container text-on-error-container px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Note</span>
                    <p className="font-citation text-citation text-on-surface-variant">{est.error}</p>
                  </div>
                )}
                {est && !est.loading && !est.error && (
                  <div className="glass-lab p-6 border-l-4 border-l-tertiary mb-6">
                    <h3 className="font-headline-sm text-headline-sm text-primary mb-1">Transcription Estimate</h3>
                    <p className="font-citation text-citation text-on-surface-variant mb-6">Calculated from the source's length and content depth.</p>
                    <div className="grid grid-cols-3 gap-6">
                      <div className="space-y-1">
                        <MonoLabel className="text-secondary">Volume</MonoLabel>
                        <p className="font-display-lg text-display-lg-mobile text-primary">
                          {est.count} <span className="text-body-md font-normal font-sans">video{est.count === 1 ? "" : "s"}</span>
                        </p>
                      </div>
                      <div className="space-y-1">
                        <MonoLabel className="text-secondary">Duration</MonoLabel>
                        <p className="font-display-lg text-display-lg-mobile text-primary">
                          {est.total_minutes} <span className="text-body-md font-normal font-sans">min</span>
                        </p>
                      </div>
                      <div className="space-y-1">
                        <MonoLabel className="text-secondary">Est. Cost</MonoLabel>
                        <p className="font-display-lg text-display-lg-mobile text-primary">
                          ${est.est_cost_usd} <span className="text-body-md font-normal font-sans">USD</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-6">
                  <button
                    className="bg-primary text-on-primary px-8 py-4 font-bold flex items-center gap-3 transition-all active:scale-95 shadow-lg disabled:opacity-50"
                    onClick={() => process()}
                    disabled={submitting}
                  >
                    {submitting ? "Processing…" : "Confirm & Start Processing"} <MatIcon name="bolt" />
                  </button>
                </div>

                <div className="border-l-2 border-primary pl-6 py-4 mt-6">
                  <p className="font-citation text-citation italic text-secondary mb-1">Technical Prerequisite</p>
                  <p className="font-body-md text-sm text-on-surface">
                    "The act of digital preservation requires a dedicated computational environment." Ensure the{" "}
                    <strong>Persona Desktop Client</strong> is active — a browser can't download from YouTube.
                  </p>
                </div>

                {/* Stage timeline (Video Processing screen) */}
                {job && (
                  <div className="mt-8">
                    <MonoLabel className="text-on-surface-variant mb-6 block">Stage Timeline</MonoLabel>
                    <div className="space-y-6 relative">
                      <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-outline-variant" />
                      {STAGES.map((s, i) => {
                        const st = stage === STAGES.length ? "done" : stage === -2 ? (i === 0 ? "err" : "pend") : i < stage ? "done" : i === stage ? "active" : "pend";
                        return (
                          <div key={s} className={`flex gap-4 relative z-10 ${st === "pend" ? "opacity-50" : ""}`}>
                            {st === "done" ? (
                              <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                                <MatIcon name="check" className="text-sm" />
                              </div>
                            ) : st === "err" ? (
                              <div className="w-6 h-6 rounded-full bg-error text-white flex items-center justify-center shrink-0">
                                <MatIcon name="priority_high" className="text-sm" />
                              </div>
                            ) : st === "active" ? (
                              <div className="w-6 h-6 rounded-full bg-white border-2 border-primary flex items-center justify-center shrink-0">
                                <span className="w-2 h-2 bg-primary rounded-full animate-ping" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-surface-container-highest border border-outline-variant shrink-0" />
                            )}
                            <div>
                              <p className={`font-bold ${st === "active" ? "text-primary" : st === "pend" ? "text-on-surface-variant" : "text-on-surface"}`}>{s}</p>
                              <p className={`font-citation text-citation ${st === "active" ? "text-primary italic" : "text-on-surface-variant"}`}>
                                {st === "done" ? "Status: Done" : st === "active" ? (job.step || "In-progress…") : st === "err" ? "Failed" : "Pending"}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {job.status === "done" && (
                      <div className="bg-primary text-on-primary py-3 px-4 mt-6 flex items-center gap-3">
                        <MatIcon name="cloud_done" />
                        <span className="font-headline-sm text-base">Processing Complete — ready to chat.</span>
                      </div>
                    )}
                    {job.status === "error" && (
                      <div className="border-l-2 border-error pl-4 py-2 mt-6">
                        <p className="font-mono-label text-mono-label uppercase tracking-widest text-error mb-1">Error</p>
                        <p className="font-body-md text-sm text-on-surface">{job.error}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Modal>
          )}

          {/* ------------------------------------------------ Chunk editor modal */}
          {cm && (
            <Modal wide onClose={() => setCm(null)}>
              <ModalHead kicker={`Source: ${cm.video.yt_id}`} title={cm.video.title} onClose={() => setCm(null)} />
              <div className="px-8 pb-2 flex items-center gap-4 shrink-0">
                <MonoLabel className="text-primary">{cm.chunks ? `${cm.chunks.length} chunks` : "Loading…"}</MonoLabel>
                <div className="h-4 w-px bg-outline-variant" />
                <span className="text-secondary text-citation font-citation flex items-center gap-1">
                  <MatIcon name="check_circle" className="text-[14px]" /> Edits re-embed instantly
                </span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-4 space-y-4">
                {cm.chunks == null ? (
                  <p className="font-citation text-citation text-on-surface-variant">Loading chunks…</p>
                ) : cm.chunks.length === 0 ? (
                  <p className="font-citation text-citation text-on-surface-variant">Is video ke koi chunks nahi mile.</p>
                ) : (
                  cm.chunks.map((k) => (
                    <div key={k.id} className={`border p-5 bg-white transition-all ${k.dirty ? "border-primary ring-1 ring-primary shadow-lg" : "border-outline-variant hover:border-primary/50"}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 font-mono-label text-[10px] ${k.dirty ? "bg-primary text-on-primary" : "bg-surface-container-highest text-secondary"}`}>
                            {k.dirty ? "EDITED" : `#${String((k.idx ?? 0) + 1).padStart(3, "0")}`}
                          </span>
                        </div>
                        <div className="flex gap-3">
                          <button
                            className="text-secondary hover:text-primary flex items-center gap-1 text-citation font-citation disabled:opacity-40"
                            disabled={cm.busyId === k.id || !k.dirty}
                            onClick={() => saveChunk(cm.video, k)}
                          >
                            <MatIcon name="save" className="text-[16px]" /> {cm.busyId === k.id ? "Saving…" : "Save & re-embed"}
                          </button>
                          <button
                            className="text-error hover:opacity-70 flex items-center gap-1 text-citation font-citation disabled:opacity-40"
                            disabled={cm.busyId === k.id}
                            onClick={() => deleteChunk(cm.video, k)}
                          >
                            <MatIcon name="delete" className="text-[16px]" /> Delete
                          </button>
                        </div>
                      </div>
                      <textarea
                        className="w-full font-body-md text-[15px] text-on-surface border-none outline-none focus:ring-0 leading-relaxed resize-vertical min-h-[72px] bg-transparent"
                        value={k.text}
                        onChange={(e) => editChunkText(k.id, e.target.value)}
                      />
                    </div>
                  ))
                )}
              </div>
            </Modal>
          )}

          {/* ------------------------------------------------ New personality modal */}
          {pOpen && (
            <Modal onClose={() => setPOpen(false)}>
              <ModalHead kicker="Define a new voice" title="Ingest New Personality" onClose={() => setPOpen(false)} />
              <div className="px-8 pb-8 overflow-y-auto custom-scrollbar space-y-8">
                <div>
                  <h3 className="font-headline-sm text-headline-sm mb-1">Identity &amp; Image</h3>
                  <p className="citation-line pl-4 font-citation text-citation text-on-surface-variant mb-4">
                    Upload a visual representation. Square format preferred for archival consistency.
                  </p>
                  <div className="flex items-center gap-6">
                    <label className="relative group cursor-pointer shrink-0">
                      <div className="w-28 h-28 rounded-xl bg-surface-container border-2 border-dashed border-outline-variant flex flex-col items-center justify-center overflow-hidden group-hover:border-primary transition-colors">
                        {pForm.image_url ? (
                          <img src={pForm.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <MatIcon name="add_a_photo" className="text-outline text-[36px]" />
                            <span className="text-[10px] uppercase tracking-widest font-bold text-outline mt-2">Upload</span>
                          </>
                        )}
                      </div>
                      <input type="file" accept="image/*" hidden onChange={(e) => pickImage(e.target.files?.[0])} />
                    </label>
                    <div className="flex-1">
                      <label className="block font-mono-label text-mono-label text-secondary mb-2 uppercase tracking-widest">Full Archival Name</label>
                      <input
                        autoFocus
                        className="w-full bg-white border border-outline-variant rounded-lg py-3 px-4 outline-none focus:ring-2 focus:ring-primary focus:border-primary font-body-md text-sm"
                        placeholder="e.g. Sahil Adeem"
                        value={pForm.name}
                        onChange={(e) => setPForm({ ...pForm, name: e.target.value })}
                        onKeyDown={(e) => e.key === "Enter" && createPersonality()}
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-outline-variant opacity-50" />

                <div>
                  <h3 className="font-headline-sm text-headline-sm mb-1">Cognitive Logic</h3>
                  <p className="citation-line pl-4 font-citation text-citation text-on-surface-variant mb-4">
                    Describe the linguistic framework — this dictates the persona's tone of reply.
                  </p>
                  <label className="block font-mono-label text-mono-label text-secondary mb-2 uppercase tracking-widest">Persona &amp; Tone Description (optional)</label>
                  <textarea
                    className="w-full bg-white border border-outline-variant rounded-lg py-3 px-4 outline-none focus:ring-2 focus:ring-primary focus:border-primary font-body-md text-sm min-h-[88px] resize-vertical"
                    placeholder="e.g. Analytic and firm. Speaks in short, declarative sentences, avoids contemporary slang."
                    value={pForm.persona}
                    onChange={(e) => setPForm({ ...pForm, persona: e.target.value })}
                  />
                </div>

                <hr className="border-outline-variant opacity-50" />

                <div>
                  <h3 className="font-headline-sm text-headline-sm mb-1">Temporal Status</h3>
                  <div className="bg-surface-container p-5 rounded-xl flex items-center justify-between mt-4">
                    <div>
                      <p className="font-body-md font-bold text-primary mb-0.5">{pForm.status === "alive" ? "Active / Alive" : "In Memory"}</p>
                      <p className="font-citation text-citation text-secondary">Toggle off for historical personalities from the archive.</p>
                    </div>
                    <div className="relative inline-block w-14 h-8 align-middle select-none shrink-0">
                      <input
                        type="checkbox"
                        id="temporal-toggle"
                        checked={pForm.status === "alive"}
                        onChange={(e) => setPForm({ ...pForm, status: e.target.checked ? "alive" : "deceased" })}
                        className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-2 border-outline-variant appearance-none cursor-pointer top-1 left-1 checked:left-7 transition-all"
                      />
                      <label htmlFor="temporal-toggle" className="toggle-label block overflow-hidden h-8 rounded-full bg-outline-variant/40 cursor-pointer" />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-6">
                  <div className="flex items-center gap-2 text-secondary min-w-0">
                    <MatIcon name="lock" className="text-[18px]" />
                    <span className="text-[11px] font-mono-label uppercase tracking-widest truncate">Private until you publish</span>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <button className="px-6 py-3 rounded-lg border border-outline-variant text-primary font-bold hover:bg-surface-container transition-colors" onClick={() => setPOpen(false)}>
                      Discard
                    </button>
                    <button
                      className="px-8 py-3 rounded-lg bg-primary text-on-primary font-bold shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                      onClick={createPersonality}
                      disabled={creating}
                    >
                      {creating ? "Creating…" : "Create Personality"}
                    </button>
                  </div>
                </div>
              </div>
            </Modal>
          )}

          {/* ------------------------------------------------ Top-up modal */}
          {topupOpen && (
            <Modal onClose={() => setTopupOpen(false)}>
              <ModalHead kicker="Modern archive wallet" title="Top Up Funds" onClose={() => setTopupOpen(false)} />
              <div className="px-8 pb-8 overflow-y-auto custom-scrollbar">
                <div className="mb-8 border-b border-outline-variant pb-6">
                  <h3 className="font-headline-sm text-base text-on-surface mb-1">Available Balance</h3>
                  <p className="font-citation text-citation text-on-surface-variant mb-3">
                    Secured for computational processing and persona interactions.
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display-lg text-display-lg-mobile text-primary tracking-tighter">
                      {wallet == null ? "—" : Number(wallet).toLocaleString()}
                    </span>
                    <span className="font-headline-sm text-headline-sm text-secondary">PKR</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  {[200, 500, 1000, 2000].map((a, i) => (
                    <button
                      key={a}
                      className="group p-4 border border-outline-variant hover:border-primary hover:ring-1 hover:ring-primary transition-all flex flex-col items-center gap-1 bg-surface-container-lowest disabled:opacity-50"
                      disabled={topupBusy}
                      onClick={() => startTopup(a)}
                    >
                      <span className="font-citation text-citation text-secondary group-hover:text-primary transition-colors">Tier {["I", "II", "III", "IV"][i]}</span>
                      <span className="font-headline-sm text-headline-sm text-primary">{a.toLocaleString()}</span>
                      <span className="font-mono-label text-mono-label text-outline">PKR</span>
                    </button>
                  ))}
                </div>

                <div className="p-5 bg-surface-container-low rounded border border-outline-variant">
                  <label className="block font-mono-label text-mono-label uppercase tracking-widest text-secondary mb-3">Custom Allocation</label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-grow">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary font-headline-sm">Rs.</span>
                      <input
                        type="number"
                        className="w-full bg-white border border-outline-variant pl-14 pr-4 py-3.5 font-headline-sm text-lg outline-none focus:border-primary focus:ring-0"
                        placeholder="0"
                        value={custom}
                        onChange={(e) => setCustom(e.target.value)}
                      />
                    </div>
                    <button
                      className="bg-stripe text-white px-6 py-3.5 font-bold hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"
                      disabled={topupBusy || !custom}
                      onClick={() => startTopup(custom)}
                    >
                      <MatIcon name="lock" className="text-[16px]" /> {topupBusy ? "…" : "Pay with Stripe"}
                    </button>
                  </div>
                  <p className="font-citation text-citation text-on-surface-variant mt-3">
                    Minimum Rs 50 · secure payment via Stripe (test mode).
                  </p>
                </div>
              </div>
            </Modal>
          )}
        </div>
      </SignedIn>
    </>
  );
}
