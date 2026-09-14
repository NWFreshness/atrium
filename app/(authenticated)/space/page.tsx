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
      <div className="atrium-pagetitle">
        <h1>Space</h1>
      </div>
      <p className="atrium-sub">Pick a page</p>
    </main>
  );
}
