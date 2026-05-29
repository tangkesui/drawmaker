import { useState } from "react";
import { fileName, openPath } from "../core/document-actions";
import { useEditorStore } from "../core/store";
import { showError } from "../services/notify";

export function RecentMenu() {
  const recent = useEditorStore((s) => s.file.recent);
  const [open, setOpen] = useState(false);

  return (
    <div className="recent-menu">
      <button disabled={recent.length === 0} onClick={() => setOpen((v) => !v)} title="最近打开">
        Recent ▾
      </button>
      {open && recent.length > 0 && (
        <ul className="recent-list" onMouseLeave={() => setOpen(false)}>
          {recent.map((p) => (
            <li key={p}>
              <button
                title={p}
                onClick={() => {
                  setOpen(false);
                  openPath(p).catch(showError);
                }}
              >
                {fileName(p)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
