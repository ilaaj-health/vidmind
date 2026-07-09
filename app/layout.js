import "./globals.css";

export const metadata = {
  title: "Persona — Chat with your videos",
  description: "Turn any YouTube video into a chattable knowledge base — cited answers in any language.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
