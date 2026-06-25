import type { DmEdge, DmNode, EdgeArrow, EdgeStyle, FlowDirection } from "./types";
import { SUBGRAPH_KIND } from "./subgraph";

/**
 * mermaid label 里的 `<br>` / `<br/>` / `<br />`（任意大小写、含空格）→ 真正换行。
 * mermaid 解析器把换行原样留作 `<br>` 交给它自己的 HTML 渲染器；我们内部统一用 `\n`
 * （shapes.css `white-space: pre-wrap` 渲染，导出时 mermaid.ts 再转回 `<br/>`）。
 */
export const decodeLabel = (s: string): string => s.replace(/<br\s*\/?\s*>/gi, "\n");

/**
 * 估算容纳 label（含换行）所需的盒子尺寸，导入时给「未定尺 + 矩形系」节点定尺，
 * 避免折行文本溢出固定默认框。纯启发式：CJK/全角按 13px/字、其余按 ~8px/字估宽，
 * 按「软换行后的可视行数」估高；结果不小于形状默认尺寸，宽度封顶后改走软换行。
 * 注意：只保证「文本区≈外接矩形」的形状（rect/rounded/stadium/subroutine/note）容纳；
 * 内接形状（圆/菱形…）需几何感知膨胀，调用方据 ShapeDef.fitsRectText 自行决定是否套用。
 */
export function labelSize(label: string, def: { width: number; height: number }): { width: number; height: number } {
  const FONT = 13;
  const LINE_H = 18;
  const PAD_X = 16; // .shape-label 左右 padding 各 8
  const PAD_Y = 12;
  const MAX_W = 260; // 超宽单行不无限拉宽，改为软换行
  const lineWidth = (s: string): number => {
    let w = 0;
    // CJK 统一表意 + 中日韩符号/标点 + 全角形式按整字宽算；其余（含大写密集 Latin）按 ~0.62em
    for (const ch of s) w += /[⺀-鿿　-〿＀-￯]/.test(ch) ? FONT : FONT * 0.62;
    return w;
  };
  const lines = label.split("\n");
  const widest = lines.reduce((m, l) => Math.max(m, lineWidth(l)), 0);
  const width = Math.min(MAX_W, Math.max(def.width, Math.ceil(widest) + PAD_X));
  const innerW = Math.max(1, width - PAD_X);
  const visualLines = lines.reduce((sum, l) => sum + Math.max(1, Math.ceil(lineWidth(l) / innerW)), 0);
  const height = Math.max(def.height, visualLines * LINE_H + PAD_Y);
  return { width, height };
}

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
  /** mermaid getSubGraphs()：成员 nodes 含直接子节点 id 与子容器 id（嵌套）。 */
  subGraphs?: { id: string; nodes: string[]; title?: string }[];
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
  // 成员 id → 所属容器 id（直接父）；容器成员里既有节点 id 也有子容器 id（嵌套）。
  const parentOf = new Map<string, string>();
  for (const sg of raw.subGraphs ?? []) for (const m of sg.nodes) parentOf.set(m, sg.id);

  const nodes: Omit<DmNode, "position">[] = Object.values(raw.vertices).map((v) => ({
    id: v.id,
    kind: SHAPE_KIND[v.type ?? ""] ?? "rect",
    data: { label: decodeLabel(v.text ?? v.id), ...parseStyles(v.styles) },
    ...(parentOf.has(v.id) ? { parentId: parentOf.get(v.id) } : {}),
  }));
  // 容器节点（无 position/size，由导入动作 layoutWithGroups 填）
  for (const sg of raw.subGraphs ?? []) {
    nodes.push({
      id: sg.id,
      kind: SUBGRAPH_KIND,
      data: { label: decodeLabel(sg.title ?? sg.id) },
      ...(parentOf.has(sg.id) ? { parentId: parentOf.get(sg.id) } : {}),
    });
  }
  const edges = raw.edges.map((e, i) => {
    const arrow = EDGE_ARROW[e.type ?? ""] ?? "end";
    const style = EDGE_STYLE[e.stroke ?? ""] ?? "solid";
    const data = {
      ...(e.text ? { label: decodeLabel(e.text) } : {}),
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

/* ============ C4 ============ */

export interface RawC4 {
  shapes: { alias: string; label?: { text?: string }; typeC4Shape?: { text?: string } }[];
  rels: { from: string; to: string; label?: { text?: string } }[];
}

export function c4ToGraph(raw: RawC4): ImportGraph {
  const nodes = raw.shapes.map((s) => ({
    id: s.alias,
    kind: s.typeC4Shape?.text === "person" ? "actor" : "rect", // person→actor（往返），其余→rect
    data: { label: s.label?.text || s.alias },
  }));
  const edges = raw.rels.map((r, i) => {
    const edge: DmEdge = { id: `e_${i + 1}`, source: r.from, target: r.to };
    if (r.label?.text) edge.data = { label: r.label.text };
    return edge;
  });
  return { nodes, edges, direction: "TD" };
}

/* ============ mindmap（树 → 节点 + 父子边）============ */

export interface RawMindmapNode {
  nodeId: string;
  descr?: string;
  children?: RawMindmapNode[];
}

export function mindmapToGraph(root: RawMindmapNode): ImportGraph {
  const nodes: Omit<DmNode, "position">[] = [];
  const edges: DmEdge[] = [];
  const seen = new Set<string>();
  let ec = 0;
  const walk = (node: RawMindmapNode): void => {
    if (!seen.has(node.nodeId)) {
      seen.add(node.nodeId);
      nodes.push({ id: node.nodeId, kind: "rect", data: { label: node.descr || node.nodeId } });
    }
    for (const c of node.children ?? []) {
      ec += 1;
      edges.push({ id: `e_${ec}`, source: node.nodeId, target: c.nodeId });
      walk(c);
    }
  };
  walk(root);
  return { nodes, edges, direction: "TD" };
}

/* ============ sequence diagram ============ */

export interface RawSequence {
  actors: Record<string, { description?: string }>;
  actorKeys: string[];
  messages: { from?: string; to?: string; message?: string }[];
}

export function sequenceToGraph(raw: RawSequence): ImportGraph {
  // 参与者按 actorKeys 顺序（决定横向排列），消息按数组顺序（时序）
  const nodes = raw.actorKeys.map((key) => ({
    id: key,
    kind: "rect",
    data: { label: raw.actors[key]?.description || key },
  }));
  const edges = raw.messages
    .filter((m) => m.from && m.to) // 跳过 note 等无两端的事件
    .map((m, i) => {
      const edge: DmEdge = { id: `e_${i + 1}`, source: m.from!, target: m.to! };
      if (m.message) edge.data = { label: m.message };
      return edge;
    });
  return { nodes, edges, direction: "LR" }; // 时序图横向更贴近
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
