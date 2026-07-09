import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Publishable key is PUBLIC (it ships in the client bundle anyway), so we bake it in as a
// fallback. That leaves CLERK_SECRET_KEY as the only env var that must be set on the server.
const PUB_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  "pk_test_Zml0dGluZy1yb2Jpbi03NS5jbGVyay5hY2NvdW50cy5kZXYk";

// clerkMiddleware must exist for Clerk to work, but /home is gated CLIENT-SIDE (SignedIn/
// SignedOut) instead of here — server middleware on /home made Vercel 404 the route.
export default clerkMiddleware(async () => {}, { publishableKey: PUB_KEY });

export const config = {
  // Only the authed routes run Clerk middleware. The landing page (/) is never matched,
  // so it stays up regardless of Clerk configuration.
  matcher: ["/sign-in/:path*", "/sign-up/:path*"],
};
