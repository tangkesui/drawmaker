# Plan: 代码体检后优化 + 打包 v0.2.0

## 目标

按 2026-06-04 全量代码体检结论,修掉真实健壮性窟窿和小性能点,版本升 0.2.0,打出直接可用的 dmg 并重装到 /Applications。

## 体检结论(摘要)

- 架构健康:分层清晰(core/canvas/services/ui),xyflow 隔离合规,无 any、无死代码,27/27 测试绿。
- 真问题只有两个半:撤销栈无上限(大文档久用可膨胀)、Recent 不校验文件存在(已删文件残留)、两处小渲染开销。

## 任务清单

- [x] T1 撤销栈容量上限(`core/history.ts`):MAX_HISTORY=200,超限丢最旧条目;cursor / savedCursor 同步平移,savedCursor 被裁掉时置为不可达(保持 dirty 直到下次保存)。**执行中发现并一并修复真 bug:redo 分支被截断时旧 savedCursor 不失效,可造成"内容已变却显示干净"、关窗不提示丢失**
- [x] T2 T1 的单测(`core/__tests__/history.test.ts`):超限裁剪、cursor 平移、savedCursor 失效语义、redo 分支截断误判干净(4 个新测试)
- [x] T3 Recent 校验(`src-tauri/src/commands.rs`):`get_recent` 返回前过滤不存在的路径并回写
- [x] T4 PropertiesPanel 选中查找 Set 化 + useMemo(`ui/PropertiesPanel.tsx`)
- [x] T5 ShapePalette 过滤 useMemo(`ui/ShapePalette.tsx`)
- [x] T6 版本号 0.2.0(package.json / tauri.conf.json / Cargo.toml)
- [x] T7 `pnpm check` + `pnpm test` 全绿(31/31)
- [x] T8 `pnpm tauri build` 出 dmg(ad-hoc 签名,沿用既定 $0 方案),安装到 /Applications 覆盖旧版(`drawmaker_0.2.0_aarch64.dmg`;Info.plist 确认 0.2.0)
- [x] T9 启动安装版冒烟:先 pkill 清干净全部实例,`open /Applications/drawmaker.app`,确认进程来自安装路径、窗口 "Untitled — drawmaker" 出现

## 验收标准

- `pnpm check`、`pnpm test` 全绿(新增 history 上限测试在内)
- dmg 产物存在;/Applications/drawmaker.app 为 0.2.0
- 安装版可启动、窗口出现

## 风险点

- T1 动 undo 核心:savedCursor 平移错误会导致 dirty 判断失真 → 用单测锁住三种语义(未裁、裁后仍可达、裁后不可达)
- T3 动 Rust:过滤逻辑放 get_recent 读取侧,不动写入侧,影响面小
- 重装覆盖旧版:既定流程(Phase 8a 已做过),先 pkill 全部实例再装

## 同步动作

- 完成后:本计划归档到 `docs/plan/archive/`,blueprint 更新日志加一条
