# 方法论：drawmaker 的产品设计 → 开发 → 测试

本文沉淀 drawmaker（尤其 Phase 10 mermaid 转型）这一程从想法到落地的工作方法。不是流水账，是**可复用的做法**。配套：现行真相看 `blueprint.md`，计划看 `plan/`，跨项目通用规范看 `~/.claude/workflow.md`。

---

## 一、产品设计：先把方向钉死，再动手

### 1. 区分"做事"和"决策"，只在真正的岔路口打断用户
- 能从需求 / 代码 / 合理默认推出的，直接做，不问。
- 改变实现方向、且偏好无法推断的，才停下来确认（用结构化选择题，每个选项标清代价）。例：双向的「同步模型 / 覆盖范围 / 取舍 / 解析器」四个决策，「画布元素边界（纯 mermaid vs 允许本地装饰）」。
- 用户说"先跟我确认思路"时，**先给认知框架 + 推荐方案，再让他在岔路上拍板**，不是开放式提问。

### 2. 用一把"判断尺"统一取舍
- mermaid 转型里那把尺是 **"这个特性能不能往返 mermaid"**。它一刀把 Excalidraw 的几十个特性分成：能往返的（颜色 / 边样式 / subgraph）、纯交互不碰数据的（对齐吸附 / 双击建点）、破坏往返的（freedraw / 便利贴 → 砍掉）。
- 有了尺，"吸收 Excalidraw"就不是抄功能，而是**在约束下筛功能**。

### 3. 大目标必然是长尾，按"同构优先"切竖片
- "几乎所有 mermaid 图"是十几种类型的长尾，不可能一回合做完。
- 切法：**先做与现有模型同构的那条线**（flowchart 与"节点+连线"同构 → 最高价值、最可行），打通完整竖片（出图→编辑→导出→实时预览），再逐类型扩展。
- 扩展时让架构吃掉重复：**"加一种类型 = 加一个序列化器 / 一个解析适配 / 一行分发"**（`SERIALIZERS` 注册表、`buildGraph` 分发）。

### 4. 诚实对待"几乎所有"
- 覆盖按"实际使用频率"算，不按类型总数刷分。主流的先做透，实验性/受阻的（quadrant 渲染数据难反推、xychart-beta 解析不稳）明说暂缓，不硬上、不假装完成。

---

## 二、开发：架构铁律 + 先去风险

### 5. 分层，让"纯逻辑"和"脏 IO"分家
- **core = SSOT + 纯函数**（document model、`toMermaid`、`flowToGraph`、各 `*ToData` 映射）——无副作用、可在 node 里测。
- **services = 唯一碰外部系统的地方**（Tauri invoke、系统剪贴板、mermaid 官方解析器这种 DOM 依赖）。
- **canvas = 渲染层**（xyflow），业务不直接 import xyflow API。
- 协调层（document-actions / clipboard-actions / importMermaid）组合 core + services，可以跨层，但**纯逻辑永远留在 core**。
- 收益：解析器虽是 DOM 重依赖，但"mermaid 顶点 type→形状 kind"这种语义映射仍是 core 纯函数，照测不误。

### 6. 引入重依赖前，先用一次性探针去风险
- 决定用 mermaid 官方解析器前，**没有直接写代码**，而是 jsdom 探针实测：`db.getVertices/getEdges/getDirection` 到底给什么、是否依赖 DOM、体积多大。确认"抽取干净、可测、dmg 只涨 0.9MB"后才动手。
- 每个新图表类型导入前都先探针看 db 形态（state 用 getStates、er 的 relationship 用内部 id 要映射回 key……），**用真实数据形态写映射，不靠猜**。探针用完即删。

### 7. 修 bug 先定位根因，别 pattern-match
- 拖拽残影：根因是 WKWebView 对带 `filter` 的元素在父级 transform 拖动时旧区域失效不彻底——去掉 filter 而非瞎调。
- savedCursor 误判"干净"：redo 分支截断没让旧保存点失效 → 加不可达哨兵。
- immer draft 是 Proxy，`structuredClone` 会 DataCloneError → 克隆挪到 commit 外用真实节点做。
- 共同点：**先理解"为什么会这样"，改动才可追溯到根因**。

### 8. 守往返保真，必要时主动"舍弃"
- mermaid 文本无坐标 → 拖拽位置只存 `.dm`，导出文本保持干净标准（能贴回 mermaid.live）。
- 为"无损往返"主动收敛形状库：只留与 mermaid 1:1 的 canonical 形状，近似的架构形状退出调色板但保留渲染（旧文件不破）。**舍弃是为了契约更纯，不是减功能。**

---

## 三、测试：能测的锁死，不能测的说清

### 9. 纯函数单测 + DOM 路径集成测试，分工明确
- 纯逻辑（映射 / 序列化 / 对齐计算 / 撤销栈）→ node 单测，**精确断言**（连 mermaid 输出的每个字符都断言，测试即规格）。
- DOM 依赖路径（mermaid 解析器）→ `// @vitest-environment jsdom` 集成测试，真跑解析器，覆盖"解析器实际产出 = 我们假设的形态"——这是纯映射测不到的、最容易因上游变化而崩的一环。

### 10. 测试是"行为锁"，不是事后补
- 发现真 bug 当回合就补单测把它钉住（savedCursor、撤销往返），防回归。
- 测不了的明说：系统剪贴板 IO、GUI 交互（resize 拖拽、⌘C/⌘V、中文 IME）在 headless 测不了 → 留手动验证，并记进 memory 的 computer-use playbook，不假装覆盖。

### 11. 每块完成都过同一条验证流水线
`pnpm check`（tsc）→ 全量 `pnpm test` → `pnpm tauri build` → ditto 重装 /Applications。**全绿才算"完成"**，dmg 装上去才叫"可用"。

---

## 四、工作节奏

### 12. 计划生命周期
想法 → `docs/plan/staging/`（够具体但不进当前窗口）→ `docs/plan/active/`（在做）→ 完成归档 + 同步 `blueprint.md`。大方向进 blueprint Roadmap/Backlog。

### 13. 提交与发布
- **每完成一块自动 commit（本地）**，逻辑一改一 commit；文件交织、无交互式 `add -p` 时按文件边界分主题提交并说明。
- **push / 发 Release 是高风险对外动作，每次单独授权**。
- 发版：三处版本号 bump → check/test/build → tag → 推两端 → GitHub Release（gh）+ forgejo Release（API，凭据走 `~/.credentials/forgejo/`，只读不打印）。

### 14. 凭据与安全
按"项目 CLAUDE.md → docs/security.md → `~/.credentials/<vendor>/secrets.env`"链路读，不主动翻 `~`，不把密码贴进输出。

---

## 五、一句话总结

**先用一把尺把方向钉死 → 与现有模型同构的竖片优先打通 → 重依赖先探针去风险 → 纯逻辑和脏 IO 分层各自可测 → 每块过同一条验证流水线、绿了才叫完成 → 自动沉淀（commit + 文档），对外动作单独授权。**
