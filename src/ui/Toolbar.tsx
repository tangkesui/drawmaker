import { newDocument, openViaDialog, save } from "../core/document-actions";
import { redo, undo } from "../core/history";
import { deleteNodes } from "../core/operations";
import { useEditorStore } from "../core/store";
import { showError } from "../services/notify";
import "./toolbar.css";

export function Toolbar() {
  const cursor = useEditorStore((s) => s.history.cursor);
  const stackLen = useEditorStore((s) => s.history.stack.length);
  const selectedCount = useEditorStore((s) => s.view.selected.length);
  const dirty = useEditorStore((s) => s.history.cursor !== s.file.savedCursor);

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button onClick={() => newDocument().catch(showError)} title="New (⌘N)">
          New
        </button>
        <button onClick={() => openViaDialog().catch(showError)} title="Open (⌘O)">
          Open
        </button>
        <button disabled={!dirty} onClick={() => save().catch(showError)} title="Save (⌘S)">
          Save
        </button>
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
