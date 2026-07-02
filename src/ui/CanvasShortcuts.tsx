import { useEffect } from "react";
import { copySelection, cutSelection, pasteClipboard } from "../core/clipboard-actions";
import { redo, undo } from "../core/history";
import { duplicateSelection, moveNodes, selectAll } from "../core/operations";
import { useEditorStore } from "../core/store";
import { groupControls } from "../canvas/group-controls";
import { setMenuTextMode } from "../services/menuService";

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

/** 焦点在可编辑元素里 → 交给系统做文字操作（原生 Edit 菜单角色项），不触发节点操作。 */
export function isEditable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
}

/**
 * 画布快捷键。⌘ 系列的主路径在原生菜单（menuService 的画布加速键项——wry/WKWebView 下
 * 菜单加速键完全吞键，webview JS 收不到 keydown，实测确认）；这里的 keydown 是兜底
 * （菜单未建成/未命中时），外加菜单没占的键：⌘G 编组、方向键微移。
 * 本组件还负责焦点跟踪：输入焦点进出时切换菜单模式（画布加速键项 vs 原生文本角色项）。
 */
export function CanvasShortcuts() {
  // 焦点跟踪 → 菜单模式。focusout 时 activeElement 尚未落定，defer 一拍再读。
  useEffect(() => {
    let timer = 0;
    const sync = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void setMenuTextMode(isEditable(document.activeElement)).catch(() => {});
      }, 0);
    };
    window.addEventListener("focusin", sync);
    window.addEventListener("focusout", sync);
    sync();
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focusin", sync);
      window.removeEventListener("focusout", sync);
    };
  }, []);

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
        case "KeyZ":
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
          break;
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
