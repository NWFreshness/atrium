import { signOut } from "@/auth";

export default function Home() {
  return (
    <main>
      <h1>Atrium</h1>
      <p>Four personal apps, one login.</p>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button type="submit">Logout</button>
      </form>
    </main>
  );
}
