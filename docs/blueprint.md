# drawmaker — Blueprint

## 项目愿景

一个**架构先进、轻量、可控、深度可定制**的本地图形编辑器。长期目标是成为我的主力作图工具，最终替代 drawio 桌面版。

## 核心需求

1. 架构更先进优化，整体更简洁
2. 整体可控，加功能时能快速修改
3. 主力使用工具，需要高度定制化

## 技术选型

| 决策 | 选型 | 理由 |
|---|---|---|
| 桌面壳 | **Tauri 2** (Rust) | 体积比 Electron 小 10-20×，启动快 4-6×，内存占用 ~一半，原生菜单 |
| 渲染内核 | **xyflow / React Flow** (MIT) | 节点-连线模型天然契合架构图/流程图；~30k LOC 我俩能读完；MIT 无许可证焦虑 |
| 前端 | React 19 + TypeScript | xyflow 强依赖（React 专属） |
| 状态管理 | Zustand | 跟 Pinia 心智模型最近，~1k LOC |
| 命令栈 | 自实现 Command 模式 | 撤销/重做 = `{ do, undo }` 对入栈 |
| 构建 | Vite | Tauri 2 默认 |
| 包管理 | pnpm | 节省磁盘、速度快 |
| 自动布局 | dagre (Phase 5+) | 工业级 layered，~150 KB；elkjs 作为进阶选项 |
| 快捷键 | react-hotkeys-hook | 声明式注册，跨平台键名 |
| 导出 | SVG (直出) / Canvas (PNG) / pdf-lib (PDF) | 纯前端实现 |
| 平台 | **仅 macOS** | 单平台聚焦，降低复杂度 |
| 文件格式 | 自定义 `.dm`（JSON-based） | 干净易扩展；**不**兼容 .drawio |
| 主要画图场景 | 架构图 + 流程图 | 决定自定义 shape 库优先级 |
| License | **MIT** | 自有项目；所有依赖均为宽松开源（MIT / Apache 2.0） |

## 关键架构决策

**xyflow 是渲染层，不是数据真相**。Editor Core 持有 document state（`.dm` 文件就是它的 JSON 序列化），xyflow 只把它画出来。这意味着：
- 未来 xyflow 升级/替换不影响业务逻辑和文件格式
- 撤销栈只面向 document，不入视图状态（hover / 缩放 / 选区）
- 多实例可共享 document 同步

## 系统架构

```
┌──────────────────────────────────────────────────────────────────┐
│                  Tauri 2 / Rust Shell  ~500-1500 LOC             │
│  FileIO (.dm)   Native Menu   Window/Drag-Drop   Updater[L]      │
└─────────────────────────────┬────────────────────────────────────┘
                              │   IPC: invoke (cmd) + emit (evt)
┌─────────────────────────────▼────────────────────────────────────┐
│                Frontend (React+TS)  ~5-10k LOC                   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │  UI Shell (自己写)                                      │     │
│  │  Toolbar │ Shape Sidebar │ Props Panel │ ContextMenu    │     │
│  └─────────────────┬───────────────────────────────────────┘     │
│                    │ dispatch                                    │
│  ┌─────────────────▼───────────────────────────────────────┐     │
│  │  Editor Core (自己写)                                   │     │
│  │  Zustand Store │ Command Stack │ .dm Serializer         │     │
│  │  - doc slice (SSOT)   - view slice   - history slice    │     │
│  └─────────────────┬───────────────────────────────────────┘     │
│                    │ read / write                                │
│  ┌─────────────────▼───────────────────────────────────────┐     │
│  │  Canvas (xyflow 承担)                                   │     │
│  │  ReactFlow │ Custom Nodes │ Custom Edges │ Controls     │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │  Utilities                                              │     │
│  │  Auto-layout (dagre/elkjs) │ Export │ Theme │ Keymap    │     │
│  └─────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
```

详细模块拆分见 `docs/reference/architecture-overview.md`（待 Phase 1 完成后补全）。

## 当前阶段

