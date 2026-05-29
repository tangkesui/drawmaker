# Plan: Phase 7 — 打包（自用 dmg + ad-hoc 签名，$0）

- **日期**：2026-05-29
- **Phase**：7
- **承接**：Phase 6（导出）已完成并 commit（`cd751e1`）
- **目标**：`pnpm tauri build` 产出可双击安装的 `drawmaker.dmg`（ad-hoc 签名），并写清首次打开的 Gatekeeper 放行步骤。**自用、$0、不公证、不联网 Apple**。
- **预估时间**：2-3 小时（主要是 release 编译 + 验证）

## 起点状态

- `tauri.conf.json` 的 `bundle.targets = ["app","dmg"]`、icons 齐全、`productName=drawmaker`、`identifier=com.tangkesui.drawmaker`
- 没配 macOS 签名 → 默认产物未签名（Gatekeeper 会拦得更凶）
- 决策已定：自用 $0，ad-hoc 签名（`signingIdentity = "-"`），不申请 Developer ID、不公证 → **不涉及任何 Apple 凭据，不建 `docs/security.md`**

## 关键设计决策

1. **ad-hoc 签名**：`tauri.conf.json` 设 `bundle.macOS.signingIdentity = "-"`，让 Tauri 用 ad-hoc（`codesign -s -`）签。比完全未签好（部分本地校验能过），且 $0、不需要证书。
2. **不公证**：跳过 notarytool；首次打开靠用户手动放行（右键→打开 / 系统设置 / `xattr`）。
3. **产物不进 git**：`.dmg`/`.app` 在 `src-tauri/target/`（已 gitignore）；本 Phase 只提交 conf 改动 + 安装说明文档。
4. **首次打开说明**进 `README.md`（项目根，面向"未来的我"），不建 security.md（无凭据）。

## 任务清单

### A. 打包配置（T1）

- [ ] T1：`tauri.conf.json` 的 `bundle` 补 macOS 自用配置
  - `bundle.macOS.signingIdentity = "-"`（ad-hoc）
  - `bundle.macOS.minimumSystemVersion`（设当前 macOS 主流下限，如 "12.0"）
  - `bundle.category = "public.app-category.graphics-design"`、`bundle.copyright`（可选元数据）

### B. 构建（T2-T3）

- [ ] T2：`pnpm tauri build`（release 编译 + 出 `.app` 和 `.dmg`）
- [ ] T3：定位产物 `src-tauri/target/release/bundle/dmg/drawmaker_0.1.0_aarch64.dmg`，记录体积；确认 ad-hoc 签名生效（`codesign -dv --verbose=2 <app>`、`spctl -a -vv` 预期 "rejected"（未公证，正常））

### C. 验证（T4）

- [ ] T4：挂载 dmg / 拷 `.app` 到 /Applications，首次打开（右键→打开放行）验证能启动、能开关文件、能导出。记录"首次打开放行"实际步骤。

### D. 安装说明 + 同步（T5-T6）

- [ ] T5：`README.md`（项目根）— 简述项目 + **从源码构建**（`pnpm install` → `pnpm tauri build`）+ **首次打开放行**（右键→打开；或系统设置→隐私与安全性→仍要打开；或 `xattr -dr com.apple.quarantine /Applications/drawmaker.app`）
- [ ] T6：同步 blueprint（Phase 7 ✅；进入 Phase 8+ 迭代）+ 归档计划 + commit（**用户授权后**）

## 验收标准

1. `pnpm tauri build` 成功，产出 `drawmaker_0.1.0_*.dmg`
2. `codesign -dv` 显示 ad-hoc 签名（Signature=adhoc）
3. 双击 dmg → 拖进 Applications → 首次右键→打开能正常启动（不是闪退）
4. 装好的 app 能新建/画形状/保存 .dm/导出 PNG —— 与 dev 一致
5. `README.md` 有可照着做的构建 + 首次放行步骤
6. git 工作区只多了 conf + README + 计划归档，**没有** dmg/app 等二进制被提交

## 风险点

| 风险 | 应对 |
|---|---|
| ad-hoc 签名仍被 Gatekeeper 拦 | 预期内（未公证）；README 写清右键→打开 / `xattr` 放行；自用可接受 |
| release 编译时间长 | 正常，首次较久；不阻断 |
| 架构（Apple Silicon aarch64 vs Intel） | 本机 aarch64 出 aarch64 dmg 即可；不做 universal（自用单机） |
| `minimumSystemVersion` 设太高/低 | 设当前机器能跑的合理下限（12.0），自用以本机为准 |
| 误把 dmg 提交进 git | T6 前 `git status` 核对；`target/` 已 gitignore |

## 待确认决策点

（$0 自用路线已把主要选择定了，仅剩小项，按推荐执行）
- `minimumSystemVersion` 用 "12.0"（如你机器更低/更高可调）
- 安装说明放 `README.md`（而非 docs/，因为是面向使用者的入口）

## 同步动作（完成后）

1. 本计划移到 `docs/plan/archive/`
2. `blueprint.md`：Phase 7 ✅；当前阶段进入 "Phase 8+ 持续迭代"
3. （commit 需用户单独授权）

## 后注

**2026-05-29 完成。** `pnpm tauri build` 一次成功。验收逐条过：

- dmg：`src-tauri/target/release/bundle/dmg/drawmaker_0.1.0_aarch64.dmg`，**~3.4 MB**
- 签名：`codesign -dv` → `Signature=adhoc`、`codesign --verify --deep --strict` 通过
- Gatekeeper：`spctl -a -vv` → rejected（未公证，预期内）
- 本机产物**无 `com.apple.quarantine`**，`open` 直接启动成功（pid 实测）—— 自用零障碍
- README.md 写了构建 + 首次放行（右键打开 / 系统设置 / `xattr`）
- git 只多了 `tauri.conf.json` + `README.md` + 计划归档，dmg/app 在已忽略的 `target/`

设计如预期：自用 $0 路线不碰任何 Apple 凭据，未建 `docs/security.md`。
未做（将来分发时）：Developer ID 签名 + notarytool 公证 + staple（需 $99/年账号）；universal（Intel）二进制。
