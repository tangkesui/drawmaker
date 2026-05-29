# Plan: Bootstrap Tauri 2 + React + xyflow 骨架 + Editor Core 雏形

- **日期**：2026-05-29
- **Phase**：1
- **承接**：替换已归档的 `plan-2026-05-28-bootstrap-tauri-tldraw.md`（许可证 + 体量两个事实出错后的方向调整）
- **目标**：`pnpm tauri dev` 能弹出 drawmaker 窗口，窗口里有最小工具栏 + xyflow 画布；能用 Toolbar 增删节点、连线、撤销/重做。Editor Core（Zustand store + Command 栈）落地骨架。
- **预估时间**：4-6 小时（比上一版重，因为多了 Editor Core + Toolbar）

## 起点状态（不是从零）

工作目录里已有：
- Tauri 2 + React 19 + TypeScript + Vite 完整骨架（来自上一计划 T1-T6）
- `src-tauri/` 已 customize（productName/identifier/window 配置）
- `package.json` 已含 tldraw v5、@tauri-apps/api 等
- `src/App.tsx` 当前嵌入了 `<Tldraw />`
- TypeScript strict ✅、`pnpm check` 通过 ✅
- `pnpm tauri dev` 还**没跑过**（用户在编译前叫停）

## 任务清单

### A. 清理与替换（T1-T3）

- [ ] T1：审计现有脚手架，列出复用/移除清单
- [ ] T2：移除 tldraw：`pnpm remove tldraw`；清理 `src/App.tsx`、`src/App.css` 里的 tldraw 引用
- [ ] T3：安装新依赖：`pnpm add @xyflow/react zustand react-hotkeys-hook immer`；devDep 加 `vitest`（headless 测 core）；暂不加 dagre/elkjs/pdf-lib（Phase 5/6 用）

### B. Editor Core 骨架（T4-T7）

- [ ] T4：`src/core/types.ts` — 定义核心类型
  - **铁律：core 类型纯 serializable，不 import 任何 xyflow API**。它就是 `.dm` 文件的内容；core ↔ xyflow 的形状映射只放 Canvas 层（T8），core 不感知 xyflow。
  - `DmNode` / `DmEdge`（我们自己的字段 + 强类型 `data`；不复用 xyflow 的 `Node`/`Edge` 类型）
  - `Document = { version, nodes, edges, meta }`
  - `ViewState = { selected, tool, viewport, hoverId }`（**不含 saveStatus**——文件 IO 是 Phase 2，避免 dead field）
  - `HistoryEntry = { label, patches, inversePatches }`（patch-based，见 T6）
  - `History = { stack: HistoryEntry[], cursor }`
- [ ] T5：`src/core/store.ts` — Zustand store（启用 immer middleware），三 slice
  - `doc` slice：Document Model（SSOT）
  - `view` slice：ViewState（不入 history）
  - `history` slice：HistoryEntry 栈 + cursor
- [ ] T6：`src/core/history.ts` — **patch-based 撤销栈（替代手写 Command 类）**
  - 一个通用 `commit(label, recipe)` 包装器：用 immer `produceWithPatches` 对 doc slice 跑 recipe，自动生成 `patches` / `inversePatches`，打包成 `HistoryEntry` 入栈（cursor 之后的 redo 分支截断）
  - `undo()`：对当前 entry 应用 `inversePatches`，cursor--
  - `redo()`：对下一 entry 应用 `patches`，cursor++
  - **重入防护**（实现时改用结构解法，见 T8）：历史只从 xyflow 手势回调采集，程序化改 prop 不触发回调，从结构上杜绝重入，不需要时间窗 flag
- [ ] T6b：`src/core/operations.ts` — 领域操作 = `commit()` 的调用点（addNode / moveNodes / deleteNodes / deleteEdges / connectNodes），UI 只调这些，不碰 history 机制；与通用 history.ts 分离
- [ ] T7：`src/core/__tests__/history.test.ts` — vitest headless 测 core 逻辑
  - addNode → undo → redo round-trip：节点数 1→0→1
  - moveNode → undo：坐标回到旧值
  - deleteNodes → undo：节点 + 关联 edge 恢复
  - redo 分支截断：undo 后做新操作，旧 redo 失效

