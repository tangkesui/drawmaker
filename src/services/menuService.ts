import { Menu, MenuItem, PredefinedMenuItem, Submenu } from "@tauri-apps/api/menu";
import { applyAutoLayout } from "../canvas/auto-layout";
import { viewport } from "../canvas/viewport-controls";
import {
  fileName,
  newDocument,
  openPath,
  openViaDialog,
  save,
  saveAs,
} from "../core/document-actions";
import { copySelection, cutSelection, pasteClipboard } from "../core/clipboard-actions";
import { redo, undo } from "../core/history";
import { deleteNodes, duplicateSelection, selectAll } from "../core/operations";
import { useEditorStore } from "../core/store";
import { readClipboardText } from "./clipboardService";
import { copyMermaid, exportMermaid, exportPdf, exportPng, exportSvg } from "./exportService";
import { importMermaidFromText } from "./importMermaid";
import { showError, showInfo } from "./notify";

/** 从系统剪贴板读 mermaid 文本并导入为可拖拽画布。 */
async function importMermaidFromClipboard(): Promise<void> {
  const result = await importMermaidFromText(await readClipboardText());
  if (!result.ok) await showInfo(result.msg ?? "导入失败");
}

/** 常用图初始模板（走导入路径，复用解析器）。 */
const TEMPLATES: { label: string; text: string }[] = [
  { label: "流程图", text: "flowchart TD\n  A[开始] --> B{判断}\n  B -->|是| C[处理]\n  B -->|否| D[结束]\n  C --> D" },
  {
    label: "时序图",
    text: "sequenceDiagram\n  participant U as 用户\n  participant S as 服务\n  U->>S: 请求\n  S-->>U: 响应",
  },
  { label: "状态图", text: "stateDiagram-v2\n  空闲 --> 运行: 启动\n  运行 --> 空闲: 停止" },
  {
    label: "类图",
    text: "classDiagram\n  class User\n  User : +name\n  User : +login()\n  User --> Account : owns",
  },
  { label: "ER 图", text: "erDiagram\n  CUSTOMER ||--o{ ORDER : places" },
];

async function insertTemplate(text: string): Promise<void> {
  const r = await importMermaidFromText(text);
  if (!r.ok) await showInfo(r.msg ?? "插入失败");
}

async function buildTemplateSubmenu(): Promise<Submenu> {
  const items = await Promise.all(
    TEMPLATES.map((t) => MenuItem.new({ text: t.label, action: run(() => insertTemplate(t.text)) })),
  );
  return Submenu.new({ text: "插入模板", items });
}

/** 把异步 action 包成 MenuItem 的 (id)=>void 回调，错误走原生对话框。 */
const run = (action: () => Promise<unknown>) => () => {
  action().catch(showError);
};

async function buildRecentSubmenu(): Promise<Submenu> {
  const { recent } = useEditorStore.getState().file;
  const items = recent.length
    ? await Promise.all(
        recent.map((path) =>
          MenuItem.new({ text: fileName(path), action: run(() => openPath(path)) }),
        ),
      )
    : [await MenuItem.new({ text: "（空）", enabled: false })];
  return Submenu.new({ text: "Open Recent", items });
}

