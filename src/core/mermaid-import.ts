import type { DmEdge, DmNode, EdgeArrow, FlowDirection } from "./types";

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
}
export interface RawEdge {
  start: string;
  end: string;
  type?: string;
  text?: string;
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

/** flowchart 原始解析 → 节点(无 position，由导入动作布局) + 边 + 方向。 */
export function flowToGraph(raw: RawFlow): {
  nodes: Omit<DmNode, "position">[];
  edges: DmEdge[];
  direction: FlowDirection;
} {
  const nodes = Object.values(raw.vertices).map((v) => ({
    id: v.id,
    kind: SHAPE_KIND[v.type ?? ""] ?? "rect",
    data: { label: v.text ?? v.id },
  }));
  const edges = raw.edges.map((e, i) => {
    const arrow = EDGE_ARROW[e.type ?? ""] ?? "end";
    const data = { ...(e.text ? { label: e.text } : {}), ...(arrow !== "end" ? { arrow } : {}) };
    const edge: DmEdge = { id: `e_${i + 1}`, source: e.start, target: e.end };
    if (Object.keys(data).length) edge.data = data;
    return edge;
  });
  return { nodes, edges, direction: mapDirection(raw.direction) };
}
