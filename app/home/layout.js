import { ClerkProvider } from "@clerk/nextjs";

// /app lives at the top level (NOT in a route group) because Vercel failed to generate the
// route when it sat at app/(auth)/app — it 404'd. This layout gives /app its Clerk context.
// Publishable key is PUBLIC, hardcoded as a fallback so only CLERK_SECRET_KEY is env-required.
const PUB_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  "pk_test_Zml0dGluZy1yb2Jpbi03NS5jbGVyay5hY2NvdW50cy5kZXYk";

export default function AppLayout({ children }) {
  return <ClerkProvider publishableKey={PUB_KEY}>{children}</ClerkProvider>;
}
