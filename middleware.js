import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Publishable key is PUBLIC (it ships in the client bundle anyway), so we bake it in as a
// fallback. That leaves CLERK_SECRET_KEY as the only env var that must be set on the server.
const PUB_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  "pk_test_Zml0dGluZy1yb2Jpbi03NS5jbGVyay5hY2NvdW50cy5kZXYk";

// Only /home (the actual product) needs login. The landing page (/) stays public.
const isProtected = createRouteMatcher(["/home(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) await auth.protect();
}, { publishableKey: PUB_KEY });

export const config = {
  // Only the authed routes run Clerk middleware. The landing page (/) is never matched,
  // so it stays up regardless of Clerk configuration.
  matcher: ["/home", "/home/:path*", "/sign-in/:path*", "/sign-up/:path*"],
};
