"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const CITE = { display: "inline-block", fontSize: "10px", fontWeight: 600, color: "#7c5cff", background: "#efeaff", borderRadius: "4px", padding: "0 5px", margin: "0 2px", verticalAlign: "super", lineHeight: 1.4 };
const MD = {
  p: ({ children }) => <p style={{ margin: "0 0 8px", lineHeight: 1.6 }}>{citeChildren(children)}</p>,
  ul: ({ children }) => <ul style={{ margin: "0 0 8px", paddingLeft: "18px" }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ margin: "0 0 8px", paddingLeft: "18px" }}>{children}</ol>,
  li: ({ children }) => <li style={{ margin: "4px 0", lineHeight: 1.55 }}>{citeChildren(children)}</li>,
  strong: ({ children }) => <strong style={{ fontWeight: 600, color: "#1c2030" }}>{children}</strong>,
  h2: ({ children }) => <h3 style={{ fontSize: "14px", fontWeight: 600, margin: "12px 0 6px" }}>{children}</h3>,
  h3: ({ children }) => <h3 style={{ fontSize: "13.5px", fontWeight: 600, margin: "12px 0 6px" }}>{children}</h3>,
  code: ({ children }) => <code style={{ background: "#eceef3", borderRadius: "4px", padding: "1px 5px", fontSize: "12px" }}>{children}</code>,
  a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" style={{ color: "#7c5cff", textDecoration: "underline" }}>{children}</a>,
};
function citeChildren(children) {
  return (Array.isArray(children) ? children : [children]).map((c, i) => {
    if (typeof c !== "string") return c;
    return c.split(/(\[\d+\])/g).map((p, j) => {
      const m = p.match(/^\[(\d+)\]$/);
      return m ? <sup key={i + "-" + j} style={CITE}>{m[1]}</sup> : p;
    });
  });
}
export default function Markdown({ text }) {
  return (
    <div style={{ whiteSpace: "normal" }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>{text || ""}</ReactMarkdown>
    </div>
  );
}
