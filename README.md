# drawmaker

本地、轻量、可定制的架构图 / 流程图编辑器。macOS only。

- **技术栈**：Tauri 2（Rust 壳）+ React 19 + TypeScript + xyflow + Zustand + 自实现 Command 撤销栈
- 详细设计见 [`docs/blueprint.md`](docs/blueprint.md)

## 功能

- 形状库（矩形 / 圆角 / 椭圆 / 菱形 / 服务 / 数据库 / 队列 / 负载均衡 / 云 / 用户 / 便签），左侧调色板拖到画布
- 连线、拖动、双击改名、属性面板（颜色 / 线宽 / 字号）
- dagre 自动布局（菜单 View → Arrange 纵 / 横）
- 文件 IO：新建 / 打开 / 保存 `.dm`（JSON）、最近打开、未保存保护
- 原生 macOS 菜单 + 快捷键、文件拖放打开、单实例
- 导出 SVG / PNG / PDF（菜单 File → Export）

## 开发

```bash
pnpm install
pnpm tauri dev      # 启动桌面应用（热重载）
pnpm test           # vitest（Editor Core / 序列化 / 布局 / 导出工具）
pnpm check          # tsc --noEmit
```

## 构建（自用）

```bash
pnpm tauri build
```

产物：

- `.app`：`src-tauri/target/release/bundle/macos/drawmaker.app`
- `.dmg`：`src-tauri/target/release/bundle/dmg/drawmaker_<版本>_aarch64.dmg`（约 3–4 MB）

应用为 **ad-hoc 签名、未公证**（自用，$0；不涉及 Apple Developer 账号）。

### 首次打开

- **本机构建直接用**：`open` 或双击即可，本机产物无 quarantine，不会被拦。
- **若把 dmg 拷到 / 下载到另一台 Mac**：因未公证，Gatekeeper 会提示「无法验证开发者」。放行任选其一：
  - 右键点 app → **打开** → 再点**打开**
  - 系统设置 → 隐私与安全性 → 「仍要打开」
  - 命令行去掉隔离属性：`xattr -dr com.apple.quarantine /Applications/drawmaker.app`

> 如果将来要分发给别人 / 消除警告，需要 Apple Developer 账号（$99/年）做 Developer ID 签名 + 公证；届时再在 `tauri.conf.json` 填 `signingIdentity` 并配公证环境变量。
