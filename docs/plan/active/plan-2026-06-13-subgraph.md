# Plan: Subgraph 分组（往返 mermaid subgraph）

## 目标

flowchart 支持分组容器：可把节点编成组、组可嵌套、可拖拽，导出 mermaid `subgraph ... end`、导入还原。入 undo 栈、随 `.dm` 持久化、保持双向。

## 决策（2026-06-13 已确认）

- **建组方式**：两种都要——① 选中节点 → ⌘G / 右键「编组」；② 调色板拖「容器」形状，再把节点拖进去
- **嵌套**：支持（组里套组）
- **范围**：只 flowchart

## 数据模型

- `DmNode` 加 `parentId?: string`：指向所属 group 节点；group 节点本身也可有 parentId ⇒ 嵌套。
- 新增 group 节点 kind = `"subgraph"`，`data.label` = 组标题。
- **坐标系约定**：有 parent 的节点 `position` 存「相对父节点左上角」（与 xyflow 子节点坐标一致）；无 parent 存绝对。换算集中在一处纯函数，避免散落。
- 序列化：parentId 是 DmNode 字段，随 `.dm` 自动走；旧文件无 parentId 照常加载。

## 待去风险（动手前先做，按方法论「探针先行」）

- [ ] V0 探针 mermaid flowDb `getSubGraphs()`：成员 id 列表、标题、嵌套怎么表示（是否成员里含子 subgraph 的 id）。
- [ ] V1 验证 xyflow `parentId` + group 节点行为：子节点坐标是否相对父、组整体拖动、`extent:"parent"` 约束、子节点拖出/拖入父的事件与时序。
- 若 xyflow 行为与设想差太多 → 回报，调整模型再继续。

## 阶段

- [ ] P1 数据模型：`DmNode.parentId` + `subgraph` kind + 坐标系纯换算函数（相对↔绝对，含多层）+ 序列化 round-trip 测试。
- [ ] P2 渲染：`SubgraphNode` 容器组件（标题栏 + 自适应包住子节点）；`toFlowNode` 设 parentId / extent，group 节点排在子节点前（xyflow 要求父先于子）。
- [ ] P3 建组 A（编组）：选中节点 → ⌘G / 右键「编组」→ 算 bbox 建 group 节点、成员 parentId、位置转相对；「解组」⌘⇧G（位置转回绝对、删 group）。一条 command。
- [ ] P4 建组 B（容器）：调色板「容器」形状；`onNodeDragStop` 命中检测 → 拖进/拖出容器时更新 parentId + 位置换算。
- [ ] P5 嵌套：group 套 group（parentId 链）；编组/解组/拖拽处理多层；导出导入递归。
- [ ] P6 导出：递归 emit `subgraph <id>[<title>] ... end`（含嵌套）；边在顶层；`toMermaid` flowchart 序列化器扩展。
- [ ] P7 导入：`getSubGraphs()` → group 节点 + 成员 parentId（含嵌套）；dagre 复合布局（`setParent` cluster，或退化为先布局成员再包框）。
- [ ] P8 撤销 / 持久化 / 测试 / 打包安装。

## 验收

- 选中节点 ⌘G → 出现带标题的容器框住它们；拖容器整体移动；拖节点出框则脱组；⌘⇧G 解组
- 容器内再选节点 ⌘G → 嵌套组
- 右侧 mermaid 实时出 `subgraph ... end`（含嵌套）；贴 mermaid.live 渲染同构
- 粘贴含 subgraph 的 mermaid → 画布还原出容器 + 成员（含嵌套）
- 保存重开分组结构不丢；⌘Z 可撤销编组/解组
- `pnpm check` + 全量测试绿

## 风险点

- **坐标系换算**（相对/绝对，尤其嵌套多层）——最易出 bug，先用纯函数 + 测试钉死，再接 UI。
- **dagre 对 compound graph（cluster）布局支持有限**：导入时分组布局可能要 `setParent` 或退化（先布成员、再算包围框当容器）。
- **拖进/拖出容器的命中判定 + parentId 更新时序**（xyflow onNodeDragStop 与 parent extent 的配合）。
- 解组 / 嵌套解组时子节点位置要正确换回绝对（多层累加偏移）。
- group 节点是「容器」不是普通形状：选区、删除（删组应否删子节点？）、复制粘贴都要特判。

## 同步动作

- 完成后归档；blueprint Phase 10 追加 subgraph；staging-excalidraw 的「分组/容器」勾掉。
