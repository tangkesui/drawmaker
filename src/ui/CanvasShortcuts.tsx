import { useEffect } from "react";
import { copySelection, cutSelection, pasteClipboard } from "../core/clipboard-actions";
import { duplicateSelection, moveNodes, selectAll } from "../core/operations";
import { useEditorStore } from "../core/store";
import { groupControls } from "../canvas/group-controls";

/** 方向键微移选中节点（1px，Shift=10px）。容器子节点用相对坐标，moveNodes 直接加即可。 */
const NUDGE: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};
function nudge(code: string, big: boolean): boolean {
  const d = NUDGE[code];
  if (!d) return false;
  const k = big ? 10 : 1;
  const { doc, view } = useEditorStore.getState();
  const sel = new Set(view.selected);
  const moves = doc.nodes
    .filter((n) => sel.has(n.id))
    .map((n) => ({ id: n.id, position: { x: n.position.x + d[0] * k, y: n.position.y + d[1] * k } }));
  if (moves.length === 0) return false;
  moveNodes(moves);
  return true;
}

/** 复制/剪切/粘贴走系统剪贴板（异步）；keydown 里 fire-and-forget，吞掉偶发 IO 异常。 */
const fire = (p: Promise<unknown>) => void p.catch(() => {});

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
      if (isEditable(e.target)) return;
      // 方向键微移（无 ⌘/Ctrl/Alt）
      if (!e.metaKey && !e.ctrlKey && !e.altKey && nudge(e.code, e.shiftKey)) {
        e.preventDefault();
        return;
      }
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      // 用 e.code（物理键，IME/布局无关）；捕获阶段在 ReactFlow 吞键之前先处理。
      switch (e.code) {
        case "KeyC":
          e.preventDefault();
          fire(copySelection());
          break;
        case "KeyX":
          e.preventDefault();
          fire(cutSelection());
          break;
        case "KeyV":
          e.preventDefault();
          fire(pasteClipboard());
          break;
        case "KeyD":
          e.preventDefault();
          duplicateSelection();
          break;
        case "KeyA":
          e.preventDefault();
          selectAll();
          break;
        case "KeyG":
          e.preventDefault();
          if (e.shiftKey) groupControls.ungroup();
          else groupControls.group();
          break;
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  return null;
}
