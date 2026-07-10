import { SignUp } from "@clerk/nextjs";
import AuthShell, { clerkAppearance } from "../../AuthShell";

export default function Page() {
  return (
    <AuthShell title="Apply for Access" subtitle="Begin your journey of infinite preservation.">
      <SignUp path="/sign-up" fallbackRedirectUrl="/home" signInUrl="/sign-in" appearance={clerkAppearance} />
    </AuthShell>
  );
}
