import { readClipboardText, writeClipboardText } from "../services/clipboardService";
import { parseClip, serializeClip } from "./clipboard";
import { deleteNodes, getSelectionClip, pasteClip } from "./operations";
import { useEditorStore } from "./store";

/**
 * 系统剪贴板复制/剪切/粘贴的协调层（类比 document-actions）：
 * 组合 core 纯逻辑（getSelectionClip / pasteClip）与 services 的系统剪贴板 IO。
 * 文字编辑框（input/textarea）内的复制粘贴由 CanvasShortcuts 焦点 guard 放行给系统，不经这里。
 */

export async function copySelection(): Promise<void> {
  const clip = getSelectionClip();
  if (!clip) return;
  await writeClipboardText(serializeClip(clip));
}

export async function cutSelection(): Promise<void> {
  const clip = getSelectionClip();
  if (!clip) return;
  await writeClipboardText(serializeClip(clip));
  deleteNodes(useEditorStore.getState().view.selected);
}

/** 粘贴：读系统剪贴板，是 drawmaker 内容才放置；外部文本静默忽略（画布不变）。 */
export async function pasteClipboard(): Promise<void> {
  const clip = parseClip(await readClipboardText());
  if (clip) pasteClip(clip);
}
