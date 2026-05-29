# Plan: Phase 2 — 文件 IO（打开 / 保存 `.dm` + 最近打开）

- **日期**：2026-05-29
- **Phase**：2
- **承接**：Phase 1（骨架 + Editor Core）已完成并 commit（`ce1f2bc`）
- **目标**：能新建 / 打开 / 保存 / 另存为 `.dm` 文件；窗口标题反映当前文件 + 脏标记；维护「最近打开」列表。前端只通过 `services/` 层调 Tauri，符合架构铁律。
- **预估时间**：4-6 小时（含 Rust 命令 + services 层 + store 集成 + UI）

## 起点状态

- Rust 侧：`tauri 2` 裸装（无插件）、`serde`/`serde_json` 已在；`capabilities/default.json` 只有 `core:default`；`lib.rs` 是空 `Builder`（无命令、无 invoke_handler）
- 前端：`DmDocument` 类型已定义（`.dm` 就是它的 JSON）；store 有 doc/view/history 三块；**还没有 `services/` 层**
- Phase 1 里 `ViewState` 故意去掉了 `saveStatus`，本 Phase 重新引入「当前文件 + 脏状态」

## 关键设计决策

1. **`.dm` 格式 = `DmDocument` 的 pretty JSON**，直接序列化，`version` 字段已在类型里。读时校验 `version`，不认识的版本直接报错（不静默吃掉）。
2. **脏状态用 history cursor 派生**，不单独维护布尔：记 `savedCursor`（上次保存时的 `history.cursor`），`dirty = history.cursor !== savedCursor`。好处：撤销回到保存点会自动变回「干净」。新建 / 打开后 `savedCursor` 重置、history 清空。
3. **打开文件 = 替换 doc + 清空 history**（不能让 ⌘Z 跨文件撤回到上一个文档）。
4. **services 层是唯一碰 Tauri 的地方**：`@tauri-apps/api` 的 `invoke` / dialog 只在 `src/services/` 出现，UI 和 core 不直接 import。

## 任务清单

### A. Rust 侧：文件读写命令（T1-T3）

- [ ] T1：加 `tauri-plugin-dialog`（原生 open/save 面板）到 `Cargo.toml` + `lib.rs` 注册；`capabilities/default.json` 加 dialog 权限
- [ ] T2：`src-tauri/src/commands.rs` — 两个自定义命令（用 `std::fs`，不引 fs 插件，避免 scope 配置）
  - `read_file(path: String) -> Result<String, String>`
  - `write_file(path: String, contents: String) -> Result<(), String>`
  - `lib.rs` 用 `.invoke_handler(tauri::generate_handler![...])` 注册
- [ ] T3：最近列表持久化命令（存 `app_config_dir/recent.json`）
  - `get_recent() -> Vec<String>` / `push_recent(path: String)`（去重、保头部、截断到 N=10）

### B. 前端 services 层（T4-T5）

- [ ] T4：`src/services/fileService.ts` — 封装 invoke + dialog
  - `openDialog()`（dialog 选 `.dm`）→ path；`saveDialog(suggestedName)` → path
  - `loadDocument(path)`：invoke `read_file` → 反序列化 → 返回 `DmDocument`
  - `saveDocument(path, doc)`：序列化 → invoke `write_file`
- [ ] T5：`src/services/recentFiles.ts` — 包 `get_recent` / `push_recent`

### C. core：序列化（T6）

- [ ] T6：`src/core/serialize.ts`
  - `serializeDocument(doc): string`（pretty JSON）
  - `deserializeDocument(text): DmDocument`（解析 + `version` 校验，未知版本 throw）

### D. store 集成（T7-T8）

- [ ] T7：store 加「文件状态」字段（新 `file` slice 或并入 view）
  - `currentPath: string | null`、`savedCursor: number`、`recent: string[]`
- [ ] T8：`src/core/document-actions.ts` — 文档级动作（调 services + 改 store）
  - `newDocument()`：空 doc、清 history、`savedCursor=-1`、`currentPath=null`
  - `openPath(path)` / `openViaDialog()`：load → 替换 doc、清 history、`savedCursor` 重置、push recent
  - `save()` / `saveAs()`：无 path 时走 saveDialog；写盘成功后 `savedCursor = history.cursor`、push recent
  - 派生 `isDirty()`

### E. UI + 窗口标题（T9-T11）

