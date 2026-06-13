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
import { absolutePos, nodeMap, SUBGRAPH_KIND, subtreeIds } from "./subgraph";

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
  const endMap = new Map(ends.map((m) => [m.id, m.position]));
  // 克隆在 commit 外用真实节点做（draft 是 Proxy，structuredClone 会 DataCloneError）。
  const { doc } = useEditorStore.getState();
  const byId = nodeMap(doc.nodes);
  // 复制集 = 被拖节点的子树并集（拖容器要连带子节点）。
  const copySet = new Set<string>();
  for (const e of ends) for (const s of subtreeIds(e.id, doc.nodes)) copySet.add(s);
  const idMap = new Map<string, string>();
  for (const id of copySet) idMap.set(id, nextId("n"));

  const copies = doc.nodes
    .filter((n) => copySet.has(n.id))
    .map((n) => {
      const clone = structuredClone(n);
      clone.id = idMap.get(n.id)!;
      if (n.parentId && copySet.has(n.parentId)) {
        clone.parentId = idMap.get(n.parentId)!; // 子副本：换新父、保持相对位置
      } else {
        delete clone.parentId; // 顶层副本：留在原绝对位置
        clone.position = absolutePos(n, byId);
      }
      return clone;
    });
  const copyEdges = doc.edges
    .filter((e) => copySet.has(e.source) && copySet.has(e.target))
    .map((e) => ({
      ...structuredClone(e),
      id: nextId("e"),
      source: idMap.get(e.source)!,
      target: idMap.get(e.target)!,
    }));
  commit("alt-drag duplicate", (d) => {
    for (const n of d.nodes) {
      const p = endMap.get(n.id);
      if (p) n.position = p; // 原节点（被拖的 ends）移到终点
    }
    d.nodes.push(...copies);
    d.edges.push(...copyEdges);
  });
}

export function deleteNodes(ids: string[]): void {
  if (ids.length === 0) return;
  commit("delete", (d) => {
    // 删分组连带删其子树（避免孤儿 parentId）；普通节点 subtreeIds 只含自身。
    const set = new Set<string>();
    for (const id of ids) for (const sub of subtreeIds(id, d.nodes)) set.add(sub);
    d.nodes = d.nodes.filter((n) => !set.has(n.id));
    d.edges = d.edges.filter((e) => !set.has(e.source) && !set.has(e.target));
  });
}

// ---- 分组（subgraph）----

/**
 * 编组：把（顶层）节点收进一个新 subgraph 容器。rect 是容器的绝对几何（含标题栏 + padding，由
 * 调用方按 measured 尺寸算）；子节点 position 转相对容器。一条 command，选中新容器。返回容器 id。
 */
export function groupNodes(
  childIds: string[],
  rectAbs: { x: number; y: number; width: number; height: number },
  parentId?: string,
  label = "组",
): string {
  const id = nextId("g");
  const set = new Set(childIds);
  commit("group", (d) => {
    const byId = nodeMap(d.nodes);
    const parentAbs = parentId ? absolutePos(byId.get(parentId)!, byId) : { x: 0, y: 0 };
    for (const n of d.nodes) {
      if (set.has(n.id)) {
        const nAbs = absolutePos(n, byId); // 先取绝对，再改父（支持嵌套：成员可在某容器内）
        n.parentId = id;
        n.position = { x: nAbs.x - rectAbs.x, y: nAbs.y - rectAbs.y };
      }
    }
    d.nodes.push({
      id,
      kind: SUBGRAPH_KIND,
      position: { x: rectAbs.x - parentAbs.x, y: rectAbs.y - parentAbs.y },
      size: { width: rectAbs.width, height: rectAbs.height },
      data: { label },
      ...(parentId ? { parentId } : {}),
    });
  });
  setSelected([id]);
  return id;
}

/**
 * 改父（拖进/拖出容器）：把节点挂到 newParentId 下（undefined=顶层）。
 * newAbs 是节点拖拽后的绝对左上角（由 Canvas 从 xyflow internalNode 取）；position 换算成相对新父。
 */
export function reparentNode(
  nodeId: string,
  newParentId: string | undefined,
  newAbs: { x: number; y: number },
): void {
  commit("reparent", (d) => {
    const byId = nodeMap(d.nodes);
    const node = byId.get(nodeId);
    if (!node) return;
    const npAbs = newParentId ? absolutePos(byId.get(newParentId)!, byId) : { x: 0, y: 0 };
    node.position = { x: newAbs.x - npAbs.x, y: newAbs.y - npAbs.y };
    if (newParentId) node.parentId = newParentId;
    else delete node.parentId;
  });
}

/** 解组：保留子节点（位置换回绝对/或提升到组的父），删掉容器。一条 command。 */
export function ungroupNodes(groupId: string): void {
  commit("ungroup", (d) => {
    const byId = nodeMap(d.nodes);
    const group = byId.get(groupId);
    if (!group || group.kind !== SUBGRAPH_KIND) return;
    const gAbs = absolutePos(group, byId);
    const up = group.parentId;
    const upAbs = up ? absolutePos(byId.get(up)!, byId) : { x: 0, y: 0 };
    for (const n of d.nodes) {
      if (n.parentId === groupId) {
        const absX = gAbs.x + n.position.x;
        const absY = gAbs.y + n.position.y;
        n.position = { x: absX - upAbs.x, y: absY - upAbs.y };
        if (up) n.parentId = up;
        else delete n.parentId;
      }
    }
    d.nodes = d.nodes.filter((n) => n.id !== groupId);
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
  // 选中容器 → 连带其子树（复制分组带内容）。
  const sel = new Set<string>();
  for (const id of view.selected) for (const s of subtreeIds(id, doc.nodes)) sel.add(s);
  const nodes = doc.nodes.filter((n) => sel.has(n.id));
  if (nodes.length === 0) return null;
  const edges = doc.edges.filter((e) => sel.has(e.source) && sel.has(e.target));
  return { nodes: nodes.map((n) => structuredClone(n)), edges: edges.map((e) => structuredClone(e)) };
}

const PASTE_OFFSET = 24;

/** 把一组节点/边以新 id 放入文档，整批一条 command，并选中新副本。
 *  分组：父也在复制集 → 重映射为新父 + 保持相对位置；否则提升到顶层 + 偏移。 */
function placeCopies(srcNodes: DmNode[], srcEdges: DmEdge[], label: string): void {
  if (srcNodes.length === 0) return;
  const idMap = new Map<string, string>();
  for (const n of srcNodes) idMap.set(n.id, nextId("n"));
  const copied = new Set(srcNodes.map((n) => n.id));

  const newNodes = srcNodes.map((n) => {
    const clone = structuredClone(n);
    clone.id = idMap.get(n.id)!;
    if (n.parentId && copied.has(n.parentId)) {
      clone.parentId = idMap.get(n.parentId)!; // 子节点：换新父、保持相对位置
    } else {
      delete clone.parentId; // 顶层副本：偏移
      clone.position = { x: clone.position.x + PASTE_OFFSET, y: clone.position.y + PASTE_OFFSET };
    }
    return clone;
  });
  const newEdges = srcEdges.map((e) => {
    const clone = structuredClone(e);
    return { ...clone, id: nextId("e"), source: idMap.get(e.source)!, target: idMap.get(e.target)! };
  });

  // 只选顶层副本（避免选区横跨层级）
  setSelected(newNodes.filter((n) => !n.parentId).map((n) => n.id));
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
