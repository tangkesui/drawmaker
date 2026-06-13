import { describe, expect, test } from "vitest";
import { flowToGraph, type RawFlow } from "../mermaid-import";

describe("flowToGraph（mermaid flowchart 解析 → 节点/边，纯映射）", () => {
  test("顶点 type→kind、边 source/target/label/arrow、方向 TB→TD", () => {
    const raw: RawFlow = {
      vertices: {
        A: { id: "A", text: "Start", type: "square" },
        B: { id: "B", text: "Decision", type: "diamond" },
        C: { id: "C", text: "End", type: "stadium" },
      },
      edges: [
        { start: "A", end: "B", type: "arrow_point", text: "" },
        { start: "B", end: "C", type: "arrow_point", text: "yes" },
      ],
      direction: "TB",
    };
    const g = flowToGraph(raw);
    expect(g.direction).toBe("TD");
    expect(g.nodes).toEqual([
      { id: "A", kind: "rect", data: { label: "Start" } },
      { id: "B", kind: "diamond", data: { label: "Decision" } },
      { id: "C", kind: "stadium", data: { label: "End" } },
    ]);
    expect(g.edges).toEqual([
      { id: "e_1", source: "A", target: "B" },
      { id: "e_2", source: "B", target: "C", data: { label: "yes" } },
    ]);
  });

  test("开放边→arrow none；双向→both；缺省→end（不写 data）", () => {
    const raw: RawFlow = {
      vertices: { A: { id: "A" }, B: { id: "B" } },
      edges: [
        { start: "A", end: "B", type: "arrow_open" },
        { start: "A", end: "B", type: "double_arrow_point" },
        { start: "A", end: "B", type: "arrow_point" },
      ],
      direction: "LR",
    };
    const g = flowToGraph(raw);
    expect(g.direction).toBe("LR");
    expect(g.edges[0].data).toEqual({ arrow: "none" });
    expect(g.edges[1].data).toEqual({ arrow: "both" });
    expect(g.edges[2].data).toBeUndefined();
  });

  test("未知形状回退 rect；无 text 用 id 兜底", () => {
    const raw: RawFlow = { vertices: { X: { id: "X", type: "weird" } }, edges: [] };
    expect(flowToGraph(raw).nodes[0]).toEqual({ id: "X", kind: "rect", data: { label: "X" } });
  });
});
