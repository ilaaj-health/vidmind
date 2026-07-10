import { SignIn } from "@clerk/nextjs";
import AuthShell, { clerkAppearance } from "../../AuthShell";

export default function Page() {
  return (
    <AuthShell title="Welcome Back" subtitle="Continue your inquiry into the archive.">
      <SignIn path="/sign-in" fallbackRedirectUrl="/home" signUpUrl="/sign-up" appearance={clerkAppearance} />
    </AuthShell>
  );
}
