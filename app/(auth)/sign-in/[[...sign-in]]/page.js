import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div style={{
      minHeight: "100vh", display: "grid", placeItems: "center", padding: 24,
      background: "radial-gradient(900px 500px at 50% -10%, rgba(124,92,255,.18), transparent 60%), #07080c",
    }}>
      <SignIn />
    </div>
  );
}
