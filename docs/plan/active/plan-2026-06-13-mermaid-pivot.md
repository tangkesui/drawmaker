# Plan: Mermaid 转型主线（roadmap）

## 背景

2026-06-13 /goal：把 drawmaker 转型为「可视化操作 mermaid」的工具。三条核心需求：
1. 随时导出 mermaid 语言
2. 拥有标准的 mermaid 模块（可拖拽，同现在）
3. 零代码操作完成几乎所有 mermaid 语言能画的图

mermaid 有十几种图表类型（flowchart / sequence / class / state / ER / gantt / pie / mindmap / timeline / git…），语法各异。"几乎所有"是多阶段长尾工程，不可能一次做完。策略：**先把 flowchart 这条线打通**（最常用、与现有 xyflow 节点-连线模型同构、契合项目"架构图+流程图"定位），建立可扩展框架，再逐图表类型推进。

## 阶段划分

### Phase A — flowchart 导出 mermaid（本计划首块，进行中）
- [x] A1 `types.ts`：`DocumentMeta.direction?`（TD/LR/RL/BT，缺省 TD）
- [x] A2 `core/mermaid.ts`：`toMermaid(doc): string` 纯函数——kind→形状语法映射表、label 转义（引号/换行→`<br/>`）、边 arrow→`-->`/`---`/`<--`/`<-->`、边 label→`-->|"x"|`
- [x] A3 `services/exportService`：`exportMermaid()` 写 `.mmd` 文件 + `copyMermaid()` 复制到系统剪贴板
- [x] A4 `menuService`：File▸Export▸Mermaid…，File▸Copy as Mermaid
- [x] A5 `core/__tests__/mermaid.test.ts`：形状映射 / 转义 / 边方向+标签 / 空图 / direction
- [x] A6 验证 + 打包安装

### Phase B — 标准 mermaid 形状库（需求 2）🔄 核心已落地
- [x] 新增「Mermaid」分类（调色板置顶）+ 7 个标准 flowchart 形状：stadium / subroutine / cylinder / circle / hexagon / parallelogram / trapezoid，kind 与 mermaid 形状语义一一对应，导出映射表覆盖
- [x] 通用分类的 rect/rounded/ellipse/diamond 同样映射 mermaid 标准形状
- [ ] 续作：alt 形状（parallelogram-alt / trapezoid-alt / double-circle / asymmetric）
- [ ] 续作：现有架构形状（service/queue/cloud/actor/note…）归「扩展」分类，明确其导出为最接近标准形状
- [ ] 续作：调色板分类进一步重组 / 形状预览微调

### Phase C — 零代码增强，逼近"几乎所有"（需求 3）🔄 进行中
- [x] 实时 mermaid 预览面板（右侧深色栏，随 doc 即时更新，复制按钮，可折叠）
- [x] 图方向 UI 切换（预览面板下拉 TD/LR/RL/BT，`setDirection` 入 history，导出头部联动）
- [x] **多图表类型**：`core/mermaid.ts` 重构为按 `diagramType` 分发的序列化器注册表（加一种=加一个序列化器）；已支持 graph 家族 5 种——flowchart / sequence / state / class / er；预览面板「类型」下拉切换，`setDiagramType` 入 history。多行 label 复用：class 首行=类名、余行=成员；er 首行=实体名、余行=属性
- [x] **数据/时间家族**（pie / gantt / timeline / journey / quadrant / xychart）：新建 schema 驱动的**表格编辑器** `DataEditor`——标题 + 配置 + 行表，受控字段失焦提交入 history；`DmDocument.data` 按类型存内容（随 .dm 序列化，已加 round-trip 测试）；6 个序列化器接入注册表；App 按类型在画布 / 表格编辑器间切换（数据模式隐藏形状/属性面板）。**graph 5 + 数据 6 = 11 种类型零代码可画可导出**
- [x] **C4 架构图 + 思维导图 Mindmap**（复用画布）：c4（节点→Person/System、边→Rel）；mindmap（从节点+连线派生树，根入度 0、DFS 缩进，森林挂根有损）。**至此 graph 7 + 数据 6 = 13 种类型**
- [ ] 边样式：虚线 `-.-` / 粗线 `==`（EdgeData 加 style + 属性面板下拉 + 渲染 + 导出映射）
- [ ] 极小众/实验类型：gitgraph（命令式）/ requirement / sankey / block / kanban / architecture / radar / treemap 等
- [ ] subgraph 分组、节点 class/style；导入 mermaid 文本 → 画布（反向）

## 验收（Phase A）

- `pnpm check` + `pnpm test` 全绿
- 手工：画几个不同形状的节点连边、加边标签 → File▸Export▸Mermaid 导出 .mmd → 文本贴到 mermaid.live 能正确渲染出同构图；Copy as Mermaid 后剪贴板是 mermaid 文本
- 空图导出 `flowchart TD` 不报错

## 风险点

- core 不依赖 canvas/registry：mermaid 语义映射表独立放 core/mermaid.ts（与 SVG 渲染解耦，两处维护不同关注点）
- mermaid id 合法性：现有 `n_1`/`e_1` 安全（字母数字下划线）
- label 特殊字符：统一双引号包裹 + 转义

## 同步动作

- Phase A 完成后归档为 `plan-2026-06-13-mermaid-phase-a.md`（或在本文件勾掉 A 段、保留 B/C 续作），blueprint 加日志 + Backlog 登记 mermaid 主线
