import { describe, expect, test } from "vitest";
import {
  absolutePos,
  childIds,
  layoutWithGroups,
  nodeMap,
  orderParentFirst,
  subtreeIds,
  toRelative,
  SUBGRAPH_KIND,
} from "../subgraph";
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

  test("layoutWithGroups：叶子绝对 → 容器包围框 + 子节点转相对", () => {
    const ns: DmNode[] = [
      node("g1", 0, 0, undefined, SUBGRAPH_KIND),
      node("A", 0, 0, "g1"),
      node("B", 0, 0, "g1"),
    ];
    const leafAbs = new Map([
      ["A", { x: 100, y: 100 }],
      ["B", { x: 300, y: 100 }],
    ]);
    const out = layoutWithGroups(ns, leafAbs, () => ({ width: 100, height: 50 }), 20, 26);
    // bbox x:100..400 y:100..150 → 容器 abs x=80 y=54，w=340 h=116
    expect(out.get("g1")).toEqual({ position: { x: 80, y: 54 }, size: { width: 340, height: 116 } });
    expect(out.get("A")!.position).toEqual({ x: 20, y: 46 }); // 100-80,100-54
    expect(out.get("B")!.position).toEqual({ x: 220, y: 46 });
  });

  test("orderParentFirst：父排子前，同层稳定", () => {
    // 故意把子节点放前面
    const unordered: DmNode[] = [node("A", 0, 0, "G2"), node("G2", 0, 0, "G1", SUBGRAPH_KIND), node("G1", 0, 0)];
    expect(orderParentFirst(unordered).map((n) => n.id)).toEqual(["G1", "G2", "A"]);
  });

  test("防环：parentId 成环不死循环", () => {
    const cyc: DmNode[] = [node("X", 1, 1, "Y", SUBGRAPH_KIND), node("Y", 2, 2, "X", SUBGRAPH_KIND)];
    const m = nodeMap(cyc);
    expect(absolutePos(m.get("X")!, m)).toEqual({ x: 3, y: 3 }); // 1+2，遇环即停
  });
});
