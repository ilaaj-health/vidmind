"use client";
import dynamic from "next/dynamic";

const Hero3D = dynamic(() => import("./components/Hero3D"), { ssr: false });

// The desktop installer, hosted on the vidmind repo's GitHub Release (repo is public).
const DOWNLOAD_URL =
  "https://github.com/ilaaj-health/vidmind/releases/download/v0.1.0/VidMind-win32-x64.zip";
const APP_URL = "/home";

function WinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 5.5 10.5 4.5v7H3zM10.5 12.5v7L3 18.5v-6zM11.5 4.3 21 3v8.5h-9.5zM21 12.5V21l-9.5-1.3v-7.2z" />
    </svg>
  );
}

// Line icons for the feature cards (stroke = currentColor).
const ICONS = {
  globe: (<><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.6 2.9 2.6 15.1 0 18M12 3c-2.6 2.9-2.6 15.1 0 18" /></>),
  graph: (<><circle cx="6" cy="7" r="2.1" /><circle cx="18" cy="7" r="2.1" /><circle cx="12" cy="18" r="2.1" /><path d="M8 7.4h8M7.4 8.8l3.5 7.3M16.6 8.8l-3.5 7.3" /></>),
  quote: (<><rect x="4.5" y="3" width="15" height="18" rx="2.2" /><path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4" /></>),
  shield: (<><path d="M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6z" /><path d="M12.6 8.4l-2.6 4.1h3l-2.6 4.1" /></>),
  video: (<><rect x="3" y="6.5" width="12.5" height="11" rx="2.2" /><path d="M7.7 10.1v3.8l3.3-1.9z" /><path d="M18.5 8.7v8.6M21 10.2v5.6" /></>),
  desktop: (<><rect x="3" y="4.5" width="18" height="12" rx="2" /><path d="M8.5 20.5h7M12 16.5v4" /></>),
};
function FIcon({ name }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[name]}
    </svg>
  );
}

