import { BlockContent, type LayoutSpec } from "./BlockRenderer";

export function CustomLayoutRenderer({ spec }: { spec: LayoutSpec }) {
  const { cols, rows } = spec.grid;
  return (
    <div className={`h-screen w-full p-4 ${spec.background}`}>
      <div
        className="relative w-full h-full"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          gap: "12px",
        }}
      >
        {spec.blocks.map((b) => (
          <div
            key={b.id}
            style={{
              gridColumn: `${b.x + 1} / span ${b.w}`,
              gridRow: `${b.y + 1} / span ${b.h}`,
              zIndex: b.z ?? 1,
            }}
          >
            <BlockContent block={b} />
          </div>
        ))}
      </div>
    </div>
  );
}
