import { useEffect, useMemo, useRef } from 'react'

interface Props {
  count: number
  /** Номер набора: от него зависит зерно, чтобы у каждой секции был свой рисунок */
  seed: number
}

function makeBubbles(count: number, seed: number) {
  let s = 7 + seed * 13
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280
  return Array.from({ length: count }, () => {
    const size = 8 + Math.round(rnd() * 34)
    const dur = 9 + rnd() * 10
    return {
      left: `${(rnd() * 96).toFixed(1)}%`,
      width: size,
      height: size,
      animationDuration: `${dur.toFixed(1)}s`,
      animationDelay: `${(-rnd() * dur).toFixed(1)}s`,
    }
  })
}

/**
 * Пузырьки кваса. Фиксированный псевдослучайный набор — картинка одинакова при каждой загрузке.
 * Высота контейнера уходит в --h: по ней пузырёк поднимается от низа до верха.
 */
export function Bubbles({ count, seed }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  const bubbles = useMemo(() => makeBubbles(count, seed), [count, seed])

  useEffect(() => {
    const box = ref.current
    if (!box) return
    const update = () => box.style.setProperty('--h', `${box.offsetHeight}px`)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(box)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="bubbles" aria-hidden="true">
      {bubbles.map((style, i) => (
        <i key={i} style={style} />
      ))}
    </div>
  )
}
