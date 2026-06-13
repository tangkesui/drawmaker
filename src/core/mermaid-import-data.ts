import type { DataDiagram } from "./types";

/**
 * 数据/时间家族 mermaid 解析结果 → DataDiagram（标题 + 配置 + 行表），纯映射可测。
 * DOM 解析在 services/mermaidParse；本文件只做无副作用的结构转换。
 * quadrant/xychart 暂不导入（getQuadrantData 返回已处理渲染数据、xychart-beta 解析不稳）。
 */

export interface RawPie {
  title?: string;
  sections: Record<string, number>;
}
export function pieToData(raw: RawPie): DataDiagram {
  return {
    title: raw.title ?? "",
    config: {},
    rows: Object.entries(raw.sections).map(([label, value]) => ({ label, value: String(value) })),
  };
}

export interface RawGanttTask {
  section?: string;
  task?: string;
  raw?: { startTime?: { startData?: string }; endTime?: { data?: string } };
}
export interface RawGantt {
  title?: string;
  dateFormat?: string;
  tasks: RawGanttTask[];
}
export function ganttToData(raw: RawGantt): DataDiagram {
  return {
    title: raw.title ?? "",
    config: raw.dateFormat ? { dateFormat: raw.dateFormat } : {},
    rows: raw.tasks.map((t) => ({
      section: t.section ?? "",
      task: (t.task ?? "").trim(),
      start: t.raw?.startTime?.startData ?? "",
      duration: t.raw?.endTime?.data ?? "",
    })),
  };
}

export interface RawTimeline {
  title?: string;
  tasks: { task?: string; events?: string[] }[];
}
export function timelineToData(raw: RawTimeline): DataDiagram {
  return {
    title: raw.title ?? "",
    config: {},
    rows: raw.tasks.map((t) => ({ period: (t.task ?? "").trim(), event: (t.events ?? []).join(" / ") })),
  };
}

export interface RawJourney {
  title?: string;
  tasks: { section?: string; task?: string; score?: number; people?: string[] }[];
}
export function journeyToData(raw: RawJourney): DataDiagram {
  return {
    title: raw.title ?? "",
    config: {},
    rows: raw.tasks.map((t) => ({
      section: t.section ?? "",
      task: t.task ?? "",
      score: t.score != null ? String(t.score) : "",
      actors: (t.people ?? []).join(", "),
    })),
  };
}
