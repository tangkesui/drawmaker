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
✅ **Phase 6**: 导出 — SVG / PNG / PDF（html-to-image 快照 + pdf-lib，全图 bounds）— 计划已归档 `docs/plan/archive/plan-2026-05-29-phase6-export.md`
✅ **Phase 7**: 打包（自用 $0）— `pnpm tauri build` 出 ad-hoc 签名 dmg（~3.4MB），README 含首次放行说明；公证留待将来分发 — 计划已归档 `docs/plan/archive/plan-2026-05-29-phase7-package.md`
🔄 **Phase 8+**: 持续迭代 — elkjs 进阶布局、主题/暗色、模板、形状 resize、边样式等（见 Backlog）
🔄 **Phase 9**: 连线能力 — 标签 / 箭头方向 / 端点重连（已完成）
🔄 **Phase 10**: **Mermaid 转型**（2026-06-13 /goal 立项）— 把 drawmaker 做成可视化操作 mermaid 的工具：随时导出 mermaid、标准 mermaid 模块可拖拽、零代码画几乎所有 mermaid 图。Phase A（flowchart 导出）✅、Phase B（标准形状库）核心✅、Phase C（零代码增强）：实时预览 + 方向切换 + **13 种图表类型零代码可画可导出**（graph 家族 7：flowchart/sequence/state/class/er/c4/mindmap 用画布；数据/时间家族 6：pie/gantt/timeline/journey/quadrant/xychart 用表格编辑器）。计划 `docs/plan/active/plan-2026-06-13-mermaid-pivot.md`

## Roadmap

| Phase | 目标 | 状态 |
|---|---|---|
| 0 | 环境搭建（docs 骨架 + git） | ✅ |
| 1 | Tauri + React + xyflow 骨架 + Editor Core (Zustand + patch-based 撤销) + 基础 Toolbar | ✅ |
| 2 | 文件 IO：打开/保存 `.dm`，最近打开列表 | ✅ |
| 3 | macOS 系统集成：原生菜单、文件拖放、单实例、快捷键 | ✅ |
| 4 | 自定义 Custom Nodes：架构图常用形状（服务/数据库/队列/LB/CDN 等） | ✅ |
| 5 | UI 完整化：侧栏 shape library、属性面板、自动布局（dagre） | ✅ |
| 6 | 导出：SVG / PNG / PDF | ✅ |
| 7 | 打包：dmg + macOS 签名 + 公证（notarization） | ✅（自用 $0：dmg + ad-hoc；公证留待分发） |
| 8+ | 持续迭代：elkjs 进阶布局、主题、模板、暗色模式、AI 辅助等 | 🔄 |
| 9 | 连线能力：标签 / 箭头方向 / 端点重连 | ✅ |
| 10 | Mermaid 转型：导出 mermaid + 标准模块 + 零代码画 mermaid 图 | 🔄 A✅ B核心✅ C：13 类型可用 |

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
- (P1) **Mermaid 主线**（2026-06-13 /goal，见 Phase 10 + plan-2026-06-13-mermaid-pivot）：Phase C 长尾——实时 mermaid 预览面板、subgraph 分组、节点/边样式（虚线 -.-/粗线 ==/class/style）、图方向 UI 切换、导入 mermaid 文本反向建图、其他图表类型（sequence/class/state/ER/gantt…逐类推进）

## 同步日志

