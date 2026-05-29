import { getCurrentWindow } from "@tauri-apps/api/window";
import { openPath } from "../core/document-actions";
import { showError } from "./notify";

/** 监听窗口文件拖放，drop 的第一个 `.dm` 文件 → 过未保存关卡后打开。 */
export async function initDragDrop(): Promise<void> {
  await getCurrentWindow().onDragDropEvent((event) => {
    if (event.payload.type !== "drop") return;
    const dm = event.payload.paths.find((p) => p.toLowerCase().endsWith(".dm"));
    if (dm) openPath(dm).catch(showError);
  });
}
