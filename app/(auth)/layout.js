import { ClerkProvider } from "@clerk/nextjs";

// Clerk wraps ONLY the authed routes (/app, /sign-in, /sign-up). The public landing
// page (/) lives outside this group, so a Clerk misconfig can never take it down.
export default function AuthLayout({ children }) {
  return <ClerkProvider>{children}</ClerkProvider>;
}