### C. Canvas 集成（T8）

- [ ] T8：`src/canvas/Canvas.tsx`（`ReactFlowProvider` + 内层 `CanvasInner`）
  - **store(doc) 是 SSOT，单向同步到本地渲染态**（`useState` 的 nodes/edges）。doc 变化时 `useEffect` 重建本地态；selection 从 `view.selected` 取，避免重建丢选区。
  - **瞬态 vs 历史，分两条路**（替代原"按 change.type 分流入 Command"方案，更干净）：
    - `onNodesChange` / `onEdgesChange` → `applyNodeChanges` 只更新本地态（拖拽中位置、选区高亮），**不入 history**
    - 历史只从**手势回调**采集：`onNodeDragStop`→`moveNodes`、`onNodesDelete`→`deleteNodes`、`onEdgesDelete`→`deleteEdges`、`onConnect`→`connectNodes`
  - **重入防护（结构解法）**：上述手势回调只在用户操作时触发；undo/redo 程序化改 nodes prop 不触发它们 → 无重入、无需 flag
  - `onPaneClick`：tool=rect/ellipse 时 `screenToFlowPosition` → `addNode`，放置后回到 select
  - `onSelectionChange` → `view.selected`；删除走 xyflow 内建 `deleteKeyCode`（单一路径）
  - 注册 `nodeTypes`（rect、ellipse 自定义 + Handle）；`connectionMode=Loose` 让任意 Handle 可作起止点
  - 内建 Background + Controls + MiniMap

### D. UI Shell 雏形（T9）

- [ ] T9：`src/ui/Toolbar.tsx`
  - 工具按钮：Select / Rect / Ellipse / Connect / Delete
  - 操作按钮：Undo / Redo（disabled 状态跟 history.cursor 联动）
  - 简单 CSS 模块，先不上 Tailwind

### E. 快捷键 + 整合（T10-T11）

- [ ] T10：`src/ui/Keymap.tsx` — 用 react-hotkeys-hook 注册
  - `cmd+z` → undo
  - `cmd+shift+z` → redo
  - `v` → tool=select
  - `r` → tool=rect
  - `e` → tool=ellipse
  - `delete` → 删除选中节点
- [ ] T11：`src/App.tsx` 重写
  - `<div className="layout">` 三段式：Toolbar 顶 / Canvas 主 / Status Bar 底（Status Bar 占位 div 即可）
  - 移除原 tldraw 代码

### F. 验证 + 同步（T12-T15）

- [ ] T12：`pnpm check` 类型干净 + `pnpm test`（vitest）core 用例全绿
- [ ] T13：`pnpm tauri dev` 启动，按 manual 流程验证（见验收）
- [ ] T14：截图保存到 `docs/design/phase1-bootstrap.png`
- [ ] T15：同步 + commit（**用户授权后才做**）
  - 移动本计划到 `archive/`
  - 更新 `blueprint.md`：Phase 1 ✅，Phase 2 🔄
  - 更新 `CLAUDE.md`：Phase 0 完成定义勾完 commit 那行
  - `git add . && git commit -m ...`（Phase 0 + Phase 1 合并提交）

## 验收标准

1. `pnpm check` exit 0；`pnpm test` core 用例全绿（add/move/delete round-trip + redo 截断）
2. `pnpm tauri dev` 启动，窗口标题为 "drawmaker"
3. 窗口三段式布局：顶 Toolbar、中 Canvas、底 Status Bar 占位
4. 点击 Rect → 鼠标变成"加节点"语义；canvas 任意位置点击 → 出现一个 Rect 节点
5. 拖拽节点 → 位置更新；松手后 Cmd+Z → 节点回到拖之前的位置
6. 从节点的 Handle 拖到另一个节点 → 连线建立；Cmd+Z 撤销
7. 选中节点按 Delete → 删除；Cmd+Z 恢复
8. Cmd+Shift+Z → Redo 链能走通
9. 多次 Cmd+Z 直到 history.cursor=0，Undo 按钮 disabled
10. `src-tauri/tauri.conf.json` 仍是 productName "drawmaker"、bundle.identifier `com.tangkesui.drawmaker`

