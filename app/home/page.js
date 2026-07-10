"use client";
import { useEffect, useRef, useState } from "react";
import { useAuth, useUser, useClerk, SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";
import { MatIcon, Avatar, UserMsg, AiMsg, Composer, Spinner, ytAt, mmss } from "../components/ui";

const API = process.env.NEXT_PUBLIC_API_BASE || "";
const DOWNLOAD_URL =
  "https://github.com/ilaaj-health/vidmind/releases/download/v0.1.0/VidMind-win32-x64.zip";

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
const clock = () => new Date().toTimeString().slice(0, 8);

function MonoLabel({ children, className = "" }) {
  return <span className={`font-mono-label text-mono-label uppercase tracking-widest ${className}`}>{children}</span>;
}

/* Two-click inline delete (no dialogs): first click arms, second confirms. */
function ArmDelete({ armed, onArm, onConfirm, busy, label = "Delete", className = "" }) {
  return armed ? (
    <button
      className={`flex items-center gap-1 text-citation font-citation font-bold text-white bg-error px-2 py-0.5 disabled:opacity-50 ${className}`}
      disabled={busy}
      onClick={onConfirm}
    >
      {busy ? <Spinner className="w-3 h-3" /> : <MatIcon name="warning" className="text-[14px]" />} Confirm?
    </button>
  ) : (
    <button
      className={`flex items-center gap-1 text-citation font-citation text-error hover:opacity-70 disabled:opacity-40 ${className}`}
      disabled={busy}
      onClick={onArm}
    >
      <MatIcon name="delete" className="text-[16px]" /> {label}
    </button>
  );
}

export default function App() {
  const { getToken } = useAuth();
  const { user, isLoaded } = useUser();
  const clerk = useClerk();

  const [view, setView] = useState("chat");            // chat | ingest | processing | knowledge | chunks | wallet | personality
  const [spaces, setSpaces] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [videos, setVideos] = useState([]);
  const [pForm, setPForm] = useState({ name: "", image_url: "", persona: "", status: "alive" });
  const [creating, setCreating] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteArm, setDeleteArm] = useState(null);    // personality id armed for delete
  const [deleteBusy, setDeleteBusy] = useState(null);

  // knowledge view
  const [kbSearch, setKbSearch] = useState("");
  const [kbSortDesc, setKbSortDesc] = useState(true);
  const [kbPage, setKbPage] = useState(0);
  const [reprocessBusy, setReprocessBusy] = useState(null);

  // chunk editor view
  const [chunkVideo, setChunkVideo] = useState(null);  // the video whose chunks are open
  const [chunks, setChunks] = useState(null);
  const [chunkBusy, setChunkBusy] = useState(null);
  const [chunkArm, setChunkArm] = useState(null);
  const [chunkFilter, setChunkFilter] = useState("");
  const [confirmingAll, setConfirmingAll] = useState(false);

  // wallet view
  const [topupBusy, setTopupBusy] = useState(false);
  const [amount, setAmount] = useState(500);
  const [custom, setCustom] = useState("");

  // ingest / processing
  const [url, setUrl] = useState("");
  const [est, setEst] = useState(null);
  const [job, setJob] = useState(null);
  const [jobTitle, setJobTitle] = useState("");
  const [jobLog, setJobLog] = useState([]);            // [{t, msg, err}] client-observed + server lines
  const [stepCards, setStepCards] = useState([]);      // distinct step messages, latest last
  const [submitting, setSubmitting] = useState(false);

  // chat
  const [q, setQ] = useState("");
  const [msgs, setMsgs] = useState([]);
  const [busy, setBusy] = useState(false);
  const end = useRef(null);
  const seenLog = useRef(new Set());

  const headers = async () => {
    const t = await getToken().catch(() => null);
    return t ? { Authorization: `Bearer ${t}` } : {};
  };
  const apiGet = async (p) => (await fetch(API + p, { headers: await headers() })).json();
  const apiPost = async (p, b) => (await fetch(API + p, {
    method: "POST", headers: { "Content-Type": "application/json", ...(await headers()) }, body: JSON.stringify(b),
  })).json();
  const apiDelete = async (p) => (await fetch(API + p, { method: "DELETE", headers: await headers() })).json();

  const active = spaces.find((s) => s.id === activeId);

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

  const startTopup = async (amt) => {
    if (!amt || amt < 50 || topupBusy) return;
    setTopupBusy(true);
    const r = await apiPost("/api/stripe/checkout", { amount_pkr: Number(amt) });
    if (r.url) window.location.href = r.url;
    else { setTopupBusy(false); alert(r.error || "Top-up failed"); }
  };

  // Live progress from the desktop app: drive the processing dashboard with real events.
  useEffect(() => {
    const el = typeof window !== "undefined" ? window.electronAPI : null;
    if (!el?.onProgress) return;
    el.onProgress((d) => {
      setJob((j) => ({ ...(j || {}), status: "running", step: d.step, progress: d.pct }));
      if (d.title) setJobTitle(d.title);
      if (d.step) {
        setStepCards((cards) => (cards[cards.length - 1]?.msg === d.step ? cards : [...cards, { t: clock(), msg: d.step }]));
        setJobLog((log) => (log[log.length - 1]?.msg === d.step ? log : [...log, { t: clock(), msg: d.step }]));
      }
      for (const line of d.log || []) {
        if (!seenLog.current.has(line)) {
          seenLog.current.add(line);
          setJobLog((log) => [...log, { t: clock(), msg: line, server: true }]);
        }
      }
    });
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
      setPForm({ name: "", image_url: "", persona: "", status: "alive" });
      setView("chat");
    } finally {
      setCreating(false);
    }
  };

  const publishPersonality = async () => {
    if (!active || publishBusy || active.publish_status === "pending" || active.publish_status === "published") return;
    setPublishBusy(true);
    await apiPost(`/api/spaces/${active.id}/publish`, {}).catch(() => ({}));
    setSpaces((x) => x.map((p) => (p.id === active.id ? { ...p, publish_status: "pending" } : p)));
    setPublishBusy(false);
  };

  const deletePersonality = async (s) => {
    setDeleteBusy(s.id);
    await apiDelete(`/api/spaces/${s.id}`).catch(() => ({}));
    setSpaces((x) => {
      const rest = x.filter((p) => p.id !== s.id);
      if (activeId === s.id) setActiveId(rest[0]?.id || null);
      return rest;
    });
    setDeleteBusy(null); setDeleteArm(null);
  };

  // ---- chunk editor (full-screen view) ----
  const openChunks = async (v) => {
    setChunkVideo(v); setChunks(null); setChunkFilter(""); setView("chunks");
    const r = await apiGet(`/api/spaces/${activeId}/videos/${v.yt_id}/chunks`).catch(() => ({}));
    setChunks(r.chunks || []);
  };
  const editChunkText = (id, text) =>
    setChunks((c) => c.map((k) => (k.id === id ? { ...k, text, dirty: true } : k)));
  const saveChunk = async (k) => {
    setChunkBusy(k.id);
    await apiPost("/api/chunks/reembed", { point_id: k.id, text: k.text });
    setChunks((c) => c.map((x) => (x.id === k.id ? { ...x, dirty: false } : x)));
    setChunkBusy(null);
  };
  const deleteChunk = async (k) => {
    setChunkBusy(k.id);
    await apiPost("/api/chunks/delete", { point_id: k.id, space_id: activeId, yt_id: chunkVideo.yt_id });
    setChunks((c) => c.filter((x) => x.id !== k.id));
    setChunkBusy(null); setChunkArm(null);
    loadVideos(activeId);
  };
  const confirmAll = async () => {
    const dirty = (chunks || []).filter((k) => k.dirty);
    if (!dirty.length || confirmingAll) return;
    setConfirmingAll(true);
    for (const k of dirty) { await saveChunk(k); }
    setConfirmingAll(false);
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

  const estimate = async () => { if (!url.trim() || est?.loading) return; setEst({ loading: true }); setEst(await apiPost("/api/estimate", { url })); };

  const process = async (link, reprocess) => {
    link = (link || url).trim();
    if (!link) return;
    const el = typeof window !== "undefined" ? window.electronAPI : null;
    if (el?.isElectron) {
      setSubmitting(true);
      if (reprocess) setReprocessBusy(link);
      seenLog.current = new Set();
      setJobTitle(""); setStepCards([]); setJobLog([{ t: clock(), msg: "Ingestion requested" }]);
      setJob({ status: "running", step: "Starting…", progress: 0 });
      setView("processing");
      try {
        const token = await getToken().catch(() => null);
        const result = await el.processYouTube(link, token, activeId);
        setJob({ ...result, status: "done", progress: 100, step: "Done" });
        setJobLog((log) => [...log, { t: clock(), msg: "Ingestion finished — chunks are live." }]);
        if (!reprocess) { setUrl(""); setEst(null); }
        loadWallet(); loadSpaces(); loadVideos(activeId);
      } catch (e) {
        setJob({ status: "error", step: "Failed", error: String(e?.message || e) });
        setJobLog((log) => [...log, { t: clock(), msg: String(e?.message || e), err: true }]);
      }
      setSubmitting(false); setReprocessBusy(null);
      return;
    }
    setJob({ status: "error", step: "Desktop app needed", error: "Adding videos needs the Persona desktop app — a browser can't download from YouTube." });
    setJobLog([{ t: clock(), msg: "Desktop client not detected.", err: true }]);
    setView("processing");
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

  // knowledge table data (search + sort + pagination — all client-side, all real)
  const PAGE = 8;
  const kbRows = videos
    .filter((v) => (v.title || "").toLowerCase().includes(kbSearch.toLowerCase()) || (v.yt_id || "").includes(kbSearch))
    .sort((a, b) => (kbSortDesc ? new Date(b.created_at) - new Date(a.created_at) : new Date(a.created_at) - new Date(b.created_at)));
  const kbPages = Math.max(1, Math.ceil(kbRows.length / PAGE));
  const kbSlice = kbRows.slice(kbPage * PAGE, kbPage * PAGE + PAGE);

  /* ---------------------------------------------------------------- sidebar */
  const NavItem = ({ icon, label, target, onClick }) => {
    const on = view === target;
    return (
      <button
        className={`w-full flex items-center gap-3 px-4 py-3 transition-colors duration-200 ${on ? "text-primary font-bold border-r-2 border-primary bg-surface-container-low" : "text-secondary hover:bg-surface-container-low"}`}
        onClick={onClick || (() => setView(target))}
      >
        <MatIcon name={icon} />
        <span className="font-body-md text-[15px]">{label}</span>
      </button>
    );
  };

  const sidebar = (
    <aside className="hidden md:flex flex-col h-screen py-8 px-4 bg-surface border-r border-outline-variant w-72 shrink-0">
      <div className="mb-8 px-2">
        <h1 className="font-headline-md text-headline-md font-bold text-primary">Persona AI</h1>
        <p className="font-citation text-citation text-secondary">Modern Archive</p>
      </div>

      {view === "chat" ? (
        <>
          {/* Wallet card (chat workspace screen) */}
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
                onClick={() => setView("wallet")}
              >
                Top Up PKR
              </button>
            </div>
          </div>

          <div className="relative mb-4 px-2">
            <MatIcon name="search" className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]" />
            <input
              className="w-full pl-10 pr-4 py-2 bg-surface-container rounded-lg border-none outline-none focus:ring-1 focus:ring-primary font-body-md text-sm"
              placeholder="Search Personalities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

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
                  <span onClick={(e) => e.stopPropagation()} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArmDelete
                      armed={deleteArm === s.id}
                      busy={deleteBusy === s.id}
                      label=""
                      onArm={() => { setDeleteArm(s.id); setTimeout(() => setDeleteArm((a) => (a === s.id ? null : a)), 3000); }}
                      onConfirm={() => deletePersonality(s)}
                    />
                  </span>
                </div>
              );
            })}
            <button
              className="w-full flex items-center gap-3 p-3 mt-1 border border-dashed border-outline-variant text-secondary hover:text-primary hover:border-primary transition-colors"
              onClick={() => setView("personality")}
            >
              <MatIcon name="person_add" className="text-[20px]" />
              <span className="font-body-md text-sm">New Personality</span>
            </button>
          </nav>
        </>
      ) : (
        /* Nav sidebar (all other screens in the design) */
        <nav className="flex-1 space-y-1">
          <NavItem icon="group" label="Personalities" target="chat" />
          <NavItem icon="library_books" label="Knowledge Base" target="knowledge" />
          <NavItem icon="account_balance_wallet" label="Wallet" target="wallet" />
          <NavItem icon="settings" label="Settings" target="settings" onClick={() => clerk.openUserProfile()} />
        </nav>
      )}

      {/* Footer */}
      <div className="mt-auto pt-4 border-t border-outline-variant px-2 space-y-1">
        {view !== "chat" && (
          <button
            className="w-full py-3 px-4 mb-3 bg-primary text-on-primary font-bold hover:opacity-90 transition-opacity active:scale-95"
            onClick={() => setView("wallet")}
          >
            Top Up PKR
          </button>
        )}
        <a href="/explore" className="flex items-center gap-3 p-2 text-secondary hover:text-primary cursor-pointer transition-all no-underline">
          <MatIcon name="language" />
          <span className="font-body-md text-sm">Explore the Archive</span>
        </a>
        {view === "chat" && (
          <button className="w-full flex items-center gap-3 p-2 text-secondary hover:text-primary cursor-pointer transition-all" onClick={() => clerk.openUserProfile()}>
            <MatIcon name="settings" />
            <span className="font-body-md text-sm">Settings</span>
          </button>
        )}
        <a href="/#how" className="flex items-center gap-3 p-2 text-secondary hover:text-primary cursor-pointer transition-all no-underline">
          <MatIcon name="help" />
          <span className="font-body-md text-sm">Help</span>
        </a>
        <button
          className="w-full flex items-center gap-3 p-2 text-error hover:opacity-80 cursor-pointer transition-all mt-2"
          onClick={() => clerk.signOut({ redirectUrl: "/" })}
        >
          <MatIcon name="logout" />
          <span className="font-body-md text-sm">Logout</span>
        </button>
      </div>
    </aside>
  );

  /* ------------------------------------------------------------- top header */
  const Tab = ({ label, target }) => {
    const on = (target === "ingest" && (view === "ingest" || view === "processing")) ||
      (target === "knowledge" && (view === "knowledge" || view === "chunks"));
    return (
      <button
        className={`font-body-md pb-1 transition-all ${on ? "text-primary border-b-2 border-primary" : "text-on-surface-variant hover:text-primary border-b-2 border-transparent"}`}
        onClick={() => setView(target)}
      >
        {label}
      </button>
    );
  };

  const publishTab = active && (
    active.publish_status === "published" ? (
      <span className="flex items-center gap-1.5 font-body-md text-secondary pb-1 border-b-2 border-transparent">
        <MatIcon name="check_circle" className="text-sm" /> Published
      </span>
    ) : active.publish_status === "pending" ? (
      <span className="flex items-center gap-1.5 font-body-md text-secondary pb-1 border-b-2 border-transparent">
        <MatIcon name="hourglass_empty" className="text-sm" /> Pending Review
      </span>
    ) : (
      <button
        className="flex items-center gap-1.5 font-body-md text-on-surface-variant hover:text-primary pb-1 border-b-2 border-transparent disabled:opacity-60"
        onClick={publishPersonality}
        disabled={publishBusy}
        title="Submit for review to appear in the public gallery"
      >
        {publishBusy && <Spinner className="w-3.5 h-3.5" />} Publish
      </button>
    )
  );

  const header = view === "chat" ? (
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
      <div className="flex items-center gap-2 shrink-0">
        <button
          className="px-4 py-1.5 border border-outline-variant hover:bg-surface-container-low transition-all text-sm font-medium flex items-center gap-2 active:scale-95"
          onClick={() => { setJob(null); setView("ingest"); }}
        >
          <MatIcon name="video_call" className="text-sm" />
          <span className="hidden sm:inline">Add Video</span>
        </button>
        <button
          className="px-4 py-1.5 border border-outline-variant hover:bg-surface-container-low transition-all text-sm font-medium flex items-center gap-2 active:scale-95"
          onClick={() => { loadVideos(activeId); setView("knowledge"); }}
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
            className="px-5 py-1.5 bg-primary text-on-primary hover:opacity-90 transition-all text-sm font-medium flex items-center gap-2 active:scale-95 disabled:opacity-60"
            onClick={publishPersonality}
            disabled={publishBusy}
          >
            {publishBusy ? <Spinner className="w-4 h-4" /> : <MatIcon name="publish" className="text-sm" />}
            <span className="hidden sm:inline">Publish</span>
          </button>
        ))}
      </div>
    </header>
  ) : (
    <header className="flex justify-between items-center w-full px-6 lg:px-margin-desktop h-16 bg-surface-container-lowest border-b border-outline-variant shadow-sm z-10 shrink-0 gap-4">
      <div className="flex items-center gap-8 min-w-0">
        <button className="font-display-lg text-headline-sm text-primary" onClick={() => setView("chat")}>Persona</button>
        {view === "knowledge" && (
          <div className="hidden lg:flex items-center bg-surface-container px-4 py-1.5 rounded-full border border-outline-variant">
            <MatIcon name="search" className="text-on-surface-variant text-[20px] mr-2" />
            <input
              className="bg-transparent border-none outline-none focus:ring-0 text-sm w-56 placeholder:text-on-surface-variant"
              placeholder="Search archive..."
              value={kbSearch}
              onChange={(e) => { setKbSearch(e.target.value); setKbPage(0); }}
            />
          </div>
        )}
      </div>
      <div className="flex items-center gap-6 shrink-0">
        <nav className="hidden md:flex items-center gap-6">
          <Tab label="Add Video" target="ingest" />
          <Tab label="Knowledge" target="knowledge" />
          {publishTab}
        </nav>
        <div className="flex items-center gap-3 border-l border-outline-variant pl-6">
          <Avatar name={active?.name} image={active?.image_url} className="w-8 h-8" textClass="text-sm" />
        </div>
      </div>
    </header>
  );

  /* ---------------------------------------------------------------- views */
  const chatView = (
    <>
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
            m.who === "user" ? <UserMsg key={i} text={m.text} /> : <AiMsg key={i} text={m.text} refs={m.refs} typing={m.typing} />
          )}
          <div ref={end} />
        </div>
      </div>
      <Composer value={q} onChange={setQ} onSend={ask} busy={busy} placeholder={`Ask ${active?.name || "the archive"}...`} />
    </>
  );

  const ingestView = (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto py-16 px-6 lg:px-margin-desktop">
        <section className="mb-12">
          <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg text-primary mb-4">Ingest Source Material</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
            Expand your Persona's wisdom by feeding it high-quality video content — a single video or a whole channel.
          </p>
        </section>

        <div className="mb-10">
          <label className="block font-mono-label text-mono-label text-secondary mb-2 uppercase tracking-widest">
            YouTube Playlist or Video URL
          </label>
          <div className="relative flex items-center">
            <MatIcon name="link" className="absolute left-4 text-outline" />
            <input
              className="w-full bg-white border border-outline-variant pl-12 pr-32 py-4 outline-none focus:ring-1 focus:ring-primary focus:border-primary font-body-md"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && estimate()}
              placeholder="https://www.youtube.com/watch?v=…  or a channel / @handle"
            />
            <button
              className="absolute right-2 bg-primary text-on-primary px-6 py-2 font-bold hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-60"
              onClick={estimate}
              disabled={est?.loading}
            >
              {est?.loading && <Spinner />} {est?.loading ? "Analyzing…" : "Analyze"}
            </button>
          </div>
        </div>

        {est?.error && (
          <div className="flex items-center gap-3 mb-8">
            <span className="bg-error-container text-on-error-container px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shrink-0">Note</span>
            <p className="font-citation text-citation text-on-surface-variant">{est.error}</p>
          </div>
        )}

        {est && !est.loading && !est.error && (
          <div className="glass-lab p-8 editorial-shadow mb-8 border-l-4 border-l-tertiary">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-primary mb-1">Transcription Estimate</h3>
                <p className="font-citation text-citation text-on-surface-variant">Calculated from the source's length and content depth.</p>
              </div>
              <MatIcon name="analytics" className="text-primary text-4xl" />
            </div>
            <div className="grid grid-cols-3 gap-8 mb-10">
              <div className="space-y-1">
                <MonoLabel className="text-secondary">Volume</MonoLabel>
                <p className="font-display-lg text-display-lg-mobile text-primary">
                  {est.count} <span className="text-body-md font-normal font-sans">video{est.count === 1 ? "" : "s"}</span>
                </p>
              </div>
              <div className="space-y-1">
                <MonoLabel className="text-secondary">Total Duration</MonoLabel>
                <p className="font-display-lg text-display-lg-mobile text-primary">
                  {est.total_minutes} <span className="text-body-md font-normal font-sans">min</span>
                </p>
              </div>
              <div className="space-y-1">
                <MonoLabel className="text-secondary">Processing Cost</MonoLabel>
                <p className="font-display-lg text-display-lg-mobile text-primary">
                  ${est.est_cost_usd} <span className="text-body-md font-normal font-sans">USD</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6 flex-wrap">
              <button
                className="bg-primary text-on-primary px-8 py-4 font-bold flex items-center gap-3 transition-all active:scale-95 shadow-lg disabled:opacity-60"
                onClick={() => process()}
                disabled={submitting}
              >
                {submitting ? <Spinner /> : <MatIcon name="bolt" />} {submitting ? "Starting…" : "Confirm & Start Processing"}
              </button>
              <div className="flex items-center gap-3 border-l border-outline-variant pl-6">
                <span className="bg-error-container text-on-error-container px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Note</span>
                <p className="font-citation text-citation text-on-surface-variant">Desktop app required for secure archiving.</p>
              </div>
            </div>
          </div>
        )}

        {!est && (
          <button
            className="bg-primary text-on-primary px-8 py-4 font-bold flex items-center gap-3 transition-all active:scale-95 shadow-lg disabled:opacity-60 mb-8"
            onClick={() => process()}
            disabled={submitting || !url.trim()}
          >
            {submitting ? <Spinner /> : <MatIcon name="bolt" />} {submitting ? "Starting…" : "Start Processing"}
          </button>
        )}

        <div className="border-l-2 border-primary pl-6 py-4">
          <p className="font-citation text-citation italic text-secondary mb-2">Technical Prerequisite</p>
          <p className="font-body-md text-body-md text-on-surface">
            "The act of digital preservation requires a dedicated computational environment." Ensure the{" "}
            <strong>Persona Desktop Client</strong> is active on your workstation —{" "}
            <a className="underline underline-offset-4" href={DOWNLOAD_URL}>download it here</a>. A browser alone can't
            fetch from YouTube.
          </p>
        </div>
      </div>
    </div>
  );

  const processingView = (
    <div className="flex-1 flex flex-col bg-surface-container-low overflow-hidden lab-grid">
      {/* Status header */}
      <div className="p-6 lg:p-8 border-b border-outline-variant bg-white/50 backdrop-blur-sm shrink-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {job?.status === "running" && <span className="inline-block w-2 h-2 bg-error rounded-full animate-pulse" />}
              {job?.status === "done" && <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full" />}
              {job?.status === "error" && <span className="inline-block w-2 h-2 bg-error rounded-full" />}
              <MonoLabel className="text-on-surface-variant">
                {job?.status === "done" ? "Ingestion Complete" : job?.status === "error" ? "Ingestion Failed" : "Live Ingestion"}
              </MonoLabel>
            </div>
            <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg leading-tight mb-2 truncate">
              Processing: {jobTitle || "Source Material"}
            </h1>
            <div className="flex items-center gap-4 text-on-surface-variant">
              <span className="flex items-center gap-1 font-citation text-citation">
                <MatIcon name="person" className="text-sm" /> {active?.name || "—"}
              </span>
              <span className="flex items-center gap-1 font-citation text-citation">
                <MatIcon name="timer" className="text-sm" /> {job?.step || "…"}
              </span>
            </div>
          </div>
          <div className="text-right min-w-[200px] shrink-0">
            <div className="flex justify-between items-end mb-2">
              <MonoLabel className="text-on-surface-variant">Total Progress</MonoLabel>
              <span className="font-display-lg text-headline-md text-primary">{Math.round(job?.progress || 0)}%</span>
            </div>
            <div className="w-full h-1 bg-surface-container-highest overflow-hidden">
              <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${Math.round(job?.progress || 0)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* 3 columns: stage timeline / live view / activity log */}
      <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden min-h-0">
        <div className="col-span-12 lg:col-span-3 border-r border-outline-variant bg-white/30 backdrop-blur-sm p-6 overflow-y-auto custom-scrollbar">
          <MonoLabel className="text-on-surface-variant mb-6 block">Stage Timeline</MonoLabel>
          <div className="space-y-8 relative">
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
                      {st === "done" ? "Status: Done" : st === "active" ? "In-progress…" : st === "err" ? "Failed" : "Pending"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-6 flex flex-col p-6 overflow-hidden relative min-h-0">
          {job?.status === "running" && <div className="scanning-line" />}
          <div className="flex justify-between items-center mb-6 shrink-0">
            <div className="flex items-center gap-3">
              <h3 className="font-headline-sm text-headline-sm">Ingestion Feed</h3>
              <span className="px-2 py-1 bg-surface-container-highest rounded font-mono-label text-mono-label">LIVE VIEW</span>
            </div>
            <div className="text-right">
              <MonoLabel className="text-on-surface-variant block">Stage</MonoLabel>
              <p className="font-headline-sm text-lg">
                {Math.min(Math.max(stage + 1, 1), STAGES.length)}<span className="text-on-surface-variant opacity-40"> / {STAGES.length}</span>
              </p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 scroll-hide">
            {stepCards.length === 0 && <p className="font-citation text-citation text-on-surface-variant">Waiting for the first event…</p>}
            {stepCards.slice(-30).map((c, i, arr) => {
              const last = i === arr.length - 1;
              return (
                <div key={i} className={`glass-lab p-4 shadow-sm border-l-4 ${last && job?.status === "running" ? "border-error/50 animate-pulse" : "border-primary"}`}>
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-mono-label text-mono-label text-primary">EVENT · {c.t}</span>
                    <MatIcon name={last && job?.status === "running" ? "sync" : "verified"} className={`text-primary text-sm ${last && job?.status === "running" ? "animate-spin" : ""}`} />
                  </div>
                  <p className="font-body-md text-body-md text-on-surface leading-relaxed">{c.msg}</p>
                </div>
              );
            })}
            {job?.status === "done" && (
              <div className="bg-primary text-on-primary py-4 px-5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <MatIcon name="cloud_done" />
                  <span className="font-headline-sm text-base">Processing Complete</span>
                </div>
                <div className="flex gap-3">
                  <button className="px-5 py-2 border border-white/40 text-on-primary font-bold hover:bg-white hover:text-primary transition-all" onClick={() => { loadVideos(activeId); setView("knowledge"); }}>
                    Review Knowledge
                  </button>
                  <button className="px-5 py-2 bg-white text-primary font-bold hover:opacity-90 transition-all" onClick={() => setView("chat")}>
                    Chat Now
                  </button>
                </div>
              </div>
            )}
            {job?.status === "error" && (
              <div className="border border-error bg-white p-5">
                <p className="font-mono-label text-mono-label uppercase tracking-widest text-error mb-2">Error</p>
                <p className="font-body-md text-body-md text-on-surface mb-4">{job.error}</p>
                <div className="flex gap-3">
                  <button className="px-5 py-2 bg-primary text-on-primary font-bold" onClick={() => setView("ingest")}>Try Again</button>
                  {typeof window !== "undefined" && !window.electronAPI?.isElectron && (
                    <a className="px-5 py-2 border border-primary text-primary font-bold no-underline" href={DOWNLOAD_URL}>Download Desktop App</a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-3 border-l border-outline-variant bg-surface-container/50 p-6 overflow-y-auto custom-scrollbar">
          <MonoLabel className="text-on-surface-variant mb-6 block">Activity Log</MonoLabel>
          <div className="space-y-5">
            {jobLog.slice(-40).map((l, i) => (
              <div key={i} className="flex gap-3">
                <div className="text-on-surface-variant font-mono-label text-[10px] pt-1 shrink-0">{l.t}</div>
                <div className={`text-sm ${l.err ? "text-error" : ""}`}>
                  <span className="font-bold">{l.err ? "Error:" : l.server ? "Server:" : "System:"}</span> {l.msg}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 p-4 border-l-2 border-outline text-on-surface-variant">
            <p className="font-citation text-citation italic">
              "The speed of digital ingestion must never outpace the rigor of ethical verification."
            </p>
            <p className="font-mono-label text-mono-label mt-2 text-right">— Archival Protocols</p>
          </div>
        </div>
      </div>
    </div>
  );

  const knowledgeView = (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-surface-container-low">
      <div className="max-w-container-max mx-auto space-y-8 p-6 lg:p-margin-desktop">
        <div className="flex flex-col md:flex-row justify-between md:items-end gap-6">
          <div>
            <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg text-primary mb-2">Knowledge Base</h2>
            <p className="text-on-surface-variant max-w-xl font-body-lg text-body-lg">
              Manage the processed sources that inform the <span className="italic">{active?.name || "…"}</span> persona.
              Every chunk is a vetted fragment of their archive.
            </p>
          </div>
          <div className="flex gap-8 shrink-0">
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

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 glass-lab rounded-lg border border-outline-variant">
          <button
            className="flex items-center gap-2 px-4 py-2 border border-outline text-on-surface-variant hover:bg-surface-container-lowest transition-all"
            onClick={() => setKbSortDesc((d) => !d)}
          >
            <MatIcon name="sort" className="text-sm" />
            <MonoLabel>Sort by date · {kbSortDesc ? "newest" : "oldest"}</MonoLabel>
          </button>
          <div className="flex items-center gap-3">
            <div className="relative">
              <MatIcon name="search" className="absolute left-3 top-2.5 text-on-surface-variant text-sm" />
              <input
                className="pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant outline-none focus:ring-1 focus:ring-primary w-64 text-sm"
                placeholder="Find specific source..."
                value={kbSearch}
                onChange={(e) => { setKbSearch(e.target.value); setKbPage(0); }}
              />
            </div>
            <button
              className="bg-primary text-on-primary px-6 py-2 font-bold hover:opacity-90 active:scale-95 transition-all text-sm flex items-center gap-2"
              onClick={() => { setJob(null); setView("ingest"); }}
            >
              <MatIcon name="upload" className="text-sm" /> INGEST NEW SOURCE
            </button>
          </div>
        </div>

        {/* Table */}
        {videos.length === 0 ? (
          <div className="bg-surface-container-lowest editorial-shadow border border-outline-variant px-8 py-16 text-center">
            <MatIcon name="library_books" className="text-4xl text-outline" />
            <p className="font-headline-sm text-headline-sm mt-4 mb-1">The archive is empty</p>
            <p className="font-body-md text-body-md text-on-surface-variant">Ingest a YouTube video to give this personality knowledge.</p>
          </div>
        ) : (
          <div className="bg-surface-container-lowest editorial-shadow border border-outline-variant">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="px-6 py-4 font-mono-label uppercase tracking-widest text-[10px] font-semibold text-on-surface-variant">Source Identity &amp; Title</th>
                    <th className="px-6 py-4 font-mono-label uppercase tracking-widest text-[10px] font-semibold text-on-surface-variant">Archived On</th>
                    <th className="px-6 py-4 font-mono-label uppercase tracking-widest text-[10px] font-semibold text-on-surface-variant">Semantic Chunks</th>
                    <th className="px-6 py-4 font-mono-label uppercase tracking-widest text-[10px] font-semibold text-on-surface-variant text-right">Laboratory Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {kbSlice.map((v) => (
                    <tr key={v.id} className="hover:bg-surface-container-low/40 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-10 bg-surface-container-high relative overflow-hidden flex-shrink-0">
                            <img src={`https://i.ytimg.com/vi/${v.yt_id}/mqdefault.jpg`} alt="" className="w-full h-full object-cover" loading="lazy" />
                          </div>
                          <div className="min-w-0">
                            <button className="font-headline-sm text-lg text-primary hover:underline decoration-primary/30 underline-offset-4 truncate block max-w-[320px] text-left" onClick={() => openChunks(v)}>
                              {v.title}
                            </button>
                            <p className="font-citation text-citation text-on-surface-variant opacity-60">Source ID: {v.yt_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <span className="text-on-surface-variant font-mono-label text-mono-label uppercase">{timeAgo(v.created_at)}</span>
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <div className="flex items-center gap-2">
                          <span className="text-primary font-bold">{v.chunks}</span>
                          <div className="h-1 w-24 bg-surface-container-high rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${Math.round(((Number(v.chunks) || 0) / maxChunks) * 100)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right whitespace-nowrap">
                        <button className="opacity-60 hover:opacity-100 hover:bg-surface-container text-on-surface p-2 transition-all" title="View & edit chunks" onClick={() => openChunks(v)}>
                          <MatIcon name="segment" className="text-[20px]" />
                        </button>
                        {v.url && (
                          <a className="inline-block opacity-60 hover:opacity-100 hover:bg-surface-container text-on-surface p-2 transition-all" href={v.url} target="_blank" rel="noreferrer" title="Open source">
                            <MatIcon name="open_in_new" className="text-[20px]" />
                          </a>
                        )}
                        <button
                          className="opacity-60 hover:opacity-100 hover:bg-surface-container text-primary p-2 transition-all disabled:opacity-30"
                          title="Re-process whole video"
                          disabled={reprocessBusy === v.url || submitting}
                          onClick={() => process(v.url, true)}
                        >
                          {reprocessBusy === v.url ? <Spinner className="w-4 h-4" /> : <MatIcon name="refresh" className="text-[20px]" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant bg-surface-container-low">
              <span className="font-citation text-citation text-on-surface-variant">
                Showing {kbRows.length === 0 ? 0 : kbPage * PAGE + 1} to {Math.min((kbPage + 1) * PAGE, kbRows.length)} of {kbRows.length} sources
              </span>
              <div className="flex gap-2">
                <button className="px-3 py-1 border border-outline-variant text-on-surface-variant disabled:opacity-40" disabled={kbPage === 0} onClick={() => setKbPage((p) => p - 1)}>
                  Previous
                </button>
                {Array.from({ length: Math.min(kbPages, 5) }, (_, i) => (
                  <button key={i} className={`px-3 py-1 border border-outline-variant ${kbPage === i ? "bg-primary text-on-primary" : "hover:bg-surface-container"}`} onClick={() => setKbPage(i)}>
                    {i + 1}
                  </button>
                ))}
                <button className="px-3 py-1 border border-outline-variant disabled:opacity-40" disabled={kbPage >= kbPages - 1} onClick={() => setKbPage((p) => p + 1)}>
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-xl border-l-2 border-on-surface-variant pl-4 py-2">
          <p className="font-citation text-citation text-on-surface-variant italic">
            Every video processed here is cross-referenced with the persona's archive to preserve high-fidelity responses.
          </p>
        </div>
      </div>
    </div>
  );

  const dirtyCount = (chunks || []).filter((k) => k.dirty).length;
  const chunkRows = (chunks || []).filter((k) => (k.text || "").toLowerCase().includes(chunkFilter.toLowerCase()));
  const chunksView = (
    <div className="flex-1 flex flex-col overflow-hidden bg-surface-container-low">
      <section className="bg-surface px-6 lg:px-margin-desktop py-6 border-b border-outline-variant shrink-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <button className="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors" onClick={() => { loadVideos(activeId); setView("knowledge"); }}>
                <MatIcon name="arrow_back" className="text-[18px]" />
                <MonoLabel>Knowledge Base</MonoLabel>
              </button>
              <span className="bg-primary text-on-primary px-2 py-0.5 font-mono-label text-[10px] tracking-widest uppercase">Editing</span>
              <span className="text-secondary font-mono-label text-citation">SOURCE_ID: {chunkVideo?.yt_id}</span>
            </div>
            <h2 className="font-display-lg text-display-lg-mobile md:text-headline-md text-primary truncate max-w-3xl">{chunkVideo?.title}</h2>
          </div>
          <button
            className="border border-primary px-6 py-2 font-mono-label text-mono-label uppercase tracking-widest hover:bg-primary hover:text-on-primary transition-all flex items-center gap-2 disabled:opacity-50 shrink-0"
            disabled={!dirtyCount || confirmingAll}
            onClick={confirmAll}
          >
            {confirmingAll ? <Spinner className="w-3.5 h-3.5" /> : <MatIcon name="cloud_upload" className="text-[18px]" />}
            Save &amp; Re-embed {dirtyCount ? `(${dirtyCount})` : ""}
          </button>
        </div>
      </section>

      <div className="flex-1 grid grid-cols-12 overflow-hidden min-h-0">
        {/* Left: real player + info */}
        <div className="col-span-12 lg:col-span-5 border-r border-outline-variant p-6 flex-col gap-6 overflow-y-auto custom-scrollbar hidden lg:flex">
          <div className="aspect-video bg-black relative overflow-hidden glass-lab rounded shadow-xl">
            {chunkVideo?.yt_id && (
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${chunkVideo.yt_id}`}
                title={chunkVideo?.title || "Source video"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant pb-2">
              <MonoLabel className="text-primary">Segment Anchors</MonoLabel>
              <MatIcon name="schedule" className="text-secondary text-sm" />
            </div>
            <div className="space-y-3">
              {(chunks || []).filter((k) => k.start != null).slice(0, 6).map((k) => (
                <a
                  key={k.id}
                  className="flex gap-4 items-start pl-4 border-l-2 border-outline no-underline hover:border-primary transition-colors"
                  href={ytAt(k.url || chunkVideo?.url, k.start)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="font-mono-label text-citation text-secondary mt-1 shrink-0">{mmss(k.start)}</span>
                  <p className="font-citation text-citation text-on-surface-variant italic line-clamp-2">"{k.text.slice(0, 110)}…"</p>
                </a>
              ))}
              {(chunks || []).every((k) => k.start == null) && (
                <p className="font-citation text-citation text-on-surface-variant">
                  No timestamps on this source yet — re-process the video to add them.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right: chunk list */}
        <div className="col-span-12 lg:col-span-7 flex flex-col h-full bg-white min-h-0">
          <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest shrink-0 gap-3">
            <div className="flex items-center gap-4 min-w-0">
              <MonoLabel className="text-primary shrink-0">{chunks ? `${chunks.length} chunks` : "Loading…"}</MonoLabel>
              <div className="h-4 w-px bg-outline-variant" />
              <span className="text-secondary text-citation font-citation flex items-center gap-1 truncate">
                <MatIcon name="check_circle" className="text-[14px]" /> {dirtyCount ? `${dirtyCount} unsaved edit${dirtyCount > 1 ? "s" : ""}` : "All synced"}
              </span>
            </div>
            <input
              className="border-outline-variant border px-3 py-1 text-citation font-body-md outline-none focus:ring-1 focus:ring-primary w-48"
              placeholder="Search transcription..."
              value={chunkFilter}
              onChange={(e) => setChunkFilter(e.target.value)}
            />
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
            {chunks == null ? (
              <div className="flex items-center gap-3 text-on-surface-variant"><Spinner /> <span className="font-citation text-citation">Consulting the archive…</span></div>
            ) : chunkRows.length === 0 ? (
              <p className="font-citation text-citation text-on-surface-variant">No chunks match.</p>
            ) : (
              chunkRows.map((k) => (
                <div key={k.id} className={`border p-5 bg-white transition-all ${k.dirty ? "border-primary ring-1 ring-primary shadow-lg" : "border-outline-variant hover:border-primary/50"}`}>
                  <div className="flex justify-between items-start mb-3 gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 font-mono-label text-[10px] ${k.dirty ? "bg-primary text-on-primary" : "bg-surface-container-highest text-secondary"}`}>
                        {k.dirty ? "EDITED" : `#${String((k.idx ?? 0) + 1).padStart(3, "0")}`}
                      </span>
                      {k.start != null && (
                        <span className="font-mono-label text-mono-label text-secondary tracking-tighter">{mmss(k.start)}</span>
                      )}
                    </div>
                    <div className="flex gap-3 items-center">
                      {k.start != null && (k.url || chunkVideo?.url) && (
                        <a
                          href={ytAt(k.url || chunkVideo?.url, k.start)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline no-underline"
                        >
                          <MatIcon name="play_circle" className="text-xs" /> WATCH SEGMENT
                        </a>
                      )}
                      <button
                        className="text-secondary hover:text-primary flex items-center gap-1 text-citation font-citation disabled:opacity-40"
                        disabled={chunkBusy === k.id || !k.dirty}
                        onClick={() => saveChunk(k)}
                      >
                        {chunkBusy === k.id ? <Spinner className="w-3.5 h-3.5" /> : <MatIcon name="save" className="text-[16px]" />}
                        {chunkBusy === k.id ? "Saving…" : "Save"}
                      </button>
                      <ArmDelete
                        armed={chunkArm === k.id}
                        busy={chunkBusy === k.id}
                        onArm={() => { setChunkArm(k.id); setTimeout(() => setChunkArm((a) => (a === k.id ? null : a)), 3000); }}
                        onConfirm={() => deleteChunk(k)}
                      />
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
        </div>
      </div>
    </div>
  );

  const walletView = (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="max-w-[1000px] mx-auto w-full py-12 px-6 lg:px-margin-desktop">
        <section className="mb-12 flex flex-col md:flex-row items-start md:items-end justify-between gap-8 border-b border-outline-variant pb-12">
          <div className="w-full md:w-1/2">
            <h2 className="font-headline-sm text-headline-sm text-on-surface mb-2">Available Balance</h2>
            <p className="font-citation text-citation text-on-surface-variant mb-6">
              Secured in your modern archive wallet for computational processing and persona interactions.
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-display-lg text-display-lg text-primary tracking-tighter">
                {wallet == null ? "—" : Number(wallet).toLocaleString()}
              </span>
              <span className="font-headline-sm text-headline-sm text-secondary">PKR</span>
            </div>
          </div>
          <div className="relative w-full md:w-1/3 h-32 rounded overflow-hidden shadow-sm glass-lab flex items-center justify-center">
            <div className="z-10 text-center">
              <MatIcon name="account_balance_wallet" className="text-4xl text-primary opacity-40" />
              <p className="font-mono-label text-mono-label uppercase tracking-widest text-primary mt-2">Prepaid Ledger</p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
          <div className="md:col-span-7 space-y-6">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Top Up Funds</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[200, 500, 1000, 2000].map((a, i) => {
                const sel = amount === a && !custom;
                return (
                  <button
                    key={a}
                    className={`group p-5 border transition-all flex flex-col items-center gap-1.5 ${sel ? "border-primary bg-primary ring-2 ring-primary ring-offset-2 ring-offset-surface" : "border-outline-variant bg-surface-container-lowest hover:border-primary"}`}
                    onClick={() => { setAmount(a); setCustom(""); }}
                  >
                    <span className={`font-citation text-citation ${sel ? "text-on-primary/70" : "text-secondary group-hover:text-primary"}`}>Tier {["I", "II", "III", "IV"][i]}</span>
                    <span className={`font-headline-sm text-headline-sm ${sel ? "text-on-primary" : "text-primary"}`}>{a.toLocaleString()}</span>
                    <span className={`font-mono-label text-mono-label ${sel ? "text-on-primary/60" : "text-outline"}`}>PKR</span>
                  </button>
                );
              })}
            </div>
            <div className="p-6 bg-surface-container-low rounded border border-outline-variant">
              <label className="block font-mono-label text-mono-label uppercase tracking-widest text-secondary mb-3">Custom Allocation</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary font-headline-sm">Rs.</span>
                <input
                  type="number"
                  min="50"
                  className="w-full bg-white border border-outline-variant pl-14 pr-4 py-4 font-headline-sm text-lg outline-none focus:border-primary focus:ring-0"
                  placeholder="0"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                />
              </div>
              <p className="font-citation text-citation text-on-surface-variant mt-3">Minimum Rs 50 — this overrides the tier selection.</p>
            </div>
          </div>

          {/* Checkout */}
          <div className="md:col-span-5 flex flex-col">
            <div className="p-8 border border-outline-variant bg-white h-full shadow-sm flex flex-col">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-primary">Checkout</h3>
                  <p className="font-citation text-citation text-secondary">Secure payment processing</p>
                </div>
                <div className="flex items-center gap-1 opacity-60">
                  <MatIcon name="verified_user" className="text-[18px]" />
                  <MonoLabel>Stripe</MonoLabel>
                </div>
              </div>
              <div className="flex-grow space-y-6">
                <div className="scholarly-border">
                  <p className="font-citation text-citation italic text-on-surface-variant">
                    "Only pay for the wisdom you ingest — the balance never expires."
                  </p>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-outline-variant space-y-4">
                <div className="flex justify-between text-on-surface-variant">
                  <span className="font-body-md">Top-up amount</span>
                  <span className="font-mono-label">{Number(custom || amount || 0).toLocaleString()} PKR</span>
                </div>
                <div className="flex justify-between font-bold text-primary">
                  <span className="font-body-md">Total Due</span>
                  <span className="font-headline-sm">{Number(custom || amount || 0).toLocaleString()} PKR</span>
                </div>
                <button
                  className="w-full bg-stripe text-white py-4 font-bold flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-60"
                  disabled={topupBusy || Number(custom || amount || 0) < 50}
                  onClick={() => startTopup(Number(custom || amount))}
                >
                  {topupBusy ? <Spinner /> : <MatIcon name="lock" className="text-[16px]" />}
                  {topupBusy ? "Redirecting to Stripe…" : "Pay with Stripe"}
                </button>
                <p className="font-citation text-citation text-on-surface-variant text-center">Test mode · you'll return here after payment.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const personalityView = (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-surface-container-lowest">
      <div className="max-w-[800px] mx-auto w-full py-12 px-6">
        <section className="mb-12">
          <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-4">Ingest New Personality</h2>
          <p className="font-body-lg text-body-lg text-secondary max-w-[600px]">
            Define the parameters for a new voice. Information provided here governs the tone and identity of the persona's responses.
          </p>
        </section>

        <div className="space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-4">
              <h3 className="font-headline-sm text-headline-sm mb-2">Identity &amp; Image</h3>
              <p className="citation-line pl-4 font-citation text-citation text-on-surface-variant">
                Upload a high-fidelity visual representation. Square format preferred for archival consistency.
              </p>
            </div>
            <div className="md:col-span-8">
              <div className="flex items-center gap-6">
                <label className="relative group cursor-pointer shrink-0">
                  <div className="w-32 h-32 rounded-xl bg-surface-container border-2 border-dashed border-outline-variant flex flex-col items-center justify-center overflow-hidden group-hover:border-primary transition-colors">
                    {pForm.image_url ? (
                      <img src={pForm.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <MatIcon name="add_a_photo" className="text-outline text-[40px]" />
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
                    className="w-full bg-white border border-outline-variant rounded-lg py-3 px-4 outline-none focus:ring-2 focus:ring-primary focus:border-primary font-body-md"
                    placeholder="e.g. Sahil Adeem"
                    value={pForm.name}
                    onChange={(e) => setPForm({ ...pForm, name: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && createPersonality()}
                  />
                </div>
              </div>
            </div>
          </div>

          <hr className="border-outline-variant opacity-50" />

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-4">
              <h3 className="font-headline-sm text-headline-sm mb-2">Cognitive Logic</h3>
              <p className="citation-line pl-4 font-citation text-citation text-on-surface-variant">
                Describe the linguistic and philosophical framework — this dictates the personality's reasoning tone.
              </p>
            </div>
            <div className="md:col-span-8">
              <label className="block font-mono-label text-mono-label text-secondary mb-2 uppercase tracking-widest">Persona &amp; Tone Description (optional)</label>
              <textarea
                className="w-full bg-white border border-outline-variant rounded-lg py-3 px-4 outline-none focus:ring-2 focus:ring-primary focus:border-primary font-body-md min-h-[110px] resize-vertical"
                placeholder="e.g. Analytic and firm. Prefers Stoic principles, speaks in short, declarative sentences, and avoids contemporary slang."
                value={pForm.persona}
                onChange={(e) => setPForm({ ...pForm, persona: e.target.value })}
              />
            </div>
          </div>

          <hr className="border-outline-variant opacity-50" />

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-4">
              <h3 className="font-headline-sm text-headline-sm mb-2">Temporal Status</h3>
              <p className="citation-line pl-4 font-citation text-citation text-on-surface-variant">
                Indicate if the persona represents a living contemporary or a historical figure from the archive.
              </p>
            </div>
            <div className="md:col-span-8">
              <div className="bg-surface-container p-6 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-body-md font-bold text-primary mb-1">{pForm.status === "alive" ? "Active / Alive" : "In Memory"}</p>
                  <p className="font-citation text-citation text-secondary">Toggle to 'In Memory' for historical personalities.</p>
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
          </div>

          <div className="pt-4 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2 text-secondary">
              <MatIcon name="lock" className="text-[18px]" />
              <span className="text-[12px] font-mono-label uppercase tracking-widest">Private until you publish</span>
            </div>
            <div className="flex gap-4 w-full md:w-auto">
              <button className="flex-1 md:flex-none px-8 py-3 rounded-lg border border-outline-variant text-primary font-bold hover:bg-surface-container transition-colors" onClick={() => setView("chat")}>
                Discard
              </button>
              <button
                className="flex-1 md:flex-none px-12 py-3 rounded-lg bg-primary text-on-primary font-bold shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                onClick={createPersonality}
                disabled={creating || !pForm.name.trim()}
              >
                {creating && <Spinner />} {creating ? "Creating…" : "Create Personality"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <SignedOut><RedirectToSignIn /></SignedOut>
      <SignedIn>
        <div className="flex h-screen overflow-hidden bg-surface text-on-surface font-body-md selection:bg-primary-fixed">
          {sidebar}
          <main className="flex-1 flex flex-col relative overflow-hidden bg-white min-w-0">
            {header}
            {view === "chat" && chatView}
            {view === "ingest" && ingestView}
            {view === "processing" && processingView}
            {view === "knowledge" && knowledgeView}
            {view === "chunks" && chunksView}
            {view === "wallet" && walletView}
            {view === "personality" && personalityView}
          </main>
        </div>
      </SignedIn>
    </>
  );
}
