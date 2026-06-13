// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import { toMermaid } from "../mermaid";
import { flowToGraph, stateToGraph } from "../mermaid-import";
import { parseFlow, parseState } from "../../services/mermaidParse";
import type { DmDocument } from "../types";

/**
 * 集成测试（jsdom）：真正跑 mermaid 官方解析器（DOM 依赖），覆盖 services/mermaidParse 这条路。
 * 纯映射在 mermaid-import.test.ts；本文件验证「解析器实际产出 = 我们假设的形态」。
 */

describe("mermaid 官方解析器集成（jsdom）", () => {
  test("flowchart 文本 → parseFlow → flowToGraph", async () => {
    const raw = await parseFlow("flowchart TD\n  A[开始] --> B{判断}\n  B -->|是| C([结束])");
    const g = flowToGraph(raw);
    expect(g.nodes.map((n) => [n.id, n.kind, n.data.label])).toEqual([
      ["A", "rect", "开始"],
      ["B", "diamond", "判断"],
      ["C", "stadium", "结束"],
    ]);
    expect(g.edges).toEqual([
      { id: "e_1", source: "A", target: "B" },
      { id: "e_2", source: "B", target: "C", data: { label: "是" } },
    ]);
  });

  test("flowchart 往返：toMermaid → parseFlow → flowToGraph 结构稳定", async () => {
    const doc: DmDocument = {
      version: 1,
      nodes: [
        { id: "A", kind: "rect", position: { x: 0, y: 0 }, data: { label: "开始", fill: "#f9f" } },
        { id: "B", kind: "stadium", position: { x: 0, y: 0 }, data: { label: "结束" } },
      ],
      edges: [{ id: "e_1", source: "A", target: "B", data: { label: "go", style: "dashed" } }],
      meta: { title: "t", diagramType: "flowchart" },
    };
    const g = flowToGraph(await parseFlow(toMermaid(doc)));
    expect(g.nodes[0]).toMatchObject({ id: "A", kind: "rect", data: { label: "开始", fill: "#f9f" } });
    expect(g.nodes[1]).toMatchObject({ id: "B", kind: "stadium", data: { label: "结束" } });
    expect(g.edges[0]).toMatchObject({ source: "A", target: "B", data: { label: "go", style: "dashed" } });
  });

  test("subgraph 往返：toMermaid → parseFlow → flowToGraph 还原分组 + parentId", async () => {
    const doc: DmDocument = {
      version: 1,
      nodes: [
        { id: "g1", kind: "subgraph", position: { x: 0, y: 0 }, data: { label: "后端" } },
        { id: "A", kind: "rect", position: { x: 0, y: 0 }, data: { label: "A" }, parentId: "g1" },
        { id: "B", kind: "rect", position: { x: 0, y: 0 }, data: { label: "B" } },
      ],
      edges: [{ id: "e_1", source: "A", target: "B" }],
      meta: { title: "t", diagramType: "flowchart" },
    };
    const g = flowToGraph(await parseFlow(toMermaid(doc)));
    const byId = Object.fromEntries(g.nodes.map((n) => [n.id, n]));
    expect(byId.A.parentId).toBe("g1");
    expect(byId.g1.kind).toBe("subgraph");
    expect(byId.g1.data.label).toBe("后端");
  });

  test("stateDiagram 文本 → parseState → stateToGraph", async () => {
    const g = stateToGraph(await parseState("stateDiagram-v2\n  s1 : 空闲\n  s1 --> s2 : 启动"));
    expect(g.nodes.map((n) => [n.id, n.data.label])).toEqual([
      ["s1", "空闲"],
      ["s2", "s2"],
    ]);
    expect(g.edges).toEqual([{ id: "e_1", source: "s1", target: "s2", data: { label: "启动" } }]);
  });
});
