import { describe, expect, test } from "vitest";
import { deserializeDocument, serializeDocument, SUPPORTED_VERSION } from "../serialize";
import type { DmDocument } from "../types";

const sample: DmDocument = {
  version: 1,
  nodes: [{ id: "n_1", kind: "rect", position: { x: 10, y: 20 }, data: { label: "A" } }],
  edges: [{ id: "e_1", source: "n_1", target: "n_1", sourceHandle: null, targetHandle: null }],
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
});
