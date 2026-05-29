import { describe, expect, test } from "vitest";
import { computeExportBox, dataUrlToBytes, EXPORT_PADDING } from "../export-utils";

describe("export-utils", () => {
  test("computeExportBox adds padding both sides and translates to origin", () => {
    const box = computeExportBox({ x: 100, y: 50, width: 200, height: 80 });
    expect(box.width).toBe(200 + EXPORT_PADDING * 2);
    expect(box.height).toBe(80 + EXPORT_PADDING * 2);
    expect(box.transform).toBe(
      `translate(${-100 + EXPORT_PADDING}px, ${-50 + EXPORT_PADDING}px) scale(1)`,
    );
  });

  test("dataUrlToBytes decodes the base64 payload", () => {
    // "hi" → base64 "aGk="
    const bytes = dataUrlToBytes("data:image/png;base64,aGk=");
    expect(Array.from(bytes)).toEqual([104, 105]);
  });
});