✅ **Phase 0**: 环境搭建完成
✅ **Phase 1**: Tauri 2 + React + xyflow 骨架 + Editor Core（Zustand + patch-based 撤销栈）+ 基础 Toolbar 跑通 — 计划已归档 `docs/plan/archive/plan-2026-05-29-bootstrap-tauri-xyflow.md`
✅ **Phase 2**: 文件 IO — 新建/打开/保存/另存 `.dm`、最近打开列表、脏标记 — 计划已归档 `docs/plan/archive/plan-2026-05-29-phase2-file-io.md`
✅ **Phase 3**: macOS 系统集成 — 原生菜单（File/Edit/View）、文件拖放、单实例、未保存保护、快捷键归口 — 计划已归档 `docs/plan/archive/plan-2026-05-29-phase3-macos.md`
✅ **Phase 4**: 自定义 Custom Nodes — 数据驱动形状注册表 + 通用 ShapeNode + 10 个形状 + 调色板（pointer 拖放）+ 双击改名 — 计划已归档 `docs/plan/archive/plan-2026-05-29-phase4-shapes.md`
✅ **Phase 5**: UI 完整化 — 属性面板（颜色/线宽/字号/标签）+ 调色板搜索/折叠 + dagre 自动布局 — 计划已归档 `docs/plan/archive/plan-2026-05-29-phase5-ui.md`
🔄 **Phase 6**: 导出 — SVG / PNG / PDF

## Roadmap

| Phase | 目标 | 状态 |
|---|---|---|
| 0 | 环境搭建（docs 骨架 + git） | ✅ |
| 1 | Tauri + React + xyflow 骨架 + Editor Core (Zustand + patch-based 撤销) + 基础 Toolbar | ✅ |
| 2 | 文件 IO：打开/保存 `.dm`，最近打开列表 | ✅ |
| 3 | macOS 系统集成：原生菜单、文件拖放、单实例、快捷键 | ✅ |
| 4 | 自定义 Custom Nodes：架构图常用形状（服务/数据库/队列/LB/CDN 等） | ✅ |
| 5 | UI 完整化：侧栏 shape library、属性面板、自动布局（dagre） | ✅ |
| 6 | 导出：SVG / PNG / PDF | 🔄 |
| 7 | 打包：dmg + macOS 签名 + 公证（notarization） | ⏳ |
| 8+ | 持续迭代：elkjs 进阶布局、主题、模板、暗色模式、AI 辅助等 | ⏳ |

## 关键指针

- 全局工作流：`~/.claude/workflow.md`
- 全局约束：`~/.claude/CLAUDE.md`
- 项目级约束：`./CLAUDE.md`
- 进行中计划：`docs/plan/active/`
- 暂存计划：`docs/plan/staging/`
- 想法收件箱：`docs/ideas.md`
- 历史参考：`docs/reference/`
- 知识体系：跨项目知识树（Notion）`知识树 → CS → 前端/通用基础` 下相关条目

## Backlog

按 P0/P1/P2/P3 标记，进入 active 前先在 `docs/ideas.md` 或本节登记。

- (P2) WASM 模块做几何/布局计算（来源：2026-05-28 立项讨论）
- (P2) Tauri Updater 自动更新（来源：2026-05-28 立项讨论），Phase 7 之后
- (P2) elkjs 进阶布局（orthogonal）— 当 dagre 不够用时引入
- (P3) 模板系统：常用图表初始模板（来源：2026-05-28 立项讨论）
- (P3) 暗色主题 — 用 CSS 变量实现
- (P3) AI 辅助：自然语言生成架构图初稿
- (P3) 协作模式：CRDT-based 多人编辑（远期）

## 同步日志

