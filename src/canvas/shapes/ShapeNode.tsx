import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { renameNode } from "../../core/operations";
import type { NodeData } from "../../core/types";
import { getShape } from "./registry";
import "./shapes.css";

const handleStyle = { width: 8, height: 8 };

/** 通用节点：形状几何来自注册表（props.type 决定），label 双击可编辑。 */
export function ShapeNode({ id, type, data, selected }: NodeProps<Node<NodeData>>) {
  const def = getShape(type ?? "rect");
  const { width: w, height: h } = def.defaultSize;

  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText(data.label);
  }, [data.label]);
  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (text !== data.label) renameNode(id, text);
  };

  // 逐节点样式覆盖：只写存在的字段，缺省回落 .shape-geom（CSS）。
  const geomStyle: CSSProperties = {};
  if (data.fill) geomStyle.fill = data.fill;
  if (data.stroke) geomStyle.stroke = data.stroke;
  if (data.strokeWidth != null) geomStyle.strokeWidth = data.strokeWidth;

  return (
    <div
      className={`shape-node${selected ? " is-selected" : ""}`}
      style={{ width: w, height: h }}
      onDoubleClick={() => setEditing(true)}
    >
      <svg className="shape-geom" width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={geomStyle}>
        {def.render(w, h)}
      </svg>

      <Handle type="source" position={Position.Top} id="t" style={handleStyle} />
      <Handle type="source" position={Position.Right} id="r" style={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="b" style={handleStyle} />
      <Handle type="source" position={Position.Left} id="l" style={handleStyle} />

      {editing ? (
        <input
          ref={inputRef}
          className="shape-label-input nodrag"
          style={data.fontSize ? { fontSize: data.fontSize } : undefined}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setText(data.label);
              setEditing(false);
            }
          }}
        />
      ) : (
        <span className="shape-label" style={data.fontSize ? { fontSize: data.fontSize } : undefined}>
          {data.label || def.label}
        </span>
      )}
    </div>
  );
}
