# Plan: Mermaid 双向转换（文本 ↔ 可拖拽画布）

## 背景

2026-06-13 用户确认方向：drawmaker = mermaid 可视化操作软件，文本与画布**双向、均可编辑**，为此可舍弃部分现有支持。

四项决策（用户拍板）：
1. **同步模型**：画布（doc）为准；粘贴=导入；文本框可编辑 + 「应用」按钮重新解析；画布改动实时回写文本。
2. **覆盖范围**：目标全 13 种类型双向（先 flowchart 竖切，再逐类扩展）。
3. **取舍/保真**：形状收敛到 mermaid 标准集，退掉近似架构形状，保证无损往返。
4. **解析器**：引入 mermaid 官方解析器。

## 核心认知（约束设计）

- **mermaid 文本无坐标**：mermaid 是自动布局引擎。粘贴 → 解析 → dagre 自动布局 → 可拖拽。拖拽位置只存 `.dm`，导出文本保持干净标准（可贴回 mermaid.live）。
- **无损往返**靠：① 用 mermaid 自己的节点 id 当我们的 id；② 形状与 mermaid 1:1。

## 待验证（最大未知，先做）

- [x] V0 实测 mermaid 官方解析器：✅ 可行。jsdom 提供 DOM 后 `db.getVertices()/getEdges()/getDirection()` 干净抽出 `{id,text,type(形状)}` + `{start,end,text,type(箭头)}` + 方向，且用 mermaid 语义 id（A/B/C，正好满足往返）。依赖 DOM（webview 有；headless 测试需 jsdom 环境）。体积：dist 430KB→4.1MB（mermaid 按类型代码分割懒加载），**dmg 3.4→4.3MB**，可接受。

## 阶段（flowchart 竖切优先）

- [x] P1 解析适配：`core/mermaid-import.ts`（纯映射 vertices/edges→节点/边，3 单测）+ `services/mermaidParse.ts`（DOM 解析 getDiagramFromText，运行时）
- [x] P2 导入动作 `services/importMermaid.ts`：解析 → `flowToGraph` → dagre `computeLayout` 布局 → 重建 doc（同名 id 保位置）→ 一条 history + fitView
- [~] P3 入口：✅ 菜单 File▸Import Mermaid（剪贴板）⌘⇧V；✅ **MermaidPanel 文本框可编辑 + 「应用到画布」按钮**（草稿/画布同步：未手改时实时镜像，手改后保留草稿、点应用解析回画布并保位置；目前 EDITABLE_TYPES=flowchart）；⏳ 画布 ⌘V 自动识别 mermaid
  - 双向闭环在一个面板内成立（flowchart）：画布改→文本实时更新；文本改→应用→画布更新（同名节点保位置）。Excalidraw mermaid 对话框同款。
- [ ] P4 形状收敛：调色板只列 mermaid 标准形状；旧 kind 仍可加载（fallback 渲染）
- [~] P5 节点 id 用 mermaid 语义 id：✅ 导入已用 A/B/C；导出走 node.id 故往返稳定（新建节点仍 n_，待统一）
- [ ] P6 扩展到其余 12 种类型（每种一个解析适配 + 数据类填表格）；headless 集成测试（jsdom 环境）覆盖 DOM 解析路径
- [ ] P7 验证 + 打包

## 验收

- 粘贴一段 flowchart mermaid → 画布出现可拖拽的同构图；拖动后导出文本仍正确
- 文本框改一行 → 应用 → 画布更新，已存在节点位置保留
- `pnpm check` + `pnpm test` 全绿（解析器若 headless 不可测，明确说明并改手工验证）

## 风险

- mermaid 重依赖（体积、d3）；解析器半内部 API / 浏览器依赖 → headless 测试可行性（V0 先验证）
- 双向一致性：文本重排与位置保留的边界
- 形状收敛是破坏性变更（调色板）——旧文件兼容靠 fallback 渲染

## 同步动作

- 完成后归档；blueprint 更新 Phase 10；舍弃的形状在 blueprint 记一笔
