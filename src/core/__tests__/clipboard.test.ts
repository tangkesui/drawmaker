import { beforeEach, describe, expect, test } from "vitest";
import { setClipboard } from "../clipboard";
import { undo } from "../history";
import {
  addNode,
  connectNodes,
  copySelection,
  cutSelection,
  duplicateSelection,
  pasteClipboard,
  resizeNode,
  selectAll,
  __resetIds,
} from "../operations";
import { createInitialState, useEditorStore } from "../store";

beforeEach(() => {
  useEditorStore.setState(createInitialState(), true);
  __resetIds();
  setClipboard({ nodes: [], edges: [] });
});

const doc = () => useEditorStore.getState().doc;
const selected = () => useEditorStore.getState().view.selected;
const select = (ids: string[]) =>
  useEditorStore.setState((s) => ({ view: { ...s.view, selected: ids } }));

describe("clipboard / duplicate / select", () => {
  test("copy + paste duplicates selected nodes and internal edges; undo reverts", () => {
    const a = addNode("rect", { x: 0, y: 0 });
    const b = addNode("ellipse", { x: 100, y: 0 });
    connectNodes(a, b);
    select([a, b]);

    copySelection();
    pasteClipboard();
    expect(doc().nodes).toHaveLength(4);
    expect(doc().edges).toHaveLength(2);
    expect(selected()).toHaveLength(2); // 粘贴出的新节点被选中

    undo();
    expect(doc().nodes).toHaveLength(2);
    expect(doc().edges).toHaveLength(1);
  });

  test("paste offsets position and assigns new ids", () => {
    const a = addNode("rect", { x: 10, y: 20 });
    select([a]);
    copySelection();
    pasteClipboard();
    const pasted = doc().nodes[1];
    expect(pasted.id).not.toBe(a);
    expect(pasted.position).toEqual({ x: 34, y: 44 });
  });

  test("only edges with both endpoints selected are copied", () => {
    const a = addNode("rect", { x: 0, y: 0 });
    const b = addNode("rect", { x: 100, y: 0 });
    connectNodes(a, b);
    select([a]); // 只选 a
    copySelection();
    pasteClipboard();
    expect(doc().nodes).toHaveLength(3);
    expect(doc().edges).toHaveLength(1); // 不复制悬空边
  });

  test("cut removes selection into clipboard; paste restores", () => {
    const a = addNode("rect", { x: 0, y: 0 });
    select([a]);
    cutSelection();
    expect(doc().nodes).toHaveLength(0);
    pasteClipboard();
    expect(doc().nodes).toHaveLength(1);
  });

  test("duplicate copies current selection without using clipboard", () => {
    const a = addNode("rect", { x: 0, y: 0 });
    select([a]);
    duplicateSelection();
    expect(doc().nodes).toHaveLength(2);
  });

  test("selectAll selects every node", () => {
    addNode("rect", { x: 0, y: 0 });
    addNode("rect", { x: 50, y: 0 });
    selectAll();
    expect(selected()).toHaveLength(2);
  });

  test("resizeNode sets size; undo reverts to undefined", () => {
    const a = addNode("rect", { x: 0, y: 0 });
    resizeNode(a, { width: 200, height: 120 });
    expect(doc().nodes[0].size).toEqual({ width: 200, height: 120 });
    undo();
    expect(doc().nodes[0].size).toBeUndefined();
  });
});
