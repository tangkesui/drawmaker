import type { DmNode } from "./types";

/**
 * Subgraph 分组的纯逻辑：坐标系换算（相对父 ↔ 绝对，含嵌套累加）+ 子树。
 * 约定：有 parentId 的节点 position 相对父节点左上角；绝对 = 自身相对 + 所有祖先相对之和。
 * 无副作用、可测；UI/operations 在此之上组合。
 */

/** 分组容器节点的 kind。渲染由 registry 决定（P2）。 */
export const SUBGRAPH_KIND = "subgraph";

export function nodeMap(nodes: DmNode[]): Map<string, DmNode> {
  return new Map(nodes.map((n) => [n.id, n]));
}

/** 节点绝对坐标：沿 parentId 链累加（防环）。 */
export function absolutePos(node: DmNode, byId: Map<string, DmNode>): { x: number; y: number } {
  let x = node.position.x;
  let y = node.position.y;
  const seen = new Set<string>([node.id]);
  let parent = node.parentId ? byId.get(node.parentId) : undefined;
  while (parent && !seen.has(parent.id)) {
    seen.add(parent.id);
    x += parent.position.x;
    y += parent.position.y;
    parent = parent.parentId ? byId.get(parent.parentId) : undefined;
  }
  return { x, y };
}

/** 把一个绝对坐标换算成「相对某个父节点」的坐标（父=undefined 则返回绝对本身）。 */
export function toRelative(
  abs: { x: number; y: number },
  parent: DmNode | undefined,
  byId: Map<string, DmNode>,
): { x: number; y: number } {
  if (!parent) return { ...abs };
  const p = absolutePos(parent, byId);
  return { x: abs.x - p.x, y: abs.y - p.y };
}

/** rootId 及其所有后代的 id（删组 / 整组移动 / 复制用）。 */
export function subtreeIds(rootId: string, nodes: DmNode[]): Set<string> {
  const childrenOf = new Map<string, string[]>();
  for (const n of nodes) {
    if (!n.parentId) continue;
    const arr = childrenOf.get(n.parentId);
    if (arr) arr.push(n.id);
    else childrenOf.set(n.parentId, [n.id]);
  }
  const out = new Set<string>();
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    for (const c of childrenOf.get(id) ?? []) stack.push(c);
  }
  return out;
}

/** 直接子节点 id。 */
export function childIds(parentId: string, nodes: DmNode[]): string[] {
  return nodes.filter((n) => n.parentId === parentId).map((n) => n.id);
}
