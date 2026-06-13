import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  ConnectionMode,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useStore,
  type Connection,
  type Edge,
  type EdgeChange,
  type EdgeMarker,
  type Node,
  type NodeChange,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useEditorStore } from "../core/store";
import {
  addNode,
  altDragDuplicate,
  connectNodes,
  deleteEdges,
  deleteNodes,
  duplicateSelection,
  moveNodes,
  reconnectEdge,
} from "../core/operations";
import type { DmEdge, DmNode, NodeData } from "../core/types";
import { LabeledEdge, type LabeledEdgeData } from "./edges/LabeledEdge";
import { getHelperLines, type HelperLines } from "./helper-lines";
import "./context-menu.css";

type ContextMenuState = { x: number; y: number; kind: "node" } | { x: number; y: number; kind: "edge"; edgeId: string };
import { registerExportSource } from "./export";
import { registerPlacement } from "./placement";
import { allShapes, getShape } from "./shapes/registry";
import { ShapeNode } from "./shapes/ShapeNode";
import { registerViewportControls } from "./viewport-controls";

type FlowNode = Node<NodeData>;
type FlowEdge = Edge<LabeledEdgeData>;

// 所有形状共用通用 ShapeNode；具体形状由节点 type（=kind）在 ShapeNode 内查注册表决定。
const nodeTypes = Object.fromEntries(allShapes().map((s) => [s.kind, ShapeNode]));
const edgeTypes = { labeled: LabeledEdge };

function toFlowNode(n: DmNode, selected: boolean): FlowNode {
  const size = n.size ?? getShape(n.kind).defaultSize;
  // 尺寸走 style.width/height（v12 里 NodeResizer 靠它才能拿到尺寸渲染手柄），
  // 不用顶层 width/height。
  return {
    id: n.id,
    type: n.kind,
    position: n.position,
    data: n.data,
    selected,
    style: { width: size.width, height: size.height },
  };
}

const EDGE_COLOR = "#5b6b7b";
const ARROW_MARKER: EdgeMarker = { type: MarkerType.ArrowClosed, width: 18, height: 18, color: EDGE_COLOR };

function toFlowEdge(
  e: DmEdge,
  editing: boolean,
  selected: boolean,
  setEdgeEditing: (id: string, editing: boolean) => void,
): FlowEdge {
  // arrow 缺省 = "end"（默认 A→B 终点箭头）；"none" 才无箭头。
  const arrow = e.data?.arrow ?? "end";
  // 线型只设 dasharray/strokeWidth（不设 stroke），让 edges.css 的选中蓝仍生效。
  const style = e.data?.style ?? "solid";
  const edgeStyle: React.CSSProperties = {};
  if (style === "dashed") edgeStyle.strokeDasharray = "6 4";
  if (style === "thick") edgeStyle.strokeWidth = 3;
  return {
    id: e.id,
    type: "labeled",
    // 边 wrapper 默认没有 nopan（节点有），不挂的话双击边改字会同时触发 d3 dblclick 缩放
    className: "nopan",
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? undefined,
    targetHandle: e.targetHandle ?? undefined,
    selected,
    style: edgeStyle,
    // 描边色/选中蓝走 edges.css（让 xyflow 自加的 .selected class 实时生效，不靠重建）；
    // 这里只挂 marker（marker 必须在 edge 对象上声明，xyflow 才会生成 def）。
    markerEnd: arrow === "end" || arrow === "both" ? ARROW_MARKER : undefined,
    markerStart: arrow === "start" || arrow === "both" ? ARROW_MARKER : undefined,
    data: {
      label: e.data?.label ?? "",
      editing,
      onEditingChange: (on: boolean) => setEdgeEditing(e.id, on),
    },
  };
}

