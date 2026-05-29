# Plan: Phase 3 — macOS 系统集成（原生菜单 + 拖放 + 未保存保护）

- **日期**：2026-05-29
- **Phase**：3
- **承接**：Phase 2（文件 IO）已完成并 commit（`4007889`）
- **目标**：原生 macOS 菜单栏（App / File / Edit / View）成为命令的规范入口；快捷键归口到菜单 accelerator；把文件拖放打开、未保存改动保护补上（Phase 2 决策 C 押后的部分）。
- **预估时间**：4-6 小时

## 起点状态

- 无原生菜单（`lib.rs` 的 `Builder` 没配 menu）
- 快捷键散在 `Keymap.tsx`（react-hotkeys-hook）：⌘Z/⌘⇧Z、V/R/E、⌘N/O/S/⌘⇧S
- 工具栏有 File 区（New/Open/Save）+ Recent 下拉
- 文件 IO / 脏状态 / document-actions 已就绪（`isDirty()`、`save()`、`openPath()` 等可直接复用）
- 无拖放、无未保存保护、无单实例

## 执行尽调（2026-05-29，已核 installed 版本）

核对 `@tauri-apps/api` 2.11.0 类型定义 + `src-tauri/gen/schemas` 权限清单，确认可执行：

- **JS Menu API 可用**：`Menu.new`/`setAsAppMenu`、`Submenu.new`、`MenuItem.new({text, accelerator, enabled, action})`、`PredefinedMenuItem`（`Quit`/`About`/`CloseWindow`/`Separator`/`Hide`/`Services`）。action 回调直接在 JS 跑。
- **Edit 的 Undo/Redo 必须用自定义 `MenuItem`**（调我们的 `undo()`/`redo()`）；预定义 `Undo`/`Redo` 走 macOS 响应链，不连我们的 history。
- **`onCloseRequested(async (e) => {...})`** 支持异步；放行关闭须调 `getCurrentWindow().destroy()`，**不能用 `close()`**（会再次触发 close-requested 死循环）。
- **`onDragDropEvent`** payload `{ type: 'drop', paths: string[] }`，未单独门控。
- **权限**：菜单 / 事件 / 拖放已被 `core:default` 覆盖（含 `core:menu:default` 的 `allow-set-as-app-menu` 等）。但 **`set_title` 与 `destroy` 不在 `core:window:default` 子集**，须显式加 `core:window:allow-set-title`、`core:window:allow-destroy`。
- **⚠️ 顺带修 Phase 2 隐藏 bug**：Phase 2 的 `TitleSync` 因缺 `allow-set-title` 被静默拒绝（`.catch(()=>{})` 吞了错），窗口标题其实从未更新。本 Phase 加权限后即修复；同时去掉静默吞错，让未来的拒绝能浮现。
- 单实例聚焦在 Rust 侧 `WebviewWindow::set_focus`，不需 JS 权限。

## 关键设计决策

1. **菜单用前端 JS Menu API 构建**（`@tauri-apps/api/menu`），不走 Rust `on_menu_event` + 事件回传。
   - 理由：菜单项点击回调直接在 JS 里调 `document-actions` / `history`，无需 Rust↔前端事件往返；Recent 子菜单随 store 变化重建也只在前端做。菜单逻辑归到 `services/menuService.ts`，守住「Tauri 只在 services 层」铁律。
2. **快捷键归口**：App 级命令（New/Open/Save/Save As/Undo/Redo）的 accelerator 交给原生菜单（macOS 菜单 accelerator 优先级最高、避免与 webview 双触发）；`Keymap.tsx` 只保留**编辑器工具键** V/R/E。删除仍走 xyflow 内建 `deleteKeyCode`。
3. **未保存保护**用 dialog 插件的 `ask`：New/Open 前若 dirty → 询问「保存 / 不保存 / 取消」；窗口关闭（`onCloseRequested`）同样拦截。
4. **Recent 归口到菜单 Open Recent 子菜单**，移除工具栏的 Recent 下拉（避免两个来源）。工具栏 New/Open/Save 按钮保留（便捷入口）。

## 任务清单

### A. 原生菜单（T1-T3）

- [ ] T1：`src/services/menuService.ts` — 用 `@tauri-apps/api/menu` 构建并 `setAppMenu`
  - App：关于 / 退出（用 `PredefinedMenuItem`）
  - File：New ⌘N、Open ⌘O、Open Recent ▸（动态）、Save ⌘S、Save As ⌘⇧S
  - Edit：Undo ⌘Z、Redo ⌘⇧Z、Delete
  - View：Zoom In ⌘+、Zoom Out ⌘-、Reset Zoom ⌘0、Fit ⌘1（经 viewport 控制桥，见 T1b）
  - 每个 item 的 action 直接调对应 document-actions / history / viewport 函数
