import { useEffect, useState } from "react";
import { addDataRow, deleteDataRow, setDataCell, setDataConfig, setDataTitle } from "../core/operations";
import { useEditorStore } from "../core/store";
import type { DataDiagramType } from "../core/types";
import "./data-editor.css";

interface Col {
  key: string;
  label: string;
  placeholder?: string;
}
interface Schema {
  label: string;
  hint: string;
  config: Col[];
  columns: Col[];
}

const SCHEMAS: Record<DataDiagramType, Schema> = {
  pie: {
    label: "饼图 Pie",
    hint: "每行一个扇区：标签 + 数值。",
    config: [],
    columns: [
      { key: "label", label: "标签", placeholder: "分类" },
      { key: "value", label: "数值", placeholder: "数字" },
    ],
  },
  gantt: {
    label: "甘特图 Gantt",
    hint: "同名「分组」自动归组；工期如 3d / 2w；缺省日期格式 YYYY-MM-DD。",
    config: [{ key: "dateFormat", label: "日期格式", placeholder: "YYYY-MM-DD" }],
    columns: [
      { key: "section", label: "分组", placeholder: "阶段" },
      { key: "task", label: "任务", placeholder: "任务名" },
      { key: "start", label: "开始", placeholder: "2024-01-01" },
      { key: "duration", label: "工期", placeholder: "3d" },
    ],
  },
  timeline: {
    label: "时间线 Timeline",
    hint: "每行：时间点 + 事件。",
    config: [],
    columns: [
      { key: "period", label: "时间", placeholder: "2024" },
      { key: "event", label: "事件", placeholder: "发生了什么" },
    ],
  },
  journey: {
    label: "用户旅程 Journey",
    hint: "评分 1-5；同名「分组」自动归组；参与者逗号分隔。",
    config: [],
    columns: [
      { key: "section", label: "分组", placeholder: "阶段" },
      { key: "task", label: "步骤", placeholder: "动作" },
      { key: "score", label: "评分", placeholder: "1-5" },
      { key: "actors", label: "参与者", placeholder: "我, 同事" },
    ],
  },
  quadrant: {
    label: "四象限 Quadrant",
    hint: "点坐标 0~1；象限 1=右上，2=左上，3=左下，4=右下；标签可留空。",
    config: [
      { key: "xLeft", label: "X 轴左", placeholder: "低" },
      { key: "xRight", label: "X 轴右", placeholder: "高" },
      { key: "yBottom", label: "Y 轴下", placeholder: "低" },
      { key: "yTop", label: "Y 轴上", placeholder: "高" },
      { key: "q1", label: "象限①右上", placeholder: "" },
      { key: "q2", label: "象限②左上", placeholder: "" },
      { key: "q3", label: "象限③左下", placeholder: "" },
      { key: "q4", label: "象限④右下", placeholder: "" },
    ],
    columns: [
      { key: "label", label: "点", placeholder: "名称" },
      { key: "x", label: "X(0-1)", placeholder: "0.5" },
      { key: "y", label: "Y(0-1)", placeholder: "0.5" },
    ],
  },
  xychart: {
    label: "XY 图表 XYChart",
    hint: "每行：类别 + 数值（柱状图）。",
    config: [],
    columns: [
      { key: "category", label: "类别", placeholder: "一月" },
      { key: "value", label: "数值", placeholder: "数字" },
    ],
  },
};

/** 受控字段：本地编辑，失焦时若有变化才提交（避免每键一条 history）；外部值变化（undo/redo）回灌。 */
function Field({
  value,
  onCommit,
  placeholder,
}: {
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <input
      className="de-input"
      value={v}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        if (v !== value) onCommit(v);
      }}
    />
  );
}

/** 数据/时间家族图表编辑器：标题 + 配置 + 行表，替代画布。零代码产出 mermaid。 */
export function DataEditor({ type }: { type: DataDiagramType }) {
  const data = useEditorStore((s) => s.doc.data?.[type]);
  const schema = SCHEMAS[type];
  const config = data?.config ?? {};
  const rows = data?.rows ?? [];

  return (
    <div className="data-editor">
      <div className="data-editor-inner">
        <h2 className="de-title">{schema.label}</h2>

        <label className="de-field">
          <span>标题</span>
          <Field value={data?.title ?? ""} placeholder="图表标题" onCommit={(val) => setDataTitle(type, val)} />
        </label>

        {schema.config.map((f) => (
          <label className="de-field" key={f.key}>
            <span>{f.label}</span>
            <Field
              value={config[f.key] ?? ""}
              placeholder={f.placeholder}
              onCommit={(val) => setDataConfig(type, f.key, val)}
            />
          </label>
        ))}

        <table className="de-table">
          <thead>
            <tr>
              {schema.columns.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
              <th aria-label="操作" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {schema.columns.map((c) => (
                  <td key={c.key}>
                    <Field
                      value={row[c.key] ?? ""}
                      placeholder={c.placeholder}
                      onCommit={(val) => setDataCell(type, i, c.key, val)}
                    />
                  </td>
                ))}
                <td>
                  <button className="de-del" title="删除行" onClick={() => deleteDataRow(type, i)}>
                    ×
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="de-empty" colSpan={schema.columns.length + 1}>
                  还没有数据，点下面「添加行」开始。
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <button className="de-add" onClick={() => addDataRow(type)}>
          + 添加行
        </button>
        <p className="de-hint">{schema.hint}右侧面板实时显示 mermaid，可一键复制/导出。</p>
      </div>
    </div>
  );
}
