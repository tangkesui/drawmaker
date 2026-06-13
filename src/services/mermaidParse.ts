import mermaid from "mermaid";
import type { RawClass, RawEr, RawFlow, RawState } from "../core/mermaid-import";

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
  await mermaid.parse(text); // 触发图类型懒注册（getDiagramFromText 依赖）
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

/** db 上某个 getter 返回 Map/对象，统一成普通对象。 */
function asRecord<T>(v: Map<string, T> | Record<string, T>): Record<string, T> {
  return v instanceof Map ? Object.fromEntries(v) : v;
}

async function dbOf(text: string): Promise<Record<string, unknown>> {
  ensureInit();
  await mermaid.parse(text);
  const diagram = await mermaid.mermaidAPI.getDiagramFromText(text);
  return diagram.db as unknown as Record<string, unknown>;
}

export async function parseState(text: string): Promise<RawState> {
  const db = (await dbOf(text)) as {
    getStates: () => Map<string, RawState["states"][string]> | RawState["states"];
    getRelations: () => RawState["relations"];
  };
  return { states: asRecord(db.getStates()), relations: db.getRelations() };
}

export async function parseClass(text: string): Promise<RawClass> {
  const db = (await dbOf(text)) as {
    getClasses: () => Map<string, RawClass["classes"][string]> | RawClass["classes"];
    getRelations: () => RawClass["relations"];
  };
  return { classes: asRecord(db.getClasses()), relations: db.getRelations() };
}

export async function parseEr(text: string): Promise<RawEr> {
  const db = (await dbOf(text)) as {
    getEntities: () => Map<string, RawEr["entities"][string]> | RawEr["entities"];
    getRelationships: () => RawEr["relationships"];
  };
  return { entities: asRecord(db.getEntities()), relationships: db.getRelationships() };
}