- [ ] T1b：`src/canvas/viewport-controls.ts` — viewport 控制桥
  - 一个模块级 registry `{ zoomIn, zoomOut, resetZoom, fitView }`；`CanvasInner` 挂载时用 `useReactFlow()` 把这些函数注册进去；menuService 调用
  - 理由：xyflow 的缩放/fit 只能在 ReactFlowProvider 内拿到，菜单在 React 外，需要这层桥
- [ ] T2：Open Recent 动态子菜单 — 订阅 `store.file.recent`，变化时重建菜单（或重建该子菜单）；空列表时 disabled
- [ ] T3：`capabilities/default.json` 加 `core:window:allow-set-title`、`core:window:allow-destroy`（菜单/事件已被 core:default 覆盖，无需再加）；并去掉 `TitleSync` 里的静默 `.catch(()=>{})`，顺带修复 Phase 2 标题不更新的 bug

### B. 快捷键归口（T4）

- [ ] T4：`Keymap.tsx` 删掉 ⌘N/O/S/⌘⇧S 与 ⌘Z/⌘⇧Z（移交菜单 accelerator），只留 V/R/E；确认无双触发

### C. 未保存保护（T5-T6）

- [ ] T5：`confirmDiscardIfDirty(): Promise<boolean>`（并入 document-actions）
  - 不 dirty → 直接 true；dirty → dialog `ask("有未保存的改动，确定放弃？", {kind:'warning', okLabel:'放弃', cancelLabel:'取消'})`
  - **执行约束**：plugin-dialog 只有两按钮，无原生「保存/不保存/取消」三选一。故为「放弃/取消」二选一（取消则中止，用户可先 ⌘S 再重试）。真三按钮需自写 React 模态，留后续增强。
  - `newDocument` / `openPath` / `openViaDialog` 改为 async，执行前过这道关（单一强制点，菜单/工具栏/快捷键/拖放都受益）；内部用不过关的私有 `loadInto(path)` 避免双重确认
- [ ] T6：窗口关闭拦截 — `getCurrentWindow().onCloseRequested(async e => …)`，先 `e.preventDefault()`，dirty 时走 T5 流程；用户确认放行后调 `getCurrentWindow().destroy()`（不能用 `close()`，会再触发本事件）

### D. 文件拖放（T7）

- [ ] T7：`src/services/dragDropService.ts` — 监听 `onDragDropEvent`，drop `.dm` 文件 → 过未保存关 → `openPath`；非 `.dm` 忽略

### E. 单实例（T8）

- [ ] T8：`tauri-plugin-single-instance`
  - `Cargo.toml` 加依赖；`lib.rs` `.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| { ... }))`
  - callback：聚焦 + unminimize 主窗口；argv 里若带 `.dm` 路径则 emit 给前端打开（hook 预留，当前无文件关联可走空）
  - 注意：single-instance 插件需在 builder 最先注册（官方要求）

### F. 整合 + 验证 + 同步（T9-T12）

- [ ] T9：App 启动 `useEffect` 初始化：建菜单 + 注册拖放 + 关闭拦截；订阅 `store.file.recent` 重建 Open Recent；监听单实例 emit 的打开事件
- [ ] T10：`pnpm check` + `pnpm test` 全绿（guard 纯逻辑部分可加 vitest）
- [ ] T11：`pnpm tauri dev` 手动验证（见验收）
- [ ] T12：同步 blueprint（Phase 3 ✅ / Phase 4 🔄）+ 归档计划 + commit（**用户授权后**）

## 验收标准

1. `pnpm check` exit 0；`pnpm test` 全绿
2. 顶部出现原生 macOS 菜单栏：App / File / Edit / View，文字与 accelerator 正确
3. 菜单 File→Save / Edit→Undo 等都能用，行为与工具栏一致
4. ⌘S / ⌘Z 等只触发一次（无 webview + 菜单双触发）
5. 有改动时 File→New 或 ⌘O → 弹「保存/不保存/取消」；取消则不切换
6. 有改动时点窗口红灯关闭 → 弹同样的询问；取消则窗口不关
7. 从 Finder 拖一个 `.dm` 到窗口 → 过未保存关后打开该文件
8. 菜单 File→Open Recent 列出最近文件，随保存/打开更新；空时该项 disabled
9. 工具栏不再有 Recent 下拉（已归口菜单）；New/Open/Save 按钮仍在
10. View→Zoom In/Out/Reset/Fit（⌘+ / ⌘- / ⌘0 / ⌘1）对画布生效
11. 应用运行中再启一个实例 → 不开新窗口，已有窗口被聚焦置前
12. （回归 Phase 2）窗口标题随文件名 + 脏标记**真正更新**（如 "• Untitled — drawmaker"），不再是固定 "drawmaker"

