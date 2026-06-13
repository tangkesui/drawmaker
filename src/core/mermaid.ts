import type { DataDiagram, DataDiagramType, DiagramType, DmDocument, EdgeArrow } from "./types";

/**
 * 文档 → mermaid 文本（纯函数，可测）。
 *
 * graph 家族（flowchart / state / class / er）共用同一套「节点 + 连线」文档模型，
 * 差别只在导出语法 —— 因此用按 diagramType 分发的序列化器注册表，加一种类型 = 加一个序列化器。
 *
 * 铁律：core 不依赖 canvas/registry。kind→形状语法等「语义」映射独立维护于此。
 */

/* ============ 通用 helpers ============ */
const firstLine = (s: string): string => s.split(/\r?\n/)[0] ?? "";
const restLines = (s: string): string[] =>
  s.split(/\r?\n/).slice(1).map((l) => l.trim()).filter(Boolean);
const oneLine = (s: string | undefined): string => (s ?? "").replace(/\r?\n/g, " ").trim();
const escQuotes = (s: string): string => s.replace(/"/g, "&quot;");
/** 双引号包裹 + 转义（flowchart label 用）。 */
const dquote = (s: string): string => `"${escQuotes(s).replace(/\r?\n/g, "<br/>")}"`;

/** 安全标识符：取首行，非词字符→_，空则回退（class/er 实体名用；保留 CJK）。 */
function ident(label: string, fallback: string): string {
  const cleaned = firstLine(label)
    .trim()
    .replace(/[^\w一-龥]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || fallback;
}

/* ============ flowchart ============ */

/** kind → mermaid flowchart 节点形状包裹 [前缀, 后缀]。未知 kind 回退矩形。 */
const SHAPE_WRAP: Record<string, [string, string]> = {
  // 通用：与 mermaid 标准形状直接对应
  rect: ["[", "]"],
  rounded: ["(", ")"],
  ellipse: ["([", "])"], // stadium（体育场形，最接近椭圆）
  diamond: ["{", "}"], // 菱形 / 判定
  // Mermaid 标准 flowchart 形状（kind 与语义一一对应）
  stadium: ["([", "])"],
  subroutine: ["[[", "]]"],
  cylinder: ["[(", ")]"],
  circle: ["((", "))"],
  hexagon: ["{{", "}}"],
  parallelogram: ["[/", "/]"],
  trapezoid: ["[/", "\\]"],
  // 架构形状 → 最接近的 mermaid 标准形状
  database: ["[(", ")]"], // cylinder
  service: ["[", "]"],
  queue: ["[[", "]]"], // subroutine
  loadbalancer: ["{{", "}}"], // hexagon
  cloud: ["((", "))"], // circle
  actor: ["[", "]"],
  note: ["[", "]"],
};
const DEFAULT_WRAP: [string, string] = ["[", "]"];

/** arrow 方向 → flowchart 连线操作符。start = 箭头在 source 端（逆向）。 */
const ARROW_OP: Record<EdgeArrow, string> = {
  end: "-->",
  none: "---",
  start: "<--",
  both: "<-->",
};

function flowchartMermaid(doc: DmDocument): string {
  const dir = doc.meta.direction ?? "TD";
  const out = [`flowchart ${dir}`];
  for (const n of doc.nodes) {
    const [open, close] = SHAPE_WRAP[n.kind] ?? DEFAULT_WRAP;
    out.push(`  ${n.id}${open}${dquote(n.data.label || n.id)}${close}`);
  }
  for (const e of doc.edges) {
    const op = ARROW_OP[e.data?.arrow ?? "end"] ?? "-->";
    const label = e.data?.label;
    out.push(`  ${e.source} ${label ? `${op}|${dquote(label)}|` : op} ${e.target}`);
  }
  return out.join("\n") + "\n";
}

/* ============ state diagram（stateDiagram-v2）============ */

function stateMermaid(doc: DmDocument): string {
  const raw = doc.meta.direction ?? "TD";
  const dir = raw === "TD" ? "TB" : raw; // state 用 TB，不认 TD
  const out = ["stateDiagram-v2", `  direction ${dir}`];
  for (const n of doc.nodes) {
    const label = oneLine(n.data.label);
    if (label && label !== n.id) out.push(`  ${n.id} : ${label}`);
  }
  for (const e of doc.edges) {
    const label = e.data?.label ? oneLine(e.data.label) : "";
    out.push(`  ${e.source} --> ${e.target}${label ? ` : ${label}` : ""}`);
  }
  return out.join("\n") + "\n";
}

/* ============ class diagram ============ */

function classMermaid(doc: DmDocument): string {
  const out = ["classDiagram"];
  for (const n of doc.nodes) {
    const display = firstLine(n.data.label).trim() || n.id;
    // class id["显示名"]，成员用单独的 `id : member` 行（避免花括号块的歧义）
    out.push(`  class ${n.id}["${escQuotes(display)}"]`);
    for (const m of restLines(n.data.label)) out.push(`  ${n.id} : ${m}`);
  }
  for (const e of doc.edges) {
    const op = (e.data?.arrow ?? "end") === "none" ? "--" : "-->"; // 默认关联
    const label = e.data?.label ? oneLine(e.data.label) : "";
    out.push(`  ${e.source} ${op} ${e.target}${label ? ` : ${label}` : ""}`);
  }
  return out.join("\n") + "\n";
}

/* ============ ER diagram ============ */

function erMermaid(doc: DmDocument): string {
  const out = ["erDiagram"];
  // 实体名用双引号包裹（mermaid ER 文档：双引号下支持 unicode/空格）—— 中文实体名安全。
  const name = new Map<string, string>();
  for (const n of doc.nodes) name.set(n.id, `"${escQuotes(firstLine(n.data.label).trim() || n.id)}"`);
  for (const n of doc.nodes) {
    const attrs = restLines(n.data.label);
    if (attrs.length === 0) continue; // 无属性实体经关系隐式声明
    out.push(`  ${name.get(n.id)} {`);
    for (const a of attrs) {
      const toks = a.split(/\s+/).filter(Boolean);
      const type = toks.length >= 2 ? ident(toks[0], "string") : "string";
      const field = toks.length >= 2 ? ident(toks.slice(1).join("_"), "field") : ident(a, "field");
      out.push(`    ${type} ${field}`);
    }
    out.push("  }");
  }
  for (const e of doc.edges) {
    const a = name.get(e.source) ?? `"${e.source}"`;
    const b = name.get(e.target) ?? `"${e.target}"`;
    const rel = e.data?.label ? ident(e.data.label, "rel") : "rel"; // ER 关系名用标识符
    out.push(`  ${a} ||--o{ ${b} : ${rel}`);
  }
  return out.join("\n") + "\n";
}

/* ============ sequence diagram ============ */

function sequenceMermaid(doc: DmDocument): string {
  const out = ["sequenceDiagram"];
  // 参与者按节点顺序声明（决定横向排列）
  for (const n of doc.nodes) out.push(`  participant ${n.id} as ${oneLine(n.data.label) || n.id}`);
  // 消息按连线（edges 数组）顺序，from→to
  for (const e of doc.edges) {
    const label = e.data?.label ? oneLine(e.data.label) : "";
    out.push(`  ${e.source}->>${e.target}: ${label}`);
  }
  return out.join("\n") + "\n";
}

/* ============ C4（架构上下文图）============ */

function c4Mermaid(doc: DmDocument): string {
  const out = ["C4Context"];
  if (doc.meta.title) out.push(`  title ${oneLine(doc.meta.title)}`);
  for (const n of doc.nodes) {
    const kind = n.kind === "actor" ? "Person" : "System"; // 用户形状→Person，其余→System
    out.push(`  ${kind}(${n.id}, "${escQuotes(oneLine(n.data.label) || n.id)}")`);
  }
  for (const e of doc.edges) out.push(`  Rel(${e.source}, ${e.target}, "${escQuotes(oneLine(e.data?.label))}")`);
  return out.join("\n") + "\n";
}

/* ============ mindmap（从节点+连线派生树）============ */

function mindmapMermaid(doc: DmDocument): string {
  const { nodes, edges } = doc;
  if (nodes.length === 0) return "mindmap\n";
  const children = new Map<string, string[]>();
  const indeg = new Map<string, number>();
  for (const n of nodes) {
    children.set(n.id, []);
    indeg.set(n.id, 0);
  }
  for (const e of edges) {
    if (children.has(e.source) && children.has(e.target)) {
      children.get(e.source)!.push(e.target);
      indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
    }
  }
  const labelOf = (id: string): string => oneLine(nodes.find((n) => n.id === id)?.data.label) || id;
  // 根 = 第一个入度 0 的节点，否则第一个节点
  const root = nodes.find((n) => (indeg.get(n.id) ?? 0) === 0) ?? nodes[0];
  const out = ["mindmap"];
  const visited = new Set<string>();
  const walk = (id: string, depth: number): void => {
    if (visited.has(id)) return; // 防环
    visited.add(id);
    const indent = "  ".repeat(depth + 1);
    out.push(depth === 0 ? `${indent}${id}((${labelOf(id)}))` : `${indent}${labelOf(id)}`);
    for (const c of children.get(id) ?? []) walk(c, depth + 1);
  };
  walk(root.id, 0);
  // 森林/不可达节点：挂到根下（mindmap 仅单根，保证不丢节点；有损）
  for (const n of nodes) if (!visited.has(n.id)) walk(n.id, 1);
  return out.join("\n") + "\n";
}

/* ============ 数据/时间家族（标题 + 行表 + 配置）============ */

const EMPTY_DATA: DataDiagram = { title: "", config: {}, rows: [] };
const dataOf = (doc: DmDocument, type: DataDiagramType): DataDiagram => doc.data?.[type] ?? EMPTY_DATA;

function num(s: string | undefined, dflt: number): number {
  const n = Number((s ?? "").trim());
  return Number.isFinite(n) ? n : dflt;
}
const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));
const cell = (r: Record<string, string>, k: string): string => oneLine(r[k] ?? "");

