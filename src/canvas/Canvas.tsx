import { useCallback, useEffect, useState } from "react";
import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useEditorStore } from "../core/store";
import { addNode, connectNodes, deleteEdges, deleteNodes, moveNodes } from "../core/operations";
import type { DmEdge, DmNode, NodeData } from "../core/types";
import { registerPlacement } from "./placement";
import { allShapes } from "./shapes/registry";
import { ShapeNode } from "./shapes/ShapeNode";
import { registerViewportControls } from "./viewport-controls";

type FlowNode = Node<NodeData>;
type FlowEdge = Edge;

// 所有形状共用通用 ShapeNode；具体形状由节点 type（=kind）在 ShapeNode 内查注册表决定。
const nodeTypes = Object.fromEntries(allShapes().map((s) => [s.kind, ShapeNode]));

function toFlowNode(n: DmNode, selected: boolean): FlowNode {
  return { id: n.id, type: n.kind, position: n.position, data: n.data, selected };
}

function toFlowEdge(e: DmEdge): FlowEdge {
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? undefined,
    targetHandle: e.targetHandle ?? undefined,
  };
}

function CanvasInner() {
  const docNodes = useEditorStore((s) => s.doc.nodes);
  const docEdges = useEditorStore((s) => s.doc.edges);
  const rf = useReactFlow();
  const { screenToFlowPosition } = rf;

  // 把缩放/fit 注册到 viewport 控制桥，供原生菜单调用
  useEffect(() => {
    registerViewportControls({
      zoomIn: () => void rf.zoomIn(),
      zoomOut: () => void rf.zoomOut(),
      resetZoom: () => void rf.zoomTo(1),
      fitView: () => void rf.fitView(),
    });
  }, [rf]);

  // 注册「按屏幕坐标放置形状」，供调色板 pointer 拖放松手时调用
  useEffect(() => {
    registerPlacement((kind, clientX, clientY) => {
      const pos = screenToFlowPosition({ x: clientX, y: clientY });
      addNode(kind, pos);
    });
  }, [screenToFlowPosition]);

  // 本地渲染态。store(doc) 是 SSOT，单向同步到这里；本地态只承载拖拽中的瞬态变化。
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);

  // store → 本地。doc 变化时重建；selection 从 view.selected 取，避免重建丢选区。
  useEffect(() => {
    const sel = new Set(useEditorStore.getState().view.selected);
    setNodes(docNodes.map((n) => toFlowNode(n, sel.has(n.id))));
  }, [docNodes]);

  useEffect(() => {
    setEdges(docEdges.map(toFlowEdge));
  }, [docEdges]);

  // onNodesChange / onEdgesChange 只更新本地瞬态（拖拽、选区高亮），不入 history。
  const onNodesChange = useCallback((changes: NodeChange<FlowNode>[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange<FlowEdge>[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  // 以下手势回调只在用户操作时触发，程序化改 nodes prop（undo/redo）不会触发它们 —— 故无重入。
  const onNodeDragStop = useCallback((_e: React.MouseEvent, _n: FlowNode, dragged: FlowNode[]) => {
    moveNodes(dragged.map((n) => ({ id: n.id, position: n.position })));
  }, []);

  const onNodesDelete = useCallback((deleted: FlowNode[]) => {
    deleteNodes(deleted.map((n) => n.id));
  }, []);

  const onEdgesDelete = useCallback((deleted: FlowEdge[]) => {
    deleteEdges(deleted.map((e) => e.id));
  }, []);

  const onConnect = useCallback((c: Connection) => {
    if (c.source && c.target) {
      connectNodes(c.source, c.target, c.sourceHandle, c.targetHandle);
    }
  }, []);

  const onSelectionChange = useCallback((p: OnSelectionChangeParams) => {
    const selected = p.nodes.map((n) => n.id);
    useEditorStore.setState((s) => ({ view: { ...s.view, selected } }));
  }, []);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      connectionMode={ConnectionMode.Loose}
      deleteKeyCode={["Backspace", "Delete"]}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeDragStop={onNodeDragStop}
      onNodesDelete={onNodesDelete}
      onEdgesDelete={onEdgesDelete}
      onConnect={onConnect}
      onSelectionChange={onSelectionChange}
      fitView
      proOptions={{ hideAttribution: true }}
    >
      <Background />
      <Controls />
      <MiniMap pannable zoomable />
    </ReactFlow>
  );
}

export function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
