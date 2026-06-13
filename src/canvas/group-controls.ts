/**
 * 分组控制桥：编组要算选中节点的包围框（依赖 xyflow measured 尺寸），
 * 所以动作定义在 Canvas（持有 rf），经此桥暴露给 CanvasShortcuts / 右键菜单调用。
 */
export const groupControls = {
  group: () => {},
  ungroup: () => {},
};

export function registerGroupControls(c: { group: () => void; ungroup: () => void }): void {
  groupControls.group = c.group;
  groupControls.ungroup = c.ungroup;
}
