import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Only /app (the actual product) needs login. The landing page (/) stays public.
const isProtected = createRouteMatcher(["/app(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) await auth.protect();
});

export const config = {
  // Only the authed routes run Clerk middleware. The landing page (/) is never matched,
  // so it stays up regardless of Clerk configuration.
  matcher: ["/app", "/app/:path*", "/sign-in/:path*", "/sign-up/:path*"],
};
