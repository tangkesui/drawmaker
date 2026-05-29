import type { Patch } from "immer";

/**
 * Core document types — the `.dm` file is the JSON serialization of `DmDocument`.
 *
 * 铁律：本文件保持纯 serializable，**不 import 任何 xyflow API**。
 * core ↔ xyflow 的形状映射只放 Canvas 层（src/canvas）。
 */

export type NodeKind = "rect" | "ellipse";

// 必须是 type alias 而非 interface：xyflow 的 Node<T> 约束 T extends Record<string, unknown>，
// interface 不满足该约束（无隐式索引签名），type 字面量满足。
export type NodeData = {
  label: string;
};

export interface DmNode {
  id: string;
  kind: NodeKind;
  position: { x: number; y: number };
  data: NodeData;
}

export interface DmEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface DocumentMeta {
  title: string;
}

export interface DmDocument {
  version: 1;
  nodes: DmNode[];
  edges: DmEdge[];
  meta: DocumentMeta;
}

// 连线通过拖拽节点 Handle 完成，无需独立 connect 工具。
export type Tool = "select" | "rect" | "ellipse";

/** View state — 不入 history（hover / 缩放 / 选区 / 当前工具）。 */
export interface ViewState {
  selected: string[];
  tool: Tool;
  viewport: { x: number; y: number; zoom: number };
  hoverId: string | null;
}

/** 一条可撤销操作：immer 自动生成的正向 / 逆向 patch 对。 */
export interface HistoryEntry {
  label: string;
  patches: Patch[];
  inversePatches: Patch[];
}

export interface History {
  stack: HistoryEntry[];
  /** 最后一条已应用 entry 的下标；-1 表示已全部撤销。 */
  cursor: number;
}