async function buildMenu(): Promise<Menu> {
  const appMenu = await Submenu.new({
    text: "drawmaker",
    items: [
      await PredefinedMenuItem.new({ item: { About: null } }),
      await PredefinedMenuItem.new({ item: "Separator" }),
      await PredefinedMenuItem.new({ item: "Hide" }),
      await PredefinedMenuItem.new({ item: "HideOthers" }),
      await PredefinedMenuItem.new({ item: "ShowAll" }),
      await PredefinedMenuItem.new({ item: "Separator" }),
      await PredefinedMenuItem.new({ item: "Quit" }),
    ],
  });

  const fileMenu = await Submenu.new({
    text: "File",
    items: [
      await MenuItem.new({ text: "New", accelerator: "CmdOrCtrl+N", action: run(newDocument) }),
      await MenuItem.new({ text: "Open…", accelerator: "CmdOrCtrl+O", action: run(openViaDialog) }),
      await MenuItem.new({
        text: "Import Mermaid（剪贴板）",
        accelerator: "CmdOrCtrl+Shift+V",
        action: run(importMermaidFromClipboard),
      }),
      await buildTemplateSubmenu(),
      await buildRecentSubmenu(),
      await PredefinedMenuItem.new({ item: "Separator" }),
      await MenuItem.new({ text: "Save", accelerator: "CmdOrCtrl+S", action: run(save) }),
      await MenuItem.new({ text: "Save As…", accelerator: "CmdOrCtrl+Shift+S", action: run(saveAs) }),
      await PredefinedMenuItem.new({ item: "Separator" }),
      await Submenu.new({
        text: "Export",
        items: [
          await MenuItem.new({ text: "Mermaid (.mmd)…", action: run(exportMermaid) }),
          await PredefinedMenuItem.new({ item: "Separator" }),
          await MenuItem.new({ text: "SVG…", action: run(exportSvg) }),
          await MenuItem.new({ text: "PNG…", action: run(exportPng) }),
          await MenuItem.new({ text: "PDF…", action: run(exportPdf) }),
        ],
      }),
      await MenuItem.new({
        text: "Copy as Mermaid",
        accelerator: "CmdOrCtrl+Shift+M",
        action: run(copyMermaid),
      }),
      await PredefinedMenuItem.new({ item: "Separator" }),
      await PredefinedMenuItem.new({ item: "CloseWindow" }),
    ],
  });

  const editMenu = await Submenu.new({
    text: "Edit",
    items: [
      await MenuItem.new({ text: "Undo", accelerator: "CmdOrCtrl+Z", action: () => undo() }),
      await MenuItem.new({ text: "Redo", accelerator: "CmdOrCtrl+Shift+Z", action: () => redo() }),
      await PredefinedMenuItem.new({ item: "Separator" }),
      // 不绑 accelerator：⌘C/⌘X/⌘V/⌘D/⌘A 由 CanvasShortcuts 带焦点 guard 处理，
      // 避免无差别拦截文本框里的文字复制粘贴。
      await MenuItem.new({ text: "Cut (⌘X)", action: run(cutSelection) }),
      await MenuItem.new({ text: "Copy (⌘C)", action: run(copySelection) }),
      await MenuItem.new({ text: "Paste (⌘V)", action: run(pasteClipboard) }),
      await MenuItem.new({ text: "Duplicate (⌘D)", action: () => duplicateSelection() }),
      await PredefinedMenuItem.new({ item: "Separator" }),
      await MenuItem.new({ text: "Select All (⌘A)", action: () => selectAll() }),
      await PredefinedMenuItem.new({ item: "Separator" }),
      // Delete 不设 accelerator：让 xyflow 的 Backspace/Delete 独占按键
      await MenuItem.new({
        text: "Delete",
        action: () => deleteNodes(useEditorStore.getState().view.selected),
      }),
    ],
  });

  const viewMenu = await Submenu.new({
    text: "View",
    items: [
      await MenuItem.new({ text: "Zoom In", accelerator: "CmdOrCtrl+=", action: () => viewport.zoomIn() }),
      await MenuItem.new({ text: "Zoom Out", accelerator: "CmdOrCtrl+-", action: () => viewport.zoomOut() }),
      await MenuItem.new({ text: "Reset Zoom", accelerator: "CmdOrCtrl+0", action: () => viewport.resetZoom() }),
      await MenuItem.new({ text: "Fit", accelerator: "CmdOrCtrl+1", action: () => viewport.fitView() }),
      await PredefinedMenuItem.new({ item: "Separator" }),
      await MenuItem.new({ text: "Arrange ↓ (纵向)", accelerator: "CmdOrCtrl+L", action: () => applyAutoLayout("TB") }),
      await MenuItem.new({ text: "Arrange → (横向)", accelerator: "CmdOrCtrl+Shift+L", action: () => applyAutoLayout("LR") }),
    ],
  });

  return Menu.new({ items: [appMenu, fileMenu, editMenu, viewMenu] });
}

async function applyMenu(): Promise<void> {
  const menu = await buildMenu();
  await menu.setAsAppMenu();
}

let rebuilding = false;

/** 建立原生菜单，并在 recent 变化时重建 Open Recent。 */
export async function initMenu(): Promise<void> {
  await applyMenu();
  useEditorStore.subscribe((state, prev) => {
    if (state.file.recent !== prev.file.recent && !rebuilding) {
      rebuilding = true;
      applyMenu()
        .catch(showError)
        .finally(() => {
          rebuilding = false;
        });
    }
  });
}
