import { computeLayout } from "../canvas/auto-layout";
import { viewport } from "../canvas/viewport-controls";
import { commit } from "../core/history";
import {
  classToGraph,
  erToGraph,
  flowToGraph,
  stateToGraph,
  type ImportGraph,
} from "../core/mermaid-import";
import { useEditorStore } from "../core/store";
import type { DiagramType, DmDocument, DmNode } from "../core/types";
import { detectDiagramType, parseClass, parseEr, parseFlow, parseState } from "./mermaidParse";

export interface ImportResult {
  ok: boolean;
  msg?: string;
}

/** 当前支持「文本 → 画布」回写的类型（与 MermaidPanel EDITABLE_TYPES 对齐）。 */
async function buildGraph(detected: string, text: string): Promise<{ type: DiagramType; graph: ImportGraph } | null> {
  if (detected.startsWith("flowchart")) return { type: "flowchart", graph: flowToGraph(await parseFlow(text)) };
  if (detected === "stateDiagram") return { type: "state", graph: stateToGraph(await parseState(text)) };
  if (detected === "class") return { type: "class", graph: classToGraph(await parseClass(text)) };
  if (detected === "er") return { type: "er", graph: erToGraph(await parseEr(text)) };
  return null;
}

/**
 * 解析 mermaid 文本 → 替换当前文档为可拖拽的同构图（flowchart/state/class/er）。
 * dagre 自动布局；已存在的同名节点保留其位置（双向编辑时不跳位）。一条 history。
 */
export async function importMermaidFromText(text: string): Promise<ImportResult> {
  const detected = await detectDiagramType(text);
  if (!detected) return { ok: false, msg: "不是合法的 mermaid 文本" };

  const built = await buildGraph(detected, text);
  if (!built) return { ok: false, msg: `暂不支持回写画布（识别为 ${detected}）` };
  const { type, graph } = built;
  if (graph.nodes.length === 0) return { ok: false, msg: "没有解析到节点" };

  const prevPos = new Map(useEditorStore.getState().doc.nodes.map((n) => [n.id, n.position]));
  const dir = graph.direction === "LR" || graph.direction === "RL" ? "LR" : "TB";
  const tmp: DmDocument = {
    version: 1,
    nodes: graph.nodes.map((n) => ({ ...n, position: { x: 0, y: 0 } })),
    edges: graph.edges,
    meta: { title: "", direction: graph.direction },
  };
  const layout = computeLayout(tmp, dir);

  const nodes: DmNode[] = graph.nodes.map((n) => ({
    ...n,
    position: prevPos.get(n.id) ?? layout.get(n.id) ?? { x: 0, y: 0 },
  }));

  commit("import mermaid", (d) => {
    d.nodes = nodes;
    d.edges = graph.edges;
    d.meta.diagramType = type;
    d.meta.direction = graph.direction;
  });
  setTimeout(() => viewport.fitView(), 60);
  return { ok: true };
}
