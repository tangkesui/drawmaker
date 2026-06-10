import { applyPatches, enablePatches, produceWithPatches } from "immer";
import type { DmDocument } from "./types";
import { useEditorStore } from "./store";

// immer 的 patch 能力是可选插件，必须显式开启。
enablePatches();

export type DocRecipe = (draft: DmDocument) => void;

/** 撤销栈容量上限：超限丢最旧条目，防止长会话内存无限增长。 */
export const MAX_HISTORY = 200;

/**
 * savedCursor 的"保存点已不可达"哨兵：保存点被截断/裁剪后，任何 cursor（≥ -1）
 * 都不可能再等于它 → dirty 恒为 true，直到下次保存重新落点。
 */
export const SAVED_CURSOR_UNREACHABLE = -2;

/**
 * 对 document 应用一次变更，并记录到撤销栈。
 * 用 immer 的 produceWithPatches 自动生成正向 / 逆向 patch，无需手写 undo。
 * 若 recipe 没有产生任何 patch（no-op），不污染栈。
 */
export function commit(label: string, recipe: DocRecipe): void {
  const { doc, history, file } = useEditorStore.getState();
  const [nextDoc, patches, inversePatches] = produceWithPatches(doc, recipe);
  if (patches.length === 0) return;

  // 截断 cursor 之后的 redo 分支；若保存点在被截掉的分支里，它从此不可达
  const kept = history.stack.slice(0, history.cursor + 1);
  let savedCursor = file.savedCursor;
  if (savedCursor > history.cursor) savedCursor = SAVED_CURSOR_UNREACHABLE;

  let stack = [...kept, { label, patches, inversePatches }];

  // 容量上限：丢最旧条目，cursor / savedCursor 同步左移
  const overflow = stack.length - MAX_HISTORY;
  if (overflow > 0) {
    stack = stack.slice(overflow);
    savedCursor = savedCursor >= overflow ? savedCursor - overflow : SAVED_CURSOR_UNREACHABLE;
  }

  useEditorStore.setState((s) => ({
    doc: nextDoc,
    history: { stack, cursor: stack.length - 1 },
    file: savedCursor === s.file.savedCursor ? s.file : { ...s.file, savedCursor },
  }));
}

export function canUndo(): boolean {
  return useEditorStore.getState().history.cursor >= 0;
}

export function canRedo(): boolean {
  const { history } = useEditorStore.getState();
  return history.cursor < history.stack.length - 1;
}

export function undo(): void {
  const { doc, history } = useEditorStore.getState();
  if (history.cursor < 0) return;
  const entry = history.stack[history.cursor];
  const nextDoc = applyPatches(doc, entry.inversePatches);
  useEditorStore.setState({ doc: nextDoc, history: { ...history, cursor: history.cursor - 1 } });
}

export function redo(): void {
  const { doc, history } = useEditorStore.getState();
  if (history.cursor >= history.stack.length - 1) return;
  const entry = history.stack[history.cursor + 1];
  const nextDoc = applyPatches(doc, entry.patches);
  useEditorStore.setState({ doc: nextDoc, history: { ...history, cursor: history.cursor + 1 } });
}
