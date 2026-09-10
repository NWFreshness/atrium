"use client";

import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import { useEffect, useRef, useState } from "react";
import {
  createBlockAction,
  deleteBlockAction,
  reorderBlocksAction,
  updateBlockAction,
} from "@/lib/space/block-actions";
import { filterBlockMenu, type BlockType } from "@/lib/space/constants";
import type { Block } from "@/lib/space/queries";
import { SlashMenu } from "./slash-menu";
import styles from "./editor.module.css";

type EditorBlock = {
  id: string;
  type: BlockType;
  content: Record<string, unknown>;
  position: number;
};

function toEditorBlock(block: Block): EditorBlock {
  return {
    id: block.id,
    type: block.type,
    content: (block.content ?? {}) as Record<string, unknown>,
    position: block.position,
  };
}

function textOf(content: Record<string, unknown>): string {
  return typeof content.text === "string" ? content.text : "";
}

function checkedOf(content: Record<string, unknown>): boolean {
  return content.checked === true;
}

function defaultContent(type: BlockType): Record<string, unknown> {
  if (type === "todo") {
    return { text: "", checked: false };
  }
  if (type === "divider") {
    return {};
  }
  return { text: "" };
}

function slashQuery(text: string): string | null {
  if (!text.startsWith("/")) {
    return null;
  }
  return text.slice(1);
}

function numberedIndex(blocks: EditorBlock[], index: number): number {
  let n = 1;
  for (let i = index - 1; i >= 0; i -= 1) {
    if (blocks[i]?.type !== "numbered_list") {
      break;
    }
    n += 1;
  }
  return n;
}

const BLOCK_CLASS: Record<BlockType, string> = {
  paragraph: "space-block-paragraph",
  heading1: "space-block-heading1",
  heading2: "space-block-heading2",
  heading3: "space-block-heading3",
  bulleted_list: "space-block-bulleted",
  numbered_list: "space-block-numbered",
  todo: "space-block-todo",
  quote: "space-block-quote",
  divider: "space-block-divider",
  code: "space-block-code",
  callout: "space-block-callout",
};

