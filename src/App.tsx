import { useEffect } from "react";
import { loadRecentList } from "./core/document-actions";
import { useEditorStore } from "./core/store";
import { Canvas } from "./canvas/Canvas";
import { Keymap } from "./ui/Keymap";
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
    loadRecentList().catch(() => {});
  }, []);

  return (
    <div className="layout">
      <Keymap />
      <TitleSync />
      <Toolbar />
      <main className="canvas-area">
        <Canvas />
      </main>
      <StatusBar />
    </div>
  );
}
