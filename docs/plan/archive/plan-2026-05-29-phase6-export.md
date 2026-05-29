# Plan: Phase 6 — 导出（SVG / PNG / PDF）

- **日期**：2026-05-29
- **Phase**：6
- **承接**：Phase 5（UI 完整化）已完成并 commit（`d14f0e1`）
- **目标**：把当前图导出成 `.svg` / `.png` / `.pdf` 文件，覆盖整张图（不止可见区域），所见即所得。
- **预估时间**：4-6 小时

## 起点状态

- 画布是 xyflow 受控渲染，节点是 SVG（注册表）+ HTML label，连线是 xyflow 的贝塞尔 SVG
- 文件写入只有 Rust `write_file(path, contents: String)` —— **只能写文本**，PNG/PDF 是二进制，需新增二进制写命令
- 已有原生 save 面板（`saveDialog`）、services 层、菜单（File 子菜单）

## 关键设计决策

1. **导出走 DOM 快照（html-to-image）**而非从模型重建：保真度高（连线贝塞尔、样式、字体所见即所得）、代码少。blueprint 原写「SVG 直出」，实测重建 xyflow 连线几何成本高且不一致，改快照（见决策 A）。
2. **覆盖整张图**：用 xyflow `getNodesBounds` 算全图包围盒，导出时按该 bounds 设宽高/transform，而不是只截可见视口。
3. **二进制写**：SVG 是文本走现有 `write_file`；PNG/PDF 是二进制，新增 Rust `write_file_bytes(path, contents: Vec<u8>)`。
4. **PDF = pdf-lib 嵌入 PNG**（栅格）：pdf-lib 不直接渲染 SVG，MVP 用「PNG 嵌一页 PDF，页面尺寸=图尺寸」。矢量 PDF 留 backlog。

## 任务清单

### A. 依赖（T1）

- [ ] T1：`pnpm add html-to-image pdf-lib`（均 MIT；先确认体量：html-to-image 很小，pdf-lib 较大但纯前端 PDF 无更轻替代）

### B. Rust 二进制写（T2）

- [ ] T2：`commands.rs` 加 `write_file_bytes(path: String, contents: Vec<u8>) -> Result<(),String>`；`lib.rs` 注册到 invoke_handler

### C. 导出服务（T3-T4）

- [ ] T3：`src/canvas/export.ts` — 计算全图 bounds + 用 html-to-image 生成
  - `renderTargets()`：拿到 React Flow 的 `.react-flow__viewport` 元素 + `getNodesBounds(nodes)`
  - `toSvgString()` / `toPngBytes()`：按 bounds 设宽高，临时把 viewport transform 设为「平移到原点、scale 1」截全图（参考 xyflow 官方 download 示例）
- [ ] T4：`src/services/exportService.ts` — 串起 dialog + 写盘
  - `exportSvg()`：toSvg → `write_file`（文本）
  - `exportPng()`：toPng(bytes) → `write_file_bytes`
  - `exportPdf()`：toPng → pdf-lib `embedPng` 一页（页面=图尺寸）→ save → `write_file_bytes`
  - 各自先 `saveDialog(suggestedName.ext)`

### D. 菜单接入（T5）

- [ ] T5：menuService File 加 **Export ▸（SVG / PNG / PDF）** 子菜单，调对应 export；错误走 `showError`

### E. 验证 + 同步（T6-T9）

- [ ] T6：测试 —— 导出主要是 DOM/二进制副作用，纯逻辑少；对 `export.ts` 里可抽的纯函数（如 bounds→尺寸换算、文件名补扩展名）加 vitest
- [ ] T7：`pnpm check` + `pnpm test` 全绿
- [ ] T8：`pnpm tauri dev` 手动验证（见验收）
- [ ] T9：同步 blueprint（Phase 6 ✅ / Phase 7 🔄）+ 归档计划 + commit（**用户授权后**）

## 验收标准

