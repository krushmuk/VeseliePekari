import { useEffect, useRef } from 'react'

// Пиксельная картинка главы «Оператор технологического цеха»: солодовня, вид сверху. Круглая грядка
// солода, в центре колонна, от неё как стрелка часов идёт ворошитель (синяя балка с моторами и шнеками).
// За балкой зерно перепахано бороздами, они понемногу разглаживаются, пока балка не вернётся.
// Рисуется на маленьком холсте целыми пикселями (холст увеличивает CSS без сглаживания).

const W = 160
const H = 110
const CX = 80
const CY = 55
const R_TANK = 52 // внутренний радиус чана
const R_ARM = 49 // длина балки
const PERIOD = 14 // секунд на оборот
const TAU = Math.PI * 2

const C = {
  rim: '#9fb0bc',
  rimLight: '#e8f1f4',
  rimDark: '#5f717b',
  k: '#1b1f2e',
  blue: '#2d56a3',
  blueLight: '#4f7fd0',
  blueDark: '#1f3b73',
  y: '#f4d35e',
  steel: '#9fb0bc',
  white: '#e8f1f4',
  steelDark: '#5f717b',
  malt: '#d89a42',
  maltLight: '#efba66',
  maltDark: '#a86d28',
  maltDeep: '#7a4c1a',
}

/** Хэш для стабильного «случайного» числа по целому */
const rnd = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

/** Рисует холст кадром для момента t (секунды) */
function draw(ctx: CanvasRenderingContext2D, t: number) {
  const rect = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c
    ctx.fillRect(Math.round(x), Math.round(y), w, h)
  }
  // пол и стены вокруг чана рисует CSS (см. .chapter-art.techshop), здесь он прозрачный
  ctx.clearRect(0, 0, W, H)

  // угол балки: растёт по часовой стрелке (ось y направлена вниз), старт — «на двенадцать часов»
  const a = -Math.PI / 2 + ((t % PERIOD) / PERIOD) * TAU
  const ca = Math.cos(a)
  const sa = Math.sin(a)
  const step = Math.floor(t * 8)

  /** Попадание в балку: вдоль неё 0..R_ARM, поперёк ±3 */
  const beam = (dx: number, dy: number, grow = 0) => {
    const along = dx * ca + dy * sa
    const perp = -dx * sa + dy * ca
    return along > 4 && along < R_ARM && Math.abs(perp) <= 3 + grow ? { along, perp } : null
  }

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - CX + 0.5
      const dy = y - CY + 0.5
      const r = Math.hypot(dx, dy)
      let c: string

      if (r > R_TANK + 4) continue
      if (r > R_TANK) {
        // борт чана
        c = r < R_TANK + 1.5 ? C.rimLight : r > R_TANK + 3 ? C.rimDark : C.rim
      } else {
        // зерно: на сколько радиан балка ушла вперёд от этой точки
        const ang = Math.atan2(dy, dx)
        const behind = (((a - ang) % TAU) + TAU) % TAU
        const stir = behind < 3 ? 1 - behind / 3 : 0
        const ring = Math.floor(r / 3)
        c = C.malt
        if (stir > 0) {
          // борозды от шнеков: кольца, рельеф сглаживается по мере удаления от балки
          const phase = (ring + (stir > 0.55 ? 0 : 1)) % 2
          if (phase === 0 && stir > 0.15) c = r % 3 < 1 ? C.maltDeep : C.maltDark
          else if (stir > 0.3) c = r % 3 < 1 ? C.maltLight : C.malt
        }
        const q = rnd(x * 31 + y * 7 + (stir > 0 ? step : 0))
        if (q < 0.12) c = C.maltDark
        else if (q > 0.9) c = C.maltLight
      }

      // тень балки, смещённая вниз-вправо
      if (r < R_TANK && beam(dx - 2, dy - 3, 0)) c = C.maltDeep
      // сама балка
      const b = r < R_TANK + 2 ? beam(dx, dy) : null
      if (b) {
        if (Math.abs(b.perp) > 2.2) c = C.k
        else if (b.perp < -0.8) c = C.blueLight
        else if (b.perp > 1.2) c = C.blueDark
        else c = C.blue
        // жёлтая полоса на конце и стыки корпуса
        if (b.along > R_ARM - 4 && Math.abs(b.perp) < 2.2) c = Math.floor(b.perp + 3) % 2 ? C.y : C.k
        else if (Math.floor(b.along) % 12 === 0 && Math.abs(b.perp) < 2.2) c = C.blueDark
      }
      ctx.fillStyle = c
      ctx.fillRect(x, y, 1, 1)
    }
  }

  // моторы на балке и вращающиеся шнеки по обе стороны
  for (let along = 10; along < R_ARM - 2; along += 6) {
    const px = CX + ca * along
    const py = CY + sa * along
    const motor = along % 12 === 4 || along === 10
    if (motor) {
      rect(px - 2, py - 2, 5, 5, C.k)
      rect(px - 1, py - 1, 3, 3, C.steelDark)
      rect(px - 1, py - 1, 1, 1, C.steel)
    }
    // шнек: крестик, который поворачивается через кадр
    const sx = px - sa * 5
    const sy = py + ca * 5
    const sw = Math.floor(t * 10 + along) % 2
    rect(sx - (sw ? 2 : 0), sy - (sw ? 0 : 2), sw ? 5 : 1, sw ? 1 : 5, C.steelDark)
    rect(sx, sy, 1, 1, C.white)
  }

  // подброшенные зёрна за шнеками
  for (let i = 0; i < 24; i++) {
    const life = (t * 1.5 + rnd(i) * 3) % 1
    const along = 8 + rnd(i * 3 + 1) * (R_ARM - 12)
    const back = 4 + life * 7
    const off = (rnd(i * 7) - 0.5) * 10
    const gx = CX + ca * along - sa * (5 + off)
    const gy = CY + sa * along + ca * (5 + off)
    rect(gx + ca * -back * 0.3, gy + sa * -back * 0.3 - Math.sin(life * Math.PI) * 3, 1, 1, rnd(i * 9) < 0.5 ? C.maltLight : C.maltDark)
  }

  // центральная колонна с воронкой
  rect(CX - 8, CY - 8, 16, 16, C.k)
  for (let y = -7; y <= 7; y++) for (let x = -7; x <= 7; x++) {
    const d = Math.hypot(x + 0.5, y + 0.5)
    if (d <= 7.5) rect(CX + x, CY + y, 1, 1, d < 3 ? C.k : d < 5 ? C.steelDark : x + y < 0 ? C.white : C.steel)
  }
  rect(CX - 1, CY - 1, 2, 2, C.y)
}

export function MaltArt() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    // Для тех, кто просит поменьше движения: один кадр
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      draw(ctx, 3)
      return
    }
    let raf = 0
    let last = 0
    const start = performance.now()
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      // 20 кадров в секунду: пиксель-арту не нужна плавность
      if (now - last < 50) return
      last = now
      draw(ctx, Math.max(0, now - start) / 1000)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return <canvas ref={ref} className="conveyor-art" width={W} height={H} aria-hidden="true" />
}
