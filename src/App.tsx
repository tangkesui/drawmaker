import { useEffect, useState } from "react";
import { loadRecentList } from "./core/document-actions";
import { useEditorStore } from "./core/store";
import { isDataDiagram, type DataDiagramType } from "./core/types";
import { Canvas } from "./canvas/Canvas";
import { DataEditor } from "./ui/DataEditor";
import { initDragDrop } from "./services/dragDropService";
import { initMenu } from "./services/menuService";
import { showError } from "./services/notify";
import { initCloseGuard } from "./services/windowService";
import { PropertiesPanel } from "./ui/PropertiesPanel";
import { CanvasShortcuts, isEditable } from "./ui/CanvasShortcuts";
import { MermaidPanel } from "./ui/MermaidPanel";
import { ShapePalette } from "./ui/ShapePalette";
import { TitleSync } from "./ui/TitleSync";
import { Toolbar } from "./ui/Toolbar";
import "./App.css";
import "./theme.css";

/** 暗/亮主题切换：data-theme 挂 <html>，localStorage 持久化。 */
function ThemeToggle() {
  const [dark, setDark] = useState(() => localStorage.getItem("drawmaker-theme") === "dark");
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("drawmaker-theme", dark ? "dark" : "light");
  }, [dark]);
  return (
    <button className="theme-toggle" onClick={() => setDark((v) => !v)}>
      {dark ? "亮色" : "暗色"}
    </button>
  );
}

function StatusBar() {
  const currentPath = useEditorStore((s) => s.file.currentPath);
  const dirty = useEditorStore((s) => s.history.cursor !== s.file.savedCursor);
  const state = dirty ? "未保存" : currentPath ? "已保存" : "";

  return (
    <footer className="statusbar">
      <span>{currentPath ?? "未命名"}</span>
      <span className="statusbar-right">
        {state && <span className="statusbar-state">{state}</span>}
        <ThemeToggle />
      </span>
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
      <Workspace />
      <StatusBar />
    </div>
  );
}

/**
 * 点画布时把焦点从输入框里解放出来：xyflow 的 pane/节点在 mousedown 上 preventDefault，
 * 浏览器不会自动 blur 已聚焦的输入框（如 Mermaid 面板），此后所有快捷键都被焦点 guard
 * 判成"文字编辑"而失灵。这里在捕获阶段主动 blur（点中的目标本身可编辑时不动）。
 */
function escapeEditableFocus(e: React.PointerEvent) {
  const active = document.activeElement;
  if (!isEditable(e.target) && isEditable(active)) (active as HTMLElement).blur();
}

/** 工作区：graph 家族用节点-连线画布；数据/时间家族用表格编辑器。 */
function Workspace() {
  const diagramType = useEditorStore((s) => s.doc.meta.diagramType ?? "flowchart");
  const dataMode = isDataDiagram(diagramType);

  return (
    <div className="workspace">
      {!dataMode && <ShapePalette />}
      <main className="canvas-area" onPointerDownCapture={escapeEditableFocus}>
        {dataMode ? <DataEditor type={diagramType as DataDiagramType} /> : <Canvas />}
      </main>
      {!dataMode && <PropertiesPanel />}
      <MermaidPanel />
    </div>
  );
}
