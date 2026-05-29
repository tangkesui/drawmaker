import { getNodesBounds, type Node } from "@xyflow/react";
import { toPng, toSvg } from "html-to-image";
import { PDFDocument } from "pdf-lib";
import { computeExportBox, dataUrlToBytes } from "./export-utils";

/**
 * 导出渲染：截 `.react-flow__viewport`（只含节点/边，不含 MiniMap/Controls），
 * 按全图 bounds 设宽高 + 平移到原点，导出整张图（不止可见视口）。
 * Canvas 在 ReactFlowProvider 内注册 getNodes（含 measured 尺寸）。
 */
type GetNodes = () => Node[];

let getNodesFn: GetNodes | null = null;

export function registerExportSource(fn: GetNodes): void {
  getNodesFn = fn;
}

function box() {
  const nodes = getNodesFn?.() ?? [];
  if (nodes.length === 0) throw new Error("画布是空的，没有可导出的内容");
  const el = document.querySelector<HTMLElement>(".react-flow__viewport");
  if (!el) throw new Error("画布未就绪");
  const { width, height, transform } = computeExportBox(getNodesBounds(nodes));
  return {
    el,
    width,
    height,
    options: {
      backgroundColor: "#ffffff",
      width,
      height,
      style: { width: `${width}px`, height: `${height}px`, transform },
    },
  };
}

export async function exportSvgString(): Promise<string> {
  const { el, options } = box();
  const dataUrl = await toSvg(el, options);
  return decodeURIComponent(dataUrl.replace(/^data:image\/svg\+xml;charset=utf-8,/, ""));
}

export async function exportPngBytes(): Promise<Uint8Array> {
  const { el, options } = box();
  return dataUrlToBytes(await toPng(el, options));
}

export async function exportPdfBytes(): Promise<Uint8Array> {
  const { el, width, height, options } = box();
  const pngBytes = dataUrlToBytes(await toPng(el, options));
  const pdf = await PDFDocument.create();
  const png = await pdf.embedPng(pngBytes);
  const page = pdf.addPage([width, height]);
  page.drawImage(png, { x: 0, y: 0, width, height });
  return pdf.save();
}
