import { exportPdfBytes, exportPngBytes, exportSvgString } from "../canvas/export";
import { toMermaid } from "../core/mermaid";
import { useEditorStore } from "../core/store";
import { writeClipboardText } from "./clipboardService";
import { exportSaveDialog, writeBytes, writeText } from "./fileService";

// 先渲染（空图会抛错，在弹面板前就报）→ 再弹 save 面板 → 写盘。
export async function exportSvg(): Promise<void> {
  const svg = await exportSvgString();
  const path = await exportSaveDialog("diagram.svg", "svg");
  if (!path) return;
  await writeText(path, svg);
}

export async function exportPng(): Promise<void> {
  const bytes = await exportPngBytes();
  const path = await exportSaveDialog("diagram.png", "png");
  if (!path) return;
  await writeBytes(path, bytes);
}

export async function exportPdf(): Promise<void> {
  const bytes = await exportPdfBytes();
  const path = await exportSaveDialog("diagram.pdf", "pdf");
  if (!path) return;
  await writeBytes(path, bytes);
}

// ---- mermaid 文本导出（从 doc 直出，不经渲染快照）----

/** 导出 mermaid flowchart 到 .mmd 文件。 */
export async function exportMermaid(): Promise<void> {
  const text = toMermaid(useEditorStore.getState().doc);
  const path = await exportSaveDialog("diagram.mmd", "mmd");
  if (!path) return;
  await writeText(path, text);
}

/** 把当前图复制为 mermaid 文本到系统剪贴板（"随时导出"最快路径）。 */
export async function copyMermaid(): Promise<void> {
  await writeClipboardText(toMermaid(useEditorStore.getState().doc));
}
