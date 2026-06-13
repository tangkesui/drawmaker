import { useMemo } from "react";
import { updateEdgeStyle, updateNodeStyle } from "../core/operations";
import { useEditorStore } from "../core/store";
import type { DmEdge, DmNode, EdgeArrow, EdgeStyle, NodeData } from "../core/types";
import "./properties-panel.css";

const ARROW_OPTIONS: { value: EdgeArrow; label: string }[] = [
  { value: "end", label: "终点 →" },
  { value: "start", label: "起点 ←" },
  { value: "both", label: "双向 ↔" },
  { value: "none", label: "无" },
];

const STYLE_OPTIONS: { value: EdgeStyle; label: string }[] = [
  { value: "solid", label: "实线" },
  { value: "dashed", label: "虚线" },
  { value: "thick", label: "粗线" },
];

export function PropertiesPanel() {
  const selected = useEditorStore((s) => s.view.selected);
  const selectedEdges = useEditorStore((s) => s.view.selectedEdges);
  const nodes = useEditorStore((s) => s.doc.nodes);
  const edges = useEditorStore((s) => s.doc.edges);

  const sel = useMemo(() => {
    const ids = new Set(selected);
    return nodes.filter((n) => ids.has(n.id));
  }, [nodes, selected]);

  const selEdges = useMemo(() => {
    const ids = new Set(selectedEdges);
    return edges.filter((e) => ids.has(e.id));
  }, [edges, selectedEdges]);

  // 节点优先：同时选中节点和边时显示节点面板。
  if (sel.length > 0) return <NodePanel sel={sel} selected={selected} />;
  if (selEdges.length > 0) return <EdgePanel selEdges={selEdges} ids={selectedEdges} />;
  return <aside className="props-panel props-empty">未选中</aside>;
}

function NodePanel({ sel, selected }: { sel: DmNode[]; selected: string[] }) {
  // 选中节点在该字段上的共同值；不一致返回 undefined。
  const common = <K extends keyof NodeData>(k: K): NodeData[K] | undefined => {
    const first = sel[0].data[k];
    return sel.every((n) => n.data[k] === first) ? first : undefined;
  };

  const apply = (patch: Partial<NodeData>) => updateNodeStyle(selected, patch);

  const dLabel = common("label") ?? "";
  const dFill = common("fill") ?? "#ffffff";
  const dStroke = common("stroke") ?? "#5b6b7b";
  const dWidth = common("strokeWidth") ?? 1.5;
  const dFont = common("fontSize") ?? 13;

  // key=选区：选区变化时重挂，让 defaultValue 刷新到新选中节点的值。
  return (
    <aside className="props-panel" key={selected.join(",")}>
      <div className="props-title">{sel.length === 1 ? "节点属性" : `${sel.length} 个节点`}</div>

      <label className="props-row">
        <span>标签</span>
        <input
          type="text"
          defaultValue={dLabel}
          onBlur={(e) => {
            if (e.target.value !== dLabel) apply({ label: e.target.value });
          }}
        />
      </label>

      <label className="props-row">
        <span>填充</span>
        <input type="color" defaultValue={dFill} onChange={(e) => apply({ fill: e.target.value })} />
      </label>

      <label className="props-row">
        <span>描边</span>
        <input type="color" defaultValue={dStroke} onChange={(e) => apply({ stroke: e.target.value })} />
      </label>

      <label className="props-row">
        <span>线宽</span>
        <input
          type="number"
          min={0.5}
          step={0.5}
          defaultValue={dWidth}
          onBlur={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v) && v !== dWidth) apply({ strokeWidth: v });
          }}
        />
      </label>

      <label className="props-row">
        <span>字号</span>
        <input
          type="number"
          min={8}
          step={1}
          defaultValue={dFont}
          onBlur={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v) && v !== dFont) apply({ fontSize: v });
          }}
        />
      </label>
    </aside>
  );
}

function EdgePanel({ selEdges, ids }: { selEdges: DmEdge[]; ids: string[] }) {
  // 缺省 arrow="end" / style="solid"；选区内不一致时下拉显示「多种」占位。
  const arrows = selEdges.map((e) => e.data?.arrow ?? "end");
  const commonArrow = arrows.every((a) => a === arrows[0]) ? arrows[0] : "";
  const styles = selEdges.map((e) => e.data?.style ?? "solid");
  const commonStyle = styles.every((s) => s === styles[0]) ? styles[0] : "";

  return (
    <aside className="props-panel">
      <div className="props-title">{selEdges.length === 1 ? "连线属性" : `${selEdges.length} 条连线`}</div>

      <label className="props-row">
        <span>箭头</span>
        <select value={commonArrow} onChange={(e) => updateEdgeStyle(ids, { arrow: e.target.value as EdgeArrow })}>
          {commonArrow === "" && (
            <option value="" disabled>
              多种
            </option>
          )}
          {ARROW_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="props-row">
        <span>线型</span>
        <select value={commonStyle} onChange={(e) => updateEdgeStyle(ids, { style: e.target.value as EdgeStyle })}>
          {commonStyle === "" && (
            <option value="" disabled>
              多种
            </option>
          )}
          {STYLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    </aside>
  );
}
