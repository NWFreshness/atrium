import { notFound } from "next/navigation";
import {
  DatabaseTable,
  RowProperties,
} from "@/components/space/database-table";
import { BlockEditor } from "@/components/space/editor";
import styles from "@/components/space/space-shell.module.css";
import { createBlockAction, listBlocksAction } from "@/lib/space/block-actions";
import { getDatabaseSnapshotAction } from "@/lib/space/database-actions";
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

  const header = (
    <header className={styles["space-page-header"]}>
      <span className={styles["space-page-icon"]} aria-hidden="true">
        {page.icon ?? "▣"}
      </span>
      <h1>{page.title.trim() === "" ? "Untitled" : page.title}</h1>
    </header>
  );

  if (page.type === "database") {
    const snapshot = await getDatabaseSnapshotAction(page.id);
    return (
      <main>
        {header}
        <DatabaseTable snapshot={snapshot} />
      </main>
    );
  }

  if (page.type === "row") {
    if (!page.parentId) {
      notFound();
    }
    let snapshot;
    try {
      snapshot = await getDatabaseSnapshotAction(page.parentId);
    } catch {
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
        {header}
        <RowProperties snapshot={snapshot} row={page} />
        <BlockEditor pageId={id} blocks={blocks} />
      </main>
    );
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
      {header}
      <BlockEditor pageId={id} blocks={blocks} />
    </main>
  );
}
