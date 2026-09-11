import { auth } from "@/auth";
import { ChangePasswordForm } from "./change-password-form";

export default async function SettingsPage() {
  const session = await auth();

  return (
    <main>
      <div className="atrium-pagetitle">
        <h1>Settings</h1>
        <p className="atrium-sub">{session?.user?.email ?? "Account"}</p>
      </div>
      <section className="atrium-panel atrium-narrow">
        <h2 className="atrium-label">Password</h2>
        <p className="atrium-sub">
          At least 12 characters. Changing it does not sign out your other
          devices.
        </p>
        <ChangePasswordForm />
      </section>
    </main>
  );
}
