import { NodeResizeControl, type Node, type NodeProps } from "@xyflow/react";
import { resizeNode } from "../../core/operations";
import type { NodeData } from "../../core/types";
import "./subgraph.css";

/** 分组容器节点：虚线框 + 标题栏，渲染在子节点之下。右下角可 resize（左上角固定，子节点不跟着动）。 */
export function SubgraphNode({ id, data, selected }: NodeProps<Node<NodeData>>) {
  return (
    <div className="subgraph-node">
      <span className="subgraph-title">{data.label || "组"}</span>
      {selected && (
        <NodeResizeControl
          position="bottom-right"
          minWidth={80}
          minHeight={60}
          onResizeEnd={(_e, p) => resizeNode(id, { width: p.width, height: p.height })}
          style={{ background: "transparent", border: "none" }}
        >
          <span className="subgraph-resize" />
        </NodeResizeControl>
      )}
    </div>
  );
}
