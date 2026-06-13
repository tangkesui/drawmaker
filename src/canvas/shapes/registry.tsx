import type { ReactNode } from "react";

/**
 * 数据驱动的形状注册表。
 * 加一个形状 = 加一条 ShapeDef；nodeTypes、调色板、默认尺寸都从这里派生。
 * render 返回 SVG 元素，画在 0..w / 0..h 坐标系内；描边/填充由 .shape-geom（CSS）统一给，
 * 需要无填充的局部用 fill="none"。
 */
export interface ShapeDef {
  kind: string;
  label: string;
  category: string;
  defaultSize: { width: number; height: number };
  render: (w: number, h: number) => ReactNode;
}

const SHAPES: ShapeDef[] = [
  // ---- Mermaid 标准形状（flowchart）----
  // 通用分类里的 rect/rounded/ellipse/diamond 也映射 mermaid 标准形状；
  // 这里补齐它们之外的标准 flowchart 形状，kind 与 mermaid 形状语义一一对应。
  {
    kind: "stadium",
    label: "体育场",
    category: "Mermaid",
    defaultSize: { width: 140, height: 56 },
    render: (w, h) => <rect x={1} y={1} width={w - 2} height={h - 2} rx={(h - 2) / 2} />,
  },
  {
    kind: "subroutine",
    label: "子程序",
    category: "Mermaid",
    defaultSize: { width: 150, height: 56 },
    render: (w, h) => (
      <>
        <rect x={1} y={1} width={w - 2} height={h - 2} rx={2} />
        <line x1={8} y1={1} x2={8} y2={h - 1} fill="none" />
        <line x1={w - 8} y1={1} x2={w - 8} y2={h - 1} fill="none" />
      </>
    ),
  },
  {
    kind: "cylinder",
    label: "圆柱",
    category: "Mermaid",
    defaultSize: { width: 100, height: 110 },
    render: (w, h) => {
      const ry = Math.min(h * 0.16, 16);
      return (
        <>
          <path
            d={`M1,${ry} A ${w / 2 - 1} ${ry} 0 0 1 ${w - 1},${ry} L ${w - 1},${h - ry} A ${w / 2 - 1} ${ry} 0 0 1 1,${h - ry} Z`}
          />
          <path d={`M1,${ry} A ${w / 2 - 1} ${ry} 0 0 0 ${w - 1},${ry}`} fill="none" />
        </>
      );
    },
  },
  {
    kind: "circle",
    label: "圆",
    category: "Mermaid",
    defaultSize: { width: 88, height: 88 },
    render: (w, h) => <circle cx={w / 2} cy={h / 2} r={Math.min(w, h) / 2 - 1} />,
  },
  {
    kind: "hexagon",
    label: "六边形",
    category: "Mermaid",
    defaultSize: { width: 140, height: 72 },
    render: (w, h) => {
      const i = Math.min(w * 0.2, 24);
      return (
        <polygon points={`${i},1 ${w - i},1 ${w - 1},${h / 2} ${w - i},${h - 1} ${i},${h - 1} 1,${h / 2}`} />
      );
    },
  },
  {
    kind: "parallelogram",
    label: "平行四边形",
    category: "Mermaid",
    defaultSize: { width: 150, height: 60 },
    render: (w, h) => {
      const s = Math.min(w * 0.2, 26);
      return <polygon points={`${s},1 ${w - 1},1 ${w - s},${h - 1} 1,${h - 1}`} />;
    },
  },
  {
    kind: "trapezoid",
    label: "梯形",
    category: "Mermaid",
    defaultSize: { width: 150, height: 64 },
    render: (w, h) => {
      const s = Math.min(w * 0.2, 28);
      return <polygon points={`${s},1 ${w - s},1 ${w - 1},${h - 1} 1,${h - 1}`} />;
    },
  },
  // ---- 通用 ----
  {
    kind: "rect",
    label: "矩形",
    category: "通用",
    defaultSize: { width: 120, height: 56 },
    render: (w, h) => <rect x={1} y={1} width={w - 2} height={h - 2} rx={2} />,
  },
  {
    kind: "rounded",
    label: "圆角矩形",
    category: "通用",
    defaultSize: { width: 140, height: 56 },
    render: (w, h) => <rect x={1} y={1} width={w - 2} height={h - 2} rx={14} />,
  },
  {
    kind: "ellipse",
    label: "椭圆",
    category: "通用",
    defaultSize: { width: 120, height: 80 },
    render: (w, h) => <ellipse cx={w / 2} cy={h / 2} rx={w / 2 - 1} ry={h / 2 - 1} />,
  },
  {
    kind: "diamond",
    label: "菱形",
    category: "通用",
    defaultSize: { width: 120, height: 80 },
    render: (w, h) => (
      <polygon points={`${w / 2},1 ${w - 1},${h / 2} ${w / 2},${h - 1} 1,${h / 2}`} />
    ),
  },
  // ---- 架构 ----
  {
    kind: "service",
    label: "服务",
    category: "架构",
    defaultSize: { width: 140, height: 64 },
    render: (w, h) => (
      <>
        <rect x={1} y={1} width={w - 2} height={h - 2} rx={6} />
        <line x1={1} y1={20} x2={w - 1} y2={20} />
      </>
    ),
  },
  {
    kind: "database",
    label: "数据库",
    category: "架构",
    defaultSize: { width: 100, height: 110 },
    render: (w, h) => {
      const ry = Math.min(h * 0.16, 16);
      return (
        <>
          <path
            d={`M1,${ry} A ${w / 2 - 1} ${ry} 0 0 1 ${w - 1},${ry} L ${w - 1},${h - ry} A ${w / 2 - 1} ${ry} 0 0 1 1,${h - ry} Z`}
          />
          <path
            d={`M1,${ry} A ${w / 2 - 1} ${ry} 0 0 0 ${w - 1},${ry}`}
            fill="none"
          />
        </>
      );
    },
  },
  {
    kind: "queue",
    label: "队列",
    category: "架构",
    defaultSize: { width: 150, height: 56 },
    render: (w, h) => (
      <>
        <rect x={1} y={1} width={w - 2} height={h - 2} rx={2} />
        <line x1={w - 30} y1={1} x2={w - 30} y2={h - 1} fill="none" />
        <line x1={w - 60} y1={1} x2={w - 60} y2={h - 1} fill="none" />
      </>
    ),
  },
  {
    kind: "loadbalancer",
    label: "负载均衡",
    category: "架构",
    defaultSize: { width: 140, height: 72 },
    render: (w, h) => {
      const i = Math.min(w * 0.22, 28);
      return (
        <polygon
          points={`${i},1 ${w - i},1 ${w - 1},${h / 2} ${w - i},${h - 1} ${i},${h - 1} 1,${h / 2}`}
        />
      );
    },
  },
  {
    kind: "cloud",
    label: "云 / CDN",
    category: "架构",
    defaultSize: { width: 150, height: 96 },
    render: (w, h) => (
      <g transform={`scale(${w / 100},${h / 64})`}>
        <path
          d="M27,52 a17,17 0 0,1 -2,-34 a22,22 0 0,1 42,-4 a16,16 0 0,1 22,16 a14,14 0 0,1 -8,26 Z"
        />
      </g>
    ),
  },
  {
    kind: "actor",
    label: "用户",
    category: "架构",
    defaultSize: { width: 64, height: 104 },
    render: (w, h) => {
      const cx = w / 2;
      const r = Math.min(w, h) * 0.18;
      const headY = r + 4;
      const shoulder = headY + r + 6;
      const hip = h * 0.66;
      return (
        <g fill="none">
          <circle cx={cx} cy={headY} r={r} fill="var(--shape-fill, #fff)" />
          <line x1={cx} y1={shoulder} x2={cx} y2={hip} />
          <line x1={cx - r * 1.6} y1={shoulder + r} x2={cx + r * 1.6} y2={shoulder + r} />
          <line x1={cx} y1={hip} x2={cx - r * 1.6} y2={h - 4} />
          <line x1={cx} y1={hip} x2={cx + r * 1.6} y2={h - 4} />
        </g>
      );
    },
  },
  {
    kind: "note",
    label: "便签",
    category: "架构",
    defaultSize: { width: 120, height: 90 },
    render: (w, h) => {
      const f = 16;
      return (
        <>
          <path d={`M1,1 L${w - f},1 L${w - 1},${f} L${w - 1},${h - 1} L1,${h - 1} Z`} />
          <path d={`M${w - f},1 L${w - f},${f} L${w - 1},${f}`} fill="none" />
        </>
      );
    },
  },
];

