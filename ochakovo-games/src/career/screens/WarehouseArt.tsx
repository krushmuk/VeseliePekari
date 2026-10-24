import { useEffect, useRef } from 'react'

// Пиксельная картинка главы «Склад»: вид сбоку, стеллаж в три яруса и погрузчик, который
// берёт коробку с пола, поднимает её на полку, затем снимает обратно и ставит на место.
// Рисуется на маленьком холсте целыми пикселями (холст увеличивает CSS без сглаживания).

const W = 160
const H = 110
const FLOOR = 96 // линия пола
const SHELF_H = 30 // высота нижней полки над полом
const BOX_W = 10
const BOX_H = 9

const C = {
  k: '#1b1f2e', // контур
  f: '#23363b', // стена
  b: '#3b4266', // разметка, панели
  s: '#7f909c', // сталь
  w: '#cfe3e6', // блики
  o: '#e0632e', // погрузчик
  y: '#f4d35e', // сигнальный жёлтый
  c: '#b9803f', // картон
  d: '#7a5129', // скотч, тень картона
  p: '#f0c9a0', // кожа
}

type Box = 'floor' | 'fork' | 'shelf'

/** Опорные кадры цикла: время, x погрузчика, высота вилки, где коробка на отрезке, начинающемся с кадра */
const KEYS: { t: number; x: number; h: number; box: Box }[] = [
  { t: 0, x: 0, h: 0, box: 'floor' },
  { t: 2, x: 21, h: 0, box: 'fork' }, // подъехал и взял коробку
  { t: 2.4, x: 21, h: 0, box: 'fork' },
  { t: 4.4, x: 63, h: 0, box: 'fork' },
  { t: 6.4, x: 63, h: 33, box: 'fork' }, // поднял на уровень полки
  { t: 7.6, x: 83, h: 33, box: 'fork' }, // заехал вилкой в стеллаж
  { t: 8.2, x: 83, h: SHELF_H, box: 'shelf' }, // коробка легла на полку
  { t: 8.7, x: 83, h: 27, box: 'shelf' },
  { t: 10, x: 63, h: 27, box: 'shelf' }, // отъехал
  { t: 11, x: 63, h: 27, box: 'shelf' },
  { t: 12.2, x: 83, h: 27, box: 'shelf' }, // снова заехал под коробку
  { t: 12.9, x: 83, h: 33, box: 'fork' }, // поднял её с полки
  { t: 14.1, x: 63, h: 33, box: 'fork' },
  { t: 15.9, x: 63, h: 0, box: 'fork' }, // опустил
  { t: 17.7, x: 21, h: 0, box: 'fork' },
  { t: 18.2, x: 21, h: 0, box: 'floor' }, // поставил на пол
  { t: 19.8, x: 0, h: 0, box: 'floor' },
]
const PERIOD = KEYS[KEYS.length - 1].t

const ease = (u: number) => u * u * (3 - 2 * u)

