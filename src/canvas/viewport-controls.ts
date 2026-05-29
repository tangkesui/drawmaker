/**
 * viewport 控制桥。
 * xyflow 的缩放/fit 只能在 ReactFlowProvider 内通过 useReactFlow 拿到，
 * 而原生菜单在 React 外。Canvas 挂载时把这些函数注册进来，menuService 调用。
 * 菜单建立早于 Canvas 挂载时先 no-op，挂载后即可用。
 */
type ViewportApi = {
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  fitView: () => void;
};

const noop = () => {};
let api: ViewportApi = { zoomIn: noop, zoomOut: noop, resetZoom: noop, fitView: noop };

export function registerViewportControls(next: ViewportApi): void {
  api = next;
}

export const viewport: ViewportApi = {
  zoomIn: () => api.zoomIn(),
  zoomOut: () => api.zoomOut(),
  resetZoom: () => api.resetZoom(),
  fitView: () => api.fitView(),
};
