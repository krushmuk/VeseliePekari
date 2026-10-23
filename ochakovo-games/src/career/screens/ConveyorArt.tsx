import { useEffect, useRef } from 'react'

// Пиксельная картинка главы «Цех розлива»: вид сверху, конвейеры по вертикали и горизонтали,
// по ним едут бутылки, а машины льют, закручивают и наклеивают. Рисуется на маленьком холсте
// целыми пикселями (холст увеличивает CSS без сглаживания), палитра — семь цветов.

const W = 160
const H = 110

const C = {
  k: '#1b1f2e', // контур, полотно ленты
  f: '#23363b', // пол
  b: '#3b4266', // рёбра ленты, разметка
  s: '#7f909c', // сталь
  w: '#cfe3e6', // стекло, блики
  o: '#e0632e', // машины
  y: '#f4d35e', // напиток
}

type Pt = [number, number]

/** Лента — ломаная из горизонтальных и вертикальных отрезков */
const BELTS = {
  main: [[18, -6], [18, 82], [168, 82]] as Pt[],
  side: [[145, -6], [145, 55], [105, 55]] as Pt[],
  feed: [[28, 15], [80, 15], [80, 30]] as Pt[],
  out: [[80, 62], [80, 82]] as Pt[],
}
const HALF = 4 // половина ширины ленты

const length = (p: Pt[]) => p.slice(1).reduce((s, q, i) => s + Math.abs(q[0] - p[i][0]) + Math.abs(q[1] - p[i][1]), 0)

/** Точка на расстоянии d от начала ломаной */
function pointAt(p: Pt[], d: number): Pt {
  for (let i = 1; i < p.length; i++) {
    const [x0, y0] = p[i - 1]
    const [x1, y1] = p[i]
    const len = Math.abs(x1 - x0) + Math.abs(y1 - y0)
    if (d <= len || i === p.length - 1) {
      const t = Math.min(d, len) / len
      return [Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t)]
    }
    d -= len
  }
  return p[0]
}

