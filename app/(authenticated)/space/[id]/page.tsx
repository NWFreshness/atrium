import { notFound } from "next/navigation";
import { BlockEditor } from "@/components/space/editor";
import styles from "@/components/space/space-shell.module.css";
import { createBlockAction, listBlocksAction } from "@/lib/space/block-actions";
import { getPageAction } from "@/lib/space/page-actions";

export default async function SpacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const page = await getPageAction(id);
  if (!page) {
    notFound();
  }

  let blocks = await listBlocksAction(id);
  if (blocks.length === 0) {
    blocks = [
      await createBlockAction({
        pageId: id,
        type: "paragraph",
        content: { text: "" },
      }),
    ];
  }

  return (
    <main>
      <header className={styles["space-page-header"]}>
        <span className={styles["space-page-icon"]} aria-hidden="true">
          {page.icon ?? "▣"}
        </span>
        <h1>{page.title.trim() === "" ? "Untitled" : page.title}</h1>
      </header>
      <BlockEditor pageId={id} blocks={blocks} />
    </main>
  );
}
