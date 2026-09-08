import { notFound } from "next/navigation";
import styles from "@/components/space/space-shell.module.css";
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

  return (
    <main>
      <header className={styles["space-page-header"]}>
        <span className={styles["space-page-icon"]} aria-hidden="true">
          {page.icon ?? "▣"}
        </span>
        <h1>{page.title.trim() === "" ? "Untitled" : page.title}</h1>
      </header>
      <p>Placeholder</p>
    </main>
  );
}