export default function Landing() {
  return (
    <div className="lp">
      <Hero3D />
      <div className="veil" />

      <div className="inner">
        <nav className="nav">
          <div className="brand">
            <span className="logo">
              <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden><path d="M18 35 V14 h7 a7 7 0 0 1 0 14 h-7" fill="none" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="30.5" cy="21" r="2.4" fill="#fff" /></svg>
            </span>
            Pers<span style={{ color: "#a78bfa" }}>o</span>na
          </div>
          <div className="nav-links">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a className="ghost-btn" href={APP_URL}>Open web app →</a>
          </div>
        </nav>

        <header className="hero">
          <div className="pill"><span className="pdot" /> Desktop app · Windows</div>
          <h1>
            Turn any <span className="grad">YouTube video</span><br />
            into a chattable <span className="grad2">knowledge base</span>.
          </h1>
          <p className="sub">
            Paste a video or channel — Persona transcribes it, indexes it, and lets you ask
            questions in any language with cited answers. Downloads run on your own machine,
            so there are no blocks and no proxies.
          </p>

          <div className="cta">
            <a className="dl" href={DOWNLOAD_URL}>
              <WinIcon /> Download for Windows
              <span className="dl-sub">Free · Windows 10/11 · ~113 MB</span>
            </a>
            <a className="try" href={APP_URL}>Try the chat in your browser</a>
          </div>
          <div className="note">No account needed · Your videos download locally on your PC</div>
        </header>

        <section id="how" className="how">
          <div className="sec-h"><span>How it works</span></div>
          <div className="steps">
            {[
              { n: "01", t: "Paste a link", d: "Drop any YouTube video or channel URL into the desktop app." },
              { n: "02", t: "It processes locally", d: "The app downloads the audio on your machine, then transcribes & indexes it in the cloud." },
              { n: "03", t: "Chat with cited answers", d: "Ask anything — English, Roman Urdu, or Urdu — and get answers with sources." },
            ].map((s) => (
              <div key={s.n} className="step">
                <div className="step-n">{s.n}</div>
                <div className="step-t">{s.t}</div>
                <div className="step-d">{s.d}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="features">
          <div className="sec-h"><span>Built for real content</span></div>
          <div className="grid">
            {[
              { i: "globe", t: "Any language", d: "Multilingual retrieval — Urdu, English, or mixed. No single language wins." },
              { i: "graph", t: "Interlinked knowledge", d: "A knowledge graph connects people, places & topics across videos." },
              { i: "quote", t: "Cited answers", d: "Every answer points back to the exact source it came from." },
              { i: "shield", t: "No proxies, no blocks", d: "Audio downloads on your own IP — YouTube never blocks you." },
              { i: "video", t: "Videos or channels", d: "Process a single talk or a whole channel's back-catalogue." },
              { i: "desktop", t: "Runs on your machine", d: "The heavy download happens locally; only audio goes to the server." },
            ].map((f) => (
              <div key={f.t} className="feat">
                <div className="feat-i"><FIcon name={f.i} /></div>
                <div className="feat-t">{f.t}</div>
                <div className="feat-d">{f.d}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="final">
          <h2>Ready to chat with your videos?</h2>
          <a className="dl big" href={DOWNLOAD_URL}>
            <WinIcon /> Download Persona for Windows
          </a>
          <div className="note">Prefer just chatting? <a href={APP_URL}>Open the web app →</a></div>
        </section>

        <footer className="foot">
          <span>Persona</span>
          <span>Built for creators & researchers · 2026</span>
        </footer>
      </div>

      <style jsx>{`
        .lp { position: relative; min-height: 100vh; overflow-x: hidden;
          background:
            radial-gradient(1100px 600px at 15% -10%, rgba(124,92,255,.22), transparent 60%),
            radial-gradient(900px 600px at 110% 0%, rgba(91,140,255,.16), transparent 55%),
            #07080c; color: #eceef4; }
        .veil { position: fixed; inset: 0; z-index: 1; pointer-events: none;
          background: radial-gradient(1200px 700px at 50% 30%, transparent 40%, rgba(7,8,12,.55) 100%); }
        .inner { position: relative; z-index: 2; max-width: 1080px; margin: 0 auto; padding: 0 22px 70px; }

        .nav { display: flex; align-items: center; justify-content: space-between; padding: 22px 0; }
        .brand { display: flex; align-items: center; gap: 11px; font-weight: 800; font-size: 19px; letter-spacing: -.02em; }
        .logo { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center;
          background: linear-gradient(135deg, #7c5cff, #5b8cff); box-shadow: 0 8px 22px -6px rgba(124,92,255,.75); }
        .nav-links { display: flex; align-items: center; gap: 22px; font-size: 14px; color: #b7bccb; }
        .nav-links a { color: inherit; text-decoration: none; transition: color .15s; }
        .nav-links a:hover { color: #fff; }
        .ghost-btn { border: 1px solid rgba(255,255,255,.16); padding: 8px 15px; border-radius: 10px;
          background: rgba(255,255,255,.03); backdrop-filter: blur(8px); }

        .hero { text-align: center; padding: 70px 0 60px; }
        .pill { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; color: #cdd2e0;
          border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.04); backdrop-filter: blur(8px);
          padding: 7px 14px; border-radius: 999px; margin-bottom: 26px; }
        .pdot { width: 7px; height: 7px; border-radius: 50%; background: #34d399; box-shadow: 0 0 0 3px rgba(52,211,153,.18); }
        .hero h1 { font-size: clamp(34px, 6vw, 62px); line-height: 1.05; font-weight: 850; letter-spacing: -.035em;
          margin: 0 0 22px; }
        .grad { background: linear-gradient(120deg, #c4b5fd, #93c5fd 60%, #a7f3d0);
          -webkit-background-clip: text; background-clip: text; color: transparent; }
        .grad2 { background: linear-gradient(120deg, #93c5fd, #c4b5fd);
          -webkit-background-clip: text; background-clip: text; color: transparent; }
        .sub { color: #9aa0b2; max-width: 640px; margin: 0 auto 34px; font-size: clamp(15px, 2vw, 17px); line-height: 1.65; }

        .cta { display: flex; gap: 16px; justify-content: center; align-items: center; flex-wrap: wrap; }
        .dl { display: inline-flex; flex-direction: column; align-items: center; gap: 2px; text-decoration: none;
          color: #fff; font-weight: 750; font-size: 16px; padding: 15px 30px; border-radius: 14px;
          background: linear-gradient(135deg, #7c5cff, #5b8cff);
          box-shadow: 0 16px 40px -12px rgba(124,92,255,.8); transition: transform .16s, box-shadow .16s; position: relative; }
        .dl svg { vertical-align: -3px; margin-right: 8px; display: inline; }
        .dl:hover { transform: translateY(-2px); box-shadow: 0 22px 50px -12px rgba(124,92,255,.9); }
        .dl-sub { font-size: 11.5px; font-weight: 500; color: rgba(255,255,255,.8); letter-spacing: .01em; }
        .try { color: #cdd2e0; text-decoration: none; font-size: 15px; border-bottom: 1px solid rgba(255,255,255,.25);
          padding-bottom: 2px; transition: color .15s; }
        .try:hover { color: #fff; }
        .note { color: #6b7186; font-size: 13px; margin-top: 20px; }
        .note a { color: #93c5fd; text-decoration: none; }

        .sec-h { display: flex; justify-content: center; margin-bottom: 34px; }
        .sec-h span { font-size: 13px; letter-spacing: .14em; text-transform: uppercase; color: #7c8296;
          border: 1px solid rgba(255,255,255,.1); border-radius: 999px; padding: 6px 16px; }

        .how { padding: 60px 0; }
        .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
        .step { border: 1px solid rgba(255,255,255,.09); border-radius: 18px; padding: 26px 22px;
          background: linear-gradient(180deg, rgba(23,26,34,.7), rgba(20,22,29,.55)); backdrop-filter: blur(10px); }
        .step-n { font-size: 13px; font-weight: 800; letter-spacing: .1em;
          background: linear-gradient(120deg, #c4b5fd, #93c5fd); -webkit-background-clip: text; background-clip: text;
          color: transparent; margin-bottom: 14px; }
        .step-t { font-weight: 750; font-size: 18px; margin-bottom: 8px; letter-spacing: -.01em; }
        .step-d { color: #9aa0b2; font-size: 14.5px; line-height: 1.6; }

        .features { padding: 50px 0; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .feat { border: 1px solid rgba(255,255,255,.08); border-radius: 16px; padding: 22px;
          background: rgba(255,255,255,.02); transition: border-color .2s, transform .2s; }
        .feat:hover { border-color: rgba(124,92,255,.45); transform: translateY(-3px); }
        .feat-i { width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center;
          margin-bottom: 14px; color: #c4b5fd;
          background: linear-gradient(135deg, rgba(124,92,255,.22), rgba(91,140,255,.14));
          border: 1px solid rgba(124,92,255,.28); }
        .feat:hover .feat-i { color: #fff; }
        .feat-t { font-weight: 700; font-size: 16px; margin-bottom: 7px; }
        .feat-d { color: #9aa0b2; font-size: 14px; line-height: 1.6; }

        .final { text-align: center; padding: 80px 0 40px; }
        .final h2 { font-size: clamp(26px, 4vw, 40px); font-weight: 800; letter-spacing: -.03em; margin: 0 0 28px; }
        .dl.big { flex-direction: row; align-items: center; gap: 4px; }
        .final .note { margin-top: 22px; }

        .foot { display: flex; justify-content: space-between; align-items: center; padding: 40px 0 0;
          border-top: 1px solid rgba(255,255,255,.07); margin-top: 50px; color: #6b7186; font-size: 13px; }
        .foot span:first-child { font-weight: 700; color: #b7bccb; }

        @media (max-width: 760px) {
          .nav-links a:not(.ghost-btn) { display: none; }
          .steps, .grid { grid-template-columns: 1fr; }
          .hero { padding: 46px 0 40px; }
        }
      `}</style>
    </div>
  );
}
