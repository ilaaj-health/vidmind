"use client";
import Markdown from "./Markdown";

/* Shared editorial UI primitives for the Stitch "Modern Archive" design. */

// Material Symbols ligature icon (same icon set the design uses).
export function MatIcon({ name, className = "", fill = false }) {
  return (
    <span aria-hidden className={`material-symbols-outlined ${fill ? "fill " : ""}${className}`}>
      {name}
    </span>
  );
}

// Square-ish archival avatar: photo when available, serif initial otherwise.
export function Avatar({ name, image, className = "", textClass = "text-base", grayscale = false }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <div className={`rounded-full overflow-hidden shrink-0 bg-primary text-on-primary flex items-center justify-center ${className}`}>
      {image ? (
        <img src={image} alt="" className={`w-full h-full object-cover ${grayscale ? "grayscale" : ""}`} />
      ) : (
        <span className={`font-headline-sm ${textClass} leading-none select-none`}>{initial}</span>
      )}
    </div>
  );
}

// User message: plain right-aligned editorial text (no bubble), per the design.
export function UserMsg({ text }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%]">
        <p className="font-body-lg text-body-lg text-primary text-right whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  );
}

// Typing indicator shown inside an AI slot.
export function Typing() {
  return (
    <span className="inline-flex gap-1.5 items-center py-2">
      <i className="w-1.5 h-1.5 rounded-full bg-outline animate-pulse" />
      <i className="w-1.5 h-1.5 rounded-full bg-outline animate-pulse [animation-delay:200ms]" />
      <i className="w-1.5 h-1.5 rounded-full bg-outline animate-pulse [animation-delay:400ms]" />
    </span>
  );
}

// AI message: black auto_awesome avatar, serif-lead markdown, Archive Citations.
export function AiMsg({ text, refs, typing }) {
  return (
    <div className="flex gap-6">
      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1">
        <MatIcon name="auto_awesome" className="text-white text-xl" />
      </div>
      <div className="flex-1 min-w-0 space-y-4">
        {typing ? <Typing /> : <Markdown text={text} />}
        {!typing && refs?.length > 0 && (
          <div className="pt-6 mt-6 border-t border-outline-variant space-y-4">
            <p className="font-mono-label text-mono-label text-on-surface-variant uppercase tracking-widest">Archive Citations</p>
            {refs.slice(0, 6).map((r) => (
              <div key={r.n} className="citation-line pl-4 py-1">
                <p className="font-citation text-citation text-on-surface-variant">
                  <span className="font-bold text-primary">[{r.n}]</span> "{r.source || "Untitled source"}"
                  {r.idx != null && <> — Segment: #{r.idx}</>}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Composer: bordered white box with black send button + scholarly meta row.
export function Composer({ value, onChange, onSend, busy, placeholder }) {
  return (
    <div className="p-6 md:p-8 bg-surface-container-lowest border-t border-outline-variant">
      <div className="max-w-[800px] mx-auto">
        <div className="flex items-center gap-4 p-3 pl-5 bg-white border border-outline-variant shadow-sm focus-within:ring-1 focus-within:ring-primary transition-all">
          <input
            className="flex-1 border-none outline-none focus:ring-0 py-2 font-body-lg text-body-lg bg-transparent placeholder:text-on-surface-variant/60"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSend()}
            placeholder={placeholder}
          />
          <button
            onClick={onSend}
            disabled={busy}
            className="p-3 bg-primary text-on-primary rounded-lg hover:opacity-90 active:scale-90 transition-all flex items-center justify-center disabled:opacity-40"
            aria-label="Send"
          >
            <MatIcon name="send" />
          </button>
        </div>
        <div className="flex justify-between items-center mt-3 px-1">
          <div className="flex gap-4">
            <span className="text-citation font-mono-label text-on-surface-variant flex items-center gap-1 uppercase tracking-widest">
              <MatIcon name="link" className="text-[14px]" /> Citation Mode
            </span>
            <span className="hidden sm:flex text-citation font-mono-label text-on-surface-variant items-center gap-1 uppercase tracking-widest">
              <MatIcon name="translate" className="text-[14px]" /> Any Language
            </span>
          </div>
          <p className="text-[10px] text-on-surface-variant italic hidden md:block">
            Persona AI uses synthesized archive data for scholarly reference.
          </p>
        </div>
      </div>
    </div>
  );
}