function CanvasInner() {
  const docNodes = useEditorStore((s) => s.doc.nodes);
  const docEdges = useEditorStore((s) => s.doc.edges);
  const viewSelected = useEditorStore((s) => s.view.selected);
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

  // 注册导出用的 getNodes（带 measured 尺寸），供菜单 Export 调用
  useEffect(() => {
    registerExportSource(() => rf.getNodes());
  }, [rf]);

  // 本地渲染态。store(doc) 是 SSOT，单向同步到这里；本地态只承载拖拽中的瞬态变化。
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);

  // 正在改字的边 id（view 瞬态，不入 history）。双击进入，提交/取消退出。
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const setEdgeEditing = useCallback((id: string, editing: boolean) => {
    setEditingEdgeId((cur) => (editing ? id : cur === id ? null : cur));
  }, []);

  // 拖动对齐参考线（view 瞬态）。
  const [helperLines, setHelperLines] = useState<HelperLines>({});

  // 右键上下文菜单（view 瞬态）。
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const closeMenu = useCallback(() => setContextMenu(null), []);

  // store → 本地。doc 变化时重建；selection 从 view.selected 取，避免重建丢选区。
  useEffect(() => {
    const sel = new Set(useEditorStore.getState().view.selected);
    setNodes(docNodes.map((n) => toFlowNode(n, sel.has(n.id))));
  }, [docNodes]);

  useEffect(() => {
    // 选区从 view.selectedEdges 读，避免重建（editingEdgeId 变化）时丢高亮。
    const selEdges = new Set(useEditorStore.getState().view.selectedEdges);
    setEdges(docEdges.map((e) => toFlowEdge(e, e.id === editingEdgeId, selEdges.has(e.id), setEdgeEditing)));
  }, [docEdges, editingEdgeId, setEdgeEditing]);

  // 程序化选区（selectAll / 粘贴后选中）：view.selected → 本地节点 selected。
  // 仅在与当前不一致时更新，避免与 onSelectionChange 形成回环。
  useEffect(() => {
    const set = new Set(viewSelected);
    setNodes((nds) => {
      let changed = false;
      const next = nds.map((n) => {
        const sel = set.has(n.id);
        if (Boolean(n.selected) !== sel) {
          changed = true;
          return { ...n, selected: sel };
        }
        return n;
      });
      return changed ? next : nds;
    });
  }, [viewSelected]);

  // onNodesChange / onEdgesChange 只更新本地瞬态（拖拽、选区高亮），不入 history。
  // 单节点拖动时算对齐参考线并吸附（改写该 change 的目标位置）。
  const onNodesChange = useCallback(
    (changes: NodeChange<FlowNode>[]) => {
      const c = changes[0];
      if (changes.length === 1 && c.type === "position" && c.dragging && c.position) {
        const lines = getHelperLines(c, nodes);
        if (lines.snapX !== undefined) c.position.x = lines.snapX;
        if (lines.snapY !== undefined) c.position.y = lines.snapY;
        setHelperLines({ horizontal: lines.horizontal, vertical: lines.vertical });
      } else if (helperLines.horizontal !== undefined || helperLines.vertical !== undefined) {
        setHelperLines({});
      }
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [nodes, helperLines],
  );

  const onEdgesChange = useCallback((changes: EdgeChange<FlowEdge>[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  // Alt 拖拽复制：记下拖拽起点是否按住 Alt。
  const altDragRef = useRef(false);
  const onNodeDragStart = useCallback((e: React.MouseEvent) => {
    altDragRef.current = e.altKey;
  }, []);

  // 以下手势回调只在用户操作时触发，程序化改 nodes prop（undo/redo）不会触发它们 —— 故无重入。
  const onNodeDragStop = useCallback((_e: React.MouseEvent, _n: FlowNode, dragged: FlowNode[]) => {
    setHelperLines({});
    const ends = dragged.map((n) => ({ id: n.id, position: n.position }));
    if (altDragRef.current) altDragDuplicate(ends);
    else moveNodes(ends);
    altDragRef.current = false;
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

  // 重连：拖边端点到新连接桩。提供 onReconnect 即启用端点锚点（edgesReconnectable 默认 true）。
  const onReconnect = useCallback((oldEdge: FlowEdge, c: Connection) => {
    reconnectEdge(oldEdge.id, c);
  }, []);

  const onSelectionChange = useCallback((p: OnSelectionChangeParams) => {
    const selected = p.nodes.map((n) => n.id);
    const selectedEdges = p.edges.map((e) => e.id);
    useEditorStore.setState((s) => ({ view: { ...s.view, selected, selectedEdges } }));
  }, []);

  const onEdgeDoubleClick = useCallback(
    (_e: React.MouseEvent, edge: FlowEdge) => setEdgeEditing(edge.id, true),
    [setEdgeEditing],
  );

  // 双击空白画布建节点（Excalidraw/tldraw 手感）。只在 pane 上触发，不影响双击节点/边改字。
  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!(e.target as HTMLElement).classList.contains("react-flow__pane")) return;
      addNode("rect", screenToFlowPosition({ x: e.clientX, y: e.clientY }));
    },
    [screenToFlowPosition],
  );

  // 右键节点：若不在选区则先选中它，再弹菜单（再制/删除作用于选区）。
  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: FlowNode) => {
    e.preventDefault();
    const { selected } = useEditorStore.getState().view;
    if (!selected.includes(node.id)) {
      useEditorStore.setState((s) => ({ view: { ...s.view, selected: [node.id], selectedEdges: [] } }));
    }
    setContextMenu({ x: e.clientX, y: e.clientY, kind: "node" });
  }, []);

  const onEdgeContextMenu = useCallback((e: React.MouseEvent, edge: FlowEdge) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, kind: "edge", edgeId: edge.id });
  }, []);

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        deleteKeyCode={["Backspace", "Delete"]}
        // 双击改用于建节点，关掉默认的双击缩放
        zoomOnDoubleClick={false}
        onDoubleClick={onDoubleClick}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onConnect={onConnect}
        onReconnect={onReconnect}
        onSelectionChange={onSelectionChange}
        onEdgeDoubleClick={onEdgeDoubleClick}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
        <MiniMap pannable zoomable />
        <HelperLinesOverlay lines={helperLines} />
      </ReactFlow>

      {contextMenu && (
        <>
          <div
            className="ctx-backdrop"
            onClick={closeMenu}
            onContextMenu={(e) => {
              e.preventDefault();
              closeMenu();
            }}
          />
          <div className="ctx-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
            {contextMenu.kind === "node" ? (
              <>
                <button
                  onClick={() => {
                    duplicateSelection();
                    closeMenu();
                  }}
                >
                  再制
                </button>
                <button
                  className="danger"
                  onClick={() => {
                    deleteNodes(useEditorStore.getState().view.selected);
                    closeMenu();
                  }}
                >
                  删除
                </button>
              </>
            ) : (
              <button
                className="danger"
                onClick={() => {
                  deleteEdges([contextMenu.edgeId]);
                  closeMenu();
                }}
              >
                删除连线
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
}

/** 拖动对齐参考线叠层：按 viewport transform 把 flow 坐标的参考线画到屏幕。 */
function HelperLinesOverlay({ lines }: { lines: HelperLines }) {
  const transform = useStore((s) => s.transform);
  if (lines.horizontal === undefined && lines.vertical === undefined) return null;
  const [tx, ty, zoom] = transform;
  const style: React.CSSProperties = { position: "absolute", background: "#2f6fed", pointerEvents: "none", zIndex: 10 };
  return (
    <>
      {lines.vertical !== undefined && (
        <div style={{ ...style, left: lines.vertical * zoom + tx, top: 0, width: 1, height: "100%" }} />
      )}
      {lines.horizontal !== undefined && (
        <div style={{ ...style, top: lines.horizontal * zoom + ty, left: 0, height: 1, width: "100%" }} />
      )}
    </>
  );
}

export function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