## 风险点

| 风险 | 应对 |
|---|---|
| 菜单 accelerator 与 Keymap 双触发 | T4 把 App 级快捷键从 Keymap 移除，单一来源在菜单 |
| JS 重建菜单的开销 / 闪烁 | Recent 变化频率低（仅保存/打开时）；只在变化时重建，不每帧 |
| `onCloseRequested` 里 await 异步 dialog 的时序 | 处理器内先 `preventDefault`，await 用户选择，确认后再 `getCurrentWindow().destroy()` |
| 菜单权限没配 → 运行时报错 | T3 配 capabilities；dev 时观察控制台 |
| 拖放事件平台差异 | 用 Tauri 的 `onDragDropEvent`（已封装跨平台）；只认 `.dm` 扩展名 |
| View 菜单缩放/fit：xyflow 命令在 React 外不可达 | T1b viewport 控制桥：Canvas 挂载时把 useReactFlow 的函数注册到模块 registry，菜单调用；菜单建立早于 Canvas 挂载时先 no-op，挂载后即可用 |
| single-instance 插件注册顺序 | 官方要求 single-instance 必须是 builder 第一个 `.plugin()`，否则行为异常；T8 注意顺序 |
| 单实例 callback 当前 argv 无文件可开 | 现在只做「聚焦已有窗口」；打开传入文件的逻辑留 hook，待文件类型关联（打包阶段）接上 |

## 决策点（2026-05-29 已定）

- **A. 单实例** → **现在就引入** `tauri-plugin-single-instance`。第二实例启动时聚焦已有窗口；其 callback 拿到的 argv 暂时用不上（文件关联未做），但 hook 留好，等 Finder 双击 .dm 关联落地即可直接接「打开传入文件」。
- **B. 未保存保护** → New/Open + 窗口关闭都拦。
- **C. View 菜单** → Fit + Zoom In/Out/Reset 都做（经 viewport 控制桥打通 xyflow）。
- **D. Recent 入口** → 移到菜单 Open Recent，移除工具栏 Recent 下拉。

新增依赖：JS `@tauri-apps/api/menu`（核心，无需装包）；Rust `tauri-plugin-single-instance`（+ JS 侧 `@tauri-apps/plugin-...` 若需）。

## 同步动作（完成后）

1. 本计划移到 `docs/plan/archive/`
2. `blueprint.md`：Phase 3 ✅、Phase 4 🔄；同步日志加一条
3. （commit 需用户单独授权）

## 后注

**2026-05-29 完成。** 静态检查全过：`pnpm check` / `pnpm test`(11/11) / `cargo check` / `pnpm build` 全干净。GUI 验收由用户「先过了」接受（含 5 无双触发、10 缩放 accelerator、12 标题修复三个高风险项）。

执行尽调（核 installed 版本）是本 Phase 的主要价值，几条落点：
- **JS Menu API 全可用**：菜单完全在前端构建（`menuService.ts`），action 回调直接调 core，无 Rust 事件回传。Edit 的 Undo/Redo 用自定义 `MenuItem`（非预定义，那个走 macOS 响应链）。
- **修了 Phase 2 隐藏 bug**：窗口标题更新一直因缺 `core:window:allow-set-title` 被静默拒绝（`.catch(()=>{})` 吞了）。本 Phase 加权限（+ `allow-destroy`）并把吞错改成 `console.error`。
- **未保存保护降级为两按钮**：plugin-dialog 的 `ask`/`confirm` 只有两按钮，无原生「保存/不保存/取消」三选一，故为「放弃/取消」。真三按钮需自写 React 模态，留后续。
- **关窗**：`onCloseRequested` 先同步 `preventDefault`，await 询问后放行用 `destroy()`（用 `close()` 会死循环）。
- **viewport 控制桥**：xyflow 缩放/fit 只能在 React 内拿到，用模块级 registry 让 Canvas 注册、菜单调用。
- **单实例**：`tauri-plugin-single-instance` 必须 builder 首个注册；callback 现只聚焦窗口，开传入文件的 hook 预留（待文件类型关联）。
- **权限确认**：菜单/事件/拖放已被 `core:default` 覆盖，无需额外配置。

未做（按决策/范围）：缩放 accelerator `⌘=`/`⌘-` 的解析以实际运行为准（如不灵再调）；Recent 已从工具栏移除、归口菜单 Open Recent。
