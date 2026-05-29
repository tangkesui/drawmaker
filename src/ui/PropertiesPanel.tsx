import { updateNodeStyle } from "../core/operations";
import { useEditorStore } from "../core/store";
import type { NodeData } from "../core/types";
import "./properties-panel.css";

export function PropertiesPanel() {
  const selected = useEditorStore((s) => s.view.selected);
  const nodes = useEditorStore((s) => s.doc.nodes);
  const sel = nodes.filter((n) => selected.includes(n.id));

  if (sel.length === 0) {
    return <aside className="props-panel props-empty">未选中节点</aside>;
  }

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
