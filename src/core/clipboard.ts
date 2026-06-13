import type { DmEdge, DmNode } from "./types";

/** 一份可复制的子图（选中节点 + 两端都在选区内的边）。 */
export interface Clip {
  nodes: DmNode[];
  edges: DmEdge[];
}

/** 系统剪贴板里 drawmaker 内容的标识；粘贴时据此区分自家内容与外部文本。 */
const MAGIC = "drawmaker/clip@1";

/** Clip → 系统剪贴板文本（带 magic 标识的 JSON）。 */
export function serializeClip(clip: Clip): string {
  return JSON.stringify({ __drawmaker: MAGIC, nodes: clip.nodes, edges: clip.edges });
}

/** 系统剪贴板文本 → Clip；非 drawmaker 内容（外部文本 / 空 / 非法 JSON）返回 null。 */
export function parseClip(text: string): Clip | null {
  if (!text) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const o = parsed as Record<string, unknown>;
  if (o.__drawmaker !== MAGIC || !Array.isArray(o.nodes) || !Array.isArray(o.edges)) return null;
  return { nodes: o.nodes as DmNode[], edges: o.edges as DmEdge[] };
}
