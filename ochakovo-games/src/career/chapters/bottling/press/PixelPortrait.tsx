import type { Palette } from '../pixel'

/** Склеить подряд идущие пиксели одного цвета в один прямоугольник */
function toRects(rows: readonly string[], palette: Palette) {
  return rows.flatMap((row, y) => {
    const out: { x: number; y: number; w: number; fill: string }[] = []
    for (let x = 0; x < row.length; ) {
      const c = row[x]
      let w = 1
      while (row[x + w] === c) w++
      if (c !== '.') out.push({ x, y, w, fill: palette[c] })
      x += w
    }
    return out
  })
}

/** Пиксельный портрет персонажа из строк сетки для рамки диалога */
export function PixelPortrait({ rows, palette, label }: { rows: readonly string[]; palette: Palette; label: string }) {
  const rects = toRects(rows, palette)
  return (
    <svg
      viewBox={`0 0 ${rows[0].length} ${rows.length}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMax meet"
      shapeRendering="crispEdges"
      role="img"
      aria-label={label}
    >
      {rects.map(r => (
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  )
}
