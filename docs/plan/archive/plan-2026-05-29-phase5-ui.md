# Plan: Phase 5 — UI 完整化（属性面板 + 调色板增强 + 自动布局）

- **日期**：2026-05-29
- **Phase**：5
- **承接**：Phase 4（形状库）已完成并 commit（`7b61d8c`）
- **目标**：让图能「调得好看 + 理得整齐」。三块：① 右侧属性面板（改选中节点的颜色/线宽/字号/标签）；② 左侧调色板加搜索 + 分类折叠；③ dagre 一键自动布局。
- **预估时间**：6-8 小时（偏大，可按 A/C/D 三块拆成两次提交）

## 起点状态

- `NodeData = { label }`，形状描边/填充由 `shapes.css` 的 `.shape-geom` 统一给，**不能逐节点改**
- 调色板 `ShapePalette` 扁平按分类列出，无搜索/折叠
- 无属性面板、无自动布局；布局纯靠手拖
- 选区在 `view.selected`；改名走 `renameNode` command（已可撤销）
- 注册表有 `defaultSize`，自动布局可用它当节点尺寸

## 关键设计决策

1. **NodeData 加可选样式字段**：`{ label, fill?, stroke?, strokeWidth?, fontSize? }`，全部 optional → 旧 `.dm` 兼容；缺省时回落 CSS/注册表默认。`ShapeNode` 把存在的字段作为 inline 覆盖应用到 SVG / label。
2. **属性编辑作用于「所有选中节点」**：面板在 `selected.length>0` 时显示；改动对每个选中节点派发一条 `updateNodeStyle` command（一次操作一条 history）。
3. **自动布局 = 纯函数 + 一条命令**：`auto-layout.ts` 输入 doc 的 nodes/edges + 注册表尺寸，dagre 算出坐标，输出 `{id->position}`；`applyAutoLayout` 把全部位置变更打包成**一条** command（可整体撤销）。
4. **dagre**（blueprint 既定）：~150KB、工业级 layered。elkjs 留作 backlog。

## 任务清单

### A. 节点样式（T1-T2）

- [ ] T1：`types.ts` — `NodeData` 加 `fill?/stroke?/strokeWidth?/fontSize?`；`ShapeNode` 应用覆盖（SVG 用 inline style 盖 `.shape-geom`，label 用 fontSize/color）
- [ ] T2：`operations.ts` — `updateNodeStyle(ids: string[], patch: Partial<NodeData>)`，一条 command 改多个节点

### B. 属性面板（T3-T4）

- [ ] T3：`src/ui/PropertiesPanel.tsx`（右栏）— 选中非空时显示：label 文本、fill/stroke 取色、strokeWidth 数值、fontSize 数值；多选时显示共同值/留空，编辑即对所有选中派发 `updateNodeStyle`
- [ ] T4：App 布局加右栏（palette | canvas | properties）；选区空时面板显示占位/隐藏

### C. 调色板增强（T5）

- [ ] T5：`ShapePalette` 加搜索框（按 label 过滤）+ 分类可折叠（点 category 头收起/展开）

### D. 自动布局（T6-T7）

- [ ] T6：`pnpm add dagre @types/dagre`；`src/canvas/auto-layout.ts` — 纯函数 `layout(doc, dir): Map<id, {x,y}>`（节点尺寸取注册表 defaultSize）
- [ ] T7：`applyAutoLayout(dir)` command（一条 history）；接入菜单 **View → Arrange（TB）/ Arrange（LR）**；布局后 fitView

### E. 验证 + 同步（T8-T11）

- [ ] T8：测试 — `auto-layout` 纯函数（给定图 → 每个节点有坐标、无重叠、连通方向合理）；`updateNodeStyle` round-trip + undo
- [ ] T9：`pnpm check` + `pnpm test` 全绿
- [ ] T10：`pnpm tauri dev` 手动验证（见验收）
- [ ] T11：同步 blueprint（Phase 5 ✅ / Phase 6 🔄）+ 归档计划 + commit（**用户授权后**）

## 验收标准

