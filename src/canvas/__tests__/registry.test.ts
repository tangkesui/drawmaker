import { describe, expect, test } from "vitest";
import { getShape } from "../shapes/registry";

describe("ShapeDef.fitsRectText（导入按内容定尺的安全门槛）", () => {
  test("矩形系标记可定尺", () => {
    for (const k of ["rect", "rounded", "stadium", "subroutine", "note"]) {
      expect(getShape(k).fitsRectText).toBe(true);
    }
  });
  test("内接形状不定尺（几何盲会撑破轮廓）", () => {
    for (const k of ["circle", "diamond", "hexagon", "parallelogram", "trapezoid", "cylinder", "ellipse"]) {
      expect(getShape(k).fitsRectText).toBeFalsy();
    }
  });
});
