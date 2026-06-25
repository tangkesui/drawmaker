import dagre from "dagre";
import { commit } from "../core/history";
import { useEditorStore } from "../core/store";
import { SUBGRAPH_KIND } from "../core/subgraph";
import type { DmDocument, DmEdge } from "../core/types";
import { getShape } from "./shapes/registry";
import { viewport } from "./viewport-controls";

/** dagre rankdir：四个方向都原生支持（TB/BT 竖向、LR/RL 横向），不再折叠极性。 */
export type LayoutDir = "TB" | "BT" | "LR" | "RL";

/**
 * 方向 → 连接桩 id：让边从「上游侧」出、「下游侧」入，匹配 dagre 流向
 * （ShapeNode 的 4 个 source 桩 t/r/b/l，ConnectionMode.Loose 下可兼作 target）。
 */
export function handlesForDir(dir: LayoutDir): { source: string; target: string } {
  switch (dir) {
    case "BT":
      return { source: "t", target: "b" };
    case "LR":
      return { source: "r", target: "l" };
    case "RL":
      return { source: "l", target: "r" };
    default:
      return { source: "b", target: "t" }; // TB（含 mermaid TD）
  }
}

/**
 * 给「两端都是普通形状」的边按方向设连接桩；触达容器(SubgraphNode 无桩)的边保持原样
 * （否则会指向不存在的桩）。返回新数组，纯函数可测。
 */
export function assignEdgeHandles(edges: DmEdge[], shapeIds: Set<string>, dir: LayoutDir): DmEdge[] {
  const h = handlesForDir(dir);
  return edges.map((e) =>
    shapeIds.has(e.source) && shapeIds.has(e.target)
      ? { ...e, sourceHandle: h.source, targetHandle: h.target }
      : e,
  );
}

/** 纯函数：dagre 算每个节点的左上角坐标。节点尺寸取注册表 defaultSize。 */
export function computeLayout(doc: DmDocument, dir: LayoutDir): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  // nodesep/ranksep 收紧，缓解宽扇出树的横向铺开（节点已按内容定尺，不会再挤）。
  g.setGraph({ rankdir: dir, nodesep: 36, ranksep: 50, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of doc.nodes) {
    const { width, height } = n.size ?? getShape(n.kind).defaultSize;
    g.setNode(n.id, { width, height });
  }
  for (const e of doc.edges) {
    g.setEdge(e.source, e.target);
  }

  dagre.layout(g);

  const result = new Map<string, { x: number; y: number }>();
  for (const n of doc.nodes) {
    const gn = g.node(n.id);
    // dagre 给中心点，xyflow position 是左上角
    if (gn) result.set(n.id, { x: gn.x - gn.width / 2, y: gn.y - gn.height / 2 });
  }
  return result;
}

/** 一键自动布局：所有节点新位置打包成一条 command（整体可撤销），随后 fitView。 */
export function applyAutoLayout(dir: LayoutDir): void {
  const { doc } = useEditorStore.getState();
  if (doc.nodes.length === 0) return;

  const positions = computeLayout(doc, dir);
  const shapeIds = new Set(doc.nodes.filter((n) => n.kind !== SUBGRAPH_KIND).map((n) => n.id));
  const h = handlesForDir(dir);
  commit(`layout-${dir}`, (d) => {
    for (const n of d.nodes) {
      const p = positions.get(n.id);
      if (p) n.position = p;
    }
    // 重排即重设连接桩，让边随新流向出/入（容器边除外）。
    for (const e of d.edges) {
      if (shapeIds.has(e.source) && shapeIds.has(e.target)) {
        e.sourceHandle = h.source;
        e.targetHandle = h.target;
      }
    }
  });

  // 等 store 变更渲染到 xyflow 后再 fit
  setTimeout(() => viewport.fitView(), 60);
}
