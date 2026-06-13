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
  /** resize 后的尺寸；缺省回落注册表 defaultSize（旧 .dm 无此字段照常加载）。 */
  size?: { width: number; height: number };
  data: NodeData;
}

/** 箭头方向：缺省（undefined）= "end"，即默认 A→B 终点箭头。 */
export type EdgeArrow = "none" | "end" | "start" | "both";

// 同 NodeData 用 type alias（xyflow Edge<T> 的 Record 约束）。字段全 optional：
// 旧 .dm 无 data 字段照常加载。
export type EdgeData = {
  label?: string;
  arrow?: EdgeArrow;
};

export interface DmEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  /** 边标签等附加数据；缺省 = 无标签。 */
  data?: EdgeData;
}

/** mermaid flowchart 图方向。 */
export type FlowDirection = "TD" | "LR" | "RL" | "BT";

/** graph 家族：以"节点+连线"建模（用画布编辑）。 */
export type GraphDiagramType =
  | "flowchart"
  | "state"
  | "class"
  | "er"
  | "sequence"
  | "c4"
  | "mindmap";

/** 数据/时间家族：结构化数据（标题 + 行表 + 配置），用表格编辑器编辑，非画布。 */
export type DataDiagramType = "pie" | "gantt" | "timeline" | "journey" | "quadrant" | "xychart";

export type DiagramType = GraphDiagramType | DataDiagramType;

/** 运行时判断：哪些图表类型走数据编辑器（而非节点-连线画布）。 */
export const DATA_DIAGRAM_TYPES: DataDiagramType[] = [
  "pie",
  "gantt",
  "timeline",
  "journey",
  "quadrant",
  "xychart",
];

export function isDataDiagram(t: DiagramType): t is DataDiagramType {
  return (DATA_DIAGRAM_TYPES as string[]).includes(t);
}

/** 数据/时间家族图表的内容：标题 + 标量配置 + 行表（每行是按列 key 的字符串字段）。 */
export interface DataDiagram {
  title: string;
  config: Record<string, string>;
  rows: Record<string, string>[];
}

export interface DocumentMeta {
  title: string;
  /** mermaid 导出方向，缺省 TD（旧 .dm 无此字段照常加载）。 */
  direction?: FlowDirection;
  /** mermaid 图表类型，缺省 flowchart（旧 .dm 无此字段照常加载）。 */
  diagramType?: DiagramType;
}

export interface DmDocument {
  version: 1;
  nodes: DmNode[];
  edges: DmEdge[];
  meta: DocumentMeta;
  /** 数据/时间家族图表内容（按类型分存；graph 家族用 nodes/edges）。缺省 = 未编辑过。 */
  data?: Partial<Record<DataDiagramType, DataDiagram>>;
}

/** View state — 不入 history（hover / 缩放 / 选区）。形状放置走调色板拖放，无工具模式。 */
export interface ViewState {
  selected: string[];
  selectedEdges: string[];
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
