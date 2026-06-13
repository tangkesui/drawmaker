import { describe, expect, test } from "vitest";
import {
  classToGraph,
  erToGraph,
  flowToGraph,
  stateToGraph,
  type RawClass,
  type RawEr,
  type RawFlow,
  type RawState,
} from "../mermaid-import";

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

  test("edge.stroke → 线型 style（虚线/粗线往返导入侧）", () => {
    const raw: RawFlow = {
      vertices: { A: { id: "A" }, B: { id: "B" } },
      edges: [
        { start: "A", end: "B", type: "arrow_point", stroke: "dotted" },
        { start: "A", end: "B", type: "arrow_open", stroke: "thick" },
        { start: "A", end: "B", type: "arrow_point", stroke: "normal" },
      ],
    };
    const g = flowToGraph(raw);
    expect(g.edges[0].data).toEqual({ style: "dashed" });
    expect(g.edges[1].data).toEqual({ arrow: "none", style: "thick" });
    expect(g.edges[2].data).toBeUndefined(); // normal + end 都是默认
  });

  test("vertex.styles → fill/stroke/strokeWidth（颜色往返导入侧）", () => {
    const raw: RawFlow = {
      vertices: {
        A: { id: "A", text: "A", type: "square", styles: ["fill:#f9f", "stroke:#333", "stroke-width:2px"] },
      },
      edges: [],
    };
    expect(flowToGraph(raw).nodes[0]).toEqual({
      id: "A",
      kind: "rect",
      data: { label: "A", fill: "#f9f", stroke: "#333", strokeWidth: 2 },
    });
  });
});

describe("stateToGraph / classToGraph / erToGraph（其余 graph 类型导入映射）", () => {
  test("state：状态 description→label，relation→带标签边", () => {
    const raw: RawState = {
      states: { s1: { descriptions: ["空闲"] }, s2: { descriptions: [] } },
      relations: [{ id1: "s1", id2: "s2", relationTitle: "启动" }],
    };
    const g = stateToGraph(raw);
    expect(g.nodes).toEqual([
      { id: "s1", kind: "rect", data: { label: "空闲" } },
      { id: "s2", kind: "rect", data: { label: "s2" } }, // 无 description → id 兜底
    ]);
    expect(g.edges).toEqual([{ id: "e_1", source: "s1", target: "s2", data: { label: "启动" } }]);
  });

  test("class：类名+成员→多行 label（去转义反斜杠）+ 关系边", () => {
    const raw: RawClass = {
      classes: { User: { label: "User", members: [{ text: "\\+name" }], methods: [{ text: "\\+login()" }] } },
      relations: [{ id1: "User", id2: "Account", title: "owns" }],
    };
    const g = classToGraph(raw);
    expect(g.nodes[0].data.label).toBe("User\n+name\n+login()");
    expect(g.nodes[0].size).toEqual({ width: 180, height: 24 + 3 * 18 });
    expect(g.edges[0]).toEqual({ id: "e_1", source: "User", target: "Account", data: { label: "owns" } });
  });

  test("er：内部 id 映射回 key，属性→多行 label，role→边标签", () => {
    const raw: RawEr = {
      entities: {
        客户: { id: "entity-客户-0", attributes: [{ type: "string", name: "姓名" }] },
        订单: { id: "entity-订单-1", attributes: [] },
      },
      relationships: [{ entityA: "entity-客户-0", roleA: "下单", entityB: "entity-订单-1" }],
    };
    const g = erToGraph(raw);
    expect(g.nodes[0].data.label).toBe("客户\nstring 姓名");
    expect(g.nodes[1].id).toBe("订单");
    expect(g.edges[0]).toEqual({ id: "e_1", source: "客户", target: "订单", data: { label: "下单" } });
  });
});
