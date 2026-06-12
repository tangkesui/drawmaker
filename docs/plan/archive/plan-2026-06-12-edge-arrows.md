# Plan: 连线箭头 + 右侧下拉配置

## 目标

连线默认显示方向箭头（A→B 终点箭头），选中边时在右侧属性面板用下拉切换箭头方向（无 / 终点 → / 起点 ← / 双向 ↔）。入 undo 栈，随 .dm 持久化。Phase 9 连线能力第二片。

## 任务清单

- [x] T1 `core/types.ts`：`EdgeData` 加 `arrow?: "none" | "end" | "start" | "both"`；`ViewState` 加 `selectedEdges: string[]`
- [x] T2 `core/store.ts`：`createInitialState` 补 `selectedEdges: []`
- [x] T3 `core/operations.ts`：`updateEdgeStyle(ids, patch)` 入 history；重构 `renameEdge` 与新 op 共用 data 合并/剪枝（空 label、默认 arrow=end 都从 data 删，data 空则删整个 data，保持 .dm 干净）
- [x] T4 `canvas/edges/LabeledEdge.tsx`：透传 `markerStart`（现仅 markerEnd），BaseEdge 带两端 marker
- [x] T5 `canvas/Canvas.tsx`：`toFlowEdge` 按 `data.arrow`（缺省=end）映射 markerStart/markerEnd（`MarkerType.ArrowClosed`），带 selected 态；边给统一深灰 stroke + marker 同色；`onSelectionChange` 记录 `selectedEdges`
- [x] T6 `ui/PropertiesPanel.tsx`：无选中节点但有选中边时，渲染边面板（箭头方向 `<select>`，多选取公共值，混合显示占位）
- [x] T7 测试：operations/history 加 updateEdgeStyle undo/redo + arrow 剪枝；serialize sample 边加 arrow round-trip
- [x] T8 验证 + 打包安装

## 验收标准

- `pnpm check` 通过；`pnpm test` 全绿
- 手工：拉线 A→B 自动出终点箭头；选中边 → 右侧出现「箭头方向」下拉 → 切「双向」两端都有箭头、切「无」无箭头；⌘Z 撤销；保存重开箭头还在；旧 .dm（无 arrow 字段）加载后默认显示终点箭头
- 导出 PNG/SVG 含箭头 marker

## 风险点

- 自定义边的 marker：必须在 edge 对象上设 `markerStart/markerEnd`，xyflow 生成 marker def 后把 URL 经 props 回传，LabeledEdge 透传给 BaseEdge（现只透 markerEnd，要补 markerStart）
- 选区现仅跟踪节点；补 `selectedEdges` 后注意 toFlowEdge 重建（editingEdgeId 变化时）要保留 selected，从 view.selectedEdges 读，避免重建丢高亮
- `renameEdge` 原逻辑空 label 删整个 data → 若边已有 arrow 会被误删；改成字段级剪枝

## 同步动作

- 完成后归档本计划，blueprint 加日志
