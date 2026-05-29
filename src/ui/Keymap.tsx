import { useHotkeys } from "react-hotkeys-hook";
import { redo, undo } from "../core/history";
import { useEditorStore } from "../core/store";
import type { Tool } from "../core/types";

function setTool(t: Tool) {
  useEditorStore.setState((s) => ({ view: { ...s.view, tool: t } }));
}

/**
 * 全局快捷键。挂载即注册，本身不渲染任何内容。
 * 删除走 xyflow 内建（deleteKeyCode），此处不重复注册，避免双路径。
 */
export function Keymap() {
  useHotkeys("mod+z", (e) => {
    e.preventDefault();
    undo();
  });
  useHotkeys("mod+shift+z", (e) => {
    e.preventDefault();
    redo();
  });
  useHotkeys("v", () => setTool("select"));
  useHotkeys("r", () => setTool("rect"));
  useHotkeys("e", () => setTool("ellipse"));

  return null;
}
