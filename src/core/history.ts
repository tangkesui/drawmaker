import { applyPatches, enablePatches, produceWithPatches } from "immer";
import type { DmDocument } from "./types";
import { useEditorStore } from "./store";

// immer 的 patch 能力是可选插件，必须显式开启。
enablePatches();

export type DocRecipe = (draft: DmDocument) => void;

/**
 * 对 document 应用一次变更，并记录到撤销栈。
 * 用 immer 的 produceWithPatches 自动生成正向 / 逆向 patch，无需手写 undo。
 * 若 recipe 没有产生任何 patch（no-op），不污染栈。
 */
export function commit(label: string, recipe: DocRecipe): void {
  const { doc, history } = useEditorStore.getState();
  const [nextDoc, patches, inversePatches] = produceWithPatches(doc, recipe);
  if (patches.length === 0) return;

  // 截断 cursor 之后的 redo 分支
  const kept = history.stack.slice(0, history.cursor + 1);
  const stack = [...kept, { label, patches, inversePatches }];
  useEditorStore.setState({ doc: nextDoc, history: { stack, cursor: stack.length - 1 } });
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