const BY_KIND = new Map(SHAPES.map((s) => [s.kind, s]));
const FALLBACK = BY_KIND.get("rect")!;

/**
 * 退出调色板的形状（往返 mermaid 不闭合：架构形状只是「近似映射」，
 * ellipse 与 stadium 都导出为 `([])`）。仍保留在注册表中以渲染旧 .dm（不破坏既有文件）。
 * 调色板只留与 mermaid 标准形状 1:1 往返安全的 canonical 集。
 */
const HIDDEN_KINDS = new Set([
  "ellipse",
  "service",
  "database",
  "queue",
  "loadbalancer",
  "cloud",
  "actor",
  "note",
]);

/** 取形状定义；未知 kind 回退到 rect（序列化容错）。 */
export function getShape(kind: string): ShapeDef {
  return BY_KIND.get(kind) ?? FALLBACK;
}

/** 注册表全集（含隐藏形状，供 nodeTypes 注册 / 渲染旧文件）。 */
export function allShapes(): ShapeDef[] {
  return SHAPES;
}

/** 该 kind 是否出现在调色板（往返安全的标准形状）。 */
export function isPaletteShape(kind: string): boolean {
  return !HIDDEN_KINDS.has(kind);
}

/** 调色板分类：只含往返安全的标准形状（隐藏架构/ellipse）。 */
export function shapesByCategory(): { category: string; shapes: ShapeDef[] }[] {
  const order: string[] = [];
  const map = new Map<string, ShapeDef[]>();
  for (const s of SHAPES) {
    if (HIDDEN_KINDS.has(s.kind)) continue;
    if (!map.has(s.category)) {
      map.set(s.category, []);
      order.push(s.category);
    }
    map.get(s.category)!.push(s);
  }
  return order.map((category) => ({ category, shapes: map.get(category)! }));
}
