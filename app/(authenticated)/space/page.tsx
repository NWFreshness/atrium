import { redirect } from "next/navigation";
import { listPagesAction } from "@/lib/space/page-actions";
import { buildPageTree, firstSidebarPageId } from "@/lib/space/tree";

export default async function SpaceLandingPage() {
  const pages = await listPagesAction();
  const firstId = firstSidebarPageId(buildPageTree(pages));
  if (firstId) {
    redirect(`/space/${firstId}`);
  }

  return (
    <main>
      <h1>Space</h1>
      <p>Pick a page</p>
    </main>
  );
}
