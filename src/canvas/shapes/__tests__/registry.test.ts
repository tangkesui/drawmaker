import { describe, expect, test } from "vitest";
import { allShapes, getShape, shapesByCategory } from "../registry";

describe("shape registry", () => {
  test("every shape has render/size/category and a unique kind", () => {
    const shapes = allShapes();
    const kinds = new Set<string>();
    for (const s of shapes) {
      expect(typeof s.render).toBe("function");
      expect(s.defaultSize.width).toBeGreaterThan(0);
      expect(s.defaultSize.height).toBeGreaterThan(0);
      expect(s.category).toBeTruthy();
      expect(kinds.has(s.kind)).toBe(false);
      kinds.add(s.kind);
    }
    expect(shapes.length).toBeGreaterThanOrEqual(10);
  });

  test("getShape falls back to rect for unknown kind", () => {
    expect(getShape("totally-unknown").kind).toBe("rect");
    expect(getShape("ellipse").kind).toBe("ellipse");
  });

  test("shapesByCategory covers every shape exactly once", () => {
    const grouped = shapesByCategory().flatMap((g) => g.shapes);
    expect(grouped.length).toBe(allShapes().length);
  });
});
