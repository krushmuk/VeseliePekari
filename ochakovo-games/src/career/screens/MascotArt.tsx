import { useEffect, useRef } from 'react'
import { buildMascot, MASCOT_H, MASCOT_W, type BodyWear, type FeetWear, type HeadWear } from './mascotPixels'

/** Маскот на маленьком холсте; увеличивает CSS без сглаживания */
export function MascotArt({
  head = 'cap',
  body = 'stripes',
  feet = 'sneakers',
}: {
  head?: HeadWear
  body?: BodyWear
  feet?: FeetWear
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, MASCOT_W, MASCOT_H)
    buildMascot(head, body, feet).forEach((row, y) =>
      row.forEach((c, x) => {
        if (!c) return
        ctx.fillStyle = c
        ctx.fillRect(x, y, 1, 1)
      }),
    )
  }, [head, body, feet])
  return <canvas ref={ref} className="mascot-art" width={MASCOT_W} height={MASCOT_H} />
}
