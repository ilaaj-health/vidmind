"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MatIcon, Avatar, UserMsg, AiMsg, Composer } from "../../components/ui";

const API = process.env.NEXT_PUBLIC_API_BASE || "";

export default function GalleryChat() {
  const { id } = useParams();
  const [p, setP] = useState(null);        // personality info (null=loading, false=not found)
  const [msgs, setMsgs] = useState([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef(null);

  useEffect(() => {
    fetch(`${API}/api/gallery/item/${id}`).then((r) => (r.ok ? r.json() : null))
      .then((d) => setP(d && d.id ? d : false)).catch(() => setP(false));
  }, [id]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const ask = async () => {
    const question = q.trim();
    if (!question || busy) return;
    setQ(""); setBusy(true);
    setMsgs((m) => [...m, { who: "user", text: question }, { who: "ai", typing: true }]);
    const r = await fetch(`${API}/api/gallery/chat`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ space_id: id, question }),
    }).then((x) => x.json()).catch(() => ({ error: "Something went wrong." }));
    setMsgs((m) => { const c = m.slice(0, -1); c.push({ who: "ai", text: r.error ? r.error : r.answer, refs: r.references || [] }); return c; });
    setBusy(false);
  };

  if (p === false) return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center border border-outline-variant bg-surface-container-lowest px-12 py-14">
        <MatIcon name="search_off" className="text-4xl text-outline" />
        <p className="font-headline-sm text-headline-sm mt-4 mb-2">This personality isn't available</p>
        <Link href="/explore" className="font-mono-label text-mono-label uppercase tracking-widest text-primary underline underline-offset-4">
          Back to the Archive
        </Link>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-white text-on-surface font-body-md selection:bg-primary-fixed">
      {/* Top bar */}
      <header className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop h-16 bg-surface-container-lowest border-b border-outline-variant shadow-sm z-10 shrink-0 gap-4">
        <Link href="/explore" className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors no-underline shrink-0">
          <MatIcon name="arrow_back" className="text-[20px]" />
          <span className="font-mono-label text-mono-label uppercase tracking-widest hidden sm:inline">Archive</span>
        </Link>
        <div className="flex items-center gap-4 flex-1 min-w-0 justify-center">
          <Avatar name={p?.name} image={p?.image_url} className="w-8 h-8" textClass="text-sm" />
          <div className="min-w-0">
            <h2 className="font-headline-sm text-lg text-primary leading-none truncate">{p?.name || "…"}</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-mono-label uppercase tracking-widest text-on-surface-variant">
                {p ? `${p.videos} ${p.videos === 1 ? "source" : "sources"} · Public Archive` : "…"}
              </span>
            </div>
          </div>
        </div>
        <Link
          href="/home"
          className="bg-primary text-on-primary px-5 py-2 font-mono-label text-mono-label uppercase tracking-widest hover:bg-on-surface-variant transition-transform active:scale-95 no-underline shrink-0"
        >
          Open App
        </Link>
      </header>

      {/* Chat canvas */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-margin-desktop">
        <div className="max-w-[800px] mx-auto space-y-12">
          {msgs.length === 0 && (
            <div className="pt-16 text-center">
              <Avatar name={p?.name} image={p?.image_url} className="w-16 h-16 mx-auto mb-6" textClass="text-2xl" />
              <p className="font-display-lg text-display-lg-mobile text-primary mb-3">
                Inquire of {p?.name || "the archive"}.
              </p>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-md mx-auto">
                {p?.persona || "Ask anything about their videos — cited answers, no sign-in needed."}
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
      <Composer value={q} onChange={setQ} onSend={ask} busy={busy} placeholder={`Ask ${p?.name || "the archive"}...`} />
    </div>
  );
}
