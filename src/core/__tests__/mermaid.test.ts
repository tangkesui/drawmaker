import { describe, expect, test } from "vitest";
import { toMermaid } from "../mermaid";
import type { DataDiagram, DataDiagramType, DmDocument, DmEdge, DmNode, EdgeArrow } from "../types";

function docOf(nodes: DmNode[], edges: DmEdge[], direction?: DmDocument["meta"]["direction"]): DmDocument {
  return { version: 1, nodes, edges, meta: { title: "t", direction } };
}
function typedDoc(
  type: DmDocument["meta"]["diagramType"],
  nodes: DmNode[],
  edges: DmEdge[],
): DmDocument {
  return { version: 1, nodes, edges, meta: { title: "t", diagramType: type } };
}
const node = (id: string, kind: string, label: string): DmNode => ({
  id,
  kind,
  position: { x: 0, y: 0 },
  data: { label },
});

describe("toMermaid", () => {
  test("空图导出合法的 flowchart 头", () => {
    expect(toMermaid(docOf([], []))).toBe("flowchart TD\n");
  });

  test("direction 来自 meta，缺省 TD", () => {
    expect(toMermaid(docOf([], [], "LR")).startsWith("flowchart LR")).toBe(true);
  });

  test("节点形状按 kind 映射到 mermaid 语法", () => {
    const out = toMermaid(
      docOf(
        [
          node("n_1", "rect", "A"),
          node("n_2", "rounded", "B"),
          node("n_3", "ellipse", "C"),
          node("n_4", "diamond", "D"),
          node("n_5", "database", "E"),
        ],
        [],
      ),
    );
    expect(out).toContain('n_1["A"]');
    expect(out).toContain('n_2("B")');
    expect(out).toContain('n_3(["C"])');
    expect(out).toContain('n_4{"D"}');
    expect(out).toContain('n_5[("E")]');
  });

  test("Mermaid 标准形状 kind 映射到对应语法", () => {
    const out = toMermaid(
      docOf(
        [
          node("n_1", "stadium", "S"),
          node("n_2", "subroutine", "Sub"),
          node("n_3", "cylinder", "Cy"),
          node("n_4", "circle", "Ci"),
          node("n_5", "hexagon", "Hx"),
          node("n_6", "parallelogram", "P"),
          node("n_7", "trapezoid", "Tz"),
        ],
        [],
      ),
    );
    expect(out).toContain('n_1(["S"])');
    expect(out).toContain('n_2[["Sub"]]');
    expect(out).toContain('n_3[("Cy")]');
    expect(out).toContain('n_4(("Ci"))');
    expect(out).toContain('n_5{{"Hx"}}');
    expect(out).toContain('n_6[/"P"/]');
    expect(out).toContain('n_7[/"Tz"\\]');
  });

  test("未知 kind 回退矩形", () => {
    expect(toMermaid(docOf([node("n_1", "weird", "X")], []))).toContain('n_1["X"]');
  });

  test("label 转义：引号 + 换行", () => {
    const out = toMermaid(docOf([node("n_1", "rect", 'a"b\nc')], []));
    expect(out).toContain('n_1["a&quot;b<br/>c"]');
  });

  test("空 label 回退节点 id", () => {
    expect(toMermaid(docOf([node("n_1", "rect", "")], []))).toContain('n_1["n_1"]');
  });

  test("边方向：end/none/start/both", () => {
    const e = (arrow: EdgeArrow): DmEdge => ({ id: "e_1", source: "n_1", target: "n_2", data: { arrow } });
    expect(toMermaid(docOf([], [e("end")]))).toContain("n_1 --> n_2");
    expect(toMermaid(docOf([], [e("none")]))).toContain("n_1 --- n_2");
    expect(toMermaid(docOf([], [e("start")]))).toContain("n_1 <-- n_2");
    expect(toMermaid(docOf([], [e("both")]))).toContain("n_1 <--> n_2");
  });

  test("边缺省 arrow = end", () => {
    const edge: DmEdge = { id: "e_1", source: "n_1", target: "n_2" };
    expect(toMermaid(docOf([], [edge]))).toContain("n_1 --> n_2");
  });

  test("边标签：-->|\"text\"|，含转义", () => {
    const edge: DmEdge = { id: "e_1", source: "n_1", target: "n_2", data: { label: "是/否" } };
    expect(toMermaid(docOf([], [edge]))).toContain('n_1 -->|"是/否"| n_2');
  });

  test("完整小图按 节点行→边行 顺序", () => {
    const out = toMermaid(
      docOf(
        [node("n_1", "rect", "开始"), node("n_2", "diamond", "判断")],
        [{ id: "e_1", source: "n_1", target: "n_2", data: { label: "go" } }],
      ),
    );
    expect(out).toBe(
      ["flowchart TD", '  n_1["开始"]', '  n_2{"判断"}', '  n_1 -->|"go"| n_2', ""].join("\n"),
    );
  });
});

