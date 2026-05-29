# Plan: Phase 4 — 自定义 Custom Nodes（架构图形状库）

- **日期**：2026-05-29
- **Phase**：4
- **承接**：Phase 3（macOS 系统集成）已完成并 commit（`6ae5085`）
- **目标**：把形状从硬编码的 rect/ellipse 升级为**数据驱动的形状注册表**；用一个通用 SVG `ShapeNode` 渲染所有形状；加一批架构图常用形状；提供一个基础侧栏调色板把它们放到画布上。让 drawmaker 真正能画架构图。
- **预估时间**：5-7 小时

## 起点状态

- 形状硬编码：`NodeKind = "rect" | "ellipse"`，`Tool = "select" | "rect" | "ellipse"`，两个 bespoke 组件 `RectNode`/`EllipseNode`
- `nodeTypes = { rect, ellipse }`；`Canvas.onPaneClick` 按 `tool` 调 `addNode(tool, pos)`
- Toolbar 里 Rect/Ellipse 是固定按钮
- `NodeData = { label }`，节点上 label 只读显示，**还不能编辑**

## 关键设计决策（数据驱动）

1. **形状注册表 `src/canvas/shapes/registry.ts`**：每个形状一条声明 `{ kind, label, category, defaultSize, render(props) }`（render 返回 SVG）。`nodeTypes`、调色板、默认尺寸全部从注册表派生。**加一个形状 = 加一条注册项**，不再改 types/tool/canvas/toolbar 多处。
2. **通用 `ShapeNode` 组件**：统一渲染外框 + 四向 Handle + label，形状差异只在注册表的 `render`（SVG path/元素）。rect/ellipse 迁进注册表，删掉 bespoke 组件。
3. **`NodeKind` 放宽为 `string`**（注册表的 key）：序列化向前兼容；`deserialize` 遇到未知 kind 用 fallback 形状（rect）渲染，不报错。
4. **放置模型泛化**：`view` 用 `activeShape: NodeKind | null`（null = 选择模式）替代 `tool` 的 rect/ellipse 分支；侧栏选形状 → 设 activeShape；拖到画布或点画布放置。

## 任务清单

### A. 形状注册表 + 通用渲染（T1-T3）

- [ ] T1：`src/canvas/shapes/registry.ts` — 形状声明类型 + 注册表 + 查询（`getShape(kind)`、`allShapes()`、`shapesByCategory()`）
- [ ] T2：`src/canvas/shapes/ShapeNode.tsx` — 通用节点组件：外框（用注册项 render 出的 SVG）+ 四向 Handle + label 显示
- [ ] T3：把 rect/ellipse 写成注册项；`Canvas` 的 `nodeTypes` 从注册表生成（所有 kind 都映射到 ShapeNode，或用单一通用 type）；删 `RectNode`/`EllipseNode`

### B. 架构图形状（T4）

- [ ] T4：加首批架构形状到注册表（见决策 C，约 8 个）：每个给 SVG + 默认尺寸 + 分类
  - 通用：rect、ellipse、rounded、diamond（判定）
  - 架构：service/process、database（圆柱）、queue、load balancer、cloud/CDN、actor/user、note

### C. 类型 + 放置泛化（T5-T6）

- [ ] T5：`types.ts` — `NodeKind` 放宽为 `string`；`view` 加 `activeShape: NodeKind | null`（移除 tool 的 rect/ellipse）
- [ ] T6：`Canvas` 放置逻辑改用 `activeShape`；放置后回到选择（activeShape=null）；`operations.addNode` 用注册表默认尺寸

### D. 侧栏调色板（T7-T8）

- [ ] T7：`src/ui/ShapePalette.tsx` — 左侧栏，按 category 分组列出形状（小 SVG 预览 + 名）；基础版（搜索/折叠等留 Phase 5）
- [ ] T8：放置交互（见决策 D）：拖拽 from 调色板到画布 drop 放置 / 或点选形状再点画布；App 布局加左栏
  - Toolbar 移除 Rect/Ellipse 固定按钮（已归调色板）；保留 Select / Delete / Undo / Redo

### E. 标签编辑（T9，见决策 E）

- [ ] T9：双击节点进入 label 编辑（contentEditable / input 覆盖），blur/回车提交为一条 `renameNode` command；Esc 取消

### F. 验证 + 同步（T10-T13）

- [ ] T10：`src/canvas/shapes/__tests__/registry.test.ts` — 注册表完整性（每个 kind 有 render/size/category；getShape fallback）
- [ ] T11：`pnpm check` + `pnpm test` 全绿
- [ ] T12：`pnpm tauri dev` 手动验证（见验收）
- [ ] T13：同步 blueprint（Phase 4 ✅ / Phase 5 🔄）+ 归档计划 + commit（**用户授权后**）

## 验收标准

