import { MASTER_H, MASTER_PAL, MASTER_W, masterRows } from './masterArt'

const ROWS = masterRows()

/** Склеить подряд идущие пиксели одного цвета в один прямоугольник */
const RECTS = ROWS.flatMap((row, y) => {
  const out: { x: number; y: number; w: number; fill: string }[] = []
  for (let x = 0; x < row.length; ) {
    const c = row[x]
    let w = 1
    while (row[x + w] === c) w++
    if (c !== '.') out.push({ x, y, w, fill: MASTER_PAL[c as keyof typeof MASTER_PAL] })
    x += w
  }
  return out
})

/** Мастер пресса: пиксельный портрет для рамки диалога */
export function MasterArt() {
  return (
    <svg
      viewBox={`0 0 ${MASTER_W} ${MASTER_H}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMax meet"
      shapeRendering="crispEdges"
      role="img"
      aria-label="Мастер пресса"
    >
      {RECTS.map(r => (
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  )
}
