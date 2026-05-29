import { beforeEach, describe, expect, test } from "vitest";
import { createInitialState, useEditorStore } from "../store";
import { addNode, connectNodes, deleteNodes, moveNodes, updateNodeStyle, __resetIds } from "../operations";
import { canRedo, canUndo, redo, undo } from "../history";

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
