"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Monochrome editorial markdown (Stitch "Modern Archive" design): Inter body,
// inline [n] citations as dark navy pills, black underlined links.
const MD = {
  p: ({ children }) => <p className="mb-3 font-body-lg text-body-lg text-on-surface-variant leading-relaxed last:mb-0">{citeChildren(children)}</p>,
  ul: ({ children }) => <ul className="mb-3 pl-5 list-disc space-y-1 font-body-lg text-body-lg text-on-surface-variant">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 pl-5 list-decimal space-y-1 font-body-lg text-body-lg text-on-surface-variant">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{citeChildren(children)}</li>,
  strong: ({ children }) => <strong className="font-semibold text-primary">{children}</strong>,
  h2: ({ children }) => <h3 className="font-headline-sm text-lg font-semibold text-primary mt-4 mb-2">{children}</h3>,
  h3: ({ children }) => <h3 className="font-headline-sm text-base font-semibold text-primary mt-4 mb-2">{children}</h3>,
  code: ({ children }) => <code className="bg-surface-container px-1.5 py-0.5 rounded text-[13px]">{children}</code>,
  a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary">{children}</a>,
};

// Replace [1], [2][3] inside text nodes with the design's citation pills.
function citeChildren(children) {
  return (Array.isArray(children) ? children : [children]).map((c, i) => {
    if (typeof c !== "string") return c;
    return c.split(/(\[\d+\])/g).map((p, j) => {
      const m = p.match(/^\[(\d+)\]$/);
      return m ? (
        <span key={i + "-" + j} className="bg-primary-container text-on-primary-container px-1 rounded cursor-help font-mono-label text-[10px] align-middle mx-0.5">
          [{m[1]}]
        </span>
      ) : p;
    });
  });
}

export default function Markdown({ text }) {
  return (
    <div className="ai-md">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>{text || ""}</ReactMarkdown>
    </div>
  );
}
