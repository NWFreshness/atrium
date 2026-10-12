import { auth, signOut } from "@/auth";
import { AtriumNav } from "@/components/atrium-nav";
import type { ResetDemoState } from "@/components/reset-demo-button";
import { collectCrmReset } from "@/lib/crm/reset";
import { collectRolodexReset } from "@/lib/rolodex/reset";
import { collectSpaceReset } from "@/lib/space/reset";
import { resetDemo } from "@/lib/tenancy/reset-demo";

export default async function AuthenticatedLayout({
  children,
}: LayoutProps<"/">) {
  const session = await auth();

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  async function resetDemoAction(
    _prevState: ResetDemoState,
    _formData: FormData,
  ): Promise<ResetDemoState> {
    "use server";
    try {
      // Groove has no tables, so it has nothing to reset.
      await resetDemo(
        async () => auth(),
        [collectCrmReset, collectRolodexReset, collectSpaceReset],
      );
      return { ok: true, message: "Demo reset." };
    } catch {
      return { ok: false, message: "Reset failed." };
    }
  }

  return (
    <>
      <AtriumNav
        email={session?.user?.email}
        role={session?.user?.role}
        logout={logout}
        resetDemo={resetDemoAction}
      />
      {children}
    </>
  );
}
