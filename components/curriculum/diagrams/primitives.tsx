import type { ReactNode } from "react";

// Small set of reusable, theme-aware SVG/flex diagram primitives for
// curriculum lessons. Each concrete diagram (components/curriculum/diagrams/
// index.tsx) is just these primitives configured with content — kept
// deliberately simple (flexbox layout + small parametric SVG connectors,
// not hand-placed absolute coordinates) so a new diagram can't easily come
// out visually broken.

const boxClassName =
  "rounded-xl border border-black/[.08] bg-black/[.02] px-3 py-2 text-center text-xs font-medium text-zinc-700 dark:border-white/[.1] dark:bg-white/[.04] dark:text-zinc-200";

function DiagramFrame({ children, caption }: { children: ReactNode; caption?: string }) {
  return (
    <figure className="flex flex-col gap-3 overflow-x-auto rounded-2xl border border-black/[.06] bg-white p-5 dark:border-white/[.08] dark:bg-zinc-950">
      {children}
      {caption && (
        <figcaption className="text-xs text-zinc-400 dark:text-zinc-600">{caption}</figcaption>
      )}
    </figure>
  );
}

function RightArrow() {
  return (
    <svg
      width="22"
      height="14"
      viewBox="0 0 22 14"
      fill="none"
      className="shrink-0 stroke-zinc-400 dark:stroke-zinc-600"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="1" y1="7" x2="17" y2="7" />
      <polyline points="12,2 18,7 12,12" />
    </svg>
  );
}

/** A left-to-right pipeline of labeled steps, e.g. Transistor → Gate → Chip. */
export function FlowDiagram({ steps, caption }: { steps: string[]; caption?: string }) {
  return (
    <DiagramFrame caption={caption}>
      <div className="flex items-center gap-2">
        {steps.map((step, i) => (
          <div key={i} className="flex shrink-0 items-center gap-2">
            <div className={boxClassName}>{step}</div>
            {i < steps.length - 1 && <RightArrow />}
          </div>
        ))}
      </div>
    </DiagramFrame>
  );
}

/** One central hub connected to several spokes, e.g. an interconnect wired
 * to CPU/GPU/memory/peripheral blocks. Spoke count is parametric — the
 * connector SVG computes its own coordinates from spokes.length rather than
 * using hand-placed positions. */
export function HubSpokeDiagram({
  hub,
  spokes,
  caption,
}: {
  hub: string;
  spokes: string[];
  caption?: string;
}) {
  const width = Math.max(spokes.length * 120, 240);
  const spokeXs = spokes.map((_, i) => ((i + 0.5) / spokes.length) * width);
  const hubX = width / 2;

  return (
    <DiagramFrame caption={caption}>
      <div className="flex flex-col items-center gap-1">
        <div className={boxClassName}>{hub}</div>
        <svg
          width={width}
          height="36"
          viewBox={`0 0 ${width} 36`}
          className="stroke-zinc-400 dark:stroke-zinc-600"
          strokeWidth="1.5"
        >
          <line x1={hubX} y1="0" x2={hubX} y2="18" />
          <line x1={Math.min(...spokeXs)} y1="18" x2={Math.max(...spokeXs)} y2="18" />
          {spokeXs.map((x, i) => (
            <line key={i} x1={x} y1="18" x2={x} y2="36" />
          ))}
        </svg>
        <div className="flex flex-wrap justify-center gap-2">
          {spokes.map((spoke, i) => (
            <div key={i} className={boxClassName}>
              {spoke}
            </div>
          ))}
        </div>
      </div>
    </DiagramFrame>
  );
}

/** A small grid of routers connected in a mesh, with one path highlighted —
 * the shape of a Network-on-Chip. Grid size is parametric from the labels
 * array's length (fills row-major, 3 columns). */
