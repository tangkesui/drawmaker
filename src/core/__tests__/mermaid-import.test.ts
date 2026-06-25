import { describe, expect, test } from "vitest";
import {
  classToGraph,
  erToGraph,
  flowToGraph,
  c4ToGraph,
  mindmapToGraph,
  sequenceToGraph,
  stateToGraph,
  type RawClass,
  type RawEr,
  type RawFlow,
  type RawSequence,
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

  test("subGraphs → 容器节点 + 成员 parentId（含嵌套）", () => {
    const raw: RawFlow = {
      vertices: { A: { id: "A" }, C: { id: "C" } },
      edges: [],
      subGraphs: [
        { id: "g2", nodes: ["C"], title: "内层" },
        { id: "g1", nodes: ["A", "g2"], title: "后端" }, // g2 嵌套在 g1
      ],
    };
    const byId = Object.fromEntries(flowToGraph(raw).nodes.map((n) => [n.id, n]));
    expect(byId.A.parentId).toBe("g1");
    expect(byId.C.parentId).toBe("g2");
    expect(byId.g2).toMatchObject({ kind: "subgraph", parentId: "g1", data: { label: "内层" } });
    expect(byId.g1).toMatchObject({ kind: "subgraph", data: { label: "后端" } });
    expect(byId.g1.parentId).toBeUndefined();
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

  test("label 里的 <br> 变体（节点/容器/边）→ 真正换行（与导出 \\n→<br/> 往返）", () => {
    const raw: RawFlow = {
      vertices: { A: { id: "A", text: "slide.pptx<br>ZIP 包<br/>~28MB" } },
      edges: [{ start: "A", end: "A", type: "arrow_point", text: "第一行<BR />第二行" }],
      subGraphs: [{ id: "g1", nodes: ["A"], title: "外壳<br />管道层" }],
    };
    const byId = Object.fromEntries(flowToGraph(raw).nodes.map((n) => [n.id, n]));
    expect(byId.A.data.label).toBe("slide.pptx\nZIP 包\n~28MB");
    expect(byId.g1.data.label).toBe("外壳\n管道层");
    expect(flowToGraph(raw).edges[0].data).toEqual({ label: "第一行\n第二行" });
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

describe("sequenceToGraph（时序图导入映射）", () => {
  test("参与者按 actorKeys 顺序→节点；消息→边；跳过无两端事件", () => {
    const raw: RawSequence = {
      actors: { U: { description: "用户" }, S: { description: "服务" } },
      actorKeys: ["U", "S"],
      messages: [
        { from: "U", to: "S", message: "请求" },
        { from: "S", to: "U", message: "响应" },
        { message: "note" }, // 无 from/to → 跳过
      ],
    };
    const g = sequenceToGraph(raw);
    expect(g.direction).toBe("LR");
    expect(g.nodes).toEqual([
      { id: "U", kind: "rect", data: { label: "用户" } },
      { id: "S", kind: "rect", data: { label: "服务" } },
    ]);
    expect(g.edges).toEqual([
      { id: "e_1", source: "U", target: "S", data: { label: "请求" } },
      { id: "e_2", source: "S", target: "U", data: { label: "响应" } },
    ]);
  });
});

describe("c4ToGraph / mindmapToGraph", () => {
  test("c4：person→actor、system→rect，Rel→边", () => {
    const g = c4ToGraph({
      shapes: [
        { alias: "u", label: { text: "用户" }, typeC4Shape: { text: "person" } },
        { alias: "s", label: { text: "服务" }, typeC4Shape: { text: "system" } },
      ],
      rels: [{ from: "u", to: "s", label: { text: "调用" } }],
    });
    expect(g.nodes).toEqual([
      { id: "u", kind: "actor", data: { label: "用户" } },
      { id: "s", kind: "rect", data: { label: "服务" } },
    ]);
    expect(g.edges[0]).toEqual({ id: "e_1", source: "u", target: "s", data: { label: "调用" } });
  });

  test("mindmap：树展平为节点 + 父子边", () => {
    const g = mindmapToGraph({
      nodeId: "root",
      descr: "中心",
      children: [
        { nodeId: "A", descr: "A", children: [] },
        { nodeId: "B", descr: "B", children: [{ nodeId: "C", descr: "C", children: [] }] },
      ],
    });
    expect(g.nodes.map((n) => n.id)).toEqual(["root", "A", "B", "C"]);
    expect(g.edges).toEqual([
      { id: "e_1", source: "root", target: "A" },
      { id: "e_2", source: "root", target: "B" },
      { id: "e_3", source: "B", target: "C" },
    ]);
  });
});
