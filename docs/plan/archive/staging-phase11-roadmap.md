# Staging: Phase 11 路线（成熟主力工具）

## 来源

2026-06-13 用户：把现有想到的方向（除 AI 辅助生成、CRDT 协作外）整理成一个大目标，规划成可落地的 plan。决策已确认：下一批做 编辑体验/模板/mermaid 收尾/暗色 四项，基建三项（elkjs/自动更新/WASM）都排进路线。

## 大目标（Phase 11）

**drawmaker 从「功能完整的 mermaid 双向编辑器」打磨成「成熟、可日常主力、可持续分发的工具」。**

排除项（仍在 blueprint Backlog，不属 Phase 11）：AI 辅助生成、CRDT 协作。

## 执行序列

按"先增量后基建、依赖在前"排。每项到执行窗口时再写成正式 `plan-YYYY-MM-DD-{slug}.md` 进 active。

### S1 · subgraph 分组（已 active，可开工）
- 状态：计划已写 `plan-2026-06-13-subgraph.md`，V0/V1 探针已过（getSubGraphs 嵌套靠成员含子组 id；xyflow 子坐标相对父、extent:'parent' 约束）。
- 颗粒度：大（一个 plan，8 阶段）。

### S2 · mermaid 覆盖收尾 — 🛑 技术墙，关闭
- 2026-06-13 二次探针：**quadrant/xychart 导入不可行**。
  - quadrant：`getQuadrantData()` 返回已渲染像素数据（点 170.2/214.6、颜色/半径/文字定位），原始输入（x:0.3、轴标签）反推不回来。
  - xychart：语法正确时 `parse` 在 jsdom 下仍 INVALID（langium 解析器不工作）。
- 结论：保持单向导出，**11/13 双向是 mermaid API 给定的上限**。S2 关闭不再投入。

### S3 · 编辑体验打磨 — 🔄 进行中
- ✅ 方向键微移（1px / Shift 10px，入 history）。
- ⏳ 双击建点后自动进编辑态、右键菜单补全。
- 范围：方向键微移节点、双击建点后自动进编辑态、键盘/右键菜单补全（如置顶置底——本地态、mermaid 无对应）。
- 颗粒度：小-中。纯增量、低风险。

### S4 · 模板系统 — ✅ 完成
- File ▸ 插入模板：流程/时序/状态/类/ER 5 个预置 mermaid，经导入路径插入（复用解析器，可撤销）。

### S5 · 暗色主题 — ✅ 完成
- 覆盖式 `theme.css`（`<html data-theme="dark">`，不动亮色 CSS）+ 状态栏切换 + localStorage 持久化。形状保持白底。

### S6 · 进阶布局 elkjs — ✅ 完成
- 引入 elkjs，layered + ORTHOGONAL 正交路由；菜单 View ▸ 正交布局 ↓/→ (elk)，与 dagre 并存。只布局顶层节点（容器当盒子）。dmg +0.4MB。

### S7 · 自动更新 — ⏭️ 暂不做（用户决策）
- 2026-06-13 用户定：继续手动发 dmg 给朋友，省 $99/年 + 公证/托管。需要时再启。

### S8 · 性能 WASM — 🕒 延后（无实测瓶颈）
- 当前常规图（几十节点）JS+dagre/elk 流畅，几何/布局计算量小，迁 WASM 零收益且复杂度高。按"不投机优化"延后，等真有瓶颈再做。

## 完成状态（2026-06-13）

Phase 11 可执行项全部落地：S1 subgraph ✅（+鲁棒）、S3 编辑体验 ✅、S4 模板 ✅、S5 暗色 ✅、S6 elkjs ✅。
关闭/延后：S2 quadrant/xychart 导入 🛑（mermaid API 技术墙）、S7 自动更新 ⏭️（用户暂不做）、S8 WASM 🕒（无瓶颈）。
→ 本 staging 可归档。
