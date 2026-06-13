import type { DmEdge, DmNode, EdgeArrow, EdgeStyle, FlowDirection } from "./types";

/**
 * mermaid flowchart 原始解析结果 → 我们的节点/边（纯映射，可测）。
 *
 * 原始数据形态来自 mermaid 官方解析器 `db.getVertices()/getEdges()/getDirection()`
 * （DOM 依赖的解析在 services/mermaidParse 层；本文件只做无副作用的形状/边映射）。
 */

export interface RawVertex {
  id: string;
  text?: string;
  type?: string;
  /** mermaid `style id ...` 收集到的样式声明，如 ["fill:#f9f","stroke:#333","stroke-width:2px"]。 */
  styles?: string[];
}

/** 解析 mermaid vertex.styles → 颜色/线宽（往返 PropertiesPanel 的 fill/stroke/strokeWidth）。 */
function parseStyles(styles?: string[]): { fill?: string; stroke?: string; strokeWidth?: number } {
  const out: { fill?: string; stroke?: string; strokeWidth?: number } = {};
  for (const s of styles ?? []) {
    const i = s.indexOf(":");
    if (i < 0) continue;
    const key = s.slice(0, i).trim();
    const val = s.slice(i + 1).trim();
    if (key === "fill") out.fill = val;
    else if (key === "stroke") out.stroke = val;
    else if (key === "stroke-width") {
      const n = parseFloat(val); // "2px" → 2
      if (Number.isFinite(n)) out.strokeWidth = n;
    }
  }
  return out;
}
export interface RawEdge {
  start: string;
  end: string;
  type?: string;
  text?: string;
  /** mermaid 线型：normal / dotted / thick。 */
  stroke?: string;
}
export interface RawFlow {
  vertices: Record<string, RawVertex>;
  edges: RawEdge[];
  direction?: string;
}

/** mermaid 顶点 type → 我们的形状 kind（收敛到标准集；未知回退 rect）。 */
const SHAPE_KIND: Record<string, string> = {
  square: "rect",
  round: "rounded",
  diamond: "diamond",
  stadium: "stadium",
  subroutine: "subroutine",
  cylinder: "cylinder",
  circle: "circle",
  doublecircle: "circle",
  hexagon: "hexagon",
  odd: "rect",
  lean_right: "parallelogram",
  lean_left: "parallelogram",
  trapezoid: "trapezoid",
  inv_trapezoid: "trapezoid",
  group: "rect",
};

/** mermaid 边 type → 箭头方向。 */
const EDGE_ARROW: Record<string, EdgeArrow> = {
  arrow_point: "end",
  arrow_open: "none",
  double_arrow_point: "both",
  arrow_circle: "end",
  arrow_cross: "end",
};

/** mermaid 边 stroke → 线型。 */
const EDGE_STYLE: Record<string, EdgeStyle> = {
  normal: "solid",
  dotted: "dashed",
  thick: "thick",
};

function mapDirection(d?: string): FlowDirection {
  switch (d) {
    case "LR":
      return "LR";
    case "RL":
      return "RL";
    case "BT":
      return "BT";
    default:
      return "TD"; // TB / TD / 缺省 → TD
  }
}

/** 各类型解析的统一产物：节点（无 position，由导入动作布局）+ 边 + 方向。 */
export interface ImportGraph {
  nodes: Omit<DmNode, "position">[];
  edges: DmEdge[];
  direction: FlowDirection;
}

/** 多行节点（class/er）按行数估高，供 dagre 布局与渲染。 */
function boxSize(lines: number): { width: number; height: number } {
  return { width: 180, height: 24 + Math.max(1, lines) * 18 };
}

