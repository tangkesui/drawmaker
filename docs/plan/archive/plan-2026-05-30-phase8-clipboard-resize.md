# Plan: Phase 8a — 补真窟窿（复制/粘贴/再制/全选 + 形状 resize）

- **日期**：2026-05-30
- **Phase**：8（持续迭代第一项）
- **承接**：MVP 主线 Phase 1-7 完成（`af08149`），已推 GitHub
- **目标**：补两个最影响日常手感的洞——① 画布节点的复制/剪切/粘贴/再制/全选（Edit 菜单现有项对画布无效）；② 形状可拖拽 resize。
- **预估时间**：4-6 小时

## 起点状态

- Edit 菜单的 Cut/Copy/Paste/SelectAll 是 Tauri 预定义项，**只对文本框生效，对画布节点完全不工作**（真窟窿）
- 形状尺寸写死在注册表 `defaultSize`，**不能 resize**
- 选区在 `view.selected`（由 xyflow `onSelectionChange` → store 单向）；无「程序化设选区」通道
- 节点放置/导出已有 bridge 模式（placement / export / viewport），selection 也照此加
- `DmNode = {id,kind,position,data}`，无 size 字段

## 关键设计决策

1. **剪贴板用 App 内部**（模块级 holder），非系统剪贴板：单实例够用、不碰系统 pasteboard 序列化。跨实例/跨应用粘贴留 backlog。
2. **快捷键用焦点感知的键盘监听**，不挂菜单 accelerator：在文本输入/contentEditable 内按 ⌘C/⌘V 应是文字操作；菜单 accelerator 会无差别拦截。故 Edit 菜单项**不绑 accelerator（仅可点击）**，另用一个 `CanvasShortcuts`（raw keydown + 焦点 guard）绑 ⌘C/⌘X/⌘V/⌘D/⌘A。避免文字冲突 + 双触发。代价：菜单项不显示快捷键提示（可接受）。
3. **粘贴/再制 = 一条 command**：新 id + 偏移 +24，重映射内部边的 source/target，整批入一条 history；粘贴后选中新节点。
4. **resize 用 xyflow `NodeResizer`**：`DmNode` 加可选 `size`，缺省回落注册表 `defaultSize`；拖拽中走 onNodesChange 本地实时缩放，`onResizeEnd` 提交一条 `resizeNode` command。SVG render(w,h) 本就参数化，自动随尺寸缩放。

## 任务清单

### A. 复制/粘贴/再制/全选（T1-T5）

- [ ] T1：`src/core/clipboard.ts` — 模块级 `{nodes, edges}` holder（set/get）
- [ ] T2：`src/core/operations.ts` 加
  - `copySelection()`：取选中节点 + 两端都在选区内的边，深拷进剪贴板
  - `cutSelection()`：copy + `deleteNodes(selected)`
  - `pasteClipboard()`：新 id + 偏移、重映射边，一条 command，选中粘贴出的新节点
  - `duplicateSelection()`：相当于「就地 copy+paste」一条 command，不动剪贴板
  - `selectAll()`：选中所有节点
- [ ] T3：`src/canvas/selection.ts` bridge + Canvas 注册 `setSelectedNodes(ids)`（程序化设 xyflow 选区，供 selectAll / 粘贴后选中）
- [ ] T4：`src/ui/CanvasShortcuts.tsx` — `keydown` 监听，焦点在可编辑元素时直接 return；绑 `mod+c/x/v/d/a`；挂进 App
- [ ] T5：`menuService` Edit 子菜单：把预定义 Cut/Copy/Paste/SelectAll **换成真 MenuItem**（不绑 accelerator）调对应 op，并加 Duplicate；保留 Undo/Redo/Delete

### B. 形状 resize（T6-T8）

- [ ] T6：`types.ts` `DmNode` 加 `size?: {width,height}`（旧 .dm 兼容）；`Canvas.toFlowNode` 把 `size ?? 注册表 defaultSize` 映射到 xyflow node 的 width/height
- [ ] T7：`ShapeNode` 用 props 的 width/height（回落 defaultSize）渲染；加 `<NodeResizer isVisible={selected} minWidth minHeight>`，`onResizeEnd` → `resizeNode(id,{w,h})`
- [ ] T8：`operations.ts` 加 `resizeNode(id, size)`（一条 command）

### C. 验证 + 同步（T9-T12）

- [ ] T9：测试 —— `operations`：copy→paste 节点+边都翻倍且 undo 回退；duplicate；cut；resizeNode round-trip + undo；selectAll 设 view.selected
- [ ] T10：`pnpm check` + `pnpm test` 全绿
- [ ] T11：`pnpm tauri dev` 手动验证（见验收）
- [ ] T12：同步 blueprint + 归档计划 + commit（**用户授权后**）

## 验收标准

