# Staging: 吸收 Excalidraw / Whiteboard 做法

## 来源

2026-06-13 用户：参考 Whiteboard / Excalidraw，在满足「mermaid 代码↔画布双向转换 + 现有操作手感」的前提下，尽可能吸收它们的做法。

## 核心判断（决定取舍的尺子）

双向是**硬约束**。Excalidraw/tldraw 是自由白板（位置/笔触即真相），mermaid 是结构化文本（无坐标）。因此按「该特性能否往返 mermaid」分层，而非照搬。

## Tier 1 — 交互手感（纯 UX，不碰数据模型，优先吸收）

不影响 mermaid 双向，直接提升「现有手感」：

- ~~**拖动对齐参考线 + 吸附**~~ ✅ 已做（2026-06-13）：`canvas/helper-lines.ts` 纯计算（左/右/中 × 上/下/中 对齐，阈值吸附，4 单测）+ Canvas onNodesChange 吸附 + `HelperLinesOverlay` 蓝色参考线。
- ~~**双击空白画布快速建节点**~~ ✅ 已做（2026-06-13）：Canvas onDoubleClick 仅在 `.react-flow__pane` 上触发 → screenToFlowPosition → addNode("rect")；关掉 zoomOnDoubleClick（双击节点/边改字不受影响）。（落点自动进编辑态待后续）
- **右键上下文菜单**：复制 / 删除 / 置顶置底 / 锁定 / 复制为 PNG/SVG。
- **Alt 拖拽复制、方向键微移、Shift 约束、框选多选**（xyflow `selectionOnDrag`）。
- 工具键建形状（按键选形状再点画布落）——可选，调色板拖拽已够用。

## Tier 2 — 能往返 mermaid 的样式 / 结构（让样式也双向）

mermaid 原生支持，故可双向：

- ~~**节点颜色/填充/描边** → mermaid `style id ...`~~ ✅ 已做（2026-06-13）：导出 `style id fill:..,stroke:..,stroke-width:..px`；导入读 `vertex.styles` 数组解析回 fill/stroke/strokeWidth。
- ~~**边样式**虚线 `-.-` / 粗线 `==`~~ ✅ 已做：EdgeData.style（solid/dashed/thick）+ 属性面板「线型」下拉 + 渲染 dasharray/strokeWidth + 导出 `线型×方向` 9 操作符表（mermaid 实测全合法）+ 导入读 `edge.stroke`（normal/dotted/thick）。
- **箭头种类** `--o` / `--x`（实心箭头已支持，圆/叉头待加）。
- **分组 / 容器** → mermaid `subgraph`（≈ Excalidraw frame）。待做。
- **z-order / 锁定**：mermaid 无对应，本地存 .dm、导出丢弃（次要）。

## Tier 3 — 破坏往返的自由白板特性（默认不做 / 本地不导出）

- freedraw 手绘笔、便利贴、任意非 mermaid 图形、frame/embed → mermaid 表达不出。建议**不做**，或仅作本地装饰、导出丢弃（会稀释 mermaid 焦点）。
- **手绘潦草外观（rough.js）**：例外——只是渲染外观、不碰数据，可作**可选主题**吸收。

## 直接参考

Excalidraw 的 **"Mermaid to Excalidraw"**：对话框贴 mermaid → 实时预览 → Insert 成可编辑元素。= 我们「可编辑 mermaid 面板 + 应用到画布」的范本。

## 与现有计划的顺序

1. 先收尾当前 flowchart 双向竖切：**可编辑 mermaid 面板 + 应用按钮**（plan-2026-06-13-mermaid-bidirectional P3）。
2. 插入 Tier 1 手感（对齐吸附 / 双击建节点 / 右键菜单 / Alt 复制）。
3. Tier 2 样式往返（颜色→mermaid style、边样式、subgraph）与「扩展其余图表类型」穿插。
4. Tier 3 仅在用户明确要时做（手绘主题可较早作为低风险彩蛋）。

## 用户已确认（2026-06-13）

- **边界 = 纯 mermaid**：画布上每个元素都必须能往返 mermaid。不做 freedraw / 便利贴 / frame 等本地装饰（Tier 3 自由白板特性整体砍掉）。
- **首批 = 先收尾可编辑 mermaid 面板**（右侧面板可编辑 + 应用按钮，Excalidraw mermaid 对话框同款）。
- **外观 = 保持现在的精确矢量风格**，不做手绘潦草主题。

→ 据此：Tier 3 移除；Tier 1 手感与 Tier 2 样式往返保留为后续；当前执行项 = 可编辑面板（并入 plan-2026-06-13-mermaid-bidirectional P3）。
