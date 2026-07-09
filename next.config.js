/** @type {import('next').NextConfig} */
const BACKEND = process.env.BACKEND_URL || "http://127.0.0.1:8000";

module.exports = {
  // Local dev: proxy /api -> backend so the browser stays same-origin (no CORS needed).
  // In production, set NEXT_PUBLIC_API_BASE to the backend URL instead (direct calls + CORS),
  // which avoids serverless proxy timeouts on long chat/transcription requests.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND}/api/:path*` }];
  },
  // /app was renamed to /home (Vercel cached /app as a 404). Redirect old links.
  async redirects() {
    return [{ source: "/app", destination: "/home", permanent: false }];
  },
};
