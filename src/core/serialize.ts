import type { DmDocument } from "./types";

export const SUPPORTED_VERSION = 1;

export function serializeDocument(doc: DmDocument): string {
  return JSON.stringify(doc, null, 2);
}

/**
 * 解析 `.dm` 文本为 DmDocument。
 * 校验 version 与基本结构；不认识的版本直接 throw（不静默吃掉）。
 */
export function deserializeDocument(text: string): DmDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(`不是合法 JSON：${(e as Error).message}`);
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("文档根必须是对象");
  }

  const doc = parsed as Partial<DmDocument>;
  if (doc.version !== SUPPORTED_VERSION) {
    throw new Error(`不支持的 .dm 版本：${String(doc.version)}（本程序支持 v${SUPPORTED_VERSION}）`);
  }
  if (!Array.isArray(doc.nodes) || !Array.isArray(doc.edges)) {
    throw new Error(".dm 缺少 nodes / edges 数组");
  }

  return {
    version: SUPPORTED_VERSION,
    nodes: doc.nodes,
    edges: doc.edges,
    meta: doc.meta ?? { title: "Untitled" },
    ...(doc.data ? { data: doc.data } : {}),
  };
}
