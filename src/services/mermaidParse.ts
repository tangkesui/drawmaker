import mermaid from "mermaid";
import type { RawFlow } from "../core/mermaid-import";

/**
 * mermaid 官方解析器适配（依赖 DOM —— 运行在 Tauri webview；headless 测试需 jsdom 环境）。
 * 只取结构化数据（vertices/edges/direction），不做渲染。映射到我们模型的纯逻辑在 core/mermaid-import。
 */

let inited = false;
function ensureInit(): void {
  if (!inited) {
    mermaid.initialize({ startOnLoad: false });
    inited = true;
  }
}

/** 校验文本是否合法 mermaid，并返回其图表类型；非法返回 null。 */
export async function detectDiagramType(text: string): Promise<string | null> {
  ensureInit();
  try {
    const r = await mermaid.parse(text, { suppressErrors: true });
    return r ? r.diagramType : null;
  } catch {
    return null;
  }
}

/** 解析 flowchart 文本 → 原始 {vertices, edges, direction}（供 core/flowToGraph 映射）。 */
export async function parseFlow(text: string): Promise<RawFlow> {
  ensureInit();
  const diagram = await mermaid.mermaidAPI.getDiagramFromText(text);
  // flowchart 的 db 暴露 getVertices/getEdges/getDirection（半内部 API，按形态取用）。
  const db = diagram.db as {
    getVertices: () => Map<string, RawFlow["vertices"][string]> | RawFlow["vertices"];
    getEdges: () => RawFlow["edges"];
    getDirection?: () => string;
  };
  const v = db.getVertices();
  const vertices = v instanceof Map ? Object.fromEntries(v) : v;
  return { vertices, edges: db.getEdges(), direction: db.getDirection?.() };
}
