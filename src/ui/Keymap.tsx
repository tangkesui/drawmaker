import { useHotkeys } from "react-hotkeys-hook";
import { newDocument, openViaDialog, save, saveAs } from "../core/document-actions";
import { redo, undo } from "../core/history";
import { useEditorStore } from "../core/store";
import type { Tool } from "../core/types";
import { showError } from "../services/notify";

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

  useHotkeys("mod+n", (e) => {
    e.preventDefault();
    newDocument();
  });
  useHotkeys("mod+o", (e) => {
    e.preventDefault();
    openViaDialog().catch(showError);
  });
  useHotkeys("mod+s", (e) => {
    e.preventDefault();
    save().catch(showError);
  });
  useHotkeys("mod+shift+s", (e) => {
    e.preventDefault();
    saveAs().catch(showError);
  });

  return null;
}
