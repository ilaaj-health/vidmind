"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_BASE || "";

function Logo({ size = 30 }) {
  return (
    <span style={{ width: size, height: size, borderRadius: 8, background: "linear-gradient(135deg,#8b6bff,#5b8cff)", display: "grid", placeItems: "center", flexShrink: 0 }}>
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 48 48" aria-hidden><path d="M18 35 V14 h7 a7 7 0 0 1 0 14 h-7" fill="none" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="30.5" cy="21" r="2.4" fill="#fff" /></svg>
    </span>
  );
}
const initial = (n) => (n || "?").trim().charAt(0).toUpperCase();

export default function Explore() {
  const [list, setList] = useState(null);
  useEffect(() => {
    fetch(`${API}/api/gallery`).then((r) => r.json()).then((r) => setList(r.gallery || [])).catch(() => setList([]));
  }, []);

  return (
    <div className="ex">
      <header className="top">
        <Link href="/" className="brand"><Logo /><span>Pers<span className="o">o</span>na</span></Link>
        <Link href="/home" className="open">Open app →</Link>
      </header>

      <div className="hero">
        <h1>Explore personalities</h1>
        <p>Chat with published personalities — no sign-in needed. Ask anything about their videos.</p>
      </div>

      {list === null ? (
        <div className="muted">Loading…</div>
      ) : list.length === 0 ? (
        <div className="empty">
          <Logo size={44} />
          <div className="et">No published personalities yet</div>
          <div className="es">Once a creator publishes one, it’ll show up here.</div>
        </div>
      ) : (
        <div className="grid">
          {list.map((p) => (
            <Link key={p.id} href={`/explore/${p.id}`} className="card">
              <span className="av">{p.image_url ? <img src={p.image_url} alt="" /> : initial(p.name)}</span>
              <div className="ci">
                <div className="cn">{p.name}</div>
                <div className="cp">{p.persona || "Chat with this personality’s videos"}</div>
                <div className="cm">{p.videos} {p.videos === 1 ? "video" : "videos"}</div>
              </div>
              <span className="go">Chat →</span>
            </Link>
          ))}
        </div>
      )}

      <style jsx>{`
        .ex { max-width: 980px; margin: 0 auto; padding: 20px 22px 70px; font-family: system-ui, -apple-system, sans-serif; color: #1b1b2e; }
        .top { display: flex; align-items: center; justify-content: space-between; padding: 6px 0 22px; }
        .brand { display: flex; align-items: center; gap: 10px; font-size: 19px; font-weight: 600; text-decoration: none; color: #1b1b2e; }
        .brand .o { color: #7c5cff; }
        .open { text-decoration: none; color: #6a49f2; font-size: 14px; font-weight: 500; border: 1px solid #d3c9ff; border-radius: 9px; padding: 8px 14px; }
        .open:hover { background: #f6f3ff; }
        .hero { text-align: center; padding: 26px 0 30px; }
        .hero h1 { font-size: clamp(26px, 4vw, 38px); font-weight: 700; letter-spacing: -.02em; margin: 0 0 10px; }
        .hero p { color: #8b90a0; font-size: 15px; max-width: 520px; margin: 0 auto; line-height: 1.6; }
        .muted { color: #8b90a0; text-align: center; padding: 40px; }
        .empty { text-align: center; padding: 50px 0; display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .empty .et { font-size: 16px; font-weight: 600; margin-top: 14px; }
        .empty .es { color: #8b90a0; font-size: 14px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
        .card { display: flex; align-items: center; gap: 14px; background: #fff; border: 1px solid #ececf4; border-radius: 14px; padding: 16px; text-decoration: none; color: inherit; transition: border-color .15s, transform .15s, box-shadow .15s; }
        .card:hover { border-color: #c9bcff; transform: translateY(-2px); box-shadow: 0 12px 28px -14px rgba(124,92,255,.5); }
        .av { width: 48px; height: 48px; border-radius: 12px; flex-shrink: 0; display: grid; place-items: center; font-size: 18px; font-weight: 600; color: #fff; background: linear-gradient(135deg,#a78bfa,#7c5cff); overflow: hidden; }
        .av img { width: 100%; height: 100%; object-fit: cover; }
        .ci { min-width: 0; flex: 1; }
        .cn { font-size: 15px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cp { font-size: 12.5px; color: #8b90a0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; }
        .cm { font-size: 11.5px; color: #a9adba; margin-top: 5px; }
        .go { font-size: 13px; font-weight: 500; color: #6a49f2; flex-shrink: 0; }
        @media (max-width: 560px) { .grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
