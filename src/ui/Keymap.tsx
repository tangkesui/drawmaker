import { useHotkeys } from "react-hotkeys-hook";
import { useEditorStore } from "../core/store";
import type { Tool } from "../core/types";

function setTool(t: Tool) {
  useEditorStore.setState((s) => ({ view: { ...s.view, tool: t } }));
}

/**
 * 只负责编辑器工具键（V/R/E）。
 * App 级命令（New/Open/Save/Save As/Undo/Redo）已归口原生菜单的 accelerator，
 * 这里不再注册，避免与菜单双触发。删除走 xyflow 内建 deleteKeyCode。
 */
export function Keymap() {
  useHotkeys("v", () => setTool("select"));
  useHotkeys("r", () => setTool("rect"));
  useHotkeys("e", () => setTool("ellipse"));

  return null;
}
