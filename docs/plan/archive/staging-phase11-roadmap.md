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

### S4 · 模板系统
- 范围：常用图初始模板（流程/时序/状态/类/ER/架构…），新建即用；实现可做成"插入一段预置 mermaid 文本走导入"复用现有解析器。
- 颗粒度：中。
- **决策点（执行时）**：模板集清单 + 是内置还是可自定义。

### S5 · 暗色主题
- 范围：CSS 变量重构 + 暗色/亮色切换；注意 mermaid 预览面板已是深色、画布/形状/连线/面板都要适配。
- 颗粒度：中。

### S6 · 进阶布局 elkjs（基建·引依赖）
- 范围：引入 elkjs，提供正交（orthogonal）连线路由 / 更整齐布局，作为 dagre 之外的可选布局。
- 颗粒度：中。
- **决策点（执行时）**：elkjs 依赖体量确认；与现有 dagre 的关系（替换 or 并存可选）。

### S7 · 自动更新 Tauri Updater（基建）
- 范围：Tauri Updater 插件 + 更新 manifest 托管 + 签名。
- 颗粒度：中-大。
- **决策点（执行时）**：签名方案（ad-hoc 不支持 Updater 验签，需 Developer ID $99/年 或自管公钥）、manifest 托管在哪（GitHub Releases / forgejo / 自建）。这是真投入，执行前要专门确认。

### S8 · 性能 WASM 几何/布局（基建·投机）
- 范围：几何/布局计算下放 WASM。
- 颗粒度：大。
- **建议**：目前无实测性能瓶颈。按方法论"不投机优化"，**执行前先做性能基准，确有瓶颈再实施**，否则保持排在最后/不做。用户已要求排进路线，故保留为 S8 但带此前置条件。

## 同步动作

- blueprint：加 Phase 11 大目标 + Roadmap 行 + 同步日志；Backlog 里被纳入 Phase 11 的项标注指向本路线，AI/CRDT 保留。
- 每项进 active 时从本文件摘出写正式 plan；全部完成后归档本 staging。
