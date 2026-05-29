import { exportPdfBytes, exportPngBytes, exportSvgString } from "../canvas/export";
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
