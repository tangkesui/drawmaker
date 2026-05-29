# drawmaker — 项目工作约束

本文件叠加在 `~/.claude/CLAUDE.md` 和 `~/.claude/workflow.md` 之上，记录 drawmaker 项目自身的约定。冲突时以本文件为准。

## 项目概要

- **目标**：本地、架构先进、可定制的图形编辑器，长期替代 drawio 作为主力作图工具
- **技术栈**：Tauri 2 + React 19 + TypeScript + **xyflow** + Zustand + Command 栈（详见 `docs/blueprint.md`）
- **平台**：**macOS only**，不写 Windows / Linux 兼容代码
- **当前阶段**：Phase 1 启动，骨架 + Editor Core 雏形

## 工作流速查

| 用途 | 位置 |
|---|---|
| 项目现行真相 | `docs/blueprint.md` |
| 进行中计划 | `docs/plan/active/` |
| 暂存计划 | `docs/plan/staging/` |
| 已归档计划 | `docs/plan/archive/` |
| 想法/灵感 | `docs/ideas.md` |
| 历史参考 | `docs/reference/` |
| 视觉/UI 参考 | `docs/design/` |
| 概念知识体系 | 跨项目知识树（Notion 工作区，CS/通用基础 下分支） |

## 技术约定

- TypeScript 严格模式（`strict: true`）
- Rust 2024 edition（Tauri 2 默认）
- 包管理：**pnpm**
- 提交前应跑：`pnpm check`（tsc --noEmit）
- 提交粒度：一个逻辑改动一个 commit；不混杂无关改动
- 不主动重构与当前任务无关的代码

## 架构铁律

- **Editor Core 是 SSOT**：document state 在 Zustand store；xyflow 受控渲染
- **撤销栈只面向 Document Model**：view state（hover、缩放、选区）不入 history
- **xyflow 是渲染层**：业务逻辑不直接 import xyflow API，通过 Canvas/services 层间接调
- **Tauri Rust 跟前端解耦**：前端只通过 `services/` 抽象层调 invoke，不直接散在 UI 里

## 该做 / 不该做

✅ 该做：
- 用 xyflow 提供的扩展点：`nodeTypes` / `edgeTypes` 注册自定义形状
- 形状库按需添加，避免一次堆很多
- 复杂功能先到 `docs/plan/active/` 起草，再动手
- 引入第三方依赖前先确认许可证 + 实际代码体量（接 2026-05-29 教训）

❌ 不该做：
- 不为 Windows / Linux 写代码（明确单平台）
- 不直接修改 `node_modules/` 里的 xyflow 源码——扩展通过 API 走
- 不引入大型新依赖前未确认（先在对话或 ideas 中提出）
- 不顺手做 drawio 兼容（已明确放弃）
- 不写跟当前 Phase 任务无关的代码

## 凭据约定

- 当前不涉及 API key、登录、外部服务
- 未来如加入云同步、Tauri Updater 签名、Apple notarization token 等敏感凭据：
  - 按全局 CLAUDE.md「凭据存储约定」走 `~/.credentials/drawmaker/`
  - 建立 `docs/security.md`，只记位置和变量名，不记真实值

## Phase 0 完成定义

- [x] `docs/` 骨架建立
- [x] `docs/blueprint.md` 写入项目愿景和技术选型
- [x] `docs/ideas.md` 占位
- [x] `docs/reference/drawio-package.json` 归档
- [x] 项目 `CLAUDE.md`（本文件）
- [x] `.gitignore`
- [x] git 仓库初始化（已 `git init -b main`）
- [x] 首次 commit（与 Phase 1 一并提交，用户授权）
