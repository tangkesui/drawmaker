import { describe, expect, test } from "vitest";
import type { Node, NodePositionChange } from "@xyflow/react";
import { getHelperLines } from "../helper-lines";

const node = (id: string, x: number, y: number, w = 100, h = 50): Node => ({
  id,
  position: { x, y },
  data: {},
  measured: { width: w, height: h },
});

const drag = (id: string, x: number, y: number): NodePositionChange => ({
  id,
  type: "position",
  position: { x, y },
  dragging: true,
});

describe("getHelperLines（拖动对齐 + 吸附）", () => {
  test("左边在阈值内 → 吸附到 B 左边并给垂直参考线", () => {
    const nodes = [node("A", 103, 200), node("B", 100, 0)];
    const r = getHelperLines(drag("A", 103, 200), nodes);
    expect(r.snapX).toBe(100); // A 左边 103 距 B 左边 100 = 3 < 5 → 吸附
    expect(r.vertical).toBe(100);
  });

  test("水平中线对齐（仅中线在阈值内）→ 吸附使中线对齐 B", () => {
    // B 中心 y=25；A 高 30，A 中心 y=11+15=26 距 25=1<5；上下边距 B 各边 >5 不命中
    const nodes = [node("A", 300, 11, 100, 30), node("B", 0, 0)];
    const r = getHelperLines(drag("A", 300, 11), nodes);
    expect(r.horizontal).toBe(25);
    expect(r.snapY).toBe(10); // 25 - 30/2
  });

  test("超出阈值 → 不吸附", () => {
    const nodes = [node("A", 200, 200), node("B", 0, 0)];
    const r = getHelperLines(drag("A", 200, 200), nodes);
    expect(r.snapX).toBeUndefined();
    expect(r.snapY).toBeUndefined();
  });

  test("无 position 的变更 → 空结果", () => {
    const nodes = [node("A", 0, 0)];
    expect(getHelperLines({ id: "A", type: "position", dragging: true }, nodes)).toEqual({});
  });
});