1. `pnpm check` exit 0；`pnpm test` 全绿
2. 选中一个节点 → 右侧出现属性面板；改 fill/stroke/线宽/字号 → 画布即时更新
3. 多选多个节点 → 改属性对所有选中生效；一次改动 ⌘Z 一次撤回
4. 改 label 也能在面板里改（与双击编辑一致，走同一 data）
5. 调色板搜索「数据」→ 只剩匹配项；点分类头能折叠/展开
6. 画几个连线的节点 → View→Arrange → 自动排成层次图（无重叠），⌘Z 一次撤回整次布局
7. Arrange(TB) 与 Arrange(LR) 方向不同
8. 存含样式的 `.dm` → 重开样式恢复；旧的无样式 `.dm` 仍正常打开（回落默认）

## 风险点

| 风险 | 应对 |
|---|---|
| 取色器/数值频繁 onChange 刷爆 history | 颜色用 `onChange` 实时预览本地态、`onBlur`/松开才提交 command；或节流。数值同理 |
| 多选编辑「共同值」展示 | 全相同显示该值，不同则留空 placeholder；提交时只写被改字段 |
| dagre 尺寸不准导致重叠 | 用注册表 defaultSize 传给 dagre 的 node width/height |
| dagre 包体积/许可证 | dagre MIT，~150KB；`@types/dagre` 仅类型。符合「引入依赖先确认」 |
| ShapeNode inline 覆盖与 CSS 优先级 | inline style 天然高于 CSS；缺省字段不写 inline，回落 `.shape-geom` |
| 右栏挤压画布宽度 | 固定窄宽（~220px）+ 选区空时可隐藏 |

## 决策点（2026-05-29 已定）

- **A. 属性面板范围** → 节点 label + fill/stroke/strokeWidth/fontSize（不含边样式 / 圆角透明度，留 backlog）。
- **B. 编辑作用域** → 作用于所有选中节点。
- **C. 自动布局库** → dagre。
- **D. 拆分** → 一次做完三块，一个 commit。

执行注意（开工前知会，T6/T3 验证）：
- **dagre 是 CommonJS**：Vite ESM 下用 `import dagre from "dagre"` 后 `new dagre.graphlib.Graph()`；若 interop 出问题，改 `import { graphlib, layout } from "dagre"` 或在 vite optimizeDeps 里 include。
- **`<input type="color">` 在 macOS WKWebView**：先验证可用；不行则退回十六进制文本输入（带一个小色块预览），不阻断。

## 同步动作（完成后）

1. 本计划移到 `docs/plan/archive/`
2. `blueprint.md`：Phase 5 ✅、Phase 6 🔄；同步日志加一条
3. （commit 需用户单独授权）

## 后注

**2026-05-29 完成。** 静态检查全过：`pnpm check` / `pnpm test`(18/18：history 6 + serialize 6 + registry 3 + auto-layout 3) / `pnpm build` 干净。GUI 验收用户通过。

执行落点：
- 两条开工前注意都**没翻车**：dagre 的 CJS/ESM interop 在 vitest 和 Vite build 下都正常（`import dagre from "dagre"` + `dagre.graphlib.Graph` / `dagre.layout` 直接可用）；`<input type="color">` 在 macOS WKWebView 可用，未触发 hex 退路。
- 属性面板防历史刷屏 / 防误写：按 `key={selected.join(",")}` 重挂使 defaultValue 跟随选区；文本/数值 onBlur 且与初值比对才提交，color 用 onChange（仅真改触发）；`commit()` 的空 patch 守卫天然吃掉无变化的提交。
- 样式覆盖：`ShapeNode` 把存在的字段作 inline style 盖 `.shape-geom`；缺省不写 inline、回落 CSS。注意：自定义 stroke 会盖掉选中态的蓝色描边，但选中态的 drop-shadow 仍在，可辨认（可接受）。
- 自动布局 fitView 用 `setTimeout(…,60)` 等 store→xyflow 渲染后再 fit。
- `pnpm build` 提示单 chunk >500KB（dagre+xyflow+react），仅体积告警；code-split 入 backlog。

未做（留后续/backlog）：边的样式（线型/箭头）、圆角/透明度等更多属性；属性面板的实时 color 预览（目前 onChange 即提交）；构建 code-split。