function pieMermaid(doc: DmDocument): string {
  const d = dataOf(doc, "pie");
  const out = [d.title ? `pie title ${oneLine(d.title)}` : "pie"];
  for (const r of d.rows) out.push(`    "${escQuotes(cell(r, "label"))}" : ${num(r.value, 0)}`);
  return out.join("\n") + "\n";
}

function ganttMermaid(doc: DmDocument): string {
  const d = dataOf(doc, "gantt");
  const out = ["gantt", `    title ${oneLine(d.title) || "Gantt"}`, `    dateFormat ${d.config.dateFormat || "YYYY-MM-DD"}`];
  let section = "";
  for (const r of d.rows) {
    const s = cell(r, "section");
    if (s && s !== section) {
      out.push(`    section ${s}`);
      section = s;
    }
    const task = cell(r, "task") || "Task";
    out.push(`    ${task} :${cell(r, "start") || "2024-01-01"}, ${cell(r, "duration") || "1d"}`);
  }
  return out.join("\n") + "\n";
}

function timelineMermaid(doc: DmDocument): string {
  const d = dataOf(doc, "timeline");
  const out = ["timeline"];
  if (d.title) out.push(`    title ${oneLine(d.title)}`);
  for (const r of d.rows) out.push(`    ${cell(r, "period")} : ${cell(r, "event")}`);
  return out.join("\n") + "\n";
}

