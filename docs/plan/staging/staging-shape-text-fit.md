# Staging: 内接形状的几何感知文本定尺

## 来源

2026-06-25：mermaid 导入「按 label 内容给节点定尺」（`labelSize`）落地时，对抗式验证发现
`labelSize` 是**几何盲**的——只按外接矩形估算。对内接形状（圆/菱形/六边形/平行四边形/
梯形/椭圆/圆柱）会让居中多行文本溢出轮廓，并把方框撑成非方（如圆 88×88→120×88）。

本轮处理：**门槛化**。只对 `ShapeDef.fitsRectText`（rect/rounded/stadium/subroutine/note，
文本区≈外接矩形）的形状按内容定尺；内接形状沿用默认尺寸（与改动前一致，零回归）。
代价：内接形状遇长/多行 label 仍可能溢出（改动前即如此，未变差），只是没修。

## 变更范围

- `src/canvas/shapes/registry.tsx`：给内接形状补一张 per-kind 「内接文本膨胀系数」表
  （几何推导，非拍脑袋）：
  - 圆/椭圆：按对角线容纳——盒子边长 ≥ `hypot(w_text, h_text)`；圆强制方形。
  - 菱形：内接矩形是半对角线，需 `~2×` 文本 bbox（宽高都放大）。
  - 六边形：可用宽 `~0.75W` → 宽放大 `~1.33×`。
  - 平行四边形/梯形：斜边吃宽 → 宽放大 `~1.3×`（梯形上窄，文本宜略偏下或高放大）。
  - 圆柱/数据库：顶盖椭圆吃高 `~15-20%` → 高放大 `~1.25×`。
- `src/core/mermaid-import.ts` `labelSize` 或新 `fitToShape`：按 kind 查表膨胀，先算纯文本
  bbox 再膨胀再 `max(默认尺寸)`（注意当前 `labelSize` 含默认尺寸 floor + MAX_W 封顶，
  膨胀要作用在「文本内容」而非 floor 上，避免短 label 的菱形被 floor×2 撑过大）。
- `src/services/importMermaid.ts`：去掉 `fitsRectText` 门槛，改对所有未定尺形状套 `fitToShape`。

## 预估颗粒度

一个 plan 装得下（一张膨胀表 + 一个 `fitToShape` + 解开门槛 + 单测）。

## 依赖 / 顺序

- 依赖本轮已落地的 `labelSize` / `fitsRectText` / 导入定尺管线。
- 与 dagre 间距（已收紧）无冲突；定尺变大后可复核间距是否需再调。
- 验证遗留 GUI 核查项（圆形文字不出轮廓、菱形不越斜边、圆形仍方形）并入此 plan 的验收。
