import { useEffect, useRef } from 'react'

// Пиксельная картинка главы «Лаборант» на светлом фоне: лабораторный стол с колбами, где идут реакции
// (бродит квас, капли из бюретки перекрашивают раствор), кружка кваса и яблоки. Объектов мало, они крупные.
// Рисуется на маленьком холсте целыми пикселями (холст увеличивает CSS без сглаживания).

const W = 100
const H = 74
const BENCH = 60 // столешница

type RGB = [number, number, number]

const C = {
  wall: '#cfdce2',
  tile: '#b6c7cf',
  top: '#8fa3ad', // столешница
  topLight: '#c4d3da',
  front: '#6f848f',
  frontDark: '#53676f',
  edge: '#2b5266', // стекло, контур
  glass: '#dcebf0',
  shine: 'rgba(255,255,255,0.95)',
  bubble: 'rgba(255,255,255,0.9)',
  ink: '#2b3236',
  wood: '#8f6234',
  woodDark: '#63401f',
  foam: '#f8efd6',
  foamDark: '#ead9a8',
  steel: '#5f717b',
  stem: '#6b4423',
  leaf: '#4f9a45',
}

const KVASS: RGB = [176, 98, 28]
const KVASS_DARK: RGB = [122, 64, 14]
const LILAC: RGB = [180, 140, 224]
const RED: RGB = [205, 0, 75]

const ease = (u: number) => u * u * (3 - 2 * u)
const clamp01 = (u: number) => Math.min(1, Math.max(0, u))

