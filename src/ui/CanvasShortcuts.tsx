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
      // 用 e.code（物理键，IME/布局无关）；捕获阶段在 ReactFlow 吞键之前先处理。
      switch (e.code) {
        case "KeyC":
          e.preventDefault();
          copySelection();
          break;
        case "KeyX":
          e.preventDefault();
          cutSelection();
          break;
        case "KeyV":
          e.preventDefault();
          pasteClipboard();
          break;
        case "KeyD":
          e.preventDefault();
          duplicateSelection();
          break;
        case "KeyA":
          e.preventDefault();
          selectAll();
          break;
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  return null;
}
