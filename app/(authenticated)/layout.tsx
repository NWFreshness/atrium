import { auth, signOut } from "@/auth";
import { AtriumNav } from "@/components/atrium-nav";

export default async function AuthenticatedLayout({
  children,
}: LayoutProps<"/">) {
  const session = await auth();

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <>
      <AtriumNav
        email={session?.user?.email}
        role={session?.user?.role}
        logout={logout}
      />
      {children}
    </>
  );
}
