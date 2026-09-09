"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { searchPagesAction } from "@/lib/space/search-actions";
import type { SearchPageHit } from "@/lib/space/search";
import styles from "./quick-find.module.css";

function shortcutLabel(): string {
  if (typeof navigator === "undefined") {
    return "Ctrl+K";
  }
  return /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘K" : "Ctrl+K";
}

export function QuickFind() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchPageHit[]>([]);
  const [highlighted, setHighlighted] = useState(0);
  const shortcut = shortcutLabel();

  useEffect(() => {
    function onWindowKeyDown(event: KeyboardEvent) {
      if (
        event.key.toLowerCase() === "k" &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onWindowKeyDown);
    return () => window.removeEventListener("keydown", onWindowKeyDown);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const q = query.trim();
    if (!q) {
      setResults([]);
      setHighlighted(0);
      return;
    }
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      const next = await searchPagesAction(q);
      if (!cancelled) {
        setResults(next);
        setHighlighted(0);
      }
    }, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query, open]);

  function close() {
    setOpen(false);
    setQuery("");
    setResults([]);
    setHighlighted(0);
  }

  function go(id: string) {
    router.push(`/space/${id}`);
    close();
  }

  function onDialogKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (results.length === 0) {
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((index) => (index + 1) % results.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((index) =>
        index <= 0 ? results.length - 1 : index - 1,
      );
      return;
    }
    if (event.key === "Enter") {
      const hit = results[highlighted];
      if (hit) {
        event.preventDefault();
        go(hit.id);
      }
    }
  }

  function onBackdropClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      close();
    }
  }

  return (
    <>
      <button
        type="button"
        className={styles["quick-find-trigger"]}
        onClick={() => setOpen(true)}
        aria-keyshortcuts="Meta+K Control+K"
      >
        Search
        <kbd className={styles["quick-find-kbd"]}>{shortcut}</kbd>
      </button>
      {open ? (
        <div
          className={styles["quick-find-backdrop"]}
          onClick={onBackdropClick}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Quick find"
            className={styles["quick-find-dialog"]}
            onKeyDown={onDialogKeyDown}
          >
            <input
              ref={inputRef}
              className={styles["quick-find-input"]}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search pages"
              aria-label="Search pages"
              autoComplete="off"
            />
            {query.trim() === "" ? (
              <p className={styles["quick-find-empty"]}>Type to search</p>
            ) : results.length === 0 ? (
              <p className={styles["quick-find-empty"]}>No results</p>
            ) : (
              <ul className={styles["quick-find-list"]} role="listbox">
                {results.map((hit, index) => (
                  <li key={hit.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={index === highlighted}
                      className={
                        index === highlighted
                          ? `${styles["quick-find-item"]} ${styles["quick-find-item-current"]}`
                          : styles["quick-find-item"]
                      }
                      onMouseEnter={() => setHighlighted(index)}
                      onClick={() => go(hit.id)}
                    >
                      {hit.icon ? (
                        <span className={styles["quick-find-icon"]}>
                          {hit.icon}
                        </span>
                      ) : null}
                      <span>{hit.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
