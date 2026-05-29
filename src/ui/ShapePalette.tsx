import { useState, type PointerEvent as ReactPointerEvent } from "react";
import { placeShapeAt } from "../canvas/placement";
import { shapesByCategory, type ShapeDef } from "../canvas/shapes/registry";
import "../canvas/shapes/shapes.css";
import "./shape-palette.css";

function Preview({ def }: { def: ShapeDef }) {
  const { width, height } = def.defaultSize;
  return (
    <svg
      className="shape-geom palette-preview"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {def.render(width, height)}
    </svg>
  );
}

/**
 * pointer 自实现拖拽：建一个跟随光标的 ghost，松手时若落在 .canvas-area 内就放置。
 * 不用 HTML5 draggable —— 会被 Tauri 的 OS 级文件拖放拦截。
 */
function startDrag(e: ReactPointerEvent, def: ShapeDef) {
  e.preventDefault();

  const ghost = document.createElement("div");
  ghost.className = "shape-drag-ghost";
  ghost.textContent = def.label;
  document.body.appendChild(ghost);

  const move = (ev: PointerEvent) => {
    ghost.style.left = `${ev.clientX + 10}px`;
    ghost.style.top = `${ev.clientY + 10}px`;
  };
  move(e.nativeEvent);

  const up = (ev: PointerEvent) => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    ghost.remove();
    const el = document.elementFromPoint(ev.clientX, ev.clientY);
    if (el?.closest(".canvas-area")) {
      placeShapeAt(def.kind, ev.clientX, ev.clientY);
    }
  };

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

/** 左侧形状调色板：搜索 + 分类折叠 + 拖拽放置。 */
export function ShapePalette() {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const q = query.trim().toLowerCase();
  const groups = shapesByCategory()
    .map((g) => ({
      category: g.category,
      shapes: q ? g.shapes.filter((s) => s.label.toLowerCase().includes(q)) : g.shapes,
    }))
    .filter((g) => g.shapes.length > 0);

  const toggle = (c: string) => setCollapsed((prev) => ({ ...prev, [c]: !prev[c] }));

  return (
    <aside className="shape-palette">
      <input
        className="palette-search"
        placeholder="搜索形状…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {groups.map((group) => {
        // 搜索中强制展开，便于看到匹配项
        const isCollapsed = !q && collapsed[group.category];
        return (
          <div key={group.category} className="palette-group">
            <button className="palette-cat" onClick={() => toggle(group.category)}>
              <span className={`palette-caret${isCollapsed ? " collapsed" : ""}`}>▾</span>
              {group.category}
            </button>
            {!isCollapsed && (
              <div className="palette-items">
                {group.shapes.map((def) => (
                  <div
                    key={def.kind}
                    className="palette-item"
                    onPointerDown={(e) => startDrag(e, def)}
                    title={`拖到画布：${def.label}`}
                  >
                    <Preview def={def} />
                    <span className="palette-name">{def.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}
