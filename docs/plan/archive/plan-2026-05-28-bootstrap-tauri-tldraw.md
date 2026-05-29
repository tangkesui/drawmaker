# Plan: Bootstrap Tauri 2 + React + tldraw 骨架

- **日期**：2026-05-28
- **Phase**：1
- **目标**：把 Tauri 2 + React + TypeScript + tldraw 项目骨架搭起来，`pnpm tauri dev` 能弹出窗口、显示可用的 tldraw 编辑器
- **预估时间**：1-2 小时

## 任务清单

- [ ] T1：在 `/tmp` 用 `create-tauri-app` 生成 React+TS 模板
- [ ] T2：把模板里的代码文件合并到工作目录（保留我们已有的 `docs/`、`CLAUDE.md`、`.gitignore`）
- [ ] T3：customize：app 名 / bundle id / 窗口标题 / 初始窗口大小（macOS only）
- [ ] T4：`pnpm install` 装基础依赖
- [ ] T5：`pnpm add tldraw`，在 `App.tsx` 里嵌入 `<Tldraw />` + 全局 CSS
- [ ] T6：tsconfig 确认 `strict: true`，添加 `pnpm check` 脚本（tsc 类型检查）
- [ ] T7：`pnpm tauri dev` 启动，验证窗口能打开、tldraw 能用
- [ ] T8：截图保存到 `docs/design/phase1-bootstrap-screenshot.png` 作为里程碑记录
- [ ] T9：把本计划移动到 `docs/plan/archive/`
- [ ] T10：更新 `docs/blueprint.md` Phase 1 状态、Phase 2 状态、同步日志
- [ ] T11：更新项目 `CLAUDE.md` 里的 Phase 0/1 完成情况
- [ ] T12：`git add` + commit（Phase 0 + Phase 1 一次性提交，由用户授权）

## 验收标准

1. `pnpm tauri dev` 能成功启动
2. 弹出的桌面窗口标题为 "drawmaker"
3. 窗口内显示 tldraw 编辑器，能创建/移动/删除几个形状
4. `pnpm check` 通过（无 TS 类型错误）
5. `src-tauri/tauri.conf.json` 中 `productName` 为 "drawmaker"，`bundle.identifier` 为 `com.tangkesui.drawmaker`
6. 没有 Windows / Linux 相关配置残留（精简到只 macOS）

## 风险点

| 风险 | 应对 |
|---|---|
| `create-tauri-app` 不能直接在非空目录创建 | 在 `/tmp` 创建，然后选择性复制 |
| 模板带来的 `.gitignore`、`README.md` 等覆盖我们文件 | 不复制这些；逐个选择需要的文件 |
| tldraw 跟 React 19 兼容问题 | tldraw v3.x 支持 React 18，模板默认 React 18 没问题；若模板用 React 19 需降级 |
| tldraw CSS 缺失导致渲染异常 | 显式 import `tldraw/tldraw.css` |
| macOS WebView 对某些新 CSS / JS API 支持差异 | 早跑 tldraw demo，立刻暴露问题 |
| pnpm dlx 下 create-tauri-app 版本不是 v2 | 显式指定 `@latest` 并验证生成的 tauri.conf 是 v2 schema |

## 同步动作（完成后）

1. 移动本计划到 `docs/plan/archive/`
2. 更新 `docs/blueprint.md`：
   - Phase 1 标记 ✅，Phase 2 标记 🔄（或保持 ⏳ 等启动）
   - 同步日志加一行：`2026-05-28: Phase 1 完成，Tauri+React+tldraw 骨架可运行`
3. 更新 `CLAUDE.md` Phase 0 完成定义那段（commit 也补勾）
4. 由用户授权后做首次 commit

## 后注

### 2026-05-29：本计划被放弃，迁档

**触发**：T7 验证前，发现两个我之前没核实的事实：

1. **tldraw 许可证**：v5 是 tldraw SDK License（非自由开源），v2 是非商用许可证。**任何版本都不是 MIT**。我之前给用户的对比表说"tldraw 是 MIT"是错的。
2. **tldraw 代码体量**：tldraw 5 SDK 源码 ~113k LOC + `@tldraw/editor` ~52k LOC = ~165k LOC。我之前说"~40k LOC，能读完"是错的。

**用户三条核心需求**（架构先进 / 整体可控 / 高度定制化）在 tldraw 许可证 + 体量下都难以满足，特别是：
- 「整体可控」需要能读懂改动，165k LOC 太大
- 「未来可能公开/分享」与 tldraw 许可证冲突

**决策**：渲染内核改为 xyflow / React Flow（MIT、~30k LOC、节点-连线模型契合架构图 + 流程图）。

**已完成的工作**（T1-T6）：
- T1-T6 都完成了，Tauri + React + TS 骨架在工作目录下已就位
- tldraw 已通过 pnpm add 安装在 node_modules
- App.tsx 引用了 `import { Tldraw } from 'tldraw'` + 全局 CSS
- 还没跑过 `pnpm tauri dev`（T7），因为用户中途叫停

**新计划如何处理已有脚手架**：
- Tauri 2 + React + TS + Vite 部分：**保留**（许可证和换库无关）
- tldraw 依赖：**移除**
- App.tsx 的 tldraw 嵌入代码：**替换为 xyflow demo**
- 详见 `docs/plan/active/plan-2026-05-29-bootstrap-tauri-xyflow.md`

**教训**：
- 跨多文件多步骤任务必须先写 plan 让用户确认，再执行；不能"写了 plan 但没等确认就动手"
- 引入第三方依赖前必须先验证许可证 + 实际代码体量，不能凭印象
- 体现在 `~/.claude/workflow.md` §2.6：「发现需求不清、风险超出原计划、会影响用户未授权内容时，停下确认」