/** Смесь двух цветов; доля округляется до шести ступеней, чтобы цвет менялся «пиксельно» */
function mix(a: RGB, b: RGB, u: number, white = 0): string {
  const q = Math.round(clamp01(u) * 6) / 6
  const ch = (i: number) => Math.round((a[i] + (b[i] - a[i]) * q) * (1 - white) + 255 * white)
  return `rgb(${ch(0)},${ch(1)},${ch(2)})`
}
const rgb = (c: RGB) => mix(c, c, 0)

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

  /**
   * Сосуд, симметричный относительно cx: hw(r) — полуширина строки r сверху.
   * Выше liquidTop — стекло, ниже — жидкость. Возвращает верхнюю строку жидкости.
   */
  const vessel = (cx: number, top: number, h: number, hw: (r: number) => number, liquidTop: number, liquid: string) => {
    for (let r = 0; r < h; r++) {
      const w = hw(r)
      const prev = r === 0 ? -1 : hw(r - 1)
      const next = r === h - 1 ? -1 : hw(r + 1)
      const y = top + r
      for (let x = -w; x <= w; x++) {
        const ax = Math.abs(x)
        const edge = ax === w || ax > prev || ax > next
        ctx.fillStyle = edge ? C.edge : y >= liquidTop ? liquid : C.glass
        ctx.fillRect(cx + x, y, 1, 1)
      }
    }
    // блик слева вдоль стенки
    for (let r = 3; r < h - 3; r++) {
      const w = hw(r)
      if (w >= 4) rect(cx - w + 2, top + r, 1, 1, C.shine)
    }
  }

  /** Пузырьки поднимаются между x0 и x1 от yBottom до yTop */
  const bubbles = (x0: number, x1: number, yBottom: number, yTop: number, n: number, speed: number, seed: number) => {
    for (let i = 0; i < n; i++) {
      const ph = (t * speed + i / n + seed * 0.37) % 1
      const y = Math.round(yBottom - ph * (yBottom - yTop))
      const x = x0 + ((i * 5 + seed * 3) % (x1 - x0 + 1)) + (Math.floor(ph * 8 + i) % 3 === 0 ? 1 : 0)
      const big = (i + seed) % 3 === 0
      rect(Math.min(x, x1), y, big ? 2 : 1, big ? 2 : 1, C.bubble)
    }
  }

  /** Яблоко: x — левый край, base — линия опоры, glint — 0..1 вспышка блика */
  const apple = (x: number, base: number, body: string, dark: string, glint = 0) => {
    disc(x + 4, base - 4, 4, dark)
    disc(x + 4, base - 5, 3, body)
    rect(x + 2, base - 7, 2, 2, 'rgba(255,255,255,0.55)')
    rect(x + 4, base - 10, 1, 2, C.stem)
    rect(x + 5, base - 10, 2, 1, C.leaf)
    if (glint > 0) {
      const gx = x + 2
      const gy = base - 7
      rect(gx, gy, 1, 1, '#ffffff')
      if (glint > 0.4) {
        rect(gx - 1, gy, 3, 1, '#ffffff')
        rect(gx, gy - 1, 1, 3, '#ffffff')
      }
    }
  }
  const RED_A = ['#c9352f', '#8a1f22']
  const GREEN_A = ['#7fb23a', '#4a7a22']

  /** Вспышка блика у одного из яблок по очереди: 0..1 */
  const glintOf = (k: number) => {
    const m = (t / 1.1) % 6
    const u = m - k * 2
    return u >= 0 && u < 1 ? Math.sin(u * Math.PI) : 0
  }

  /** Стакан (кружка) кваса: x — центр, base — дно */
  const mug = (cx: number, base: number, h: number, seed: number) => {
    const top = base - h + 1
    const liquidTop = top + 4
    vessel(cx, top, h, () => 5, liquidTop, rgb(KVASS))
    // тёмная толща к дну
    rect(cx - 4, base - 3, 9, 3, rgb(KVASS_DARK))
    // пена с шапкой, которая чуть дышит
    const lift = Math.floor(t * 1.5 + seed) % 2
    for (let x = -4; x <= 4; x++) {
      const bump = (x + seed + Math.floor(t * 2)) % 3 === 0 ? 1 : 0
      rect(cx + x, liquidTop - 2 - bump - lift, 1, 2 + bump + lift, C.foam)
    }
    rect(cx - 4, liquidTop, 9, 1, C.foamDark)
    bubbles(cx - 3, cx + 3, base - 2, liquidTop + 1, 5, 0.5, seed)
    // ручка
    rect(cx + 6, top + 3, 3, 1, C.edge)
    rect(cx + 8, top + 3, 1, h - 8, C.edge)
    rect(cx + 6, top + h - 6, 3, 1, C.edge)
  }

  // ---------- стена ----------
  rect(0, 0, W, BENCH, C.wall)
  for (let x = 0; x < W; x += 20) rect(x, 0, 1, BENCH, C.tile)
  for (let y = 8; y < BENCH; y += 16) rect(0, y, W, 1, C.tile)

  // ---------- стол ----------
  rect(0, BENCH, W, 4, C.top)
  rect(0, BENCH, W, 1, C.topLight)
  rect(0, BENCH + 4, W, H - BENCH - 4, C.front)
  rect(0, BENCH + 4, W, 1, C.frontDark)
  for (const x of [0, 34, 67]) {
    rect(x + 3, BENCH + 6, 30, 7, C.frontDark)
    rect(x + 4, BENCH + 7, 28, 5, C.front)
    rect(x + 16, BENCH + 9, 4, 1, C.steel)
  }

  // ---------- колба 1: бродит квас ----------
  {
    const cx = 17
    const top = BENCH - 34
    const liquidTop = top + 26
    const hw = (r: number) => (r < 10 ? 3 : 3 + Math.round(((r - 10) / 23) * 9))
    vessel(cx, top, 34, hw, liquidTop, rgb(KVASS))
    rect(cx - 9, BENCH - 3, 19, 2, rgb(KVASS_DARK))
    // пена у поверхности колышется
    const w = hw(26)
    for (let x = -w + 1; x <= w - 1; x++) {
      if ((x + Math.floor(t * 3)) % 3 !== 0) rect(cx + x, liquidTop - 1, 1, 2, C.foam)
    }
    bubbles(cx - 8, cx + 8, BENCH - 3, liquidTop + 1, 9, 0.7, 3)
    // пар над горлышком
    bubbles(cx - 1, cx + 1, top - 2, top - 14, 3, 0.35, 5)
    rect(cx - 4, top - 1, 9, 2, C.edge) // пробка-ободок
  }

  // ---------- колба 2: капли из бюретки меняют цвет ----------
  {
    const PERIOD = 3
    const k = Math.floor(t / PERIOD)
    const p = (t % PERIOD) / PERIOD
    const cols = [LILAC, RED]
    const from = cols[k % 2]
    const to = cols[(k + 1) % 2]
    const react = clamp01((p - 0.72) / 0.28) // 0..1: идёт реакция после падения капли
    const u = ease(react)
    const liquid = mix(from, to, u, Math.sin(react * Math.PI) * 0.35)
    const cx = 44
    const top = BENCH - 34
    const liquidTop = top + 21
    const hw = (r: number) => {
      if (r < 11) return 3
      return Math.max(3, Math.round(Math.sqrt(11.5 * 11.5 - (r - 22) * (r - 22))))
    }
    vessel(cx, top, 34, hw, liquidTop, liquid)
    // рябь после капли
    if (react > 0 && react < 0.7) {
      rect(cx - 2, liquidTop, 5, 1, mix(from, to, u, 0.6))
      rect(cx - 3 - Math.floor(react * 6), liquidTop, 1, 1, C.bubble)
      rect(cx + 3 + Math.floor(react * 6), liquidTop, 1, 1, C.bubble)
    }
    // пузырьки во время реакции
    if (react > 0) bubbles(cx - 8, cx + 8, BENCH - 3, liquidTop + 1, 6, 1.2, 7)
    // пробка с трубкой для бюретки
    rect(cx - 4, top - 1, 9, 2, C.edge)

    // бюретка над колбой: трубка, шкала, кран и носик
    const bt = 5
    rect(cx - 2, bt, 5, top - 12 - bt, C.edge)
    rect(cx - 1, bt, 3, top - 12 - bt, C.glass)
    rect(cx, bt + 1, 1, top - 14 - bt, mix(LILAC, LILAC, 0, 0.35))
    for (let y = bt + 4; y < top - 16; y += 4) rect(cx - 2, y, 2, 1, C.ink)
    rect(cx - 3, top - 12, 7, 2, C.steel) // кран
    rect(cx, top - 10, 1, 4, C.edge) // носик
    // капля: набухает на носике, падает, исчезает в колбе
    const tipY = top - 6
    if (p < 0.45) rect(cx, tipY, 1, p > 0.25 ? 2 : 1, rgb(LILAC))
    else if (p < 0.72) {
      const y = Math.round(tipY + ((p - 0.45) / 0.27) ** 2 * (liquidTop - tipY - 1))
      rect(cx, y, 1, 2, rgb(LILAC))
    }
    // штатив: стойка и держатель
    rect(59, 5, 2, BENCH - 5, C.steel)
    rect(53, BENCH - 3, 14, 3, C.steel)
    rect(cx + 3, 14, 59 - cx - 3, 2, C.steel)
    rect(cx + 2, 12, 2, 6, C.ink)
  }

  // ---------- кружка кваса и горка яблок на столе ----------
  mug(73, BENCH, 16, 4)
  apple(83, BENCH, RED_A[0], RED_A[1], glintOf(0))
  apple(91, BENCH, GREEN_A[0], GREEN_A[1], glintOf(1))
  apple(87, BENCH - 7, RED_A[0], RED_A[1], glintOf(2))
}

export function LabArt() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    // Для тех, кто просит поменьше движения: один кадр
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      draw(ctx, 2.2)
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
