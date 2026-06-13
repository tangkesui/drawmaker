import type { Node, NodeProps } from "@xyflow/react";
import type { NodeData } from "../../core/types";
import "./subgraph.css";

/** 分组容器节点：带虚线框 + 标题栏，渲染在子节点之下（父排子前 ⇒ 低 z）。 */
export function SubgraphNode({ data }: NodeProps<Node<NodeData>>) {
  return (
    <div className="subgraph-node">
      <span className="subgraph-title">{data.label || "组"}</span>
    </div>
  );
}
