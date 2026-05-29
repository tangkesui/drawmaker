import { describe, expect, test } from "vitest";
import { computeLayout } from "../auto-layout";
import type { DmDocument } from "../../core/types";

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
});
