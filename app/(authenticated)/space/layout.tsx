import type { ReactNode } from "react";
import { SpaceShell } from "@/components/space/space-shell";
import { listPagesAction } from "@/lib/space/page-actions";
import { buildPageTree } from "@/lib/space/tree";

export default async function SpaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pages = await listPagesAction();
  const tree = buildPageTree(pages);
  return <SpaceShell tree={tree}>{children}</SpaceShell>;
}
