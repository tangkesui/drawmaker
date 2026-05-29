import { newDocument, openViaDialog, save } from "../core/document-actions";
import { redo, undo } from "../core/history";
import { deleteNodes } from "../core/operations";
import { useEditorStore } from "../core/store";
import type { Tool } from "../core/types";
import { showError } from "../services/notify";
import { RecentMenu } from "./RecentMenu";
import "./toolbar.css";

const TOOLS: { id: Tool; label: string; key: string }[] = [
  { id: "select", label: "Select", key: "V" },
  { id: "rect", label: "Rect", key: "R" },
  { id: "ellipse", label: "Ellipse", key: "E" },
];

function setTool(t: Tool) {
  useEditorStore.setState((s) => ({ view: { ...s.view, tool: t } }));
}

export function Toolbar() {
  const tool = useEditorStore((s) => s.view.tool);
  const cursor = useEditorStore((s) => s.history.cursor);
  const stackLen = useEditorStore((s) => s.history.stack.length);
  const selectedCount = useEditorStore((s) => s.view.selected.length);
  const dirty = useEditorStore((s) => s.history.cursor !== s.file.savedCursor);

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button onClick={newDocument} title="New (⌘N)">
          New
        </button>
        <button onClick={() => openViaDialog().catch(showError)} title="Open (⌘O)">
          Open
        </button>
        <button disabled={!dirty} onClick={() => save().catch(showError)} title="Save (⌘S)">
          Save
        </button>
        <RecentMenu />
      </div>

      <span className="toolbar-sep" />

      <div className="toolbar-group">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={tool === t.id ? "is-active" : ""}
            onClick={() => setTool(t.id)}
            title={`${t.label} (${t.key})`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <span className="toolbar-sep" />

      <div className="toolbar-group">
        <button
          disabled={selectedCount === 0}
          onClick={() => deleteNodes(useEditorStore.getState().view.selected)}
          title="Delete (⌫)"
        >
          Delete
        </button>
      </div>

      <span className="toolbar-sep" />

      <div className="toolbar-group">
        <button disabled={cursor < 0} onClick={undo} title="Undo (⌘Z)">
          Undo
        </button>
        <button disabled={cursor >= stackLen - 1} onClick={redo} title="Redo (⌘⇧Z)">
          Redo
        </button>
      </div>
    </div>
  );
}
