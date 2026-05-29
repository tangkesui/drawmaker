import { getCurrentWindow } from "@tauri-apps/api/window";
import { confirmDiscardIfDirty } from "../core/document-actions";

export async function setWindowTitle(title: string): Promise<void> {
  await getCurrentWindow().setTitle(title);
}

/**
 * 关窗未保存保护。
 * 先同步 preventDefault 截住默认关闭，再 await 询问；放行时用 destroy() 强制关闭
 * （不能用 close()，会再次触发 onCloseRequested 死循环）。
 */
export async function initCloseGuard(): Promise<void> {
  const win = getCurrentWindow();
  await win.onCloseRequested(async (event) => {
    event.preventDefault();
    if (await confirmDiscardIfDirty()) {
      await win.destroy();
    }
  });
}
