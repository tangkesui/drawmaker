import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { NodeData } from "../../core/types";

const handleStyle = { width: 8, height: 8 };

export function RectNode({ data, selected }: NodeProps<Node<NodeData>>) {
  return (
    <div className={`dm-node dm-rect${selected ? " is-selected" : ""}`}>
      <Handle type="source" position={Position.Top} id="t" style={handleStyle} />
      <Handle type="source" position={Position.Right} id="r" style={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="b" style={handleStyle} />
      <Handle type="source" position={Position.Left} id="l" style={handleStyle} />
      <span className="dm-label">{data.label || "Rect"}</span>
    </div>
  );
}
