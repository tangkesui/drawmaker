import dagre from "dagre";
import { commit } from "../core/history";
import { useEditorStore } from "../core/store";
import type { DmDocument } from "../core/types";
import { getShape } from "./shapes/registry";
import { viewport } from "./viewport-controls";

export type LayoutDir = "TB" | "LR";

/** 纯函数：dagre 算每个节点的左上角坐标。节点尺寸取注册表 defaultSize。 */
export function computeLayout(doc: DmDocument, dir: LayoutDir): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: dir, nodesep: 50, ranksep: 60, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of doc.nodes) {
    const { width, height } = getShape(n.kind).defaultSize;
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
  commit(`layout-${dir}`, (d) => {
    for (const n of d.nodes) {
      const p = positions.get(n.id);
      if (p) n.position = p;
    }
  });

  // 等 store 变更渲染到 xyflow 后再 fit
  setTimeout(() => viewport.fitView(), 60);
}
