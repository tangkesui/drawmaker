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

  test("调色板只含往返安全的 canonical 形状，隐藏架构/ellipse（仍在注册表中可渲染）", () => {
    const palette = shapesByCategory().flatMap((g) => g.shapes).map((s) => s.kind);
    const canonical = [
      "rect",
      "rounded",
      "diamond",
      "stadium",
      "subroutine",
      "cylinder",
      "circle",
      "hexagon",
      "parallelogram",
      "trapezoid",
    ];
    for (const k of canonical) expect(palette).toContain(k);
    for (const k of ["ellipse", "cloud", "service", "database", "actor", "note"]) {
      expect(palette).not.toContain(k); // 退出调色板
      expect(allShapes().map((s) => s.kind)).toContain(k); // 但注册表仍保留（旧文件可渲染）
    }
    expect(palette.length).toBeLessThan(allShapes().length);
  });
});
