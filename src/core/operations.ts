import type {
  DataDiagram,
  DataDiagramType,
  DiagramType,
  DmDocument,
  DmEdge,
  DmNode,
  EdgeData,
  FlowDirection,
  NodeData,
  NodeKind,
} from "./types";
import type { Clip } from "./clipboard";
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

/**
 * 把 patch 合并进边的 data，并按字段剪枝默认值，保持 .dm 干净：
 * 空 label、arrow="end"（=缺省）都从 data 删除；data 变空则删掉整个 data。
 */
function applyEdgeData(d: DmDocument, ids: Set<string>, patch: Partial<EdgeData>): void {
  for (const e of d.edges) {
    if (!ids.has(e.id)) continue;
    const next: EdgeData = { ...e.data, ...patch };
    if (!next.label) delete next.label;
    if (!next.arrow || next.arrow === "end") delete next.arrow;
    if (!next.style || next.style === "solid") delete next.style;
    if (Object.keys(next).length === 0) delete e.data;
    else e.data = next;
  }
}

export function renameEdge(id: string, label: string): void {
  commit("rename edge", (d) => applyEdgeData(d, new Set([id]), { label }));
}

/** 改一批边的样式（目前是箭头方向），一条 command。 */
export function updateEdgeStyle(ids: string[], patch: Partial<EdgeData>): void {
  if (ids.length === 0) return;
  commit("edge style", (d) => applyEdgeData(d, new Set(ids), patch));
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

/**
 * Alt 拖拽复制（Excalidraw 同款）：原位留下副本，被拖节点移到终点。一条 command。
 * ends 是被拖节点的终点位置；副本取被拖节点的当前（起点）位置 + 新 id；内部边一并复制。
 */
export function altDragDuplicate(ends: { id: string; position: { x: number; y: number } }[]): void {
  if (ends.length === 0) return;
  const ids = new Set(ends.map((m) => m.id));
  const endMap = new Map(ends.map((m) => [m.id, m.position]));
  // 克隆在 commit 外用真实节点做（draft 是 Proxy，structuredClone 会 DataCloneError）。
  const { doc } = useEditorStore.getState();
  const idMap = new Map<string, string>();
  const copies = doc.nodes
    .filter((n) => ids.has(n.id))
    .map((n) => {
      const id = nextId("n");
      idMap.set(n.id, id);
      return { ...structuredClone(n), id }; // position = 原节点当前（起点）位置
    });
  const copyEdges = doc.edges
    .filter((e) => ids.has(e.source) && ids.has(e.target))
    .map((e) => ({
      ...structuredClone(e),
      id: nextId("e"),
      source: idMap.get(e.source)!,
      target: idMap.get(e.target)!,
    }));
  commit("alt-drag duplicate", (d) => {
    for (const n of d.nodes) {
      const p = endMap.get(n.id);
      if (p) n.position = p; // 原节点移到终点
    }
    d.nodes.push(...copies);
    d.edges.push(...copyEdges);
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

/** 重连：把边的某一端拖到新的节点/连接桩。conn 来自 xyflow 的 Connection（在 Canvas 边界转入）。 */
export function reconnectEdge(
  id: string,
  conn: { source: string | null; target: string | null; sourceHandle?: string | null; targetHandle?: string | null },
): void {
  if (!conn.source || !conn.target) return;
  commit("reconnect edge", (d) => {
    const e = d.edges.find((x) => x.id === id);
    if (!e) return;
    e.source = conn.source!;
    e.target = conn.target!;
    e.sourceHandle = conn.sourceHandle ?? null;
    e.targetHandle = conn.targetHandle ?? null;
  });
}

/** 设置 mermaid 导出方向（document 内容，入 history）。 */
export function setDirection(dir: FlowDirection): void {
  commit("direction", (d) => {
    d.meta.direction = dir;
  });
}

/** 设置 mermaid 图表类型（document 内容，入 history）。 */
export function setDiagramType(type: DiagramType): void {
  commit("diagram type", (d) => {
    d.meta.diagramType = type;
  });
}

// ---- 数据/时间家族图表编辑（标题 + 配置 + 行表，均入 history）----

/** 取/建 doc.data[type] 的 draft 子树。 */
function ensureData(d: DmDocument, type: DataDiagramType): DataDiagram {
  if (!d.data) d.data = {};
  if (!d.data[type]) d.data[type] = { title: "", config: {}, rows: [] };
  return d.data[type]!;
}

export function setDataTitle(type: DataDiagramType, title: string): void {
  commit("data title", (d) => {
    ensureData(d, type).title = title;
  });
}

export function setDataConfig(type: DataDiagramType, key: string, value: string): void {
  commit("data config", (d) => {
    ensureData(d, type).config[key] = value;
  });
}

export function addDataRow(type: DataDiagramType): void {
  commit("data row +", (d) => {
    ensureData(d, type).rows.push({});
  });
}

export function setDataCell(type: DataDiagramType, index: number, key: string, value: string): void {
  commit("data cell", (d) => {
    const row = ensureData(d, type).rows[index];
    if (row) row[key] = value;
  });
}

export function deleteDataRow(type: DataDiagramType, index: number): void {
  commit("data row -", (d) => {
    ensureData(d, type).rows.splice(index, 1);
  });
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

/**
 * 当前选区的可复制子图（选中节点 + 两端都在选区内的边，深拷贝）。空选区返回 null。
 * 纯逻辑：复制/剪切到系统剪贴板的 IO 在 clipboard-actions 层组合。
 */
export function getSelectionClip(): Clip | null {
  const { doc, view } = useEditorStore.getState();
  const sel = new Set(view.selected);
  const nodes = doc.nodes.filter((n) => sel.has(n.id));
  if (nodes.length === 0) return null;
  const edges = doc.edges.filter((e) => sel.has(e.source) && sel.has(e.target));
  return { nodes: nodes.map((n) => structuredClone(n)), edges: edges.map((e) => structuredClone(e)) };
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

/** 放置一个 clip（新 id、偏移、选中新副本），整批一条 command。 */
export function pasteClip(clip: Clip): void {
  placeCopies(clip.nodes, clip.edges, "paste");
}

export function duplicateSelection(): void {
  const clip = getSelectionClip();
  if (clip) placeCopies(clip.nodes, clip.edges, "duplicate");
}
