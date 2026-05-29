import { create } from "zustand";
import type { DmDocument, History, ViewState } from "./types";

/**
 * Editor Core 的单一 store。三块状态：
 * - doc：Document Model（SSOT，`.dm` 的内容）
 * - view：ViewState（不入 history）
 * - history：patch-based 撤销栈
 *
 * doc 的所有变更都走 `history.commit()`（见 history.ts），不直接 setState。
 */
export interface EditorState {
  doc: DmDocument;
  view: ViewState;
  history: History;
}

export function createEmptyDocument(): DmDocument {
  return { version: 1, nodes: [], edges: [], meta: { title: "Untitled" } };
}

export function createInitialState(): EditorState {
  return {
    doc: createEmptyDocument(),
    view: {
      selected: [],
      tool: "select",
      viewport: { x: 0, y: 0, zoom: 1 },
      hoverId: null,
    },
    history: { stack: [], cursor: -1 },
  };
}

export const useEditorStore = create<EditorState>()(() => createInitialState());
