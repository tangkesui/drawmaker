# Plan: 系统级复制粘贴

## 目标

节点/边复制粘贴从「App 内存剪贴板」升级为「系统剪贴板」：复制写入系统剪贴板（带 drawmaker 标识的 JSON 文本），粘贴从系统剪贴板读取并识别。跨重启/实例持久；粘贴非 drawmaker 内容时安全忽略（不破坏画布）。⌘D 再制保持原地复制不变。

## 任务清单

- [x] T1 Rust：Cargo.toml 加 `tauri-plugin-clipboard-manager = "2"`；lib.rs 注册；capability 加 `clipboard-manager:allow-read-text` + `allow-write-text`
- [x] T2 JS 依赖：`pnpm add @tauri-apps/plugin-clipboard-manager`
- [x] T3 `services/clipboardService.ts`：封装插件 readText/writeText（readText 失败/空时返回 ""，不崩）
- [x] T4 `core/clipboard.ts` 重构：删内存 clip，改纯序列化 `serializeClip(clip)` / `parseClip(text): Clip|null`（带 magic 标识，外部文本返回 null）
- [x] T5 `core/operations.ts`：拆出纯逻辑 `getSelectionClip(): Clip|null`（选区子图，含 structuredClone）、`pasteClip(clip)`；`duplicateSelection` 改用 getSelectionClip；删旧内存版 copy/cut/paste
- [x] T6 `core/clipboard-actions.ts`（新协调层，类比 document-actions，可 import services）：async `copySelection` / `cutSelection` / `pasteClipboard`，组合 getSelectionClip + serialize + clipboardService + pasteClip
- [x] T7 调用点：`CanvasShortcuts.tsx`（copy/cut/paste 改从 clipboard-actions 引，fire-and-forget）、`menuService.ts`（用 run() 包装异步）
- [x] T8 测试：`clipboard.test.ts` 重构为 getSelectionClip + pasteClip 测放置逻辑；新增 serializeClip/parseClip round-trip + 外部文本返回 null
- [x] T9 验证 + 打包安装

## 验收标准

- `pnpm check` 通过；`pnpm test` 全绿
- 手工：选节点 ⌘C → ⌘V 粘出副本；⌘X 剪切后 ⌘V 还原；**重启 App 后 ⌘V 仍能粘出之前复制的**（系统级关键验证）；粘贴外部纯文本（如从备忘录复制）不报错、画布不变；⌘D 再制照常
- 复制后在外部编辑器 ⌘V 能看到 drawmaker JSON 文本（系统级旁证）

## 风险点

- 同步→异步：copy/cut/paste 变 Promise，调用点（keydown handler / 菜单 action）须适配；preventDefault 在 await 前已做，无影响
- 架构铁律：core 不直接碰 Tauri；IO 走 services，协调放 clipboard-actions（document-actions 同款模式）
- 新依赖：tauri-plugin-clipboard-manager 是 Tauri 官方一方插件（MIT/Apache-2.0，体量小），符合「宽松许可+小体量」
- headless 测试无法测系统剪贴板 IO → 只测纯逻辑（序列化 + 放置），IO 留手动验证

## 同步动作

- 完成后归档本计划，blueprint 加日志
