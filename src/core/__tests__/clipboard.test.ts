import { beforeEach, describe, expect, test } from "vitest";
import { parseClip, serializeClip, type Clip } from "../clipboard";
import { undo } from "../history";
import {
  addNode,
  altDragDuplicate,
  connectNodes,
  deleteNodes,
  duplicateSelection,
  getSelectionClip,
  groupNodes,
  pasteClip,
  reparentNode,
  resizeNode,
  selectAll,
  ungroupNodes,
  __resetIds,
} from "../operations";
import { createInitialState, useEditorStore } from "../store";

beforeEach(() => {
  useEditorStore.setState(createInitialState(), true);
  __resetIds();
});

const doc = () => useEditorStore.getState().doc;
const selected = () => useEditorStore.getState().view.selected;
const select = (ids: string[]) =>
  useEditorStore.setState((s) => ({ view: { ...s.view, selected: ids } }));

describe("clipboard / duplicate / select", () => {
  test("getSelectionClip + pasteClip duplicates selected nodes and internal edges; undo reverts", () => {
    const a = addNode("rect", { x: 0, y: 0 });
    const b = addNode("ellipse", { x: 100, y: 0 });
    connectNodes(a, b);
    select([a, b]);

    const clip = getSelectionClip();
    expect(clip).not.toBeNull();
    pasteClip(clip!);
    expect(doc().nodes).toHaveLength(4);
    expect(doc().edges).toHaveLength(2);
    expect(selected()).toHaveLength(2); // 粘贴出的新节点被选中

    undo();
    expect(doc().nodes).toHaveLength(2);
    expect(doc().edges).toHaveLength(1);
  });

  test("pasteClip offsets position and assigns new ids", () => {
    const a = addNode("rect", { x: 10, y: 20 });
    select([a]);
    pasteClip(getSelectionClip()!);
    const pasted = doc().nodes[1];
    expect(pasted.id).not.toBe(a);
    expect(pasted.position).toEqual({ x: 34, y: 44 });
  });

  test("getSelectionClip only includes edges with both endpoints selected", () => {
    const a = addNode("rect", { x: 0, y: 0 });
    const b = addNode("rect", { x: 100, y: 0 });
    connectNodes(a, b);
    select([a]); // 只选 a
    const clip = getSelectionClip()!;
    expect(clip.nodes).toHaveLength(1);
    expect(clip.edges).toHaveLength(0); // 不含悬空边
  });

  test("getSelectionClip returns null for empty selection", () => {
    expect(getSelectionClip()).toBeNull();
  });

  test("cut semantics: snapshot clip → delete → paste restores", () => {
    const a = addNode("rect", { x: 0, y: 0 });
    select([a]);
    const clip = getSelectionClip()!;
    deleteNodes([a]);
    expect(doc().nodes).toHaveLength(0);
    pasteClip(clip);
    expect(doc().nodes).toHaveLength(1);
  });

  test("altDragDuplicate：原节点移到终点、原位留副本、内部边复制", () => {
    const a = addNode("rect", { x: 0, y: 0 });
    const b = addNode("rect", { x: 100, y: 0 });
    connectNodes(a, b);

    altDragDuplicate([
      { id: a, position: { x: 0, y: 200 } },
      { id: b, position: { x: 100, y: 200 } },
    ]);

    expect(doc().nodes).toHaveLength(4);
    expect(doc().nodes.find((n) => n.id === a)!.position).toEqual({ x: 0, y: 200 }); // 原节点到终点
    const copies = doc().nodes.filter((n) => n.id !== a && n.id !== b);
    expect(copies.map((c) => c.position)).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]); // 副本留起点
    expect(doc().edges).toHaveLength(2); // 原边 + 副本边

    undo();
    expect(doc().nodes).toHaveLength(2);
    expect(doc().edges).toHaveLength(1);
  });

  test("duplicate copies current selection without using clipboard", () => {
    const a = addNode("rect", { x: 0, y: 0 });
    select([a]);
    duplicateSelection();
    expect(doc().nodes).toHaveLength(2);
  });

  test("groupNodes：建容器、子节点 parentId + 位置转相对；ungroup 还原绝对、删容器", () => {
    const a = addNode("rect", { x: 100, y: 100 });
    const b = addNode("rect", { x: 200, y: 140 });
    const gid = groupNodes([a, b], { x: 80, y: 60, width: 200, height: 140 }, undefined, "后端");

    const group = doc().nodes.find((n) => n.id === gid)!;
    expect(group.kind).toBe("subgraph");
    expect(group.position).toEqual({ x: 80, y: 60 });
    expect(group.size).toEqual({ width: 200, height: 140 });
    expect(doc().nodes.find((n) => n.id === a)!).toMatchObject({ parentId: gid, position: { x: 20, y: 40 } }); // 100-80,100-60
    expect(doc().nodes.find((n) => n.id === b)!).toMatchObject({ parentId: gid, position: { x: 120, y: 80 } });
    expect(selected()).toEqual([gid]);

    ungroupNodes(gid);
    expect(doc().nodes.find((n) => n.id === gid)).toBeUndefined(); // 容器删
    expect(doc().nodes.find((n) => n.id === a)!).toMatchObject({ position: { x: 100, y: 100 } }); // 换回绝对
    expect(doc().nodes.find((n) => n.id === a)!.parentId).toBeUndefined();
  });

  test("reparentNode：拖进容器 parentId 改 + 位置换相对；拖出回顶层", () => {
    const a = addNode("rect", { x: 0, y: 0 });
    const b = addNode("rect", { x: 50, y: 0 });
    const gid = groupNodes([b], { x: 40, y: 40, width: 200, height: 160 }); // 容器在 (40,40)
    // a（顶层，绝对 0,0）拖进容器，落点绝对 (60,80)
    reparentNode(a, gid, { x: 60, y: 80 });
    expect(doc().nodes.find((n) => n.id === a)!).toMatchObject({ parentId: gid, position: { x: 20, y: 40 } }); // 60-40,80-40
    // 再拖出到顶层，落点绝对 (300,300)
    reparentNode(a, undefined, { x: 300, y: 300 });
    const aNode = doc().nodes.find((n) => n.id === a)!;
    expect(aNode.parentId).toBeUndefined();
    expect(aNode.position).toEqual({ x: 300, y: 300 });
  });

  test("groupNodes 嵌套：在容器内再建子组（parentId + 绝对换算）", () => {
    const a = addNode("rect", { x: 100, y: 100 });
    const g1 = groupNodes([a], { x: 80, y: 60, width: 300, height: 300 }); // a 相对 g1 = (20,40)，绝对 (100,100)
    const g2 = groupNodes([a], { x: 90, y: 90, width: 120, height: 80 }, g1); // 在 g1 内对 a 再建组
    const g2node = doc().nodes.find((n) => n.id === g2)!;
    expect(g2node.parentId).toBe(g1);
    expect(g2node.position).toEqual({ x: 10, y: 30 }); // 90-80,90-60
    const aNode = doc().nodes.find((n) => n.id === a)!;
    expect(aNode.parentId).toBe(g2);
    expect(aNode.position).toEqual({ x: 10, y: 10 }); // 绝对 100,100 - g2 绝对 90,90
  });

  test("复制分组：选容器带子树，parentId 重映射、子相对位置保持、顶层容器偏移", () => {
    const a = addNode("rect", { x: 100, y: 100 });
    const gid = groupNodes([a], { x: 80, y: 60, width: 200, height: 160 }); // a 相对容器 (20,40)
    select([gid]);
    const clip = getSelectionClip()!;
    expect(clip.nodes.map((n) => n.id).sort()).toEqual([a, gid].sort()); // 带上子节点

    pasteClip(clip);
    expect(doc().nodes).toHaveLength(4); // 原 g+a + 新 g'+a'
    const newGroup = doc().nodes.find((n) => n.kind === "subgraph" && n.id !== gid)!;
    const newChild = doc().nodes.find((n) => n.parentId === newGroup.id)!;
    expect(newGroup.position).toEqual({ x: 104, y: 84 }); // 80+24,60+24（顶层偏移）
    expect(newChild.position).toEqual({ x: 20, y: 40 }); // 相对保持
  });

  test("删容器连带删子树（避免孤儿 parentId）", () => {
    const a = addNode("rect", { x: 0, y: 0 });
    const b = addNode("rect", { x: 50, y: 0 });
    const gid = groupNodes([a, b], { x: 0, y: 0, width: 100, height: 100 });
    deleteNodes([gid]);
    expect(doc().nodes).toHaveLength(0); // 容器 + a + b 全删
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

describe("clip serialize / parse (系统剪贴板文本)", () => {
  const clip: Clip = {
    nodes: [{ id: "n_1", kind: "rect", position: { x: 1, y: 2 }, data: { label: "A" } }],
    edges: [{ id: "e_1", source: "n_1", target: "n_1", sourceHandle: null, targetHandle: null }],
  };

  test("round-trips a clip through system-clipboard text", () => {
    expect(parseClip(serializeClip(clip))).toEqual(clip);
  });

  test("rejects external / empty / non-drawmaker text", () => {
    expect(parseClip("")).toBeNull();
    expect(parseClip("从备忘录复制的一段文字")).toBeNull();
    expect(parseClip("{ broken json")).toBeNull();
    expect(parseClip(JSON.stringify({ nodes: [], edges: [] }))).toBeNull(); // 缺 magic 标识
  });
});
