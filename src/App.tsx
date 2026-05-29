import { Canvas } from "./canvas/Canvas";
import { Keymap } from "./ui/Keymap";
import { Toolbar } from "./ui/Toolbar";
import "./App.css";

export default function App() {
  return (
    <div className="layout">
      <Keymap />
      <Toolbar />
      <main className="canvas-area">
        <Canvas />
      </main>
      <footer className="statusbar">drawmaker</footer>
    </div>
  );
}