- 2026-05-28：项目立项。原定 Tauri 2 + tldraw + macOS only。建立 docs 骨架，归档 drawio-desktop v30.0.4 package.json 作参照。
- 2026-05-29：**渲染内核换型**。发现 tldraw v5 是 SDK License（非自由）、v2 是非商用许可、实际 ~165k LOC（不是宣传的 40k）。改用 xyflow / React Flow（MIT、~30k LOC、节点-连线模型契合架构图/流程图）。配套技术选型确定：Zustand（状态）、Command 模式（撤销栈）、dagre（自动布局）、react-hotkeys-hook（快捷键）。架构图入 blueprint。原 Phase 1 计划归档，新建 plan-2026-05-29-bootstrap-tauri-xyflow.md。
- 2026-05-29：35 项核心概念补盲到 Notion 知识树（CS → 前端 / 通用基础 / 后端 / 框架 / 库 等多个分支，含 3 新 Branch + 30 新 Leaf）。
- 2026-05-29：**Phase 1 完成**。Tauri + React + xyflow 骨架跑通；Editor Core 落地（Zustand store 三块 doc/view/history + immer patch-based 撤销栈 + operations 调用点）；自定义 Rect/Ellipse 节点 + Toolbar + 快捷键。撤销重入用「历史只从 xyflow 手势回调采集」的结构解法（非时间窗 flag）。core 逻辑有 vitest headless 覆盖。计划归档。
- 2026-05-29：**Phase 2 完成**。文件 IO 全链路：Rust 自定义命令（`std::fs` read/write + `recent.json`）+ `tauri-plugin-dialog` 原生面板；前端 `services/` 层是唯一碰 Tauri 的地方（守架构铁律）；`core/serialize` 带版本校验 + vitest；脏状态由 `history.cursor !== savedCursor` 派生（不单独存布尔）；新建/打开会清空 history 防跨文件撤回。新增 store `file` slice + `document-actions`。决策：读写用自定义命令（不引 fs 插件）、最近列表用自定义 recent.json（不引 store 插件）、未保存保护留到 Phase 3。计划归档。
- 2026-05-29：**Phase 3 完成**。原生 macOS 菜单（前端 JS Menu API 构建，菜单项直接调 document-actions/history/viewport，无 Rust 事件回传）；App 级快捷键归口菜单 accelerator、Keymap 只留 V/R/E；未保存保护（New/Open/关窗都拦，dialog `ask` 两按钮）；文件拖放打开；`tauri-plugin-single-instance` 聚焦已有窗口；viewport 控制桥打通 xyflow 缩放/fit。**尽调中发现并修复 Phase 2 隐藏 bug**：窗口标题因缺 `core:window:allow-set-title` 权限被静默拒绝，本 Phase 补权限 + 去掉静默吞错。计划归档。
- 2026-05-29：**Phase 4 完成**。数据驱动形状注册表（`canvas/shapes/registry`：每形状一条 `{kind,label,category,defaultSize,render(SVG)}`，nodeTypes/调色板/尺寸全派生）；通用 `ShapeNode` 渲染所有形状 + 双击改名（`renameNode` command）；10 个形状（通用 rect/rounded/ellipse/diamond + 架构 service/database/queue/loadbalancer/cloud/actor/note）；左侧调色板拖放放置。`NodeKind` 放宽为 string + 反序列化 fallback；移除 tool 工具模式（拖放放置不需要）、删 Keymap 与 `react-hotkeys-hook`（快捷键已全归原生菜单）。**执行中踩坑并修正**：Tauri OS 级文件拖放与 webview HTML5 DnD 同窗口互斥，调色板拖放改用 pointer 事件自实现（保住 Phase 3 文件拖放打开）。计划归档。
- 2026-05-29：**Phase 5 完成**。属性面板（右栏，选中节点改 fill/stroke/strokeWidth/fontSize/label，作用于所有选中，一次改动一条 history，按选区 key 重挂避免误写）；`NodeData` 加可选样式字段（旧 .dm 兼容），`ShapeNode` inline 覆盖回落 CSS；调色板加搜索 + 分类折叠；dagre 自动布局（`auto-layout.ts` 纯函数 + `applyAutoLayout` 一条 command + 菜单 View→Arrange 纵/横，布局后 fitView）。新增 `updateNodeStyle` command。计划归档。
- 2026-05-29：**Phase 6 完成**。导出 SVG / PNG / PDF：html-to-image 截 `.react-flow__viewport`（不含控件）、按 `getNodesBounds` 全图 bounds 平移导全图（非可见视口）；PNG/PDF 二进制经新增 Rust `write_file_bytes(Vec<u8>)` 写盘，SVG 走文本 `write_file`；PDF 用 pdf-lib 嵌 PNG 一页。`canvas/export-utils` 纯函数（box 换算 / dataUrl→bytes）有 vitest。菜单 File→Export ▸（SVG/PNG/PDF）。计划归档。
- 2026-05-29：**Phase 7 完成（自用 $0）**。`tauri.conf.json` 配 `bundle.macOS.signingIdentity="-"`（ad-hoc）+ minimumSystemVersion 12.0 + category；`pnpm tauri build` 出 `drawmaker_0.1.0_aarch64.dmg`（~3.4MB），codesign 验证 adhoc 有效，spctl rejected（未公证，预期）。本机构建无 quarantine、直接可运行。新增 `README.md`（构建 + 首次放行说明）。不涉及 Apple 凭据，未建 security.md。公证 / Developer ID（$99/年）留待将来分发。计划归档。**MVP 主线 Phase 1-7 全部完成，drawmaker 已是可日常使用的作图工具。** 已推 GitHub（public，github.com/tangkesui/drawmaker）。
- 2026-05-30：**Phase 8a 完成（补真窟窿）**。复制/剪切/粘贴/再制/全选画布节点（App 内部剪贴板 + 焦点感知键盘 `CanvasShortcuts`，文字仍走系统剪贴板；Edit 菜单换成真 op）；形状 resize（`NodeResizer` + `DmNode.size` 缺省回落注册表）。新增 `clipboard.ts` / `operations` 的 copy/cut/paste/duplicate/selectAll/resizeNode。逻辑 27 单测全绿；纯交互三项（resize 拖拽 / 运行态 ⌘C⌘V / 文本焦点 guard）因本机环境（无 cliclick/Quartz、中文 IME、NSOpenPanel AX 过深）未自动化验到，留手动。
- 2026-05-30：**Phase 8a 修复 + 实测**。发现 resize 手柄不显示（节点尺寸该用 `style.{width,height}` 而非顶层 `width/height`，v12 NodeResizer 才渲染手柄）、⌘C/⌘V 不触发（键盘监听改捕获阶段 + `e.code`，避免 ReactFlow 冒泡吞键 + IME）。两者修复后 computer-use 实测通过（resize 手柄出现、⌘C⌘V 节点数 1→2）。**教训**：此前验证一直撞到 `/Applications` 常驻的 Phase 7 安装版（单实例重定向 dev 启动），杀掉后 Phase 8 正常；dogfood 需用最新 build 重装。
- 2026-06-04：**代码体检 + v0.2.0 打包**。全量体检结论:架构健康(分层合规、无 any、无死代码),真问题集中在 history。修复:①撤销栈加 MAX_HISTORY=200 上限(超限丢最旧,cursor/savedCursor 平移,保存点被裁则置不可达哨兵恒 dirty);②**真 bug**——保存→撤销→新改动时 redo 分支截断不使旧 savedCursor 失效,新 cursor 数值碰巧相等会误判"干净"、关窗不提示丢失,已修并 4 个新单测锁住(31/31 绿);③`get_recent` 过滤已删除文件并回写;④PropertiesPanel/ShapePalette 渲染 memo 化。版本 0.1.0→0.2.0,`drawmaker_0.2.0_aarch64.dmg` 已构建并重装 /Applications,安装版冒烟通过。仓库已加 forgejo 远端双备份(2026-06-04 推送)。计划归档。
- 2026-06-13：**发布 v0.3.0**。Excalidraw 手感补全(双击建点 / 右键菜单 / Alt 拖拽复制;框选=Shift+拖拽走 xyflow 默认,不动现有平移手感)。版本 0.2.0→0.3.0,90 测试绿,`drawmaker_0.3.0_aarch64.dmg` 构建+重装。tag v0.3.0 推 GitHub/forgejo,两端 Release 均挂 dmg(GitHub releases/tag/v0.3.0、forgejo release id 10)。**v0.3.0 = mermaid 双向编辑(11/13 类型)+ 13 类型导出 + Excalidraw 手感的完整里程碑。** 沉淀方法论文档 docs/methodology.md。
- 2026-06-13：**双向导入扩展数据家族 4 种（11/13 双向）**。pie/gantt/timeline/journey 解析→DataDiagram→DataEditor 表格:`core/mermaid-import-data` 纯映射(pieToData/ganttToData/timelineToData/journeyToData,4 单测)+ services parsePie/Gantt/Timeline/Journey(注意 gantt 从 task.raw.startTime.startData/endTime.data 取、timeline title 在 commonDb)+ importMermaid 数据分支(commit doc.data[type]+diagramType,不动画布)+ EDITABLE_TYPES。**quadrant/xychart 导入暂缓**(getQuadrantData 已处理渲染数据难反推、xychart-beta 解析报词法错;导出仍可用)。**至此 13 种里 11 种文本↔画布双向**(仅 quadrant/xychart 单向导出)。86/86 测试绿,已重装。待续:jsdom 集成测试。
- 2026-06-13：**双向导入扩展 c4 + mindmap（graph 家族 7 种全双向）**。c4:`getC4ShapeArray`(person→actor/system→rect)+`getRels`→边;mindmap:`getMindmap` 树展平为节点 + 父子边。parseC4/parseMindmap + c4ToGraph/mindmapToGraph(2 单测)+ 分发 + EDITABLE_TYPES。**至此 graph 家族 7 种(flowchart/state/class/er/sequence/c4/mindmap)全部文本↔画布双向**。82/82 测试绿,已重装。待续:数据/时间家族 6 种(解析→DataEditor 表格)+ jsdom 集成测试。
- 2026-06-13：**双向导入扩展 sequence**。参与者按 `getActorKeys` 顺序→节点、`getMessages` from/to→边、direction=LR、跳过 note 等无两端事件。parseSequence(services)+ sequenceToGraph(core 纯映射,1 单测)+ importMermaid 分发 + EDITABLE_TYPES+=sequence。**已双向:flowchart/state/class/er/sequence(5/7 graph 类型)**。80/80 测试绿,已重装。待续:mindmap/c4 + 数据家族(解析→DataEditor)。
- 2026-06-13：**双向导入扩展 state/class/er**。flowchart 之外再加 3 个 node-edge 家族类型可粘贴出图。services/mermaidParse 加 parseState/parseClass/parseEr(抽 getStates/getRelations、getClasses、getEntities/getRelationships,注意 er relationship 用内部 id `entity-X-n` 需经 entity.id 映射回 key);core/mermaid-import 加纯映射 stateToGraph/classToGraph/erToGraph(class 成员去 mermaid 的 `\+` 转义、class/er 多行节点按行数 boxSize 估高);importMermaidFromText 重构为按 diagramType 分发(flowchart-v2/stateDiagram/class/er)+ 公共 dagre 重建;computeLayout 改用 `node.size ?? defaultSize`;MermaidPanel EDITABLE_TYPES += state/class/er。**已双向类型:flowchart/state/class/er**。79/79 测试绿,已重装。待续:sequence/mindmap/c4 + 数据家族(解析→DataEditor)+ jsdom 集成测试。
- 2026-06-13：**Tier2 样式往返（颜色 + 边样式双向）**。①**节点颜色往返**:flowchart 导出 `style id fill:..,stroke:..,stroke-width:..px`;导入读 mermaid `vertex.styles` 数组(实测形态 `["fill:#f9f",...]`)解析回 fill/stroke/strokeWidth。②**边样式往返**:`EdgeData.style`(solid/dashed/thick)+ 属性面板「线型」下拉 + 画布渲染(dasharray/strokeWidth,只设虚线/线宽不碰 stroke 故选中蓝仍生效)+ 导出 `线型×方向` 9 操作符表(probe 实测 mermaid 全合法、import 侧 type 与 stroke 分开给)+ 导入读 `edge.stroke`。`parseFlow` 加防御 `mermaid.parse` 触发图类型注册。76/76 测试绿,已重装。
- 2026-06-13：**形状收敛 + 对齐参考线（双向保真 + Excalidraw 手感）**。①**形状收敛**(P4):调色板只留往返安全的 canonical 10 形状(rect/rounded/diamond/stadium/subroutine/cylinder/circle/hexagon/parallelogram/trapezoid);ellipse(→stadium)与架构形状(service/database/queue/loadbalancer/cloud/actor/note)退出调色板(`HIDDEN_KINDS`)但保留注册表渲染旧 .dm。②**拖动对齐参考线+吸附**(Excalidraw/tldraw 招牌,staging Tier1 首项):`canvas/helper-lines.ts` 纯计算(左/右/中×上/下/中,阈值吸附)+ Canvas onNodesChange 吸附 + `HelperLinesOverlay` 蓝线,4 单测。71/71 测试绿,已重装。前序双向工作已 commit+push 两端(80f4f26 剪贴板/e0b3721 mermaid 双向/42e9083 docs)。
- 2026-06-13：**Mermaid 双向转换立项 + flowchart 入站打通（Phase 10 续）**。用户确认方向:drawmaker = mermaid 可视化操作软件,文本↔画布双向均可编辑,为此可舍弃部分现有支持。四决策:①画布(doc)为准+文本「应用」按钮;②目标全 13 种双向(先 flowchart 竖切);③形状收敛到 mermaid 标准集保无损往返;④用 mermaid 官方解析器。**核心认知**:mermaid 文本无坐标(它是布局引擎),拖拽位置只存 .dm,导出文本保持干净标准。**de-risk(V0)**:实测 mermaid 官方解析器——jsdom 给 DOM 后 `db.getVertices/getEdges/getDirection` 干净抽出节点(id+文字+形状)/边(+标签+箭头)/方向,用语义 id(A/B/C)正好往返;依赖 DOM(webview 有,headless 测试需 jsdom);引入 mermaid 11(+95 包,dist 430KB→4.1MB 按类型懒加载,**dmg 3.4→4.3MB**)。**已落地**:`core/mermaid-import`(纯映射,3 单测)+`services/mermaidParse`(DOM 解析)+`services/importMermaid`(解析→flowToGraph→dagre 布局→重建 doc 保位置)+菜单 File▸Import Mermaid(剪贴板)⌘⇧V。**flowchart「粘贴出图」已通**。**续:可编辑面板**——MermaidPanel 文本框改可编辑 + 「应用到画布」按钮(草稿与画布生成文本同步:未手改时实时镜像、手改后保留草稿、点应用解析回画布并保位置),flowchart 双向闭环在一个面板内成立(Excalidraw mermaid 对话框同款)。**Excalidraw/Whiteboard 吸收方向已确认**(staging-excalidraw-practices):边界=纯 mermaid(所有元素可往返,不做 freedraw/便利贴/frame)、保持精确风格不做手绘;后续吸收 Tier1 交互手感(对齐吸附/双击建点/右键菜单/Alt复制)+ Tier2 样式往返(颜色→mermaid style、边样式、subgraph)。67/67 测试绿,已重装,dmg 4.3MB。**待续**:形状收敛调色板、扩展其余类型解析、Tier1/2。计划 plan-2026-06-13-mermaid-bidirectional.md + staging-excalidraw-practices.md。
- 2026-06-13：**Mermaid 转型立项 + Phase A/B 首交付（Phase 10）**。/goal 把 drawmaker 定位为「可视化操作 mermaid」工具(3 需求:随时导出 mermaid / 标准 mermaid 模块可拖拽 / 零代码画几乎所有 mermaid 图)。mermaid 十几种图表类型是长尾,策略=先打通与 xyflow 节点-连线同构的 flowchart。**Phase A 导出**:`core/mermaid.ts` 的 `toMermaid(doc)` 纯函数——kind→形状语法映射表(core 自维护,不依赖 canvas/registry)、label 双引号转义(引号→&quot; 换行→<br/>)、边 arrow→`-->`/`---`/`<--`/`<-->`、边 label→`-->|"x"|`、`meta.direction` 缺省 TD;`exportService` 加 `exportMermaid`(.mmd 文件)+`copyMermaid`(剪贴板);菜单 File▸Export▸Mermaid… + Copy as Mermaid(⌘⇧M)。**Phase B 标准形状**:新增「Mermaid」分类(调色板置顶)7 个标准 flowchart 形状 stadium/subroutine/cylinder/circle/hexagon/parallelogram/trapezoid,kind 与 mermaid 形状语义一一对应。10 个 mermaid 单测,49/49 绿,已重装 /Applications。验证:画图→Copy as Mermaid→贴 mermaid.live 应渲染同构图。**Phase C 进行中**:①右侧实时 mermaid 预览面板(深色栏,随 doc 即时更新 + 复制 + 折叠);②图方向 UI 切换(下拉 TD/LR/RL/BT,`setDirection` 入 history);③**多图表类型**——`toMermaid` 重构为按 `meta.diagramType` 分发的序列化器注册表(加一种=加一个序列化器),已支持 graph 家族 5 种:flowchart / sequence / state / class / er,预览面板「类型」下拉切换,`setDiagramType` 入 history;多行 label 复用(class 首行=类名余行=成员、er 首行=实体名余行=属性、sequence 参与者按节点序、消息按边序)。④**数据/时间家族**(pie/gantt/timeline/journey/quadrant/xychart):非"节点+连线",新建 schema 驱动的表格编辑器 `DataEditor`(标题+配置+行表,受控字段失焦提交入 history),`DmDocument.data` 按类型存内容并随 .dm 序列化(加 round-trip 测试),6 个序列化器接入注册表,App 按 `isDataDiagram` 在画布/表格编辑器间切换。⑤**C4 + mindmap**(复用画布):c4(节点→Person/System、边→Rel)、mindmap(从节点+连线派生树,根入度0+DFS缩进,森林挂根有损)。**至此 graph 7(flowchart/sequence/state/class/er/c4/mindmap)+ 数据 6(pie/gantt/timeline/journey/quadrant/xychart)= 13 种 mermaid 类型零代码可画可导出**,覆盖 mermaid 主流/常用图表绝大多数。剩余为极小众/实验类型(gitgraph/requirement/sankey/block/kanban/architecture/radar/treemap 等)+ 边样式/subgraph/导入反向,见 plan + Backlog。64/64 测试绿,已重装 /Applications。计划 active:plan-2026-06-13-mermaid-pivot.md。
- 2026-06-12：**系统级复制粘贴**。节点/边复制粘贴从 App 内存剪贴板升级为系统剪贴板:复制写入系统剪贴板(带 `drawmaker/clip@1` magic 的 JSON 文本),粘贴读取并识别——跨重启/实例持久;粘贴外部文本时 `parseClip` 返回 null、静默忽略不破坏画布。⌘D 再制保持原地复制不变。新依赖:Tauri 官方 `tauri-plugin-clipboard-manager`(MIT/Apache-2.0,一方,体量小)+ `@tauri-apps/plugin-clipboard-manager@2.3.2`,capability 加 read-text/write-text 权限。分层:`services/clipboardService`(IO)+ `core/clipboard`(纯序列化 serializeClip/parseClip)+ `core/operations`(纯逻辑 getSelectionClip/pasteClip)+ 新 `core/clipboard-actions`(协调层,async copy/cut/paste,类比 document-actions);copy/cut/paste 同步→异步,CanvasShortcuts/menuService 调用点适配。clipboard.test 重构为纯逻辑(放置 + 序列化 round-trip + 外部文本 null),系统剪贴板 IO 留手动。38/38 测试绿,已重装 /Applications。计划归档 plan-2026-06-12-system-clipboard.md。
- 2026-06-12：**连线端点重连（Phase 9 连线能力第三片）**。选中边后拖动端点改接到新连接桩/新节点。xyflow 内置能力:EdgeWrapper 在提供 `onReconnect` 且 `edgesReconnectable`(默认 true)时自动在端点渲染透明可拖锚点(默认 cursor:move),回调 `(oldEdge, newConnection)`。实现:`operations.reconnectEdge(id, conn)` 更新边 source/target/handle 入 history(core 不 import xyflow,conn 用内联结构、Canvas 边界转入);Canvas 接 `onReconnect`;edges.css 让选中边的锚点显示成小蓝点(r:4)做拖动提示。35/35 测试绿,已重装 /Applications。改动小未单独起 plan。
- 2026-06-12：**连线箭头 + 右侧下拉配置（Phase 9 连线能力第二片）**。连线默认显示方向箭头(A→B 终点),选中边时右侧属性面板出现「箭头」下拉:终点→/起点←/双向↔/无。数据模型 `EdgeData.arrow?: "none"|"end"|"start"|"both"`(缺省=end,旧 .dm 及现有边自动获得终点箭头);渲染层 `toFlowEdge` 按 arrow 映射 `markerStart/markerEnd`(MarkerType.ArrowClosed),LabeledEdge 补透传 markerStart。选区扩展:`ViewState.selectedEdges` + onSelectionChange 记录,PropertiesPanel 拆 NodePanel/EdgePanel(节点优先)。`operations` 加 `updateEdgeStyle` + 重构 `renameEdge` 共用 `applyEdgeData` 字段级剪枝(空 label / 默认 arrow=end 都从 data 删,避免清空 label 误删 arrow)。连线默认描边改深灰 #5b6b7b(走 edges.css 让选中蓝实时生效,不靠重建)。34/34 测试绿,已重装 /Applications。计划归档 plan-2026-06-12-edge-arrows.md。
- 2026-06-12：**形状文字多行**。节点 label 支持换行:编辑框由单行 `<input>` 换 `<textarea>`,Enter=换行(原绑提交),提交改走点开别处 / Cmd+Enter,Esc 取消;显示层 `.shape-label` 加 `white-space: pre-wrap` 保留 `\n`。`label` 仍是普通字符串(含 `\n`),无需改数据模型/序列化。已重装 /Applications。
- 2026-06-12：**连线标签（Phase 9 连线能力第一片）**。边支持文字标签:双击边进编辑(Enter 提交/Esc 取消),标签白底居中盖线,入 undo 栈,随 .dm 持久化(`DmEdge.data.label` 可选字段,旧文件兼容)。实现:自定义 `LabeledEdge`(BaseEdge + EdgeLabelRenderer)+ `renameEdge` op + Canvas 注册 edgeTypes/onEdgeDoubleClick。坑:边 wrapper 默认无 `nopan`(节点有),双击边会触发 d3 缩放,已在 toFlowEdge 挂 `nopan`;标签层默认 `pointer-events:none` 需显式开回。32/32 测试绿,已重装 /Applications。计划归档 plan-2026-06-12-edge-labels.md。
- 2026-06-10：**拖拽残影修复 + 发布管理建制**。残影根因:选中态 CSS `filter: drop-shadow` 在 WKWebView 下父级 transform 拖动时旧区域失效不彻底,沿路径留整节点残影;去 filter 改加粗蓝描边(1.5→2px)。建立 tag + Release 双端发布:`v0.2.0` 已打 tag 推 GitHub/forgejo,两端 Release 均挂 dmg(含 Gatekeeper 放行说明,面向朋友分发,仅 aarch64);发布流程沉淀进 README。dmg 维持构建副产物定位(不进 git)。
