import ELK from "elkjs/lib/elk.bundled.js";
import { commit } from "../core/history";
import { useEditorStore } from "../core/store";
import { getShape } from "./shapes/registry";
import { viewport } from "./viewport-controls";

/**
 * elkjs 正交（orthogonal）布局，作为 dagre 之外的可选布局（连线走直角，图更整齐）。
 * 只布局顶层节点（含分组容器，按容器尺寸当盒子）；容器内子节点保持相对位置不动。
 */
const elk = new ELK();

export async function applyElkLayout(dir: "DOWN" | "RIGHT"): Promise<void> {
  const { doc } = useEditorStore.getState();
  const top = doc.nodes.filter((n) => !n.parentId);
  if (top.length === 0) return;
  const topIds = new Set(top.map((n) => n.id));

  const graph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": dir,
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.spacing.nodeNode": "48",
      "elk.layered.spacing.nodeNodeBetweenLayers": "64",
    },
    children: top.map((n) => {
      const s = n.size ?? getShape(n.kind).defaultSize;
      return { id: n.id, width: s.width, height: s.height };
    }),
    edges: doc.edges
      .filter((e) => topIds.has(e.source) && topIds.has(e.target))
      .map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  };

  const res = await elk.layout(graph);
  const pos = new Map<string, { x: number; y: number }>();
  for (const c of res.children ?? []) pos.set(c.id, { x: c.x ?? 0, y: c.y ?? 0 });

  commit("elk layout", (d) => {
    for (const n of d.nodes) {
      const p = pos.get(n.id);
      if (p) n.position = p;
    }
  });
  setTimeout(() => viewport.fitView(), 60);
}