1. `pnpm check` exit 0；`pnpm test` 全绿
2. 选中几个连线的节点 → ⌘C ⌘V → 出现一组带偏移的副本（含它们之间的连线），且新副本被选中
3. ⌘Z 一次撤销整批粘贴
4. ⌘X 剪切（删除并入剪贴板）→ ⌘V 粘回
5. ⌘D 再制选中
6. ⌘A 全选所有节点
7. **在标签编辑框 / 属性面板输入框里** ⌘C/⌘V 是**文字**复制粘贴，不会误触节点复制
8. 选中节点出现 resize 手柄，拖动改大小；松手后 ⌘Z 撤销到原尺寸
9. resize 后形状不变形（圆柱/菱形/六边形等随尺寸正常缩放）
10. 存含 resize/粘贴结果的 `.dm` → 重开恢复；旧无 size 的 `.dm` 仍正常（回落默认尺寸）
11. Edit 菜单点 Copy/Paste/Duplicate/Select All 也能用（无快捷键提示但功能正常）

## 风险点

| 风险 | 应对 |
|---|---|
| 文本框内 ⌘C/⌘V 被节点复制抢走 | CanvasShortcuts 焦点 guard：activeElement 是 input/textarea/contentEditable 时直接 return；菜单项不绑 accelerator |
| 粘贴边 id/端点重映射错 | 建 oldId→newId map，只复制两端都在选区的边；新边新 id |
| NodeResizer 与受控本地态/提交时机 | 拖拽走 onNodesChange 本地实时；onResizeEnd 才提交 doc，docNodes 回流重建一致 |
| 程序化选区与 onSelectionChange 回环 | setSelectedNodes 改 xyflow 选区→onSelectionChange 回写 view.selected，单向收敛；粘贴则先写 view.selected 再 commit |
| resize 后 SVG 变形 | render(w,h) 已参数化；NodeResizer 设 minWidth/minHeight 防过小 |
| 多次粘贴叠在一起 | MVP 固定偏移 +24；累进偏移留后续 |

## 决策点（2026-05-30 已定）

- **A. 剪贴板** → App 内部剪贴板。文字编辑仍走系统剪贴板（焦点 guard 放行）；节点复制仅限 App 内。
- **B. 范围** → 全套：copy / cut / paste + 再制(⌘D) + 全选(⌘A)。
- **C. resize** → 自由缩放（等比锁定留后续）。
- 复制内容 = 选中节点的完整深拷贝（kind/position/label/样式/size）+ 选区内部边（含 handle）。

## 同步动作（完成后）

1. 本计划移到 `docs/plan/archive/`
2. `blueprint.md`：Phase 8 进展记一条；从 Backlog 划掉 resize / 边……（resize 完成）
3. （commit 需用户单独授权）

## 后注

**2026-05-30 完成。** 静态检查全过：`pnpm check` / `pnpm test`(27/27：+7 个 clipboard/resize) / `pnpm build` 干净。

实现落点：
- 选区程序化设置没用单独 bridge，改成 Canvas 一个 `view.selected → 本地节点 selected` 的 effect（带"仅在不一致时更新"的防回环 guard）。比正文 T3 的 bridge 更简。
- 复制深拷用 `structuredClone`；粘贴/再制走同一个 `placeCopies`（新 id + 偏移 +24 + 重映射内部边），整批一条 command，并先 `setSelected(newIds)` 再 commit，让 docNodes 回流时自动选中新副本。
- resize 用 xyflow `NodeResizer`（`isVisible={selected}`），`DmNode.size` 缺省回落注册表 `defaultSize`，`onResizeEnd` 提交一条 `resizeNode`。
- 快捷键焦点 guard（`CanvasShortcuts`）：输入框/contentEditable 内 ⌘C/⌘V 放行给系统文字操作；菜单项不绑 accelerator，避免双触发。Edit 菜单的预定义 Cut/Copy/Paste/SelectAll 换成真 MenuItem 调画布 op。

**验证情况（诚实记录）：** 逻辑层 27 单测全绿；菜单接线（AX 读到 Edit 5 项齐全）、UI 渲染、标题栏修复经 computer-use 截图/AX 确认。**纯交互三项**（NodeResizer 手柄拖拽、运行态 ⌘C/⌘V、文本框焦点 guard）未自动化验到——本机环境三重阻塞：无 cliclick/Quartz（合成不了拖拽放置）、中文 IME（keystroke 打路径被转拼音，文件对话框自动化失败）、NSOpenPanel AX 层级过深。留待用户手动点验或切 ABC 输入法后补。

**顺带观察（待查，未列入本次范围）：** 种 recent.json 后重启，Open Recent 菜单只显示 2 条里的 1 条——可能是 `loadRecentList` → 菜单重建的时序/去重问题，也可能是 seed 时序噪声，inconclusive。后续若复现再单独排查。
