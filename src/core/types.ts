import type { Patch } from "immer";

/**
 * Core document types — the `.dm` file is the JSON serialization of `DmDocument`.
 *
 * 铁律：本文件保持纯 serializable，**不 import 任何 xyflow API**。
 * core ↔ xyflow 的形状映射只放 Canvas 层（src/canvas）。
 */

// 形状种类 = 注册表（src/canvas/shapes/registry）的 key。放宽为 string：
// 序列化向前兼容，反序列化遇未知 kind 由注册表 fallback 渲染。
export type NodeKind = string;

// 必须是 type alias 而非 interface：xyflow 的 Node<T> 约束 T extends Record<string, unknown>，
// interface 不满足该约束（无隐式索引签名），type 字面量满足。
// 样式字段全部 optional：缺省时回落 shapes.css / 默认；旧 .dm 无这些字段照常加载。
export type NodeData = {
  label: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  fontSize?: number;
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

/** View state — 不入 history（hover / 缩放 / 选区）。形状放置走调色板拖放，无工具模式。 */
export interface ViewState {
  selected: string[];
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
