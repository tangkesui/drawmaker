import { useEffect, useMemo, useState } from "react";
import { toMermaid } from "../core/mermaid";
import { setDiagramType, setDirection } from "../core/operations";
import { useEditorStore } from "../core/store";
import type { DiagramType, FlowDirection } from "../core/types";
import { copyMermaid } from "../services/exportService";
import { importMermaidFromText } from "../services/importMermaid";
import { showInfo } from "../services/notify";
import "./mermaid-panel.css";

const DIAGRAM_GROUPS: { group: string; items: { value: DiagramType; label: string }[] }[] = [
  {
    group: "图（节点+连线）",
    items: [
      { value: "flowchart", label: "流程图 Flowchart" },
      { value: "sequence", label: "时序图 Sequence" },
      { value: "state", label: "状态图 State" },
      { value: "class", label: "类图 Class" },
      { value: "er", label: "ER 图" },
      { value: "c4", label: "C4 架构图" },
      { value: "mindmap", label: "思维导图 Mindmap" },
    ],
  },
  {
    group: "数据 / 时间",
    items: [
      { value: "pie", label: "饼图 Pie" },
      { value: "gantt", label: "甘特图 Gantt" },
      { value: "timeline", label: "时间线 Timeline" },
      { value: "journey", label: "用户旅程 Journey" },
      { value: "quadrant", label: "四象限 Quadrant" },
      { value: "xychart", label: "XY 图表 XYChart" },
    ],
  },
];

const DIRECTIONS: { value: FlowDirection; label: string }[] = [
  { value: "TD", label: "↓ 纵向 TD" },
  { value: "LR", label: "→ 横向 LR" },
  { value: "RL", label: "← 横向 RL" },
  { value: "BT", label: "↑ 纵向 BT" },
];

/** 当前支持「文本 → 画布」回写的类型（解析器逐步扩展）。 */
const EDITABLE_TYPES: DiagramType[] = ["flowchart", "state", "class", "er", "sequence"];

/**
 * 右侧 mermaid 面板：画布→文本实时预览；文本→画布可编辑 + 「应用」（双向）。
 * 草稿与画布生成文本同步：未手改时实时镜像；手改后保留草稿、点应用解析回画布。
 */
export function MermaidPanel() {
  const doc = useEditorStore((s) => s.doc);
  const generated = useMemo(() => toMermaid(doc), [doc]);
  const type = doc.meta.diagramType ?? "flowchart";
  const dir = doc.meta.direction ?? "TD";
  const showDirection = type === "flowchart" || type === "state";
  const editable = EDITABLE_TYPES.includes(type);

  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [draft, setDraft] = useState(generated);
  const [dirty, setDirty] = useState(false);
  const [applying, setApplying] = useState(false);

  // 画布(generated)变化：用户没手改草稿时，实时镜像到文本框。
  useEffect(() => {
    if (!dirty) setDraft(generated);
  }, [generated, dirty]);

  const onCopy = () => {
    copyMermaid()
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      })
      .catch(() => {});
  };

  const onApply = async () => {
    setApplying(true);
    const r = await importMermaidFromText(draft);
    setApplying(false);
    if (r.ok) setDirty(false); // doc 会变→generated 变→useEffect 同步草稿
    else await showInfo(r.msg ?? "应用失败");
  };

  if (collapsed) {
    return (
      <aside className="mermaid-panel collapsed" onClick={() => setCollapsed(false)} title="展开 Mermaid">
        <span className="mermaid-tab-label">Mermaid</span>
      </aside>
    );
  }

  return (
    <aside className="mermaid-panel">
      <div className="mermaid-head">
        <span className="mermaid-title">Mermaid</span>
        <div className="mermaid-actions">
          <button onClick={onCopy}>{copied ? "已复制" : "复制"}</button>
          <button onClick={() => setCollapsed(true)} title="折叠">
            ›
          </button>
        </div>
      </div>

      <div className="mermaid-sub">
        <label>
          类型
          <select value={type} onChange={(e) => setDiagramType(e.target.value as DiagramType)}>
            {DIAGRAM_GROUPS.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.items.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        {showDirection && (
          <label>
            方向
            <select value={dir} onChange={(e) => setDirection(e.target.value as FlowDirection)}>
              {DIRECTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {editable ? (
        <>
          <textarea
            className="mermaid-code mermaid-edit"
            spellCheck={false}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setDirty(e.target.value !== generated);
            }}
          />
          <div className="mermaid-foot">
            <span className="mermaid-dirty">{dirty ? "● 已改，未应用" : "已同步"}</span>
            <button className="mermaid-apply" disabled={!dirty || applying} onClick={onApply}>
              {applying ? "应用中…" : "应用到画布"}
            </button>
          </div>
        </>
      ) : (
        <pre className="mermaid-code">{generated}</pre>
      )}
    </aside>
  );
}