function journeyMermaid(doc: DmDocument): string {
  const d = dataOf(doc, "journey");
  const out = ["journey"];
  if (d.title) out.push(`    title ${oneLine(d.title)}`);
  let section = "";
  for (const r of d.rows) {
    const s = cell(r, "section");
    if (s && s !== section) {
      out.push(`    section ${s}`);
      section = s;
    }
    out.push(`      ${cell(r, "task") || "Task"}: ${num(r.score, 3)}: ${cell(r, "actors") || "User"}`);
  }
  return out.join("\n") + "\n";
}

function quadrantMermaid(doc: DmDocument): string {
  const d = dataOf(doc, "quadrant");
  const c = d.config;
  const out = ["quadrantChart"];
  if (d.title) out.push(`    title ${oneLine(d.title)}`);
  out.push(`    x-axis ${oneLine(c.xLeft) || "Low"} --> ${oneLine(c.xRight) || "High"}`);
  out.push(`    y-axis ${oneLine(c.yBottom) || "Low"} --> ${oneLine(c.yTop) || "High"}`);
  for (const [k, q] of [["q1", c.q1], ["q2", c.q2], ["q3", c.q3], ["q4", c.q4]] as const) {
    if (q) out.push(`    quadrant-${k[1]} ${oneLine(q)}`);
  }
  for (const r of d.rows) {
    out.push(`    ${cell(r, "label") || "Point"}: [${clamp01(num(r.x, 0.5))}, ${clamp01(num(r.y, 0.5))}]`);
  }
  return out.join("\n") + "\n";
}

function xychartMermaid(doc: DmDocument): string {
  const d = dataOf(doc, "xychart");
  const out = ["xychart-beta"];
  if (d.title) out.push(`    title "${escQuotes(oneLine(d.title))}"`);
  if (d.rows.length) {
    out.push(`    x-axis [${d.rows.map((r) => `"${escQuotes(cell(r, "category"))}"`).join(", ")}]`);
    out.push(`    bar [${d.rows.map((r) => num(r.value, 0)).join(", ")}]`);
  }
  return out.join("\n") + "\n";
}

/* ============ 分发 ============ */

const SERIALIZERS: Record<DiagramType, (doc: DmDocument) => string> = {
  flowchart: flowchartMermaid,
  state: stateMermaid,
  class: classMermaid,
  er: erMermaid,
  sequence: sequenceMermaid,
  c4: c4Mermaid,
  mindmap: mindmapMermaid,
  pie: pieMermaid,
  gantt: ganttMermaid,
  timeline: timelineMermaid,
  journey: journeyMermaid,
  quadrant: quadrantMermaid,
  xychart: xychartMermaid,
};

/** 按 doc.meta.diagramType 导出 mermaid 文本（缺省 flowchart）。空图导出合法的图表头。 */
export function toMermaid(doc: DmDocument): string {
  const type = doc.meta.diagramType ?? "flowchart";
  return (SERIALIZERS[type] ?? flowchartMermaid)(doc);
}