describe("toMermaid — 多图表类型分发", () => {
  test("state：stateDiagram-v2 + direction + 状态描述 + 带标签转移", () => {
    const out = toMermaid(
      typedDoc(
        "state",
        [node("n_1", "rect", "空闲"), node("n_2", "rect", "运行")],
        [{ id: "e_1", source: "n_1", target: "n_2", data: { label: "启动" } }],
      ),
    );
    expect(out).toBe(
      ["stateDiagram-v2", "  direction TB", "  n_1 : 空闲", "  n_2 : 运行", "  n_1 --> n_2 : 启动", ""].join(
        "\n",
      ),
    );
  });

  test("class：class id[\"显示名\"] + 多行 label 转成员 + 关联边", () => {
    const out = toMermaid(
      typedDoc(
        "class",
        [node("n_1", "rect", "User\n+name: string\n+login()"), node("n_2", "rect", "Account")],
        [{ id: "e_1", source: "n_1", target: "n_2", data: { label: "owns" } }],
      ),
    );
    expect(out).toContain("classDiagram");
    expect(out).toContain('  class n_1["User"]');
    expect(out).toContain("  n_1 : +name: string");
    expect(out).toContain("  n_1 : +login()");
    expect(out).toContain('  class n_2["Account"]');
    expect(out).toContain("  n_1 --> n_2 : owns");
  });

  test("er：实体属性块 + 关系（默认基数 ||--o{）", () => {
    const out = toMermaid(
      typedDoc(
        "er",
        [node("n_1", "rect", "客户\nstring 姓名"), node("n_2", "rect", "订单")],
        [{ id: "e_1", source: "n_1", target: "n_2", data: { label: "下单" } }],
      ),
    );
    expect(out).toContain("erDiagram");
    expect(out).toContain('  "客户" {');
    expect(out).toContain("    string 姓名");
    expect(out).toContain('  "客户" ||--o{ "订单" : 下单');
  });

  test("sequence：participant 声明 + 按边顺序的消息", () => {
    const out = toMermaid(
      typedDoc(
        "sequence",
        [node("n_1", "rect", "用户"), node("n_2", "rect", "服务")],
        [
          { id: "e_1", source: "n_1", target: "n_2", data: { label: "请求" } },
          { id: "e_2", source: "n_2", target: "n_1", data: { label: "响应" } },
        ],
      ),
    );
    expect(out).toBe(
      [
        "sequenceDiagram",
        "  participant n_1 as 用户",
        "  participant n_2 as 服务",
        "  n_1->>n_2: 请求",
        "  n_2->>n_1: 响应",
        "",
      ].join("\n"),
    );
  });

  test("c4：Person/System + Rel", () => {
    const out = toMermaid(
      typedDoc(
        "c4",
        [node("n_1", "actor", "用户"), node("n_2", "service", "API")],
        [{ id: "e_1", source: "n_1", target: "n_2", data: { label: "调用" } }],
      ),
    );
    expect(out).toContain("C4Context");
    expect(out).toContain('  Person(n_1, "用户")');
    expect(out).toContain('  System(n_2, "API")');
    expect(out).toContain('  Rel(n_1, n_2, "调用")');
  });

  test("mindmap：根用 ((..))，子节点按边层级缩进", () => {
    const out = toMermaid(
      typedDoc(
        "mindmap",
        [node("n_1", "rect", "中心"), node("n_2", "rect", "分支A"), node("n_3", "rect", "子")],
        [
          { id: "e_1", source: "n_1", target: "n_2" },
          { id: "e_2", source: "n_2", target: "n_3" },
        ],
      ),
    );
    expect(out).toBe(
      ["mindmap", "  n_1((中心))", "    分支A", "      子", ""].join("\n"),
    );
  });

  test("缺省 diagramType = flowchart", () => {
    expect(toMermaid(typedDoc(undefined, [node("n_1", "rect", "A")], [])).startsWith("flowchart TD")).toBe(
      true,
    );
  });
});