/** Рисует холст кадром для момента t (секунды) */
function draw(ctx: CanvasRenderingContext2D, t: number) {
  const rect = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c
    ctx.fillRect(x, y, w, h)
  }
  const disc = (cx: number, cy: number, r: number, c: string) => {
    ctx.fillStyle = c
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.8) ctx.fillRect(cx + x, cy + y, 1, 1)
  }
  /** Корпус машины: контур, сталь или цвет, светлая кромка сверху-слева */
  const body = (x: number, y: number, w: number, h: number, c: string) => {
    rect(x - 1, y - 1, w + 2, h + 2, C.k)
    rect(x, y, w, h, c)
    rect(x, y, w, 1, C.w)
    rect(x, y, 1, h, C.w)
  }

  rect(0, 0, W, H, C.f)
  for (let y = 4; y < H; y += 12) for (let x = 4; x < W; x += 12) rect(x, y, 1, 1, C.b)

  // ленты: рамки, полотно и рёбра, бегущие по ходу ленты
  const step = Math.floor(t * 8)
  for (const p of Object.values(BELTS)) {
    for (let i = 1; i < p.length; i++) {
      const [x0, y0] = p[i - 1]
      const [x1, y1] = p[i]
      const horiz = y0 === y1
      const x = Math.min(x0, x1) - (horiz ? 0 : HALF)
      const y = Math.min(y0, y1) - (horiz ? HALF : 0)
      const w = horiz ? Math.abs(x1 - x0) : HALF * 2 + 1
      const h = horiz ? HALF * 2 + 1 : Math.abs(y1 - y0)
      rect(x - 1, y - 1, w + 2, h + 2, C.s)
      rect(x, y, w, h, C.k)
      // сдвиг рёбер считаем от начала отрезка, так что у лент, идущих вверх и влево, они бегут назад
      const dir = horiz ? Math.sign(x1 - x0) : Math.sign(y1 - y0)
      for (let d = 0; d < (horiz ? w : h); d++) {
        const along = dir > 0 ? d : (horiz ? w : h) - 1 - d
        if ((along - step + 400) % 4 === 0) {
          if (horiz) rect(x + d, y, 1, h, C.b)
          else rect(x, y + d, w, 1, C.b)
        }
      }
    }
  }
  // углы поворотов закрываем полотном
  for (const p of Object.values(BELTS)) {
    for (let i = 1; i < p.length - 1; i++) rect(p[i][0] - HALF, p[i][1] - HALF, HALF * 2 + 1, HALF * 2 + 1, C.k)
  }

  // ящик в конце боковой ленты
  body(93, 50, 10, 10, C.s)
  rect(97, 51, 1, 8, C.k)
  rect(94, 55, 8, 1, C.k)

  // бутылка сверху: диск стекла или напитка, пиксель-крышка
  const bottle = (x: number, y: number, full: boolean, cap: boolean) => {
    disc(x, y, 2, full ? C.y : C.w)
    if (cap) rect(x, y, 1, 1, C.o)
  }
  const flow = (p: Pt[], count: number, speed: number, mark: (d: number) => [boolean, boolean]) => {
    const len = length(p)
    for (let i = 0; i < count; i++) {
      const d = (t * speed + (len * i) / count) % len
      const [x, y] = pointAt(p, d)
      const [full, cap] = mark(d)
      bottle(x, y, full, cap)
    }
  }

  // карусельный автомат: диск, вращающиеся гнёзда с бутылками, ступица
  disc(80, 46, 15, C.k)
  disc(80, 46, 14, C.s)
  disc(80, 46, 10, C.f)
  const turn = t * 0.45
  for (let k = 0; k < 6; k++) {
    const a = turn + (k * Math.PI) / 3
    const x = Math.round(80 + Math.cos(a) * 10)
    const y = Math.round(46 + Math.sin(a) * 10)
    bottle(x, y, k % 2 === 0, k % 2 === 0)
  }
  disc(80, 46, 3, C.s)
  rect(80, 46, 1, 1, C.k)
  // форсунка над каруселью
  rect(79, 29, 3, 3, C.o)
  if (Math.floor(t * 3) % 2) rect(80, 32, 1, 3, C.y)

  // основная лента: бутылка наполняется после портала и получает крышку после укупорки
  const fillAt = 88 + (60 - 18)
  const capAt = 88 + (110 - 18)
  const mainLen = length(BELTS.main)
  for (let i = 0; i < 7; i++) {
    const d = (t * 13 + (mainLen * i) / 7) % mainLen
    const [x, y] = pointAt(BELTS.main, d)
    bottle(x, y, d >= fillAt, d >= capAt)
  }
  flow(BELTS.side, 3, 11, () => [true, true])
  flow(BELTS.feed, 3, 10, () => [false, false])
  flow(BELTS.out, 2, 9, () => [true, false])

  // цистерна с мешалкой и труба
  rect(59, 64, 3, 9, C.s)
  disc(60, 58, 6, C.k)
  disc(60, 58, 5, C.s)
  disc(60, 58, 3, C.y)
  const stir: Pt[][] = [[[-3, 0], [3, 0]], [[-2, -2], [2, 2]], [[0, -3], [0, 3]], [[-2, 2], [2, -2]]]
  const [sa, sb] = stir[Math.floor(t * 6) % 4]
  const n = Math.max(Math.abs(sb[0] - sa[0]), Math.abs(sb[1] - sa[1]))
  for (let i = 0; i <= n; i++) rect(60 + sa[0] + Math.round(((sb[0] - sa[0]) * i) / n), 58 + sa[1] + Math.round(((sb[1] - sa[1]) * i) / n), 1, 1, C.k)

  // наливной портал
  body(56, 73, 9, 19, C.o)
  rect(60, 81, 1, 1, C.k)
  const drip = Math.floor(t * 5) % 3
  rect(60, 81, 1, 1, drip === 0 ? C.w : C.y)
  if (drip === 1) rect(59, 80, 3, 3, C.y)

  // укупорка: головка вращается кадрами «плюс — крест»
  body(106, 73, 9, 19, C.s)
  const cross = Math.floor(t * 5) % 2
  rect(110, 81, 1, 1, C.k)
  for (const [dx, dy] of cross ? [[-1, -1], [1, -1], [-1, 1], [1, 1]] : [[0, -1], [-1, 0], [1, 0], [0, 1]]) rect(110 + dx, 82 + dy - 1, 1, 1, C.k)

  // датчик на вертикальной ленте: лампы мигают по очереди
  body(10, 36, 17, 8, C.s)
  const blink = Math.floor(t * 2) % 2
  rect(13, 39, 3, 2, blink ? C.o : C.k)
  rect(21, 39, 3, 2, blink ? C.k : C.y)

  // этикетировщик на боковой ленте: рука качается в четыре кадра
  body(138, 20, 15, 9, C.s)
  const arm = [[-2, 0], [-4, 0], [-4, 2], [-3, 3]][Math.floor(t * 4) % 4]
  const ax = 145
  const ay = 24
  for (let i = 0; i <= 5; i++) rect(ax - Math.round((Math.abs(arm[0]) + 1.5) * (i / 5)) - 1, ay + Math.round(arm[1] * (i / 5)), 2, 2, C.o)
  rect(ax, ay, 2, 2, C.k)
}

export function ConveyorArt() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    // Для тех, кто просит поменьше движения: один кадр
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      draw(ctx, 1)
      return
    }
    let raf = 0
    let last = 0
    const start = performance.now()
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      // 20 кадров в секунду: пиксель-арт не нужна плавность
      if (now - last < 50) return
      last = now
      draw(ctx, (now - start) / 1000)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return <canvas ref={ref} className="conveyor-art" width={W} height={H} aria-hidden="true" />
}
