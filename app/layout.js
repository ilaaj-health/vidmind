import "./globals.css";

export const metadata = {
  title: "VidMind — Chat with YouTube",
  description: "Transcribe YouTube videos and chat with the content in any language.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