- 2026-05-28：项目立项。原定 Tauri 2 + tldraw + macOS only。建立 docs 骨架，归档 drawio-desktop v30.0.4 package.json 作参照。
- 2026-05-29：**渲染内核换型**。发现 tldraw v5 是 SDK License（非自由）、v2 是非商用许可、实际 ~165k LOC（不是宣传的 40k）。改用 xyflow / React Flow（MIT、~30k LOC、节点-连线模型契合架构图/流程图）。配套技术选型确定：Zustand（状态）、Command 模式（撤销栈）、dagre（自动布局）、react-hotkeys-hook（快捷键）。架构图入 blueprint。原 Phase 1 计划归档，新建 plan-2026-05-29-bootstrap-tauri-xyflow.md。
- 2026-05-29：35 项核心概念补盲到 Notion 知识树（CS → 前端 / 通用基础 / 后端 / 框架 / 库 等多个分支，含 3 新 Branch + 30 新 Leaf）。
- 2026-05-29：**Phase 1 完成**。Tauri + React + xyflow 骨架跑通；Editor Core 落地（Zustand store 三块 doc/view/history + immer patch-based 撤销栈 + operations 调用点）；自定义 Rect/Ellipse 节点 + Toolbar + 快捷键。撤销重入用「历史只从 xyflow 手势回调采集」的结构解法（非时间窗 flag）。core 逻辑有 vitest headless 覆盖。计划归档。
- 2026-05-29：**Phase 2 完成**。文件 IO 全链路：Rust 自定义命令（`std::fs` read/write + `recent.json`）+ `tauri-plugin-dialog` 原生面板；前端 `services/` 层是唯一碰 Tauri 的地方（守架构铁律）；`core/serialize` 带版本校验 + vitest；脏状态由 `history.cursor !== savedCursor` 派生（不单独存布尔）；新建/打开会清空 history 防跨文件撤回。新增 store `file` slice + `document-actions`。决策：读写用自定义命令（不引 fs 插件）、最近列表用自定义 recent.json（不引 store 插件）、未保存保护留到 Phase 3。计划归档。
- 2026-05-29：**Phase 3 完成**。原生 macOS 菜单（前端 JS Menu API 构建，菜单项直接调 document-actions/history/viewport，无 Rust 事件回传）；App 级快捷键归口菜单 accelerator、Keymap 只留 V/R/E；未保存保护（New/Open/关窗都拦，dialog `ask` 两按钮）；文件拖放打开；`tauri-plugin-single-instance` 聚焦已有窗口；viewport 控制桥打通 xyflow 缩放/fit。**尽调中发现并修复 Phase 2 隐藏 bug**：窗口标题因缺 `core:window:allow-set-title` 权限被静默拒绝，本 Phase 补权限 + 去掉静默吞错。计划归档。
- 2026-05-29：**Phase 4 完成**。数据驱动形状注册表（`canvas/shapes/registry`：每形状一条 `{kind,label,category,defaultSize,render(SVG)}`，nodeTypes/调色板/尺寸全派生）；通用 `ShapeNode` 渲染所有形状 + 双击改名（`renameNode` command）；10 个形状（通用 rect/rounded/ellipse/diamond + 架构 service/database/queue/loadbalancer/cloud/actor/note）；左侧调色板拖放放置。`NodeKind` 放宽为 string + 反序列化 fallback；移除 tool 工具模式（拖放放置不需要）、删 Keymap 与 `react-hotkeys-hook`（快捷键已全归原生菜单）。**执行中踩坑并修正**：Tauri OS 级文件拖放与 webview HTML5 DnD 同窗口互斥，调色板拖放改用 pointer 事件自实现（保住 Phase 3 文件拖放打开）。计划归档。
- 2026-05-29：**Phase 5 完成**。属性面板（右栏，选中节点改 fill/stroke/strokeWidth/fontSize/label，作用于所有选中，一次改动一条 history，按选区 key 重挂避免误写）；`NodeData` 加可选样式字段（旧 .dm 兼容），`ShapeNode` inline 覆盖回落 CSS；调色板加搜索 + 分类折叠；dagre 自动布局（`auto-layout.ts` 纯函数 + `applyAutoLayout` 一条 command + 菜单 View→Arrange 纵/横，布局后 fitView）。新增 `updateNodeStyle` command。计划归档。
