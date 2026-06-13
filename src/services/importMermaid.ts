import { computeLayout } from "../canvas/auto-layout";
import { getShape } from "../canvas/shapes/registry";
import { viewport } from "../canvas/viewport-controls";
import { commit } from "../core/history";
import { layoutWithGroups, SUBGRAPH_KIND } from "../core/subgraph";
import {
  c4ToGraph,
  classToGraph,
  erToGraph,
  flowToGraph,
  mindmapToGraph,
  sequenceToGraph,
  stateToGraph,
  type ImportGraph,
} from "../core/mermaid-import";
import {
  ganttToData,
  journeyToData,
  pieToData,
  timelineToData,
} from "../core/mermaid-import-data";
import { useEditorStore } from "../core/store";
import type { DataDiagram, DataDiagramType, DiagramType, DmDocument, DmNode } from "../core/types";
import {
  detectDiagramType,
  parseC4,
  parseClass,
  parseEr,
  parseFlow,
  parseGantt,
  parseJourney,
  parseMindmap,
  parsePie,
  parseSequence,
  parseState,
  parseTimeline,
} from "./mermaidParse";

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
  if (detected === "sequence") return { type: "sequence", graph: sequenceToGraph(await parseSequence(text)) };
  if (detected === "c4") return { type: "c4", graph: c4ToGraph(await parseC4(text)) };
  if (detected === "mindmap") return { type: "mindmap", graph: mindmapToGraph(await parseMindmap(text)) };
  return null;
}

/** 数据/时间家族：解析 → DataDiagram（填 DataEditor 表格，非画布）。 */
async function buildData(detected: string, text: string): Promise<{ type: DataDiagramType; data: DataDiagram } | null> {
  if (detected === "pie") return { type: "pie", data: pieToData(await parsePie(text)) };
  if (detected === "gantt") return { type: "gantt", data: ganttToData(await parseGantt(text)) };
  if (detected === "timeline") return { type: "timeline", data: timelineToData(await parseTimeline(text)) };
  if (detected === "journey") return { type: "journey", data: journeyToData(await parseJourney(text)) };
  return null;
}

/**
 * 解析 mermaid 文本 → 替换当前文档为可拖拽的同构图（flowchart/state/class/er）。
 * dagre 自动布局；已存在的同名节点保留其位置（双向编辑时不跳位）。一条 history。
 */
export async function importMermaidFromText(text: string): Promise<ImportResult> {
  const detected = await detectDiagramType(text);
  if (!detected) return { ok: false, msg: "不是合法的 mermaid 文本" };

  // 数据/时间家族：填 DataEditor，不动画布
  const dataBuilt = await buildData(detected, text);
  if (dataBuilt) {
    commit("import mermaid", (d) => {
      if (!d.data) d.data = {};
      d.data[dataBuilt.type] = dataBuilt.data;
      d.meta.diagramType = dataBuilt.type;
    });
    return { ok: true };
  }

  const built = await buildGraph(detected, text);
  if (!built) return { ok: false, msg: `暂不支持回写画布（识别为 ${detected}）` };
  const { type, graph } = built;
  if (graph.nodes.length === 0) return { ok: false, msg: "没有解析到节点" };

  const dir = graph.direction === "LR" || graph.direction === "RL" ? "LR" : "TB";
  const hasGroups = graph.nodes.some((n) => n.kind === SUBGRAPH_KIND);

  let nodes: DmNode[];
  if (hasGroups) {
    // 含分组：先 dagre 扁平布局叶子（忽略 parentId），再 layoutWithGroups 自底向上算容器框 + 转相对。
    const leaves = graph.nodes.filter((n) => n.kind !== SUBGRAPH_KIND);
    const tmp: DmDocument = {
      version: 1,
      nodes: leaves.map((n) => ({ ...n, position: { x: 0, y: 0 }, parentId: undefined })),
      edges: graph.edges,
      meta: { title: "", direction: graph.direction },
    };
    const leafAbs = computeLayout(tmp, dir);
    const sizeOf = new Map(graph.nodes.map((n) => [n.id, n]));
    const geom = layoutWithGroups(
      graph.nodes as unknown as DmNode[],
      leafAbs,
      (id) => sizeOf.get(id)?.size ?? getShape(sizeOf.get(id)?.kind ?? "rect").defaultSize,
    );
    nodes = graph.nodes.map((n) => {
      const g = geom.get(n.id)!;
      return { ...n, position: g.position, ...(g.size ? { size: g.size } : {}) };
    });
  } else {
    const prevPos = new Map(useEditorStore.getState().doc.nodes.map((n) => [n.id, n.position]));
    const tmp: DmDocument = {
      version: 1,
      nodes: graph.nodes.map((n) => ({ ...n, position: { x: 0, y: 0 } })),
      edges: graph.edges,
      meta: { title: "", direction: graph.direction },
    };
    const layout = computeLayout(tmp, dir);
    nodes = graph.nodes.map((n) => ({
      ...n,
      position: prevPos.get(n.id) ?? layout.get(n.id) ?? { x: 0, y: 0 },
    }));
  }

  commit("import mermaid", (d) => {
    d.nodes = nodes;
    d.edges = graph.edges;
    d.meta.diagramType = type;
    d.meta.direction = graph.direction;
  });
  setTimeout(() => viewport.fitView(), 60);
  return { ok: true };
}