export function BlockEditor({
  pageId,
  blocks: initialBlocks,
}: {
  pageId: string;
  blocks: Block[];
}) {
  const [blocks, setBlocks] = useState<EditorBlock[]>(
    initialBlocks.map(toEditorBlock),
  );
  const [focusId, setFocusId] = useState<string | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);
  const pending = useRef(new Map<string, Record<string, unknown>>());
  const timers = useRef(new Map<string, number>());
  const textareas = useRef(new Map<string, HTMLTextAreaElement>());

  useEffect(() => {
    setBlocks(initialBlocks.map(toEditorBlock));
  }, [initialBlocks]);

  useEffect(() => {
    if (!focusId) {
      return;
    }
    const node = textareas.current.get(focusId);
    node?.focus();
  }, [focusId, blocks]);

  useEffect(() => {
    const pendingMap = pending.current;
    const timerMap = timers.current;
    return () => {
      for (const timer of timerMap.values()) {
        window.clearTimeout(timer);
      }
      for (const [id, content] of pendingMap) {
        void updateBlockAction(id, { content });
      }
    };
  }, []);

  function scheduleSave(id: string, content: Record<string, unknown>) {
    pending.current.set(id, content);
    const previous = timers.current.get(id);
    if (previous !== undefined) {
      window.clearTimeout(previous);
    }
    const timer = window.setTimeout(() => {
      pending.current.delete(id);
      timers.current.delete(id);
      void updateBlockAction(id, { content });
    }, 300);
    timers.current.set(id, timer);
  }

  function patchBlock(id: string, patch: Partial<EditorBlock>) {
    setBlocks((current) =>
      current.map((block) =>
        block.id === id ? { ...block, ...patch } : block,
      ),
    );
  }

  async function convertType(id: string, type: BlockType) {
    const content = defaultContent(type);
    patchBlock(id, { type, content });
    pending.current.delete(id);
    setSlashIndex(0);
    await updateBlockAction(id, { type, content });
  }

  async function addBlockAfter(index: number) {
    const created = await createBlockAction({
      pageId,
      type: "paragraph",
      content: { text: "" },
      index: index + 1,
    });
    const next = toEditorBlock(created);
    setBlocks((current) => {
      const copy = [...current];
      copy.splice(index + 1, 0, next);
      return copy.map((block, position) => ({ ...block, position }));
    });
    setFocusId(created.id);
  }

  async function removeBlock(id: string, index: number) {
    if (blocks.length === 1) {
      const content = defaultContent(blocks[0]!.type);
      patchBlock(id, { content });
      scheduleSave(id, content);
      return;
    }
    const previous = blocks[index - 1];
    await deleteBlockAction(id);
    setBlocks((current) => current.filter((block) => block.id !== id));
    if (previous) {
      setFocusId(previous.id);
    }
  }

  async function onDragEnd(result: DropResult) {
    if (!result.destination) {
      return;
    }
    const from = result.source.index;
    const to = result.destination.index;
    if (from === to) {
      return;
    }
    const next = [...blocks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved!);
    const ordered = next.map((block, position) => ({ ...block, position }));
    setBlocks(ordered);
    await reorderBlocksAction(
      pageId,
      ordered.map((block) => block.id),
    );
  }

  return (
    <DragDropContext onDragEnd={(result) => void onDragEnd(result)}>
      <Droppable droppableId={pageId}>
        {(provided) => (
          <div
            className={styles["space-editor"]}
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            <p className={styles["space-editor-meta"]}>
              {blocks.length} block{blocks.length === 1 ? "" : "s"} · autosaves as
              you type
            </p>
            {blocks.map((block, index) => {
              const text = textOf(block.content);
              const query = slashQuery(text);
              const items = query === null ? [] : filterBlockMenu(query);
              return (
                <Draggable key={block.id} draggableId={block.id} index={index}>
                  {(drag) => (
                    <div
                      className={`${styles["space-block"]} ${styles[BLOCK_CLASS[block.type]]}`}
                      ref={drag.innerRef}
                      {...drag.draggableProps}
                    >
                      <button
                        type="button"
                        className={styles["space-block-handle"]}
                        aria-label="Drag to reorder"
                        {...drag.dragHandleProps}
                      >
                        <span className={styles["space-dragdots"]} aria-hidden="true">
                          <i />
                          <i />
                          <i />
                          <i />
                          <i />
                          <i />
                        </span>
                      </button>
                      {block.type === "todo" ? (
                        <input
                          type="checkbox"
                          className={styles["space-block-check"]}
                          checked={checkedOf(block.content)}
                          aria-label="To-do"
                          onChange={(event) => {
                            const content = {
                              ...block.content,
                              checked: event.target.checked,
                            };
                            patchBlock(block.id, { content });
                            void updateBlockAction(block.id, { content });
                          }}
                        />
                      ) : null}
                      {block.type === "bulleted_list" ? (
                        <span
                          className={styles["space-block-mark"]}
                          aria-hidden
                        >
                          •
                        </span>
                      ) : null}
                      {block.type === "numbered_list" ? (
                        <span
                          className={styles["space-block-mark"]}
                          aria-hidden
                        >
                          {numberedIndex(blocks, index)}.
                        </span>
                      ) : null}
                      {block.type === "divider" ? (
                        <hr className={styles["space-block-rule"]} />
                      ) : (
                        <div className={styles["space-block-body"]}>
                          <textarea
                            ref={(node) => {
                              if (node) {
                                textareas.current.set(block.id, node);
                              } else {
                                textareas.current.delete(block.id);
                              }
                            }}
                            className={styles["space-block-input"]}
                            value={text}
                            rows={Math.max(1, text.split("\n").length)}
                            aria-label={block.type.replaceAll("_", " ")}
                            onChange={(event) => {
                              const value = event.target.value;
                              const content = {
                                ...block.content,
                                text: value,
                              };
                              patchBlock(block.id, { content });
                              scheduleSave(block.id, content);
                              setSlashIndex(0);
                            }}
                            onKeyDown={(event) => {
                              if (query !== null && items.length > 0) {
                                if (event.key === "ArrowDown") {
                                  event.preventDefault();
                                  setSlashIndex((i) => (i + 1) % items.length);
                                  return;
                                }
                                if (event.key === "ArrowUp") {
                                  event.preventDefault();
                                  setSlashIndex(
                                    (i) =>
                                      (i - 1 + items.length) % items.length,
                                  );
                                  return;
                                }
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  const selected =
                                    items[slashIndex] ?? items[0];
                                  if (selected) {
                                    void convertType(block.id, selected.type);
                                  }
                                  return;
                                }
                                if (event.key === "Escape") {
                                  event.preventDefault();
                                  const content = {
                                    ...block.content,
                                    text: "",
                                  };
                                  patchBlock(block.id, { content });
                                  scheduleSave(block.id, content);
                                  return;
                                }
                              }
                              if (event.key === "Enter" && !event.shiftKey) {
                                event.preventDefault();
                                void addBlockAfter(index);
                                return;
                              }
                              if (
                                event.key === "Backspace" &&
                                text === "" &&
                                event.currentTarget.selectionStart === 0
                              ) {
                                event.preventDefault();
                                void removeBlock(block.id, index);
                              }
                            }}
                          />
                          {query !== null ? (
                            <SlashMenu
                              query={query}
                              selectedIndex={slashIndex}
                              onHover={setSlashIndex}
                              onSelect={(type) => {
                                void convertType(block.id, type);
                              }}
                            />
                          ) : null}
                        </div>
                      )}
                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
            <button
              type="button"
              className={styles["space-add-block"]}
              onClick={() => void addBlockAfter(blocks.length - 1)}
            >
              <span className={styles["space-add-block-plus"]} aria-hidden="true">
                +
              </span>
              Add a block — text, list, divider…
            </button>
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