export function MeshDiagram({
  nodes,
  highlightPath,
  caption,
}: {
  nodes: string[];
  /** Indices into `nodes` describing the highlighted route, in order. */
  highlightPath: number[];
  caption?: string;
}) {
  const cols = 3;
  const cellSize = 90;
  const rows = Math.ceil(nodes.length / cols);
  const width = cols * cellSize;
  const height = rows * cellSize;
  const centerOf = (i: number) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return { x: col * cellSize + cellSize / 2, y: row * cellSize + cellSize / 2 };
  };

  const gridLines: ReactNode[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const { x, y } = centerOf(i);
    const col = i % cols;
    const row = Math.floor(i / cols);
    if (col < cols - 1 && i + 1 < nodes.length) {
      const right = centerOf(i + 1);
      gridLines.push(
        <line key={`h${i}`} x1={x} y1={y} x2={right.x} y2={right.y} />,
      );
    }
    if (row < rows - 1 && i + cols < nodes.length) {
      const down = centerOf(i + cols);
      gridLines.push(<line key={`v${i}`} x1={x} y1={y} x2={down.x} y2={down.y} />);
    }
  }

  const highlightSegments: ReactNode[] = [];
  for (let i = 0; i < highlightPath.length - 1; i++) {
    const a = centerOf(highlightPath[i]);
    const b = centerOf(highlightPath[i + 1]);
    highlightSegments.push(
      <line
        key={`hl${i}`}
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        className="stroke-sky-500 dark:stroke-sky-400"
        strokeWidth="3"
      />,
    );
  }

  return (
    <DiagramFrame caption={caption}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <g className="stroke-zinc-300 dark:stroke-zinc-700" strokeWidth="1.5">
          {gridLines}
        </g>
        <g>{highlightSegments}</g>
        {nodes.map((label, i) => {
          const { x, y } = centerOf(i);
          const onPath = highlightPath.includes(i);
          return (
            <g key={i}>
              <circle
                cx={x}
                cy={y}
                r="22"
                className={
                  onPath
                    ? "fill-sky-500/10 stroke-sky-500 dark:stroke-sky-400"
                    : "fill-black/[.02] stroke-zinc-400 dark:fill-white/[.04] dark:stroke-zinc-600"
                }
                strokeWidth="1.5"
              />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-zinc-700 text-[9px] font-medium dark:fill-zinc-200"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </DiagramFrame>
  );
}

/** Two small labeled groups side by side, for contrasting a pair of
 * concepts (e.g. non-coherent vs. coherent interconnect). */
function ComparisonSide({
  title,
  items,
  synced,
}: {
  title: string;
  items: string[];
  synced?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2 rounded-xl border border-black/[.06] p-4 dark:border-white/[.08]">
      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{title}</span>
      <div className="flex items-center gap-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={boxClassName}>{item}</div>
            {i < items.length - 1 && (
              <svg width="28" height="14" viewBox="0 0 28 14" className="shrink-0">
                <line
                  x1="2"
                  y1="7"
                  x2="26"
                  y2="7"
                  className={
                    synced
                      ? "stroke-emerald-500 dark:stroke-emerald-400"
                      : "stroke-zinc-300 dark:stroke-zinc-700"
                  }
                  strokeWidth="1.75"
                  strokeDasharray={synced ? undefined : "3,3"}
                />
              </svg>
            )}
          </div>
        ))}
      </div>
      <span
        className={
          synced
            ? "text-[10px] text-emerald-600 dark:text-emerald-400"
            : "text-[10px] text-zinc-400 dark:text-zinc-600"
        }
      >
        {synced ? "caches kept in sync" : "caches not synchronized"}
      </span>
    </div>
  );
}

export function ComparisonDiagram({
  left,
  right,
  caption,
}: {
  left: { title: string; items: string[]; synced?: boolean };
  right: { title: string; items: string[]; synced?: boolean };
  caption?: string;
}) {
  return (
    <DiagramFrame caption={caption}>
      <div className="flex flex-col gap-3 sm:flex-row">
        <ComparisonSide {...left} />
        <ComparisonSide {...right} />
      </div>
    </DiagramFrame>
  );
}

/** A handful of labeled nodes with edges between them — for a small
 * concept-graph excerpt. Positions are computed on a circle from
 * nodes.length, not hand-placed. */
export function NodeGraphDiagram({
  nodes,
  edges,
  caption,
}: {
  nodes: string[];
  /** Pairs of indices into `nodes`. */
  edges: [number, number][];
  caption?: string;
}) {
  const size = 260;
  const radius = 95;
  const center = size / 2;
  const positions = nodes.map((_, i) => {
    const angle = (i / nodes.length) * 2 * Math.PI - Math.PI / 2;
    return { x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle) };
  });

  return (
    <DiagramFrame caption={caption}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
        <g className="stroke-zinc-300 dark:stroke-zinc-700" strokeWidth="1.5">
          {edges.map(([a, b]) => (
            <line
              key={`${a}-${b}`}
              x1={positions[a].x}
              y1={positions[a].y}
              x2={positions[b].x}
              y2={positions[b].y}
            />
          ))}
        </g>
        {nodes.map((label, i) => (
          <g key={i}>
            <circle
              cx={positions[i].x}
              cy={positions[i].y}
              r="30"
              className="fill-violet-500/10 stroke-violet-500 dark:stroke-violet-400"
              strokeWidth="1.5"
            />
            <text
              x={positions[i].x}
              y={positions[i].y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-zinc-700 text-[9px] font-medium dark:fill-zinc-200"
            >
              {label}
            </text>
          </g>
        ))}
      </svg>
    </DiagramFrame>
  );
}