1. `pnpm check` exit 0；`pnpm test` 全绿
2. File→Export→SVG → 原生面板存 `.svg` → 用浏览器/预览打开，图完整（含所有节点和连线，不止可见部分）
3. Export→PNG → 存 `.png` → 打开是清晰位图，背景/形状/连线/标签都在
4. Export→PDF → 存 `.pdf` → 打开是一页、整张图可见
5. 导出范围是全图：把图拖到视口外一部分再导出，导出物仍包含全部节点
6. 导出的样式与画布一致（Phase 5 改的颜色/线宽/字号都反映出来）
7. 空图导出不崩（给个友好提示或导出空白）

## 风险点

| 风险 | 应对 |
|---|---|
| 只截到可见视口、漏掉视口外节点 | 用 `getNodesBounds` + 设 viewport transform 到全图原点、scale 1（xyflow 官方 download 示例做法） |
| html-to-image SVG 用 foreignObject，部分编辑器不认 | MVP 可接受（浏览器/预览能开）；纯矢量 SVG 留 backlog |
| 现有 write_file 只能写文本，PNG/PDF 是二进制 | 新增 `write_file_bytes(Vec<u8>)`；前端传 Uint8Array |
| 字体/样式未内联导致导出走样 | html-to-image 默认内联计算样式；必要时用 `fontEmbedCSS`/`skipFonts` 选项调 |
| pdf-lib 体量 | MIT；纯前端 PDF 生成无更轻替代；仅导出时用，可后续 dynamic import 懒加载 |
| MiniMap/Controls 等 UI 被一起截进去 | 截 `.react-flow__viewport`（只含节点/边），不截整个 `.react-flow`（含控件） |

## 决策点（2026-05-29 已定）

- **A. 导出实现** → html-to-image DOM 快照。
- **B. 新依赖** → html-to-image + pdf-lib（均 MIT）。
- **C. PDF 形式** → pdf-lib 嵌 PNG 栅格、一页=图尺寸。
- **D. 导出范围** → 整张图全 bounds。

执行注意（T2/T3 知会）：
- **二进制传输**：Tauri invoke 默认 JSON 序列化，`write_file_bytes` 的 `Vec<u8>` 前端用 `Array.from(uint8)`（number[]）传；大图会有 JSON 数组开销，MVP 可接受；若慢再换 base64+Rust 解码或 raw IPC。
- **截图目标**：截 `.react-flow__viewport`（只含节点/边），不截 `.react-flow`（含 MiniMap/Controls 等控件）。

## 同步动作（完成后）

1. 本计划移到 `docs/plan/archive/`
2. `blueprint.md`：Phase 6 ✅、Phase 7 🔄；同步日志加一条
3. （commit 需用户单独授权）

## 后注

**2026-05-29 完成。** 静态检查全过：`pnpm check` / `pnpm test`(20/20，新增 export-utils 2) / `cargo check` / `pnpm build` 干净。GUI 验收用户通过。

执行落点：
- 两条开工前注意都顺利：二进制经 `write_file_bytes(Vec<u8>)` + 前端 `Array.from` 写盘正常；截 `.react-flow__viewport` 避开了 MiniMap/Controls。
- 纯函数（`computeExportBox` / `dataUrlToBytes`）抽到 `export-utils.ts`（不引 html-to-image/pdf-lib），`export.ts` 再引入它们 —— 这样测试不必加载重型库。
- toSvg 返回 data URL，解码 `decodeURIComponent` 后写为 `.svg` 文本；toPng 返回 base64 data URL → bytes；PDF 用 pdf-lib `embedPng` 一页、页面=图尺寸。
- 空图在弹保存面板前先抛「画布是空的」（render 在 dialog 之前）。

**一个非 bug 的澄清（用户反馈「没看到 Export 子菜单」）**：用 macOS Accessibility API（`osascript` 读 System Events 菜单树）实测确认 File→Export ▸（SVG/PNG/PDF）确实存在且正确，只是位置在 File 菜单中部、是二级子菜单不够显眼。功能无误，未改动；若后续要更显眼可提到顶层或摊平（已与用户沟通，暂不改）。

未做（backlog）：矢量 PDF；纯矢量 SVG（当前 foreignObject）；导出按钮上工具栏；构建 code-split（chunk >500KB 告警）。
