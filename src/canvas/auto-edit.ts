/**
 * 新建节点后自动进编辑态的桥：双击空白建点时记下新 id，ShapeNode 挂载时认领并进入改字。
 * 一次性消费，避免后续重渲染重复触发。
 */
let pending: string | null = null;

export function setAutoEdit(id: string): void {
  pending = id;
}

/** 若 id 是待自动编辑的节点则认领（返回 true）并清空。 */
export function consumeAutoEdit(id: string): boolean {
  if (pending !== id) return false;
  pending = null;
  return true;
}
