import { ClerkProvider } from "@clerk/nextjs";

// Publishable key is PUBLIC (baked into the client bundle regardless), so hardcode it as a
// fallback — only CLERK_SECRET_KEY needs to be set in Vercel. Clerk wraps ONLY these authed
// routes (/app, /sign-in, /sign-up); the public landing (/) lives outside this group.
const PUB_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  "pk_test_Zml0dGluZy1yb2Jpbi03NS5jbGVyay5hY2NvdW50cy5kZXYk";

// These routes are auth-gated — never static-prerender them (that dropped /app to a 404 on Vercel).
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }) {
  return <ClerkProvider publishableKey={PUB_KEY}>{children}</ClerkProvider>;
}