1. `pnpm check` exit 0；`pnpm test` 全绿（含注册表用例）
2. 左侧栏按分类列出所有形状，有 SVG 预览
3. 从调色板放置任意架构形状到画布，渲染正确（圆柱/队列/LB 等形状可辨认）
4. 放置的形状能拖动、连线、删除、撤销/重做（复用既有机制）
5. 双击节点改 label → 提交；⌘Z 能撤销改名
6. 旧 `.dm`（只含 rect/ellipse）仍能正常打开；构造一个含未知 kind 的 `.dm` → fallback 渲染不崩
7. 保存含新形状的图 → 重开后形状/标签恢复
8. Toolbar 不再有 Rect/Ellipse 按钮（归调色板）；Select/Delete/Undo/Redo 仍在

## 风险点

| 风险 | 应对 |
|---|---|
| 形状多了 nodeTypes/类型/工具多处要改 | 注册表数据驱动：单一新增点；nodeTypes 从注册表派生 |
| SVG 形状在不同尺寸下变形 | 注册项给 `defaultSize` + viewBox，ShapeNode 用百分比/preserveAspectRatio |
| NodeKind 放宽为 string 后 TS 失去枚举约束 | 注册表 key 仍集中定义；`getShape` 对未知 kind fallback；序列化容错 |
| label 编辑与画布快捷键/拖拽冲突 | 编辑态拦截键盘事件（stopPropagation），编辑时禁用节点拖拽 |
| 拖拽放置坐标换算 | 复用 Phase 1 的 `screenToFlowPosition`；drop 时按光标位置定位 |
| 调色板与 Phase 5 侧栏重复造 | Phase 4 只做基础列表，Phase 5 在其上加搜索/分类折叠/属性面板，不推倒 |

## 决策点（2026-05-29 已定）

- **A. 渲染方式** → 通用 SVG `ShapeNode` + 注册表。
- **B. 放置 UI** → Phase 4 做基础侧栏调色板（Phase 5 侧栏的基座）。
- **C. 首批形状** → 通用 rect/ellipse/rounded/diamond + 架构 service/database/queue/load balancer/cloud-CDN/actor，约 10 个。
- **D. 放置交互** → 从调色板拖拽到画布 drop。
- **E. 标签编辑** → Phase 4 就加双击编辑 label。

⚠️ **执行风险（D 相关，开工前知会）**：Phase 3 开了 Tauri OS 级文件拖放（`onDragDropEvent`），它可能拦截 webview 内的 HTML5 拖拽事件（Tauri 已知坑）。T8 实现「调色板拖到画布」时先验证 HTML5 dnd 是否可用；若被拦截，退路依次为：(1) 改用 pointer 事件（mousedown→move→up）自行实现拖拽；(2) 降级为点选形状再点画布放置。届时按实际表现定，不阻断本 Phase。

## 同步动作（完成后）

1. 本计划移到 `docs/plan/archive/`
2. `blueprint.md`：Phase 4 ✅、Phase 5 🔄；同步日志加一条
3. （commit 需用户单独授权）

## 后注

**2026-05-29 完成。** 静态检查全过：`pnpm check` / `pnpm test`(14/14：history 5 + serialize 6 + registry 3) / `pnpm build` 干净。GUI 验收用户通过（含拖放放置、双击改名）。

**最大的执行偏离：拖放方案 D 翻车并改道。** 计划用 HTML5 DnD（draggable + onDrop）从调色板拖到画布——实测**被拦**：Phase 3 开的 Tauri OS 级文件拖放（`onDragDropEvent`）与 webview 内 HTML5 DnD **同窗口互斥**（`dragDropEnabled` 二选一）。若关掉 Tauri 拖放则 HTML5 可用，但会废掉 Phase 3 的「拖 .dm 进来打开」。取舍后走风险表的退路(1)：**pointer 事件自实现拖拽**——`onPointerDown` 起一个跟随光标的 ghost，`pointerup` 时 `document.elementFromPoint` 落在 `.canvas-area` 内才放置；坐标经 Canvas 注册的 `placement` 桥（`screenToFlowPosition`）换算。两个拖放（文件 / 调色板）因此各走各路、互不干扰。

其余落点：
- 形状渲染：CSS `.shape-geom` 统一给描边/填充，子图形 SVG 继承；局部无填充用 `fill="none"`。
- `ShapeNode` 单组件 + `props.type` 查注册表；尺寸取注册表 `defaultSize`（暂不支持 resize，留后续）。label 用 HTML 覆盖层而非 SVG text，方便双击编辑。
- 工具模式整体移除：拖放放置不需要 select/rect/ellipse 工具；连带删 `view.tool`、`Tool` 类型、`Keymap`，并移除已无用的 `react-hotkeys-hook` 依赖（快捷键全在原生菜单）。
- Toolbar 简化为 File / Delete / Undo / Redo。

未做（留后续）：形状 resize；调色板搜索/分类折叠（Phase 5）；属性面板（Phase 5）。
