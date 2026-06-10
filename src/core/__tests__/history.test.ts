import { beforeEach, describe, expect, test } from "vitest";
import { createInitialState, useEditorStore } from "../store";
import { addNode, connectNodes, deleteNodes, moveNodes, updateNodeStyle, __resetIds } from "../operations";
import { canRedo, canUndo, commit, MAX_HISTORY, redo, undo } from "../history";

beforeEach(() => {
  useEditorStore.setState(createInitialState(), true);
  __resetIds();
});

const doc = () => useEditorStore.getState().doc;

describe("history (patch-based)", () => {
  test("add → undo → redo round-trip", () => {
    addNode("rect", { x: 0, y: 0 });
    expect(doc().nodes).toHaveLength(1);
    undo();
    expect(doc().nodes).toHaveLength(0);
    redo();
    expect(doc().nodes).toHaveLength(1);
  });

  test("move → undo restores old position", () => {
    const id = addNode("rect", { x: 10, y: 10 });
    moveNodes([{ id, position: { x: 200, y: 200 } }]);
    expect(doc().nodes[0].position).toEqual({ x: 200, y: 200 });
    undo();
    expect(doc().nodes[0].position).toEqual({ x: 10, y: 10 });
  });

  test("delete node also removes its edges; undo restores both", () => {
    const a = addNode("rect", { x: 0, y: 0 });
    const b = addNode("ellipse", { x: 100, y: 0 });
    connectNodes(a, b);
    expect(doc().edges).toHaveLength(1);

    deleteNodes([a]);
    expect(doc().nodes).toHaveLength(1);
    expect(doc().edges).toHaveLength(0);

    undo();
    expect(doc().nodes).toHaveLength(2);
    expect(doc().edges).toHaveLength(1);
  });

  test("a new commit truncates the redo branch", () => {
    addNode("rect", { x: 0, y: 0 });
    addNode("rect", { x: 50, y: 50 });
    undo();
    expect(doc().nodes).toHaveLength(1);

    addNode("ellipse", { x: 99, y: 99 });
    expect(canRedo()).toBe(false);
    expect(doc().nodes).toHaveLength(2);
  });

  test("updateNodeStyle changes data; undo reverts", () => {
    const id = addNode("rect", { x: 0, y: 0 });
    updateNodeStyle([id], { fill: "#ff0000", strokeWidth: 3 });
    expect(doc().nodes[0].data.fill).toBe("#ff0000");
    expect(doc().nodes[0].data.strokeWidth).toBe(3);
    undo();
    expect(doc().nodes[0].data.fill).toBeUndefined();
  });

  test("canUndo / canRedo track the cursor", () => {
    expect(canUndo()).toBe(false);
    expect(canRedo()).toBe(false);

    addNode("rect", { x: 0, y: 0 });
    expect(canUndo()).toBe(true);
    expect(canRedo()).toBe(false);

    undo();
    expect(canUndo()).toBe(false);
    expect(canRedo()).toBe(true);
  });
});

describe("history cap & savedCursor integrity", () => {
  const state = () => useEditorStore.getState();
  const markSaved = () =>
    useEditorStore.setState((s) => ({
      file: { ...s.file, savedCursor: s.history.cursor },
    }));
  const dirty = () => state().history.cursor !== state().file.savedCursor;

  test("stack is capped at MAX_HISTORY, oldest entries dropped, undo still works", () => {
    for (let i = 0; i < MAX_HISTORY + 20; i++) {
      commit(`tick ${i}`, (d) => {
        d.meta.title = `t${i}`;
      });
    }
    expect(state().history.stack).toHaveLength(MAX_HISTORY);
    expect(state().history.cursor).toBe(MAX_HISTORY - 1);
    // 最旧的 20 条被丢弃，留下的第一条是 tick 20
    expect(state().history.stack[0].label).toBe("tick 20");

    undo();
    expect(state().doc.meta.title).toBe(`t${MAX_HISTORY + 18}`);
  });

  test("savedCursor shifts with trimming and stays reachable", () => {
    // 先做几步，在第 5 步保存
    for (let i = 0; i < 6; i++) {
      commit(`pre ${i}`, (d) => {
        d.meta.title = `p${i}`;
      });
    }
    markSaved(); // savedCursor = 5
    // 再推 MAX_HISTORY - 3 步 → 总长超限，裁掉最旧 3 条
    for (let i = 0; i < MAX_HISTORY - 3; i++) {
      commit(`post ${i}`, (d) => {
        d.meta.title = `q${i}`;
      });
    }
    expect(state().history.stack).toHaveLength(MAX_HISTORY);
    // 保存点平移：5 - 3 = 2，且 undo 回到保存点时 dirty 归零
    expect(state().file.savedCursor).toBe(2);
    while (state().history.cursor !== state().file.savedCursor) undo();
    expect(state().doc.meta.title).toBe("p5");
    expect(dirty()).toBe(false);
  });

  test("savedCursor trimmed away → permanently dirty until next save", () => {
    commit("first", (d) => {
      d.meta.title = "first";
    });
    markSaved(); // savedCursor = 0
    for (let i = 0; i < MAX_HISTORY; i++) {
      commit(`flood ${i}`, (d) => {
        d.meta.title = `f${i}`;
      });
    }
    // 保存点（index 0）已被裁掉：撤到底也回不到保存状态 → 必须恒 dirty
    while (canUndo()) undo();
    expect(dirty()).toBe(true);
  });

  test("commit after undo invalidates a savedCursor in the truncated redo branch", () => {
    commit("a", (d) => {
      d.meta.title = "a";
    });
    commit("b", (d) => {
      d.meta.title = "b";
    });
    markSaved(); // 保存于 b（savedCursor = 1）
    undo(); // 回到 a
    commit("c", (d) => {
      d.meta.title = "c";
    });
    // 新 cursor 恰好也是 1，但内容是 c ≠ 保存的 b——不能误判为干净
    expect(state().history.cursor).toBe(1);
    expect(dirty()).toBe(true);
    // 且撤销到任何位置都不应变干净
    while (canUndo()) {
      undo();
      expect(dirty()).toBe(true);
    }
  });
});
