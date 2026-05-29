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
import { redo, undo } from "../core/history";
import { deleteNodes } from "../core/operations";
import { useEditorStore } from "../core/store";
import { showError } from "./notify";

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
      await buildRecentSubmenu(),
      await PredefinedMenuItem.new({ item: "Separator" }),
      await MenuItem.new({ text: "Save", accelerator: "CmdOrCtrl+S", action: run(save) }),
      await MenuItem.new({ text: "Save As…", accelerator: "CmdOrCtrl+Shift+S", action: run(saveAs) }),
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
      await PredefinedMenuItem.new({ item: "Cut" }),
      await PredefinedMenuItem.new({ item: "Copy" }),
      await PredefinedMenuItem.new({ item: "Paste" }),
      await PredefinedMenuItem.new({ item: "SelectAll" }),
      await PredefinedMenuItem.new({ item: "Separator" }),
      // Delete 不设 accelerator：让 xyflow 的 Backspace/Delete 独占按键，避免冲突
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