- [ ] T9：Toolbar 加 File 区：New / Open / Save（Save 在 dirty 时高亮 / 非 dirty 时 disabled）
- [ ] T10：Keymap 加 `mod+n` / `mod+o` / `mod+s` / `mod+shift+s`
- [ ] T11：窗口标题 + 状态栏反映文件名 + 脏标记
  - 标题：`<filename> — drawmaker`，dirty 时加 `•`（services 调 Tauri `getCurrentWindow().setTitle`）
  - 状态栏：显示路径 / 「未保存」

### F. 验证 + 同步（T12-T15）

- [ ] T12：`src/core/__tests__/serialize.test.ts` — round-trip + 版本不匹配 throw
- [ ] T13：`pnpm check` + `pnpm test` 全绿
- [ ] T14：`pnpm tauri dev` 手动验证（见验收）
- [ ] T15：同步 blueprint（Phase 2 ✅ / Phase 3 🔄）+ 归档本计划 + commit（**用户授权后**）

## 验收标准

1. `pnpm check` exit 0；`pnpm test` 全绿（含 serialize 用例）
2. 画几个节点 → ⌘S → 原生保存面板 → 存成 `xxx.dm`；用文本编辑器打开是合法、可读的 JSON
3. 关闭重开 app → ⌘O 打开该 `.dm` → 画布恢复成保存时的样子
4. 打开文件后按 ⌘Z → **不会**撤回到上一个文档（history 已清空）
5. 改动后窗口标题出现 `•`；⌘S 后 `•` 消失；⌘Z 撤回到保存点 → `•` 自动消失（脏状态派生正确）
6. 已有 currentPath 时 ⌘S 直接覆盖写（不弹面板）；⌘⇧S 总是弹面板另存
7. ⌘N 新建 → 空白画布、标题回到无文件态
8. 「最近打开」列表能列出刚存/开过的文件，重复打开不产生重复项，上限 10

## 风险点

| 风险 | 应对 |
|---|---|
| Tauri 权限没配全 → 运行时 "not allowed" | T1 同步改 `capabilities/default.json`；dialog 命令需显式 permission |
| 自定义命令读任意路径的安全性 | 本地单机编辑器、路径均由用户经原生面板显式选择，可接受；不暴露给远程内容 |
| `.dm` 版本前向兼容 | `version` 字段 + 反序列化校验，未知版本明确 throw，不静默 |
| 脏状态与 undo 交互 | 用 `savedCursor` 派生 `dirty`，撤销/重做天然正确，无需手维护布尔 |
| 未保存改动直接被新建/打开覆盖丢失 | **见待确认决策 C**：Phase 2 是否做「未保存提示」 |
| services 层泄漏 Tauri 依赖到 UI/core | code review 时确认 `@tauri-apps/*` import 只出现在 `src/services/` |

## 决策点（2026-05-29 已定）

- **A. 读写实现** → 自定义 Rust 命令（`std::fs`），不引 `tauri-plugin-fs`，无 scope 配置。
- **B. 最近列表存储** → 自定义 `recent.json`（`app_config_dir`），不引 `tauri-plugin-store`。
- **C. 未保存改动保护** → Phase 2 不做，留到 Phase 3 配合原生菜单 + 标准对话框一起做。

唯一新增 Rust 依赖：`tauri-plugin-dialog`（原生 open/save 面板，无可替代的最小选择）。

## 同步动作（完成后）

1. 本计划移到 `docs/plan/archive/`
2. `blueprint.md`：Phase 2 ✅、Phase 3 🔄；同步日志加一条
3. （commit 需用户单独授权）

## 后注

**2026-05-29 完成。** 验收 1-8 全部通过（GUI 2-8 由用户确认：保存出合法 JSON、脏标记 `•` 联动撤销、打开恢复、history 跨文件隔离、覆盖 vs 另存、Recent 去重）。`pnpm test` 11/11、`pnpm check` / `pnpm build` / `cargo check` 全干净。

实现基本贴合正文，几处落点补记：
- `document-actions.ts` 放在 `core/`，它 import `services/`（orchestration 调抽象层，符合铁律；纯逻辑 types/store/history/serialize 仍不碰 Tauri）。
- 报错走 `services/notify.ts` 的原生 `message` 对话框（dialog 插件自带，不额外引依赖）。
- 窗口标题用独立 `TitleSync` 组件订阅 store 派生，不在各 action 里手动刷。
- `cargo check` 显示 `tauri-plugin-fs` 被间接编译——它是 dialog 插件的依赖，不是我们直接引入；read/write 仍走自定义 `std::fs` 命令（决策 A 未变）。
- Recent 用了一个最简下拉，Phase 3 接原生菜单后会被更顺手的入口替代。
