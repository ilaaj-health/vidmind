import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#fcf8fa", color: "#1b1b1d", fontFamily: "Inter, system-ui, sans-serif", padding: 24 }}>
      <div style={{ textAlign: "center", background: "#fff", border: "1px solid #c6c6cd", padding: "56px 64px", maxWidth: 520 }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#5f5e5c", borderLeft: "2px solid #000", paddingLeft: 10, display: "inline-block", margin: "0 0 16px" }}>
          Record not found
        </p>
        <h1 style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: 40, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 12px" }}>
          This page is not in the archive.
        </h1>
        <p style={{ color: "#45464d", fontSize: 16, lineHeight: 1.6, margin: "0 0 28px" }}>
          The document you requested may have been moved, unpublished, or never preserved.
        </p>
        <Link href="/" style={{ display: "inline-block", background: "#000", color: "#fff", padding: "14px 28px", fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", textDecoration: "none" }}>
          Return to the Archive
        </Link>
      </div>
    </div>
  );
}
