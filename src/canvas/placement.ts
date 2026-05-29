/**
 * 放置桥。
 * 调色板用 pointer 事件自实现拖拽（Tauri 的 OS 级文件拖放会拦截 webview 的 HTML5 DnD，
 * 二者同窗口互斥；为保住 Phase 3 的文件拖放打开，调色板改走 pointer 方案）。
 * Canvas 在 ReactFlowProvider 内注册「按屏幕坐标放置形状」，调色板松手时调用。
 */
type PlaceFn = (kind: string, clientX: number, clientY: number) => void;

let placeFn: PlaceFn | null = null;

export function registerPlacement(fn: PlaceFn): void {
  placeFn = fn;
}

export function placeShapeAt(kind: string, clientX: number, clientY: number): void {
  placeFn?.(kind, clientX, clientY);
}
