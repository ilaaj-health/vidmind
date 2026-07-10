import { MatIcon } from "../components/ui";

/* Split-card auth shell from the Stitch "Sign In / Sign Up" screen: editorial left
   panel + the Clerk widget (functionality untouched) themed monochrome on the right. */

// Visual-only theming for the Clerk widget (black primary, Inter, sharp corners).
export const clerkAppearance = {
  variables: {
    colorPrimary: "#000000",
    colorText: "#1b1b1d",
    colorTextSecondary: "#5f5e5c",
    colorBackground: "#ffffff",
    colorInputBackground: "#f6f3f5",
    colorInputText: "#1b1b1d",
    colorDanger: "#ba1a1a",
    borderRadius: "2px",
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: "15px",
  },
  elements: {
    rootBox: "w-full",
    card: "shadow-none border-0 bg-transparent p-0 w-full",
    cardBox: "shadow-none border-0 bg-transparent w-full",
    header: "hidden",
    formButtonPrimary:
      "bg-primary hover:bg-on-surface-variant text-on-primary font-semibold py-3 shadow-none uppercase tracking-widest text-[12px]",
    socialButtonsBlockButton: "border border-outline-variant bg-surface hover:bg-surface-container-low rounded-none py-3",
    formFieldLabel: "font-mono-label text-mono-label uppercase tracking-widest text-on-surface-variant",
    formFieldInput: "bg-surface-container-low border-none h-12 focus:ring-1 focus:ring-primary rounded-none",
    dividerText: "font-citation text-citation uppercase tracking-widest text-outline",
    footer: "bg-transparent",
    footerAction: "bg-transparent",
  },
};

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface font-body-md">
      <main className="flex-grow flex items-center justify-center relative overflow-hidden px-4 py-10 md:px-0">
        <div className="z-10 w-full max-w-[1100px] flex flex-col md:flex-row bg-surface shadow-sm rounded-none border border-outline-variant overflow-hidden">
          {/* Left editorial panel */}
          <div className="hidden md:flex md:w-1/2 bg-surface-container-lowest p-16 flex-col justify-between border-r border-outline-variant">
            <div>
              <h1 className="font-display-lg text-display-lg text-primary mb-2">Persona AI</h1>
              <p className="font-citation text-citation text-on-surface-variant uppercase tracking-widest border-l-2 border-primary pl-4 py-1">
                Your Infinite Archive
              </p>
            </div>
            <div className="space-y-12">
              <div>
                <MatIcon name="auto_stories" className="text-primary text-4xl mb-4" />
                <h2 className="font-headline-sm text-headline-sm text-primary mb-2">Preserve Wisdom</h2>
                <p className="font-body-md text-body-md text-secondary">
                  Digitize YouTube lectures into an interactive knowledge base. Access personal archives with high-tech precision.
                </p>
              </div>
              <div>
                <MatIcon name="neurology" className="text-primary text-4xl mb-4" />
                <h2 className="font-headline-sm text-headline-sm text-primary mb-2">Neural Archiving</h2>
                <p className="font-body-md text-body-md text-secondary">
                  Advanced computational models bridge the gap between historical sources and modern inquiry.
                </p>
              </div>
            </div>
            <div className="pt-8 border-t border-outline-variant">
              <p className="font-citation text-citation text-secondary italic">
                "Information is the source of wisdom; the archive is the home of time."
              </p>
            </div>
          </div>

          {/* Right panel: Clerk widget */}
          <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-center bg-surface-container-lowest">
            <div className="mb-8 text-center md:text-left">
              <h3 className="font-headline-md text-headline-md text-primary mb-2">{title}</h3>
              <p className="font-body-md text-body-md text-secondary">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>
      </main>
      <footer className="w-full py-8 px-margin-mobile md:px-margin-desktop flex flex-col md:flex-row justify-between items-center bg-surface-container text-on-surface-variant font-citation text-citation gap-4">
        <div>© 2026 Persona AI. All rights reserved.</div>
        <div className="flex gap-8">
          <a className="hover:text-primary transition-colors no-underline" href="/">Home</a>
          <a className="hover:text-primary transition-colors no-underline" href="/explore">Explore the Archive</a>
        </div>
      </footer>
    </div>
  );
}
