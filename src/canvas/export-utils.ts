/** 导出的纯工具函数（无 DOM / 无第三方库依赖，便于 headless 测试）。 */

export const EXPORT_PADDING = 24;

/** 由 bounds 算导出画布的宽高与把全图平移到原点的 transform。 */
export function computeExportBox(bounds: { x: number; y: number; width: number; height: number }) {
  const width = Math.ceil(bounds.width + EXPORT_PADDING * 2);
  const height = Math.ceil(bounds.height + EXPORT_PADDING * 2);
  const transform = `translate(${-bounds.x + EXPORT_PADDING}px, ${-bounds.y + EXPORT_PADDING}px) scale(1)`;
  return { width, height, transform };
}

/** data URL → 字节。 */
export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] ?? "";
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
