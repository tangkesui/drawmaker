import type { NodeKind } from "./types";
import { commit } from "./history";

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