/** Состояние погрузчика в момент t (секунды) */
function pose(t: number) {
  const m = t % PERIOD
  let i = 0
  while (i < KEYS.length - 2 && m >= KEYS[i + 1].t) i++
  const a = KEYS[i]
  const b = KEYS[i + 1]
  const u = ease(Math.min(1, Math.max(0, (m - a.t) / (b.t - a.t))))
  return { x: Math.round(a.x + (b.x - a.x) * u), h: Math.round(a.h + (b.h - a.h) * u), box: a.box, moving: a.x !== b.x }
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
  /** Коробка: x слева, hb — высота дна над полом */
  const box = (x: number, hb: number) => {
    const y = FLOOR - hb - BOX_H
    rect(x - 1, y - 1, BOX_W + 2, BOX_H + 2, C.k)
    rect(x, y, BOX_W, BOX_H, C.c)
    rect(x, y, BOX_W, 1, C.y)
    rect(x + 4, y, 2, BOX_H, C.d)
    rect(x, y + BOX_H - 1, BOX_W, 1, C.d)
  }

  // стена: панели и верхняя полоса
  rect(0, 0, W, H, C.f)
  for (let x = 0; x < W; x += 20) rect(x, 0, 1, FLOOR, C.b)
  rect(0, 12, W, 1, C.b)

  // пол: жёлто-чёрная полоса, ниже плитка
  rect(0, FLOOR, W, H - FLOOR, C.k)
  for (let x = 0; x < W; x += 6) rect(x, FLOOR, 3, 3, C.y)
  for (let x = 8; x < W; x += 16) rect(x, FLOOR + 6, 6, 1, C.b)

  // место для коробки на полу: жёлтая рамка
  for (let x = 36; x < 52; x += 4) rect(x, FLOOR - 1, 2, 1, C.y)

  // стеллаж: стойки и полки на трёх уровнях
  const L = 96
  const R = 150
  for (const h of [SHELF_H, SHELF_H * 2]) rect(L, FLOOR - h, R - L + 2, 2, C.o)
  rect(L, FLOOR - 82, 2, 82, C.s)
  rect(R, FLOOR - 82, 2, 82, C.s)
  rect(L, FLOOR - 82, R - L + 2, 2, C.s)
  for (let h = 6; h < 80; h += 12) {
    rect(L, FLOOR - h, 2, 1, C.b)
    rect(R, FLOOR - h, 2, 1, C.b)
  }
  // нижняя полка — над самым полом, чтобы вилка не упиралась
  rect(L, FLOOR - 2, R - L + 2, 2, C.o)
  // остальные коробки на стеллаже
  box(114, SHELF_H)
  box(128, SHELF_H)
  box(102, SHELF_H * 2)
  box(118, SHELF_H * 2)
  box(136, SHELF_H * 2)
  box(104, 2)
  box(132, 2)
  box(142, 2)

  const p = pose(t)

  // коробка: на полу, на полке или на вилке
  if (p.box === 'floor') box(38, 0)
  else if (p.box === 'shelf' && p.h <= SHELF_H) box(100, SHELF_H)
  else box(p.x + 17, p.h)

  // погрузчик, смотрит вправо
  const x = p.x
  // мачта и каретка с вилкой
  rect(x + 15, FLOOR - 42, 3, 41, C.k)
  rect(x + 16, FLOOR - 41, 1, 39, C.s)
  rect(x + 17, FLOOR - p.h - 9, 2, 10, C.k)
  rect(x + 18, FLOOR - p.h - 1, 10, 2, C.k)
  rect(x + 18, FLOOR - p.h - 1, 9, 1, C.s)
  // кузов, противовес, капот
  rect(x - 1, FLOOR - 15, 18, 11, C.k)
  rect(x, FLOOR - 14, 16, 9, C.o)
  rect(x, FLOOR - 14, 16, 1, C.w)
  rect(x, FLOOR - 9, 16, 1, C.k)
  // кабина: стойки, крыша, водитель
  rect(x + 2, FLOOR - 28, 2, 14, C.k)
  rect(x + 11, FLOOR - 28, 2, 14, C.k)
  rect(x + 1, FLOOR - 30, 13, 2, C.k)
  rect(x + 5, FLOOR - 22, 5, 8, C.b) // сиденье
  rect(x + 6, FLOOR - 22, 3, 6, C.w) // куртка
  disc(x + 7, FLOOR - 24, 2, C.p)
  rect(x + 5, FLOOR - 27, 5, 2, C.y) // каска
  // мигалка на крыше
  rect(x + 7, FLOOR - 33, 2, 3, Math.floor(t * 3) % 2 ? C.y : C.o)
  // колёса: ступица крутится, пока едем
  const spin = p.moving ? Math.floor(t * 12) % 4 : 0
  for (const wx of [x + 4, x + 12]) {
    disc(wx, FLOOR - 3, 3, C.k)
    const [dx, dy] = [[0, -1], [1, 0], [0, 1], [-1, 0]][spin]
    rect(wx + dx, FLOOR - 3 + dy, 1, 1, C.s)
  }
}

export function WarehouseArt() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    // Для тех, кто просит поменьше движения: один кадр
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      draw(ctx, 7.8)
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