describe("toMermaid — 数据/时间家族", () => {
  const dataDoc = (type: DataDiagramType, data: DataDiagram): DmDocument => ({
    version: 1,
    nodes: [],
    edges: [],
    meta: { title: "t", diagramType: type },
    data: { [type]: data },
  });

  test("pie：标题 + 扇区", () => {
    const out = toMermaid(
      dataDoc("pie", { title: "宠物", config: {}, rows: [{ label: "狗", value: "10" }, { label: "猫", value: "5" }] }),
    );
    expect(out).toBe(["pie title 宠物", '    "狗" : 10', '    "猫" : 5', ""].join("\n"));
  });

  test("gantt：title + dateFormat + section 归组 + 任务", () => {
    const out = toMermaid(
      dataDoc("gantt", {
        title: "计划",
        config: {},
        rows: [
          { section: "设计", task: "原型", start: "2024-01-01", duration: "3d" },
          { section: "设计", task: "评审", start: "2024-01-04", duration: "1d" },
        ],
      }),
    );
    expect(out).toContain("gantt");
    expect(out).toContain("    title 计划");
    expect(out).toContain("    dateFormat YYYY-MM-DD");
    expect(out).toContain("    section 设计");
    expect(out).toContain("    原型 :2024-01-01, 3d");
    expect(out).toContain("    评审 :2024-01-04, 1d");
  });

  test("timeline：时间点 + 事件", () => {
    const out = toMermaid(
      dataDoc("timeline", { title: "历史", config: {}, rows: [{ period: "2004", event: "Facebook" }] }),
    );
    expect(out).toBe(["timeline", "    title 历史", "    2004 : Facebook", ""].join("\n"));
  });

  test("journey：section + 步骤:评分:参与者", () => {
    const out = toMermaid(
      dataDoc("journey", {
        title: "上班",
        config: {},
        rows: [{ section: "早晨", task: "起床", score: "3", actors: "我" }],
      }),
    );
    expect(out).toContain("journey");
    expect(out).toContain("    section 早晨");
    expect(out).toContain("      起床: 3: 我");
  });

  test("quadrant：轴 + 象限 + 点坐标（夹到 0~1）", () => {
    const out = toMermaid(
      dataDoc("quadrant", {
        title: "优先级",
        config: { xLeft: "易", xRight: "难", q1: "立刻做" },
        rows: [{ label: "任务A", x: "0.3", y: "1.5" }],
      }),
    );
    expect(out).toContain("quadrantChart");
    expect(out).toContain("    x-axis 易 --> 难");
    expect(out).toContain("    quadrant-1 立刻做");
    expect(out).toContain("    任务A: [0.3, 1]"); // y=1.5 夹到 1
  });

  test("xychart：title + x-axis 类别 + bar 数值", () => {
    const out = toMermaid(
      dataDoc("xychart", {
        title: "销量",
        config: {},
        rows: [{ category: "一月", value: "100" }, { category: "二月", value: "150" }],
      }),
    );
    expect(out).toContain("xychart-beta");
    expect(out).toContain('    title "销量"');
    expect(out).toContain('    x-axis ["一月", "二月"]');
    expect(out).toContain("    bar [100, 150]");
  });
});
