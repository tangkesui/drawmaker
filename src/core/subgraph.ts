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

/** 节点层级深度（根=0）。 */
export function nodeDepth(id: string, nodes: DmNode[]): number {
  const byId = nodeMap(nodes);
  const n = byId.get(id);
  return n ? depthOf(n, byId) : 0;
}

/** 节点的层级深度（根=0）。 */
function depthOf(node: DmNode, byId: Map<string, DmNode>): number {
  let d = 0;
  const seen = new Set<string>([node.id]);
  let p = node.parentId ? byId.get(node.parentId) : undefined;
  while (p && !seen.has(p.id)) {
    seen.add(p.id);
    d += 1;
    p = p.parentId ? byId.get(p.parentId) : undefined;
  }
  return d;
}

/**
 * 导入分组图的布局（纯函数）：叶子已有绝对坐标，自底向上给每个容器算包围框（含标题栏+padding），
 * 再把所有节点换成「相对父」坐标。返回每个 id 的最终 position（+ 容器 size）。
 */
export function layoutWithGroups(
  nodes: DmNode[],
  leafAbs: Map<string, { x: number; y: number }>,
  leafSize: (id: string) => { width: number; height: number },
  pad = 24,
  titleH = 26,
): Map<string, { position: { x: number; y: number }; size?: { width: number; height: number } }> {
  const byId = nodeMap(nodes);
  const isGroup = (id: string): boolean => byId.get(id)?.kind === SUBGRAPH_KIND;

  const abs = new Map<string, { x: number; y: number }>();
  const size = new Map<string, { width: number; height: number }>();
  for (const n of nodes) {
    if (isGroup(n.id)) continue;
    abs.set(n.id, leafAbs.get(n.id) ?? { x: 0, y: 0 });
    size.set(n.id, leafSize(n.id));
  }
  // 容器自底向上（深度大的先算，保证嵌套子容器已就绪）
  const groups = nodes.filter((n) => isGroup(n.id)).sort((a, b) => depthOf(b, byId) - depthOf(a, byId));
  for (const g of groups) {
    const kids = nodes.filter((n) => n.parentId === g.id);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const c of kids) {
      const p = abs.get(c.id);
      const s = size.get(c.id);
      if (!p || !s) continue;
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + s.width);
      maxY = Math.max(maxY, p.y + s.height);
    }
    if (!Number.isFinite(minX)) {
      minX = 0; minY = 0; maxX = 120; maxY = 60; // 空容器兜底
    }
    abs.set(g.id, { x: minX - pad, y: minY - pad - titleH });
    size.set(g.id, { width: maxX - minX + pad * 2, height: maxY - minY + pad * 2 + titleH });
  }
  // 换成相对父
  const out = new Map<string, { position: { x: number; y: number }; size?: { width: number; height: number } }>();
  for (const n of nodes) {
    const a = abs.get(n.id) ?? { x: 0, y: 0 };
    const pAbs = n.parentId ? abs.get(n.parentId) : undefined;
    const position = pAbs ? { x: a.x - pAbs.x, y: a.y - pAbs.y } : a;
    out.set(n.id, { position, ...(isGroup(n.id) ? { size: size.get(n.id) } : {}) });
  }
  return out;
}

/** 按层级深度稳定排序，父排子前（xyflow 要求父节点先于子节点）。 */
export function orderParentFirst(nodes: DmNode[]): DmNode[] {
  const byId = nodeMap(nodes);
  const depthOf = (n: DmNode): number => {
    let d = 0;
    const seen = new Set<string>([n.id]);
    let p = n.parentId ? byId.get(n.parentId) : undefined;
    while (p && !seen.has(p.id)) {
      seen.add(p.id);
      d += 1;
      p = p.parentId ? byId.get(p.parentId) : undefined;
    }
    return d;
  };
  return nodes
    .map((n, i) => ({ n, i, d: depthOf(n) }))
    .sort((a, b) => a.d - b.d || a.i - b.i)
    .map((x) => x.n);
}
