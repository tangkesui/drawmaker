import { describe, expect, test } from "vitest";
import { assignEdgeHandles, computeLayout, handlesForDir } from "../auto-layout";
import type { DmDocument, DmEdge } from "../../core/types";

const doc: DmDocument = {
  version: 1,
  nodes: [
    { id: "a", kind: "rect", position: { x: 0, y: 0 }, data: { label: "A" } },
    { id: "b", kind: "rect", position: { x: 0, y: 0 }, data: { label: "B" } },
    { id: "c", kind: "rect", position: { x: 0, y: 0 }, data: { label: "C" } },
  ],
  edges: [
    { id: "e1", source: "a", target: "b" },
    { id: "e2", source: "b", target: "c" },
  ],
  meta: { title: "t" },
};

describe("auto-layout (dagre)", () => {
  test("assigns a position to every node", () => {
    const pos = computeLayout(doc, "TB");
    expect(pos.size).toBe(3);
    for (const id of ["a", "b", "c"]) expect(pos.get(id)).toBeDefined();
  });

  test("TB ranks flow downward", () => {
    const pos = computeLayout(doc, "TB");
    expect(pos.get("a")!.y).toBeLessThan(pos.get("b")!.y);
    expect(pos.get("b")!.y).toBeLessThan(pos.get("c")!.y);
  });

  test("LR ranks flow rightward", () => {
    const pos = computeLayout(doc, "LR");
    expect(pos.get("a")!.x).toBeLessThan(pos.get("b")!.x);
    expect(pos.get("b")!.x).toBeLessThan(pos.get("c")!.x);
  });

  test("BT/RL 原生反向（极性不再折叠）", () => {
    const bt = computeLayout(doc, "BT");
    expect(bt.get("a")!.y).toBeGreaterThan(bt.get("b")!.y); // a 在下、c 在上
    const rl = computeLayout(doc, "RL");
    expect(rl.get("a")!.x).toBeGreaterThan(rl.get("b")!.x);
  });
});

describe("方向 → 连接桩（TD 从下出/上入 等）", () => {
  test("handlesForDir 四向映射", () => {
    expect(handlesForDir("TB")).toEqual({ source: "b", target: "t" });
    expect(handlesForDir("BT")).toEqual({ source: "t", target: "b" });
    expect(handlesForDir("LR")).toEqual({ source: "r", target: "l" });
    expect(handlesForDir("RL")).toEqual({ source: "l", target: "r" });
  });

  test("assignEdgeHandles：普通边按方向设桩，容器边保持原样", () => {
    const edges: DmEdge[] = [
      { id: "e1", source: "a", target: "b" }, // 两端普通形状
      { id: "e2", source: "a", target: "g1" }, // 指向容器，无桩可设
    ];
    const shapeIds = new Set(["a", "b"]); // g1 是 subgraph，不在内
    const out = assignEdgeHandles(edges, shapeIds, "TB");
    expect(out[0]).toMatchObject({ sourceHandle: "b", targetHandle: "t" });
    expect(out[1].sourceHandle).toBeUndefined();
    expect(out[1].targetHandle).toBeUndefined();
    expect(edges[0].sourceHandle).toBeUndefined(); // 纯函数，不改入参
  });
});
