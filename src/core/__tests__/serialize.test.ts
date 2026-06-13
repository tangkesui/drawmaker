import { describe, expect, test } from "vitest";
import { deserializeDocument, serializeDocument, SUPPORTED_VERSION } from "../serialize";
import type { DmDocument } from "../types";

const sample: DmDocument = {
  version: 1,
  nodes: [{ id: "n_1", kind: "rect", position: { x: 10, y: 20 }, data: { label: "A" } }],
  edges: [
    {
      id: "e_1",
      source: "n_1",
      target: "n_1",
      sourceHandle: null,
      targetHandle: null,
      data: { label: "调用", arrow: "both" },
    },
  ],
  meta: { title: "Sample" },
};

describe("serialize", () => {
  test("round-trip preserves document", () => {
    const restored = deserializeDocument(serializeDocument(sample));
    expect(restored).toEqual(sample);
  });

  test("output is pretty JSON", () => {
    expect(serializeDocument(sample)).toContain("\n");
  });

  test("rejects malformed JSON", () => {
    expect(() => deserializeDocument("{ not json")).toThrow();
  });

  test("rejects unknown version", () => {
    const text = JSON.stringify({ ...sample, version: 99 });
    expect(() => deserializeDocument(text)).toThrow(/版本/);
  });

  test("rejects missing nodes/edges arrays", () => {
    const text = JSON.stringify({ version: SUPPORTED_VERSION, meta: { title: "x" } });
    expect(() => deserializeDocument(text)).toThrow();
  });

  test("fills missing meta with default", () => {
    const text = JSON.stringify({ version: 1, nodes: [], edges: [] });
    expect(deserializeDocument(text).meta).toEqual({ title: "Untitled" });
  });

  test("round-trips parentId (subgraph 分组存盘)", () => {
    const grouped: DmDocument = {
      version: 1,
      nodes: [
        { id: "G1", kind: "subgraph", position: { x: 0, y: 0 }, data: { label: "组" } },
        { id: "A", kind: "rect", position: { x: 10, y: 10 }, data: { label: "A" }, parentId: "G1" },
      ],
      edges: [],
      meta: { title: "t" },
    };
    expect(deserializeDocument(serializeDocument(grouped))).toEqual(grouped);
  });

  test("round-trips data-family content (data/时间家族存盘)", () => {
    const withData: DmDocument = {
      version: 1,
      nodes: [],
      edges: [],
      meta: { title: "饼图", diagramType: "pie" },
      data: { pie: { title: "宠物", config: {}, rows: [{ label: "狗", value: "10" }] } },
    };
    expect(deserializeDocument(serializeDocument(withData))).toEqual(withData);
  });
});