/** flowchart 原始解析 → 节点(无 position，由导入动作布局) + 边 + 方向。 */
export function flowToGraph(raw: RawFlow): ImportGraph {
  const nodes = Object.values(raw.vertices).map((v) => ({
    id: v.id,
    kind: SHAPE_KIND[v.type ?? ""] ?? "rect",
    data: { label: v.text ?? v.id, ...parseStyles(v.styles) },
  }));
  const edges = raw.edges.map((e, i) => {
    const arrow = EDGE_ARROW[e.type ?? ""] ?? "end";
    const style = EDGE_STYLE[e.stroke ?? ""] ?? "solid";
    const data = {
      ...(e.text ? { label: e.text } : {}),
      ...(arrow !== "end" ? { arrow } : {}),
      ...(style !== "solid" ? { style } : {}),
    };
    const edge: DmEdge = { id: `e_${i + 1}`, source: e.start, target: e.end };
    if (Object.keys(data).length) edge.data = data;
    return edge;
  });
  return { nodes, edges, direction: mapDirection(raw.direction) };
}

/* ============ state diagram ============ */

export interface RawState {
  states: Record<string, { descriptions?: string[] }>;
  relations: { id1: string; id2: string; relationTitle?: string }[];
}

export function stateToGraph(raw: RawState): ImportGraph {
  const nodes = Object.entries(raw.states).map(([id, s]) => ({
    id,
    kind: "rect",
    data: { label: (s.descriptions ?? []).join(" ") || id },
  }));
  const edges = raw.relations.map((r, i) => {
    const edge: DmEdge = { id: `e_${i + 1}`, source: r.id1, target: r.id2 };
    if (r.relationTitle) edge.data = { label: r.relationTitle };
    return edge;
  });
  return { nodes, edges, direction: "TD" };
}

/* ============ class diagram ============ */

export interface RawClass {
  classes: Record<string, { label?: string; members?: { text?: string }[]; methods?: { text?: string }[] }>;
  relations: { id1: string; id2: string; title?: string }[];
}

export function classToGraph(raw: RawClass): ImportGraph {
  const nodes = Object.entries(raw.classes).map(([id, c]) => {
    const lines = [c.label || id];
    for (const m of [...(c.members ?? []), ...(c.methods ?? [])]) {
      if (m.text) lines.push(m.text.replace(/^\\/, "")); // mermaid 把 +/- 转义成 \+，去掉前导反斜杠
    }
    return { id, kind: "rect", size: boxSize(lines.length), data: { label: lines.join("\n") } };
  });
  const edges = raw.relations.map((r, i) => {
    const edge: DmEdge = { id: `e_${i + 1}`, source: r.id1, target: r.id2 };
    if (r.title && r.title !== "none") edge.data = { label: r.title };
    return edge;
  });
  return { nodes, edges, direction: "TD" };
}

/* ============ ER diagram ============ */

export interface RawEr {
  // key=显示名；entry.id=内部 id（entity-X-n），relationships 用内部 id 需映射回 key
  entities: Record<string, { id?: string; attributes?: { type?: string; name?: string }[] }>;
  relationships: { entityA: string; roleA?: string; entityB: string }[];
}

export function erToGraph(raw: RawEr): ImportGraph {
  const internalToKey = new Map<string, string>();
  for (const [key, e] of Object.entries(raw.entities)) if (e.id) internalToKey.set(e.id, key);
  const nodes = Object.entries(raw.entities).map(([key, e]) => {
    const lines = [key];
    for (const a of e.attributes ?? []) lines.push(`${a.type ?? ""} ${a.name ?? ""}`.trim());
    return { id: key, kind: "rect", size: boxSize(lines.length), data: { label: lines.join("\n") } };
  });
  const edges = raw.relationships.map((r, i) => {
    const edge: DmEdge = {
      id: `e_${i + 1}`,
      source: internalToKey.get(r.entityA) ?? r.entityA,
      target: internalToKey.get(r.entityB) ?? r.entityB,
    };
    if (r.roleA) edge.data = { label: r.roleA };
    return edge;
  });
  return { nodes, edges, direction: "TD" };
}
