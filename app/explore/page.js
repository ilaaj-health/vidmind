"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MatIcon } from "../components/ui";

const API = process.env.NEXT_PUBLIC_API_BASE || "";

export default function Explore() {
  const [list, setList] = useState(null);
  useEffect(() => {
    fetch(`${API}/api/gallery`).then((r) => r.json()).then((r) => setList(r.gallery || [])).catch(() => setList([]));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface font-body-md selection:bg-primary-fixed">
      {/* Top bar */}
      <header className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop h-16 bg-surface-container-lowest border-b border-outline-variant shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-display-lg text-headline-sm text-primary no-underline">Persona</Link>
          <nav className="hidden md:flex gap-6">
            <span className="text-primary border-b-2 border-primary pb-1 font-body-md">Public Gallery</span>
          </nav>
        </div>
        <Link
          href="/home"
          className="bg-primary text-on-primary px-6 py-2 font-mono-label text-mono-label uppercase tracking-widest hover:bg-on-surface-variant transition-transform active:scale-95 no-underline"
        >
          Open App
        </Link>
      </header>

      <main className="flex-1 w-full px-margin-mobile md:px-margin-desktop py-12 max-w-container-max mx-auto">
        <div className="mb-12">
          <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-4">Explore the Infinite Archive</h2>
          <div className="scholarly-border pl-4 max-w-2xl">
            <p className="font-body-lg text-body-lg text-on-surface-variant italic">
              "The archive is not a quiet place of the past, but a living dialogue with the intellects that shaped our understanding of the universe."
            </p>
            <p className="font-citation text-citation mt-2 uppercase tracking-widest text-outline">
              Published personalities — chat freely, no sign-in needed
            </p>
          </div>
        </div>

        {list === null ? (
          <p className="font-citation text-citation text-on-surface-variant py-16 text-center">Consulting the archive…</p>
        ) : list.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-outline-variant">
            <MatIcon name="auto_stories" className="text-4xl text-outline" />
            <p className="font-headline-sm text-headline-sm mt-4 mb-1">No published personalities yet</p>
            <p className="font-body-md text-body-md text-on-surface-variant">Once a creator publishes one, it will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
            {list.map((p) => (
              <div key={p.id} className="group relative bg-surface-container-lowest p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-outline-variant flex flex-col">
                <div className="relative h-64 w-full mb-6 overflow-hidden rounded-lg bg-surface-container-high grayscale group-hover:grayscale-0 transition-all duration-500">
                  {p.image_url ? (
                    <img src={p.image_url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary">
                      <span className="font-display-lg text-[96px] text-on-primary/90 select-none leading-none">
                        {(p.name || "?").trim().charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-start mb-2 gap-3">
                  <h3 className="font-headline-sm text-headline-sm min-w-0 truncate">{p.name}</h3>
                  <div className="flex items-center gap-1 text-on-surface-variant shrink-0 mt-1">
                    <MatIcon name="video_library" className="text-[18px]" />
                    <span className="font-mono-label text-mono-label uppercase">{p.videos} {p.videos === 1 ? "source" : "sources"}</span>
                  </div>
                </div>
                <p className="font-body-md text-body-md text-secondary mb-8 line-clamp-2 flex-1">
                  {p.persona || "Chat with this personality's videos — cited answers in any language."}
                </p>
                <Link
                  href={`/explore/${p.id}`}
                  className="w-full bg-primary text-on-primary font-bold py-4 rounded-lg flex justify-center items-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all no-underline"
                >
                  Chat Now <MatIcon name="arrow_forward" />
                </Link>
              </div>
            ))}

            {/* Digitize a Voice CTA */}
            <Link
              href="/home"
              className="group border-2 border-dashed border-outline-variant rounded-xl p-6 flex flex-col items-center justify-center text-center min-h-[320px] hover:border-primary transition-colors no-underline"
            >
              <div className="w-12 h-12 rounded-full border border-outline-variant flex items-center justify-center mb-4 group-hover:border-primary group-hover:bg-primary group-hover:text-on-primary transition-all">
                <MatIcon name="add" />
              </div>
              <p className="font-headline-sm text-headline-sm mb-1">Digitize a Voice</p>
              <p className="font-citation text-citation text-on-surface-variant max-w-[220px]">
                Ingest video data to preserve an intellectual legacy of your own.
              </p>
            </Link>
          </div>
        )}
      </main>

      <footer className="w-full py-8 px-margin-mobile md:px-margin-desktop flex flex-col md:flex-row justify-between items-center gap-4 bg-surface-container border-t border-outline-variant">
        <div className="flex items-center gap-6">
          <span className="font-headline-sm text-headline-sm text-on-surface">Persona AI</span>
          <span className="font-citation text-citation text-secondary">© 2026 Persona AI. All rights reserved.</span>
        </div>
        <div className="flex gap-8">
          <Link className="font-citation text-citation text-secondary hover:text-primary transition-colors no-underline" href="/">Home</Link>
          <Link className="font-citation text-citation text-secondary hover:text-primary transition-colors no-underline" href="/home">Open App</Link>
        </div>
      </footer>
    </div>
  );
}
