import { useEffect } from "react";
import {
  copySelection,
  cutSelection,
  duplicateSelection,
  pasteClipboard,
  selectAll,
} from "../core/operations";

/** 焦点在可编辑元素里 → 交给系统做文字操作，不触发节点操作。 */
function isEditable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
}

/**
 * 画布快捷键：⌘C/⌘X/⌘V/⌘D/⌘A。
 * 不挂原生菜单 accelerator —— 那会无差别拦截文本框里的 ⌘C/⌘V。
 * 这里带焦点 guard：在输入框/contentEditable 内直接放行给系统。
 */
export function CanvasShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      if (isEditable(e.target)) return;
      switch (e.key.toLowerCase()) {
        case "c":
          e.preventDefault();
          copySelection();
          break;
        case "x":
          e.preventDefault();
          cutSelection();
          break;
        case "v":
          e.preventDefault();
          pasteClipboard();
          break;
        case "d":
          e.preventDefault();
          duplicateSelection();
          break;
        case "a":
          e.preventDefault();
          selectAll();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return null;
}
