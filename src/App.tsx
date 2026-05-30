import { useEffect } from "react";
import { loadRecentList } from "./core/document-actions";
import { useEditorStore } from "./core/store";
import { Canvas } from "./canvas/Canvas";
import { initDragDrop } from "./services/dragDropService";
import { initMenu } from "./services/menuService";
import { showError } from "./services/notify";
import { initCloseGuard } from "./services/windowService";
import { PropertiesPanel } from "./ui/PropertiesPanel";
import { CanvasShortcuts } from "./ui/CanvasShortcuts";
import { ShapePalette } from "./ui/ShapePalette";
import { TitleSync } from "./ui/TitleSync";
import { Toolbar } from "./ui/Toolbar";
import "./App.css";

function StatusBar() {
  const currentPath = useEditorStore((s) => s.file.currentPath);
  const dirty = useEditorStore((s) => s.history.cursor !== s.file.savedCursor);
  const state = dirty ? "未保存" : currentPath ? "已保存" : "";

  return (
    <footer className="statusbar">
      <span>{currentPath ?? "未命名"}</span>
      {state && <span className="statusbar-state">{state}</span>}
    </footer>
  );
}

export default function App() {
  useEffect(() => {
    (async () => {
      await loadRecentList();
      await initMenu();
      await initCloseGuard();
      await initDragDrop();
    })().catch(showError);
  }, []);

  return (
    <div className="layout">
      <TitleSync />
      <CanvasShortcuts />
      <Toolbar />
      <div className="workspace">
        <ShapePalette />
        <main className="canvas-area">
          <Canvas />
        </main>
        <PropertiesPanel />
      </div>
      <StatusBar />
    </div>
  );
}