## 风险点

| 风险 | 应对 |
|---|---|
| **撤销重入死循环**：undo/redo 改 store → xyflow 重渲染 → 再次入栈 | 结构解法（已落地）：历史只从手势回调（onNodeDragStop/onNodesDelete/onConnect）采集，程序化改 prop 不触发回调，无重入；不再用时间窗 flag |
| xyflow 的内部状态跟 Zustand store 双向同步出问题 | 「store(doc) → 本地渲染态」单向；onNodesChange 只更新本地瞬态，不入 history |
| onNodesChange 高频触发（拖拽时每帧）导致栈爆 | 拖拽中只更新本地态；松手 `onNodeDragStop` 才 `moveNodes` 合并为一条 |
| React 19 + xyflow 12.x 兼容（peer deps） | xyflow 文档明示支持 React 18/19，已安装包验证 peerDep 区间 |
| macOS WebKit 渲染细节差异（如字体、滚动） | T13 验证时观察；不阻断 MVP |
| Editor Core 抽象过早导致 over-engineering | 先写最小骨架；撤销用 patch-based 通用 `commit()`，新操作只是新调用点，不加新类、不改架构 |
| patch-based 撤销正确性 | T7 vitest 覆盖 add/move/delete round-trip + redo 分支截断；core 纯逻辑可 headless 测，不依赖 GUI |

## 同步动作（完成后）

1. 本计划移动到 `docs/plan/archive/`
2. 更新 `docs/blueprint.md`：
   - Phase 1 ✅，Phase 2 🔄
   - 同步日志加：`2026-05-29: Phase 1 完成，xyflow + Editor Core + Toolbar 可运行`
3. 更新 `CLAUDE.md` Phase 0 完成定义最后一项（commit 勾上）
4. （首次 commit 需用户单独授权）

## 后注

**2026-05-29 完成。** 验收 1-10 全部通过(GUI 4-9 由用户手动确认)。T14(里程碑截图)经用户决定跳过——纯文档用途、不影响功能;后续如需再补到 `docs/design/`。

实现期相对正文的两处偏离(均已回写正文 T6/T8/风险表):

1. **重入防护从「时间窗 flag」改为「手势回调」结构解法**。原计划用 `isApplyingHistory` 在 do/undo/redo 期间置位、onNodesChange 据此跳过。动手时发现 flag 同步置位/重置撑不过 React 的异步重渲染——等 xyflow 真正发 change 时 flag 已被重置回 false,挡不住。改为:历史只从 `onNodeDragStop`/`onNodesDelete`/`onEdgesDelete`/`onConnect` 这些**用户手势回调**采集;程序化改 `nodes` prop(undo/redo)不会触发这些回调,从结构上杜绝重入,flag 直接删掉(顺带避免一个 dead field)。`onNodesChange` 只更新本地渲染态(拖拽瞬态、选区高亮),不入 history。

2. **去掉 connect 工具**。连线靠拖 Handle 完成(`connectionMode=Loose` 让任意 Handle 可作起止点),独立 connect 工具是冗余,从 `Tool` 类型里删了。删除统一走 xyflow 内建 `deleteKeyCode`,Keymap 不重复注册,避免双路径。

文件落点:`src/core/{types,store,history,operations}.ts` + `__tests__/history.test.ts`;`src/canvas/{Canvas.tsx,canvas.css,nodes/{Rect,Ellipse}Node.tsx}`;`src/ui/{Toolbar,Keymap}.tsx` + `toolbar.css`;`src/App.{tsx,css}` 重写。

一个 TS strict + xyflow 的坑:`NodeData` 必须是 `type` 而非 `interface`,否则不满足 xyflow `Node<T extends Record<string, unknown>>` 约束。

验证:`pnpm test` 5/5、`pnpm check` 干净、`pnpm build` 干净、`pnpm tauri dev` 窗口正常(`IMKCFRunLoopWakeUpReliable` 告警为 macOS 输入法子系统无害日志)。
