# Plan: 连线标签（双击改字）

## 目标

边（连线）支持文字标签：双击边进入编辑，标签居中显示在线上，入 undo 栈、随 .dm 持久化。Phase 9（连线能力）第一片。

## 任务清单

- [x] T1 `core/types.ts`：`EdgeData { label?: string }`，`DmEdge` 加可选 `data`（旧 .dm 无此字段照常加载）
- [x] T2 `core/operations.ts`：`renameEdge(id, label)`，空标签清掉 data，commit 入 history
- [x] T3 `canvas/edges/LabeledEdge.tsx` + `edges.css`：自定义边组件，bezier 路径不变，`EdgeLabelRenderer` 居中标签（白底盖线），编辑态渲染 input（Enter 提交 / Esc 取消），标签挂 `nodrag nopan`
- [x] T4 `canvas/Canvas.tsx`：注册 `edgeTypes`，`toFlowEdge` 带 `type: "labeled"` + `className: "nopan"`（防双击边触发 d3 缩放）+ data（label / editing / onEditingChange），`onEdgeDoubleClick` 进编辑态
- [x] T5 测试：history.test.ts 加 renameEdge undo/redo + 空标签清 data；serialize.test.ts sample 边加 label 走 round-trip
- [x] T6 验证 + 打包安装

## 验收标准

- `pnpm check` 通过；`pnpm test` 全绿
- 手工：连两个形状 → 双击边 → 输入文字 → Enter 落标签；再双击可改；Esc 取消；⌘Z 撤销改字；保存重开 label 还在；双击边不触发画布缩放
- 导出 PNG 含边标签（EdgeLabelRenderer 层在 `.react-flow__viewport` 内，截图自然带上）

## 风险点

- 双击边触发 d3 dblclick 缩放 → 边挂 `nopan`（节点默认有，边默认没有，已查 @xyflow/system 0.0.76 filter 源码确认）
- 标签层 `pointer-events` 默认 none → wrapper 显式 `pointer-events: all`
- 复制粘贴：`placeCopies` 对边 `structuredClone`，label 自动带上，无需改动

## 同步动作

- 完成后归档本计划，blueprint 加日志 + Phase 9 状态更新
