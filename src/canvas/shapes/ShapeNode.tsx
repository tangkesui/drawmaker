import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Handle, NodeResizer, Position, type Node, type NodeProps } from "@xyflow/react";
import { renameNode, resizeNode } from "../../core/operations";
import type { NodeData } from "../../core/types";
import { getShape } from "./registry";
import "./shapes.css";

const handleStyle = { width: 8, height: 8 };

/** 通用节点：形状几何来自注册表（props.type 决定），尺寸来自 props（可 resize），label 双击可编辑。 */
export function ShapeNode({ id, type, data, selected, width, height }: NodeProps<Node<NodeData>>) {
  const def = getShape(type ?? "rect");
  const w = typeof width === "number" ? width : def.defaultSize.width;
  const h = typeof height === "number" ? height : def.defaultSize.height;

  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(data.label);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
      style={{ width: "100%", height: "100%" }}
      onDoubleClick={() => setEditing(true)}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={40}
        minHeight={32}
        lineStyle={{ borderColor: "#2f6fed" }}
        handleStyle={{
          width: 8,
          height: 8,
          borderRadius: 2,
          background: "#2f6fed",
          border: "1px solid #ffffff",
        }}
        onResizeEnd={(_e, p) => resizeNode(id, { width: p.width, height: p.height })}
      />
      <svg className="shape-geom" width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} style={geomStyle}>
        {def.render(w, h)}
      </svg>

      <Handle type="source" position={Position.Top} id="t" style={handleStyle} />
      <Handle type="source" position={Position.Right} id="r" style={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="b" style={handleStyle} />
      <Handle type="source" position={Position.Left} id="l" style={handleStyle} />

      {editing ? (
        <textarea
          ref={inputRef}
          className="shape-label-input nodrag"
          style={data.fontSize ? { fontSize: data.fontSize } : undefined}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            e.stopPropagation();
            // Enter 换行（textarea 默认行为）；Cmd/Ctrl+Enter 提交，Esc 取消。
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              commit();
            }
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
