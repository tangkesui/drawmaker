import { useEffect, useRef, useState } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type Edge, type EdgeProps } from "@xyflow/react";
import { renameEdge } from "../../core/operations";
import "./edges.css";

/** Canvas → 边组件的渲染数据：label 来自 doc；editing / onEditingChange 是 Canvas 持有的瞬态。 */
export type LabeledEdgeData = {
  label: string;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
};

/** 通用连线：bezier 路径 + 居中标签，双击改字（入口在 Canvas 的 onEdgeDoubleClick / 标签自身）。 */
export function LabeledEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerStart,
  markerEnd,
  style,
}: EdgeProps<Edge<LabeledEdgeData>>) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const label = data?.label ?? "";
  const editing = data?.editing ?? false;

  const [text, setText] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText(label);
  }, [label]);
  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const finish = (save: boolean) => {
    if (save && text !== label) renameEdge(id, text);
    else setText(label);
    data?.onEditingChange(false);
  };

  return (
    <>
      <BaseEdge id={id} path={path} markerStart={markerStart} markerEnd={markerEnd} style={style} />
      {(editing || label) && (
        <EdgeLabelRenderer>
          {/* 标签层默认 pointer-events:none；nodrag nopan 防双击标签触发画布缩放/拖动 */}
          <div
            className="edge-label-wrap nodrag nopan"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {editing ? (
              <input
                ref={inputRef}
                className="edge-label-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onBlur={() => finish(true)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") finish(true);
                  if (e.key === "Escape") finish(false);
                }}
              />
            ) : (
              <span className="edge-label" onDoubleClick={() => data?.onEditingChange(true)}>
                {label}
              </span>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
