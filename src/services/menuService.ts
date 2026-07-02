import { Menu, MenuItem, PredefinedMenuItem, Submenu } from "@tauri-apps/api/menu";
import { applyAutoLayout } from "../canvas/auto-layout";
import { applyElkLayout } from "../canvas/elk-layout";
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

/**
 * 菜单模式。macOS 的加速键匹配是"菜单顺序首个命中者赢，禁用项也算命中且吞键"（实测），
 * 所以模式切换必须**重建菜单**改变加速键归属，不能只 setEnabled：
 * - 画布模式：画布项挂 ⌘Z/⌘X/⌘C/⌘V/⌘D/⌘A（排在前，先命中）；
 * - 文本模式：画布项摘掉加速键并置灰 → 原生文本角色项成为首个命中者，文字编辑生效。
 */
let textMode = false;

/** 菜单重建串行队列：焦点连续切换时保证最终状态一致（不并发 setAsAppMenu）。 */
let menuQueue: Promise<void> = Promise.resolve();

function queueApplyMenu(): Promise<void> {
  menuQueue = menuQueue.then(applyMenu).catch(showError);
  return menuQueue;
}

/** 焦点进出输入框时切换菜单模式（由 CanvasShortcuts 的焦点跟踪调用）。 */
export function setMenuTextMode(next: boolean): Promise<void> {
  if (next === textMode) return menuQueue;
  textMode = next;
  return queueApplyMenu();
}

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

  // 画布快捷键项：画布模式挂加速键（排在前，首个命中）；文本模式摘加速键 + 置灰。
  // 实测（wry/WKWebView）：菜单加速键完全吞键、webview JS 收不到 keydown，所以画布
  // 快捷键必须走菜单动作，不能指望 CanvasShortcuts 的 keydown（那只是无菜单时的兜底）。
  const canvasItem = (text: string, accelerator: string, action: () => void) =>
    MenuItem.new({ text, enabled: !textMode, ...(textMode ? {} : { accelerator }), action });
  const canvasItems = [
    await canvasItem("撤销", "CmdOrCtrl+Z", () => undo()),
    await canvasItem("重做", "CmdOrCtrl+Shift+Z", () => redo()),
    await canvasItem("剪切节点", "CmdOrCtrl+X", run(cutSelection)),
    await canvasItem("复制节点", "CmdOrCtrl+C", run(copySelection)),
    await canvasItem("粘贴节点", "CmdOrCtrl+V", run(pasteClipboard)),
    await canvasItem("再制", "CmdOrCtrl+D", () => duplicateSelection()),
    await canvasItem("全选节点", "CmdOrCtrl+A", () => selectAll()),
  ];

  const editMenu = await Submenu.new({
    text: "Edit",
    items: [
      ...canvasItems,
      await PredefinedMenuItem.new({ item: "Separator" }),
      // 原生角色项：macOS WKWebView 里文本框的 ⌘Z/⌘X/⌘C/⌘V/⌘A 必须经由菜单原生
      // selector（undo:/copy:/paste:…）沿 responder 链下发才会生效——没有这些项，
      // 输入框内的文字复制粘贴整体失灵（实测确认）。
      await PredefinedMenuItem.new({ item: "Undo", text: "撤销（文本）" }),
      await PredefinedMenuItem.new({ item: "Redo", text: "重做（文本）" }),
      await PredefinedMenuItem.new({ item: "Cut", text: "剪切（文本）" }),
      await PredefinedMenuItem.new({ item: "Copy", text: "复制（文本）" }),
      await PredefinedMenuItem.new({ item: "Paste", text: "粘贴（文本）" }),
      await PredefinedMenuItem.new({ item: "SelectAll", text: "全选（文本）" }),
      await PredefinedMenuItem.new({ item: "Separator" }),
      // Delete 不设 accelerator：让 xyflow 的 Backspace/Delete 独占按键
      await MenuItem.new({
        text: "删除所选",
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
      await PredefinedMenuItem.new({ item: "Separator" }),
      await MenuItem.new({ text: "正交布局 ↓ (elk)", action: run(() => applyElkLayout("DOWN")) }),
      await MenuItem.new({ text: "正交布局 → (elk)", action: run(() => applyElkLayout("RIGHT")) }),
    ],
  });

  return Menu.new({ items: [appMenu, fileMenu, editMenu, viewMenu] });
}

async function applyMenu(): Promise<void> {
  const menu = await buildMenu();
  await menu.setAsAppMenu();
}

/** 建立原生菜单，并在 recent 变化时重建 Open Recent（经同一串行队列）。 */
export async function initMenu(): Promise<void> {
  await queueApplyMenu();
  useEditorStore.subscribe((state, prev) => {
    if (state.file.recent !== prev.file.recent) void queueApplyMenu();
  });
}
