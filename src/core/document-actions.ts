import {
  loadDocument,
  openDialog,
  saveDialog,
  saveDocument,
} from "../services/fileService";
import { confirmDiscard } from "../services/notify";
import { getRecent, pushRecent } from "../services/recentFiles";
import { createEmptyDocument, useEditorStore } from "./store";
import type { DmDocument } from "./types";

export function fileName(path: string | null): string {
  if (!path) return "Untitled";
  return path.split("/").pop() || path;
}

/** 脏状态：自上次保存以来 history 是否有变化。 */
export function isDirty(): boolean {
  const s = useEditorStore.getState();
  return s.history.cursor !== s.file.savedCursor;
}

/** 未保存保护：dirty 时弹原生确认。true=放行，false=中止。 */
export async function confirmDiscardIfDirty(): Promise<boolean> {
  if (!isDirty()) return true;
  return confirmDiscard("有未保存的改动，确定放弃？");
}

/** 把加载好的文档灌入 store：替换 doc、清空 history（避免 ⌘Z 跨文件撤回）。 */
function applyLoaded(path: string, doc: DmDocument): void {
  useEditorStore.setState((s) => ({
    doc,
    history: { stack: [], cursor: -1 },
    view: { ...s.view, selected: [] },
    file: { ...s.file, currentPath: path, savedCursor: -1 },
  }));
}

/** 不过未保存关卡的内部打开（供 openPath / openViaDialog 复用，避免双重确认）。 */
async function finishOpen(path: string): Promise<void> {
  const doc = await loadDocument(path);
  applyLoaded(path, doc);
  const recent = await pushRecent(path);
  useEditorStore.setState((s) => ({ file: { ...s.file, recent } }));
}

/** 新建：清空 doc、history、文件状态（先过未保存关卡）。 */
export async function newDocument(): Promise<void> {
  if (!(await confirmDiscardIfDirty())) return;
  useEditorStore.setState((s) => ({
    doc: createEmptyDocument(),
    history: { stack: [], cursor: -1 },
    view: { ...s.view, selected: [] },
    file: { ...s.file, currentPath: null, savedCursor: -1 },
  }));
}

export async function openPath(path: string): Promise<void> {
  if (!(await confirmDiscardIfDirty())) return;
  await finishOpen(path);
}

export async function openViaDialog(): Promise<void> {
  if (!(await confirmDiscardIfDirty())) return;
  const path = await openDialog();
  if (!path) return;
  await finishOpen(path);
}

async function writeTo(path: string): Promise<void> {
  const { doc, history } = useEditorStore.getState();
  await saveDocument(path, doc);
  const recent = await pushRecent(path);
  // 保存点 = 当前 history cursor；之后 dirty 派生自动归零
  useEditorStore.setState((s) => ({
    file: { ...s.file, currentPath: path, savedCursor: history.cursor, recent },
  }));
}

/** 保存：无 currentPath 时退化为另存为。 */
export async function save(): Promise<void> {
  const { file } = useEditorStore.getState();
  if (!file.currentPath) {
    await saveAs();
    return;
  }
  await writeTo(file.currentPath);
}

export async function saveAs(): Promise<void> {
  const { file } = useEditorStore.getState();
  const suggested = fileName(file.currentPath ?? "untitled.dm");
  const path = await saveDialog(suggested);
  if (!path) return;
  await writeTo(path);
}

/** 启动时加载最近列表到 store。 */
export async function loadRecentList(): Promise<void> {
  const recent = await getRecent();
  useEditorStore.setState((s) => ({ file: { ...s.file, recent } }));
}
