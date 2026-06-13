import { describe, expect, test } from "vitest";
import { absolutePos, childIds, nodeMap, subtreeIds, toRelative, SUBGRAPH_KIND } from "../subgraph";
import type { DmNode } from "../types";

const node = (id: string, x: number, y: number, parentId?: string, kind = "rect"): DmNode => ({
  id,
  kind,
  position: { x, y },
  data: { label: id },
  ...(parentId ? { parentId } : {}),
});

describe("subgraph 坐标换算 + 子树", () => {
  // G1@(100,100) ⊃ G2@rel(20,30) ⊃ A@rel(5,5)，B@rel(10,0) 直属 G1
  const nodes: DmNode[] = [
    node("G1", 100, 100, undefined, SUBGRAPH_KIND),
    node("G2", 20, 30, "G1", SUBGRAPH_KIND),
    node("A", 5, 5, "G2"),
    node("B", 10, 0, "G1"),
  ];
  const byId = nodeMap(nodes);

  test("absolutePos 沿 parentId 链累加（嵌套）", () => {
    expect(absolutePos(byId.get("G1")!, byId)).toEqual({ x: 100, y: 100 });
    expect(absolutePos(byId.get("G2")!, byId)).toEqual({ x: 120, y: 130 }); // 100+20,100+30
    expect(absolutePos(byId.get("A")!, byId)).toEqual({ x: 125, y: 135 }); // +5,+5
    expect(absolutePos(byId.get("B")!, byId)).toEqual({ x: 110, y: 100 });
  });

  test("toRelative：绝对坐标换算成相对某父（含嵌套）", () => {
    // 把绝对 (125,135) 放进 G2 → 相对 (5,5)
    expect(toRelative({ x: 125, y: 135 }, byId.get("G2"), byId)).toEqual({ x: 5, y: 5 });
    // 放进 G1 → 相对 (25,35)
    expect(toRelative({ x: 125, y: 135 }, byId.get("G1"), byId)).toEqual({ x: 25, y: 35 });
    // 无父 → 绝对本身
    expect(toRelative({ x: 125, y: 135 }, undefined, byId)).toEqual({ x: 125, y: 135 });
  });

  test("absolutePos→toRelative 往返自洽", () => {
    const abs = absolutePos(byId.get("A")!, byId);
    expect(toRelative(abs, byId.get("G2"), byId)).toEqual(byId.get("A")!.position);
  });

  test("subtreeIds 含根 + 所有后代", () => {
    expect(subtreeIds("G1", nodes)).toEqual(new Set(["G1", "G2", "A", "B"]));
    expect(subtreeIds("G2", nodes)).toEqual(new Set(["G2", "A"]));
    expect(subtreeIds("A", nodes)).toEqual(new Set(["A"]));
  });

  test("childIds 只取直接子级", () => {
    expect(childIds("G1", nodes).sort()).toEqual(["B", "G2"]);
    expect(childIds("G2", nodes)).toEqual(["A"]);
  });

  test("防环：parentId 成环不死循环", () => {
    const cyc: DmNode[] = [node("X", 1, 1, "Y", SUBGRAPH_KIND), node("Y", 2, 2, "X", SUBGRAPH_KIND)];
    const m = nodeMap(cyc);
    expect(absolutePos(m.get("X")!, m)).toEqual({ x: 3, y: 3 }); // 1+2，遇环即停
  });
});
