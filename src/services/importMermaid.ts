import { computeLayout } from "../canvas/auto-layout";
import { viewport } from "../canvas/viewport-controls";
import { commit } from "../core/history";
import { flowToGraph } from "../core/mermaid-import";
import { useEditorStore } from "../core/store";
import type { DmDocument, DmNode } from "../core/types";
import { detectDiagramType, parseFlow } from "./mermaidParse";

export interface ImportResult {
  ok: boolean;
  msg?: string;
}

/**
 * 解析 mermaid flowchart 文本 → 替换当前文档为可拖拽的同构图。
 * dagre 自动布局；已存在的同名节点保留其位置（双向编辑时不跳位）。一条 history。
 */
export async function importMermaidFromText(text: string): Promise<ImportResult> {
  const type = await detectDiagramType(text);
  if (!type) return { ok: false, msg: "不是合法的 mermaid 文本" };
  if (!type.startsWith("flowchart")) {
    return { ok: false, msg: `暂只支持 flowchart 回写画布（识别为 ${type}）` };
  }

  const { nodes, edges, direction } = flowToGraph(await parseFlow(text));
  if (nodes.length === 0) return { ok: false, msg: "没有解析到节点" };

  const prevPos = new Map(useEditorStore.getState().doc.nodes.map((n) => [n.id, n.position]));
  const dir = direction === "LR" || direction === "RL" ? "LR" : "TB";
  const tmp: DmDocument = {
    version: 1,
    nodes: nodes.map((n) => ({ ...n, position: { x: 0, y: 0 } })),
    edges,
    meta: { title: "", direction },
  };
  const layout = computeLayout(tmp, dir);

  const built: DmNode[] = nodes.map((n) => ({
    ...n,
    position: prevPos.get(n.id) ?? layout.get(n.id) ?? { x: 0, y: 0 },
  }));

  commit("import mermaid", (d) => {
    d.nodes = built;
    d.edges = edges;
    d.meta.diagramType = "flowchart";
    d.meta.direction = direction;
  });
  setTimeout(() => viewport.fitView(), 60);
  return { ok: true };
}
