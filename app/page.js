"use client";
import { MatIcon } from "./components/ui";

// The desktop installer, hosted on the vidmind repo's GitHub Release (repo is public).
const DOWNLOAD_URL =
  "https://github.com/ilaaj-health/vidmind/releases/download/v0.1.0/VidMind-win32-x64.zip";
const APP_URL = "/home";

export default function Landing() {
  return (
    <div className="bg-background text-on-surface font-body-md selection:bg-primary-fixed">
      {/* Top Navigation Bar */}
      <header className="fixed top-0 w-full z-50 bg-surface-container-lowest/80 backdrop-blur-md flex justify-between items-center px-margin-mobile md:px-margin-desktop h-16 border-b border-outline-variant shadow-sm">
        <div className="flex items-center gap-4">
          <a href="/" className="font-display-lg text-display-lg-mobile md:text-headline-sm text-primary no-underline">Persona</a>
          <nav className="hidden md:flex gap-8 ml-12">
            <a className="font-body-md text-primary border-b-2 border-primary pb-1 no-underline" href="#how">How it works</a>
            <a className="font-body-md text-on-surface-variant hover:text-primary transition-all no-underline" href="#features">Features</a>
            <a className="font-body-md text-on-surface-variant hover:text-primary transition-all no-underline" href="/explore">Explore</a>
          </nav>
        </div>
        <div className="flex items-center gap-6">
          <a className="hidden sm:block font-body-md text-on-surface-variant hover:text-primary transition-all no-underline" href={APP_URL}>Open Web App</a>
          <a
            className="bg-primary text-on-primary px-6 py-2 font-mono-label text-mono-label uppercase tracking-widest hover:bg-on-surface-variant transition-transform active:scale-95 no-underline"
            href={DOWNLOAD_URL}
          >
            Download for Desktop
          </a>
        </div>
      </header>

      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative min-h-[85vh] flex items-center overflow-hidden px-margin-mobile md:px-margin-desktop bg-surface py-20">
          <div className="container mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10 items-center max-w-container-max">
            <div className="lg:col-span-6 space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container-high rounded-full border border-outline-variant">
                <MatIcon name="auto_awesome" className="text-primary text-[16px]" />
                <span className="font-mono-label text-[10px] tracking-[0.1em] text-on-surface-variant uppercase">Urdu &amp; Roman Urdu Support</span>
              </div>
              <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface leading-tight">
                Talk to the <span className="italic font-light">wisdom</span> of the world.
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl">
                Persona transforms YouTube lectures into your personal archive. Paste a video or a
                whole channel — it transcribes, indexes, and turns passive viewing into an active
                dialogue with cited answers, in any language.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <a href={APP_URL} className="bg-primary text-on-primary px-8 py-4 font-headline-sm text-base flex items-center gap-3 hover:shadow-lg transition-all active:scale-95 no-underline">
                  Try the Demo <MatIcon name="arrow_forward" />
                </a>
                <a href="/explore" className="bg-transparent border border-primary text-primary px-8 py-4 font-headline-sm text-base hover:bg-surface-container-low transition-all no-underline">
                  View Examples
                </a>
              </div>
              <p className="font-citation text-citation text-on-surface-variant">
                Desktop app for Windows 10/11 (~113&nbsp;MB) · videos download on your own machine — no blocks, no proxies.
              </p>
            </div>

            {/* Chat preview illustration */}
            <div className="lg:col-span-6 relative">
              <div className="floating-ui relative z-20 space-y-6">
                <div className="glass-lab p-6 rounded-xl shadow-xl max-w-md mx-auto md:ml-auto">
                  <div className="flex items-center gap-4 mb-6 border-b border-outline-variant pb-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary bg-primary text-on-primary flex items-center justify-center">
                      <span className="font-headline-sm text-lg select-none">M</span>
                    </div>
                    <div>
                      <h4 className="font-headline-sm text-lg">Marcus Aurelius</h4>
                      <p className="font-citation text-citation text-on-surface-variant">Archived from: "Stoic Meditation Series"</p>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="flex justify-end">
                      <div className="bg-primary-container text-on-primary-fixed px-4 py-2 rounded-lg max-w-[80%]">
                        <p className="font-body-md text-sm text-primary-fixed">How should I approach a difficult workday tomorrow?</p>
                      </div>
                    </div>
                    <div className="bg-surface-container-low px-4 py-3 rounded-lg border border-outline-variant">
                      <p className="font-display-lg text-sm italic mb-2">
                        "Begin the morning by saying to yourself, I shall meet with the busybody, the ungrateful, arrogant, deceitful, envious, unsocial..."
                      </p>
                      <div className="citation-line pl-3">
                        <p className="font-citation text-[10px] text-on-tertiary-container uppercase tracking-widest">Source: Meditations bk. II</p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="bg-primary-container px-4 py-2 rounded-lg max-w-[80%]">
                        <p className="font-body-md text-sm text-primary-fixed">Kal ke mushkil kaam ko kaise dekhein?</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center gap-2 bg-surface p-2 border border-outline rounded">
                    <span className="flex-1 font-body-md text-sm text-on-surface-variant/60 pl-2 select-none">Inquire of the source...</span>
                    <MatIcon name="send" className="text-primary p-1" />
                  </div>
                </div>

                {/* Data Ingestion Overlay */}
                <div className="absolute -bottom-10 -left-10 md:-left-20 glass-lab p-4 w-64 border-l-4 border-tertiary-fixed shadow-lg hidden md:block">
                  <div className="flex items-center gap-2 mb-2">
                    <MatIcon name="fiber_manual_record" fill className="text-[14px] text-on-tertiary-container animate-pulse" />
                    <span className="font-mono-label text-[10px] uppercase">Processing Knowledge</span>
                  </div>
                  <div className="w-full bg-surface-container-highest h-1 rounded-full mb-2">
                    <div className="bg-on-tertiary-container h-1 rounded-full w-2/3" />
                  </div>
                  <div className="flex justify-between font-citation text-[10px] text-on-surface-variant">
                    <span>URI: YT_XJ920...</span>
                    <span>68% Complete</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="py-24 px-margin-mobile md:px-margin-desktop bg-surface-container-low border-y border-outline-variant">
          <div className="max-w-container-max mx-auto">
            <div className="mb-16">
              <h2 className="font-headline-md text-headline-md text-on-surface mb-4">How the Archive Grows</h2>
              <div className="w-24 h-1 bg-primary" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
              {[
                { n: "01", t: "Paste a link", d: "Drop any YouTube video or channel URL into the desktop app." },
                { n: "02", t: "It processes locally", d: "Audio downloads on your machine, then is transcribed, chunked, and indexed in the cloud." },
                { n: "03", t: "Chat with cited answers", d: "Ask anything — English, Urdu, or Roman Urdu — every answer points back to its source." },
              ].map((s) => (
                <div key={s.n} className="bg-surface-container-lowest border border-outline-variant p-8 hover:border-primary transition-colors">
                  <p className="font-display-lg text-headline-md text-primary mb-6">{s.n}</p>
                  <h3 className="font-headline-sm text-headline-sm mb-3">{s.t}</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Bento Grid */}
        <section id="features" className="py-24 px-margin-mobile md:px-margin-desktop bg-surface-container-lowest">
          <div className="max-w-container-max mx-auto">
            <div className="mb-16">
              <h2 className="font-headline-md text-headline-md text-on-surface mb-4">A Systematic Approach to Wisdom</h2>
              <div className="w-24 h-1 bg-primary" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
              {/* Feature 1: Multilingual */}
              <div className="md:col-span-7 bg-surface-container-low p-8 border border-outline-variant hover:border-primary transition-colors group flex flex-col justify-between min-h-[320px]">
                <div>
                  <MatIcon name="translate" className="text-primary mb-6" />
                  <h3 className="font-headline-sm text-headline-sm mb-4">Linguistic Fluidity</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
                    Break the language barrier. Interface with complex global ideas in English, Urdu, or Roman Urdu with native precision.
                  </p>
                </div>
                <div className="mt-8 flex gap-4 overflow-hidden grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                  <span className="font-display-lg text-lg border-r pr-4 border-outline">Urdu</span>
                  <span className="font-display-lg text-lg border-r pr-4 border-outline italic">English</span>
                  <span className="font-display-lg text-lg">Roman Urdu</span>
                </div>
              </div>
              {/* Feature 2: Permanent Knowledge */}
              <div className="md:col-span-5 bg-tertiary-container text-tertiary-fixed p-8 border border-tertiary shadow-xl flex flex-col justify-between">
                <div>
                  <MatIcon name="database" className="text-tertiary-fixed mb-6" />
                  <h3 className="font-headline-sm text-headline-sm mb-4">Permanent Knowledge</h3>
                  <p className="font-body-md text-body-md opacity-80">
                    Once ingested, the persona resides in your private archive. Knowledge that doesn't expire and is always ready for citation.
                  </p>
                </div>
                <div className="mt-8 border-t border-tertiary-fixed-dim/20 pt-4">
                  <div className="flex items-center gap-2">
                    <MatIcon name="check_circle" fill className="text-sm" />
                    <span className="font-citation text-[10px] uppercase tracking-widest">Answers cite their sources</span>
                  </div>
                </div>
              </div>
              {/* Feature 3: Pay as you go */}
              <div className="md:col-span-4 bg-surface p-8 border border-outline-variant hover:shadow-md transition-all">
                <MatIcon name="payments" className="text-primary mb-6" />
                <h3 className="font-headline-sm text-headline-sm mb-2">Pay-as-you-go</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  No subscription bloat. Only pay for the wisdom you ingest — a prepaid PKR wallet that never expires. Chat is free.
                </p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="font-headline-md text-headline-md text-primary">≈ PKR 2</span>
                  <span className="font-citation text-citation">/minute of wisdom</span>
                </div>
              </div>
              {/* Feature 4: High Tech Monitor */}
              <div className="md:col-span-8 bg-on-surface overflow-hidden relative group">
                <div className="absolute inset-0 opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity">
                  <div
                    className="w-full h-full"
                    style={{
                      backgroundImage:
                        "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
                      backgroundSize: "20px 20px",
                    }}
                  />
                </div>
                <div className="relative p-8 h-full flex flex-col md:flex-row gap-8 items-center">
                  <div className="flex-1">
                    <h3 className="font-headline-sm text-headline-sm text-surface-container-lowest mb-4">Laboratory Precision</h3>
                    <p className="font-body-md text-body-md text-surface-variant opacity-70">
                      Experience the Lab View. Watch in real time as the desktop app fetches, transcribes, chunks, and feeds each video to your persona.
                    </p>
                  </div>
                  <div className="w-full md:w-64 aspect-video bg-black/50 border border-outline-variant/30 relative rounded p-2 overflow-hidden">
                    <div className="video-flicker absolute inset-0 flex items-center justify-center">
                      <MatIcon name="monitoring" className="text-on-surface-variant text-4xl" />
                    </div>
                    <div className="absolute bottom-2 left-2 right-2 flex justify-between">
                      <div className="h-1 flex-1 bg-surface-variant/20 mr-4">
                        <div className="h-full bg-tertiary-fixed w-1/3" />
                      </div>
                      <span className="font-mono-label text-[8px] text-tertiary-fixed">SCANNING_V_092</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-margin-mobile md:px-margin-desktop bg-surface">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface">The archive is waiting for you.</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Join researchers and students turning the internet's noise into structured knowledge.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
              <a href={APP_URL} className="bg-primary text-on-primary px-10 py-5 font-headline-sm text-lg hover:bg-on-surface-variant transition-all no-underline">
                Get Started for Free
              </a>
              <a href="/explore" className="bg-transparent border-2 border-primary text-primary px-10 py-5 font-headline-sm text-lg hover:bg-primary hover:text-on-primary transition-all no-underline">
                Explore the Library
              </a>
            </div>
            <p className="font-citation text-citation text-on-surface-variant">
              No account needed to browse · your videos download locally on your PC.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-12 px-margin-mobile md:px-margin-desktop bg-surface-container flex flex-col md:flex-row justify-between items-center gap-8 border-t border-outline-variant">
        <div className="flex flex-col items-center md:items-start gap-4">
          <span className="font-headline-sm text-headline-sm text-on-surface">Persona AI</span>
          <p className="font-citation text-citation text-on-surface-variant">© 2026 Persona AI. All rights reserved.</p>
        </div>
        <nav className="flex flex-wrap justify-center gap-8">
          <a className="font-citation text-citation text-secondary hover:text-primary transition-all no-underline" href="#how">How it works</a>
          <a className="font-citation text-citation text-secondary hover:text-primary transition-all no-underline" href="#features">Features</a>
          <a className="font-citation text-citation text-secondary hover:text-primary transition-all no-underline" href="/explore">Explore</a>
          <a className="font-citation text-citation text-secondary hover:text-primary transition-all no-underline" href={APP_URL}>Web App</a>
        </nav>
        <div className="flex gap-4">
          <a
            className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-high hover:bg-primary hover:text-on-primary transition-colors"
            href={DOWNLOAD_URL}
            title="Download for Windows"
          >
            <MatIcon name="download" className="text-xl" />
          </a>
          <a
            className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-high hover:bg-primary hover:text-on-primary transition-colors"
            href="/explore"
            title="Explore the gallery"
          >
            <MatIcon name="language" className="text-xl" />
          </a>
        </div>
      </footer>
    </div>
  );
}
