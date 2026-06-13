import type { Node, NodePositionChange } from "@xyflow/react";

/**
 * 拖动对齐：算被拖节点与其它节点的对齐参考线 + 吸附位置（Excalidraw/tldraw 手感）。
 * 纯函数，可测。坐标都在 flow 空间。
 */
export interface HelperLines {
  /** 水平参考线的 flow y（被拖节点某条水平边与它对齐）。 */
  horizontal?: number;
  /** 垂直参考线的 flow x。 */
  vertical?: number;
  /** 吸附后被拖节点的 position.x / y（缺省=不吸附该轴）。 */
  snapX?: number;
  snapY?: number;
}

function sizeOf(n: Node): { w: number; h: number } {
  const w = n.measured?.width ?? (typeof n.style?.width === "number" ? n.style.width : 0);
  const h = n.measured?.height ?? (typeof n.style?.height === "number" ? n.style.height : 0);
  return { w, h };
}

/** distance=吸附阈值（flow 像素）。返回最近的对齐参考线与吸附位置。 */
export function getHelperLines(change: NodePositionChange, nodes: Node[], distance = 5): HelperLines {
  const result: HelperLines = {};
  if (!change.position) return result;
  const a = nodes.find((n) => n.id === change.id);
  if (!a) return result;

  const { w: aw, h: ah } = sizeOf(a);
  const A = {
    left: change.position.x,
    right: change.position.x + aw,
    top: change.position.y,
    bottom: change.position.y + ah,
    cx: change.position.x + aw / 2,
    cy: change.position.y + ah / 2,
  };

  let vDist = distance;
  let hDist = distance;

  for (const b of nodes) {
    if (b.id === a.id) continue;
    const { w: bw, h: bh } = sizeOf(b);
    const B = {
      left: b.position.x,
      right: b.position.x + bw,
      top: b.position.y,
      bottom: b.position.y + bh,
      cx: b.position.x + bw / 2,
      cy: b.position.y + bh / 2,
    };

    // 垂直对齐（x）：左-左 / 右-右 / 中-中 / 左-右 / 右-左。三元：[距离, 参考线x, 吸附后 position.x]
    const v: [number, number, number][] = [
      [Math.abs(A.left - B.left), B.left, B.left],
      [Math.abs(A.right - B.right), B.right, B.right - aw],
      [Math.abs(A.cx - B.cx), B.cx, B.cx - aw / 2],
      [Math.abs(A.left - B.right), B.right, B.right],
      [Math.abs(A.right - B.left), B.left, B.left - aw],
    ];
    for (const [d, line, snap] of v) {
      if (d < vDist) {
        vDist = d;
        result.vertical = line;
        result.snapX = snap;
      }
    }

    // 水平对齐（y）：上-上 / 下-下 / 中-中 / 上-下 / 下-上
    const h: [number, number, number][] = [
      [Math.abs(A.top - B.top), B.top, B.top],
      [Math.abs(A.bottom - B.bottom), B.bottom, B.bottom - ah],
      [Math.abs(A.cy - B.cy), B.cy, B.cy - ah / 2],
      [Math.abs(A.top - B.bottom), B.bottom, B.bottom],
      [Math.abs(A.bottom - B.top), B.top, B.top - ah],
    ];
    for (const [d, line, snap] of h) {
      if (d < hDist) {
        hDist = d;
        result.horizontal = line;
        result.snapY = snap;
      }
    }
  }
  return result;
}
