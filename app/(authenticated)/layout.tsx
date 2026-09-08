import { auth, signOut } from "@/auth";
import { AtriumNav } from "@/components/atrium-nav";
import type { ResetDemoState } from "@/components/reset-demo-button";
import "@/lib/crm/reset";
import "@/lib/space/reset";
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
      await resetDemo(async () => auth());
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
