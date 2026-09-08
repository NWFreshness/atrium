import styles from "@/components/space/space-shell.module.css";

export default async function SpacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await params;

  return (
    <main>
      <header className={styles["space-page-header"]}>
        <span className={styles["space-page-icon"]} aria-hidden="true">
          ▣
        </span>
        <h1>Page</h1>
      </header>
      <p>Placeholder</p>
    </main>
  );
}
