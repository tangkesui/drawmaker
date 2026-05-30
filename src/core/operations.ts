import type { DmEdge, DmNode, NodeData, NodeKind } from "./types";
import { getClipboard, setClipboard } from "./clipboard";
import { commit } from "./history";
import { useEditorStore } from "./store";

/**
 * 领域操作 = `commit()` 的调用点。
 * UI / Canvas 只调这些函数，不直接碰 store 或 history 机制。
 */

let seq = 0;
function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}_${seq}`;
}

/** 仅供测试：重置 id 计数器。 */
export function __resetIds(): void {
  seq = 0;
}

export function addNode(kind: NodeKind, position: { x: number; y: number }, label = ""): string {
  const id = nextId("n");
  commit("add node", (d) => {
    d.nodes.push({ id, kind, position, data: { label } });
  });
  return id;
}

export function renameNode(id: string, label: string): void {
  commit("rename", (d) => {
    const n = d.nodes.find((x) => x.id === id);
    if (n) n.data.label = label;
  });
}

/** 改多个节点的样式/标签，一条 command。patch 里 undefined 的字段不动。 */
export function updateNodeStyle(ids: string[], patch: Partial<NodeData>): void {
  if (ids.length === 0) return;
  const set = new Set(ids);
  commit("style", (d) => {
    for (const n of d.nodes) {
      if (set.has(n.id)) Object.assign(n.data, patch);
    }
  });
}

export function moveNodes(moves: { id: string; position: { x: number; y: number } }[]): void {
  if (moves.length === 0) return;
  commit("move", (d) => {
    for (const m of moves) {
      const n = d.nodes.find((x) => x.id === m.id);
      if (n) n.position = m.position;
    }
  });
}

export function deleteNodes(ids: string[]): void {
  if (ids.length === 0) return;
  const set = new Set(ids);
  commit("delete", (d) => {
    d.nodes = d.nodes.filter((n) => !set.has(n.id));
    d.edges = d.edges.filter((e) => !set.has(e.source) && !set.has(e.target));
  });
}

export function deleteEdges(ids: string[]): void {
  if (ids.length === 0) return;
  const set = new Set(ids);
  commit("delete edge", (d) => {
    d.edges = d.edges.filter((e) => !set.has(e.id));
  });
}

export function connectNodes(
  source: string,
  target: string,
  sourceHandle?: string | null,
  targetHandle?: string | null,
): string {
  const id = nextId("e");
  commit("connect", (d) => {
    d.edges.push({ id, source, target, sourceHandle: sourceHandle ?? null, targetHandle: targetHandle ?? null });
  });
  return id;
}

/** resize 后提交节点尺寸（一条 command）。 */
export function resizeNode(id: string, size: { width: number; height: number }): void {
  commit("resize", (d) => {
    const n = d.nodes.find((x) => x.id === id);
    if (n) n.size = size;
  });
}

// ---- 选区 / 剪贴板 / 再制 ----

function setSelected(ids: string[]): void {
  useEditorStore.setState((s) => ({ view: { ...s.view, selected: ids } }));
}

export function selectAll(): void {
  setSelected(useEditorStore.getState().doc.nodes.map((n) => n.id));
}

/** 当前选区里：选中节点 + 两端都在选区内的边。 */
function selectionSubgraph(): { nodes: DmNode[]; edges: DmEdge[] } {
  const { doc, view } = useEditorStore.getState();
  const sel = new Set(view.selected);
  return {
    nodes: doc.nodes.filter((n) => sel.has(n.id)),
    edges: doc.edges.filter((e) => sel.has(e.source) && sel.has(e.target)),
  };
}

export function copySelection(): void {
  const { nodes, edges } = selectionSubgraph();
  if (nodes.length === 0) return;
  setClipboard({ nodes: nodes.map((n) => structuredClone(n)), edges: edges.map((e) => structuredClone(e)) });
}

export function cutSelection(): void {
  const ids = useEditorStore.getState().view.selected;
  copySelection();
  deleteNodes(ids);
}

const PASTE_OFFSET = 24;

/** 把一组节点/边以新 id、偏移后放入文档，整批一条 command，并选中新副本。 */
function placeCopies(srcNodes: DmNode[], srcEdges: DmEdge[], label: string): void {
  if (srcNodes.length === 0) return;
  const idMap = new Map<string, string>();
  const newNodes = srcNodes.map((n) => {
    const id = nextId("n");
    idMap.set(n.id, id);
    const clone = structuredClone(n);
    return {
      ...clone,
      id,
      position: { x: n.position.x + PASTE_OFFSET, y: n.position.y + PASTE_OFFSET },
    };
  });
  const newEdges = srcEdges.map((e) => {
    const clone = structuredClone(e);
    return { ...clone, id: nextId("e"), source: idMap.get(e.source)!, target: idMap.get(e.target)! };
  });

  setSelected(newNodes.map((n) => n.id));
  commit(label, (d) => {
    d.nodes.push(...newNodes);
    d.edges.push(...newEdges);
  });
}

export function pasteClipboard(): void {
  const clip = getClipboard();
  if (clip) placeCopies(clip.nodes, clip.edges, "paste");
}

export function duplicateSelection(): void {
  const { nodes, edges } = selectionSubgraph();
  placeCopies(nodes, edges, "duplicate");
}
