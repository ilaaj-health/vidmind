"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Markdown from "../../components/Markdown";

const API = process.env.NEXT_PUBLIC_API_BASE || "";
const initial = (n) => (n || "?").trim().charAt(0).toUpperCase();

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
    <div className="wrap"><div className="nf">This personality isn’t available. <Link href="/explore">Back to Explore</Link></div>
      <style jsx>{`.wrap{max-width:760px;margin:0 auto;padding:60px 22px;font-family:system-ui}.nf{text-align:center;color:#8b90a0}a{color:#6a49f2}`}</style></div>
  );

  return (
    <div className="page">
      <header className="top">
        <Link href="/explore" className="back">← Explore</Link>
        <div className="who">
          <span className="av">{p?.image_url ? <img src={p.image_url} alt="" /> : initial(p?.name)}</span>
          <div><div className="nm">{p?.name || "…"}</div><div className="mt">{p ? `${p.videos} ${p.videos === 1 ? "video" : "videos"}` : ""}</div></div>
        </div>
        <Link href="/home" className="open">Open app →</Link>
      </header>

      <div className="chat">
        {msgs.length === 0 && (
          <div className="empty">
            <span className="eav">{p?.image_url ? <img src={p.image_url} alt="" /> : initial(p?.name)}</span>
            <div className="et">Chat with {p?.name || "this personality"}</div>
            <div className="es">Ask anything about their videos — cited answers, no sign-in needed.</div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={"msg " + m.who}>
            <div className="bub">{m.typing ? <span className="typ"><i /><i /><i /></span> : (m.who === "ai" ? <Markdown text={m.text} /> : m.text)}</div>
            {m.refs?.length > 0 && <div className="refs">{m.refs.slice(0, 4).map((r) => <span key={r.n} className="ref">[{r.n}] {(r.source || "").slice(0, 40)}</span>)}</div>}
          </div>
        ))}
        <div ref={end} />
      </div>

      <div className="comp">
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} placeholder={`Message ${p?.name || "personality"}…`} />
        <button onClick={ask} disabled={busy}>{busy ? "…" : "Send"}</button>
      </div>

      <style jsx>{`
        .page { max-width: 760px; margin: 0 auto; min-height: 100vh; display: flex; flex-direction: column; font-family: system-ui, -apple-system, sans-serif; color: #1b1b2e; }
        .top { display: flex; align-items: center; gap: 14px; padding: 14px 20px; border-bottom: 1px solid #edeef2; position: sticky; top: 0; background: #fff; z-index: 5; }
        .back { text-decoration: none; color: #8b90a0; font-size: 13.5px; flex-shrink: 0; }
        .back:hover { color: #6a49f2; }
        .who { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
        .av { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; font-size: 15px; font-weight: 600; color: #fff; background: linear-gradient(135deg,#a78bfa,#7c5cff); overflow: hidden; flex-shrink: 0; }
        .av img { width: 100%; height: 100%; object-fit: cover; }
        .nm { font-size: 15px; font-weight: 600; }
        .mt { font-size: 12px; color: #a9adba; }
        .open { text-decoration: none; color: #6a49f2; font-size: 13px; font-weight: 500; flex-shrink: 0; }
        .chat { flex: 1; overflow-y: auto; padding: 22px 20px; display: flex; flex-direction: column; gap: 14px; }
        .empty { text-align: center; margin: auto; display: flex; flex-direction: column; align-items: center; gap: 5px; }
        .eav { width: 54px; height: 54px; border-radius: 15px; display: grid; place-items: center; font-size: 22px; font-weight: 600; color: #fff; background: linear-gradient(135deg,#a78bfa,#7c5cff); overflow: hidden; margin-bottom: 8px; }
        .eav img { width: 100%; height: 100%; object-fit: cover; }
        .empty .et { font-size: 16px; font-weight: 600; }
        .empty .es { font-size: 13.5px; color: #8b90a0; max-width: 360px; }
        .msg { display: flex; flex-direction: column; max-width: 82%; }
        .msg.user { align-self: flex-end; align-items: flex-end; }
        .bub { padding: 9px 13px; border-radius: 13px; font-size: 14px; line-height: 1.55; white-space: pre-wrap; }
        .msg.ai .bub { background: #f4f5f8; border: 1px solid #ebedf1; border-top-left-radius: 3px; }
        .msg.user .bub { background: #7c5cff; color: #fff; border-top-right-radius: 3px; }
        .refs { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px; }
        .ref { font-size: 11px; color: #6b7180; background: #f4f5f8; border: 1px solid #ebedf1; border-radius: 5px; padding: 2px 7px; }
        .typ { display: inline-flex; gap: 4px; padding: 2px 0; }
        .typ i { width: 6px; height: 6px; border-radius: 50%; background: #b9bdc9; animation: b 1s infinite; }
        .typ i:nth-child(2) { animation-delay: .15s; } .typ i:nth-child(3) { animation-delay: .3s; }
        @keyframes b { 0%,60%,100% { opacity: .3; } 30% { opacity: 1; } }
        .comp { display: flex; gap: 8px; padding: 14px 20px; border-top: 1px solid #edeef2; position: sticky; bottom: 0; background: #fff; }
        .comp input { flex: 1; border: 1px solid #e2e4ea; border-radius: 11px; padding: 11px 14px; font: inherit; font-size: 14px; outline: none; }
        .comp input:focus { border-color: #7c5cff; box-shadow: 0 0 0 2px rgba(124,92,255,.12); }
        .comp button { border: 0; border-radius: 11px; padding: 0 20px; background: #7c5cff; color: #fff; font: inherit; font-size: 14px; font-weight: 500; cursor: pointer; }
        .comp button:disabled { opacity: .5; }
      `}</style>
    </div>
  );
}
