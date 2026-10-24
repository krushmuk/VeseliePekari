import type Phaser from 'phaser'
import { CART, FIELD, RACK } from './config'
import type { Cell } from './rules'

// Графика главы «Склад»: стена и пол, деревянный стеллаж, тележка и коробки.
// Палитра взята из кладовой пролога (screens/StorageArt.tsx), чтобы склад выглядел знакомо.
// Всё рисуется целыми пикселями поля — камера увеличивает его целым числом раз.

type G = Phaser.GameObjects.Graphics

export const C = {
  dark: 0x1a110a,
  wall: 0x8a8174,
  wallDark: 0x6f675c,
  wallLight: 0xa39a8a,
  niche: 0x2a1c12,
  wood: 0x8b5a2b,
  woodLight: 0xb07a3e,
  woodShine: 0xd09a58,
  woodDark: 0x5a3517,
  floor: 0x4d463c,
  floorDark: 0x3a352d,
  floorLight: 0x5e564a,
  steel: 0x7f909c,
  steelLight: 0xc9d3d6,
  steelDark: 0x4f5d6a,
  yellow: 0xe0b83e,
  paper: 0xf1ece0,
  red: 0xcd004b,
}

/** Детерминированный «случайный» ряд: потёртости не должны меняться между запусками */
const hash = (a: number, b: number) => {
  const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return n - Math.floor(n)
}

/** Крапинки 1×1 по области: каждая клетка с вероятностью density получает пятнышко цвета color */
function specks(g: G, x: number, y: number, w: number, h: number, color: number, alpha: number, density: number, seed: number) {
  g.fillStyle(color, alpha)
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (hash(x + i + seed, y + j) < density) g.fillRect(x + i, y + j, 1, 1)
}

/** Короткие горизонтальные (или вертикальные) штрихи — волокна дерева и царапины */
function strokes(g: G, x: number, y: number, w: number, h: number, color: number, alpha: number, count: number, len: number, vertical: boolean, seed: number) {
  g.fillStyle(color, alpha)
  for (let i = 0; i < count; i++) {
    const px = x + Math.floor(hash(i + seed, 1) * w)
    const py = y + Math.floor(hash(i + seed, 2) * h)
    const l = 2 + Math.floor(hash(i + seed, 3) * len)
    if (vertical) g.fillRect(px, py, 1, Math.min(l, y + h - py))
    else g.fillRect(px, py, Math.min(l, x + w - px), 1)
  }
}

/** Светлее (t > 0) или темнее (t < 0) на долю пути к белому / чёрному */
export const shade = (color: number, t: number) => {
  const to = t > 0 ? 255 : 0
  const ch = (shift: number) => {
    const v = (color >> shift) & 255
    return Math.round(v + (to - v) * Math.abs(t))
  }
  return (ch(16) << 16) | (ch(8) << 8) | ch(0)
}

/** Уровень пола: низ колёс тележки */
export const FLOOR_Y = CART.wheelY + CART.wheelR

const AREA = { x: -300, y: -140, w: FIELD.w + 600 }

/** Фон: ровная стена, простой пол и стеллаж. Выходит за поле — на других экранах видно продолжение */
export function drawBackdrop(g: G) {
  wall(g)
  floor(g)
  rack(g)
}

function wall(g: G) {
  g.fillStyle(C.wall)
  g.fillRect(AREA.x, AREA.y, AREA.w, FLOOR_Y - AREA.y)
}

function floor(g: G) {
  g.fillStyle(C.floor)
  g.fillRect(AREA.x, FLOOR_Y, AREA.w, 400)
  g.fillStyle(C.dark)
  g.fillRect(AREA.x, FLOOR_Y, AREA.w, 1)
  g.fillStyle(C.floorLight)
}

/** Стеллаж: тёмная ниша, доски ярусов (коробки стоят на досках), две стойки до пола и верхняя балка */
function rack(g: G) {
  const { x0, x1, top, boardY, board } = RACK
  const bottom = boardY[boardY.length - 1] + board + 6
  const post = 4

  // Ниша между стойками: задняя стенка из вертикальных досок разного тона, без чёрных полос
  const inner = x1 - x0 + 4
  g.fillStyle(C.niche)
  g.fillRect(x0 - 2, top, inner, bottom - top)
  for (let x = x0 - 2, i = 0; x < x1 + 2; x += 14, i++) {
    const w = Math.min(14, x1 + 2 - x)
    g.fillStyle(i % 2 ? 0x34241a : 0x302016)
    g.fillRect(x, top, w, bottom - top)
    g.fillStyle(C.woodDark, 0.5)
    g.fillRect(x, top, 1, bottom - top)
  }
  specks(g, x0 - 2, top, inner, bottom - top, C.woodDark, 0.4, 0.012, 3)
  strokes(g, x0 - 2, top, inner, bottom - top, 0x45301f, 0.6, 10, 4, true, 11)

  // Доски: светлая кромка сверху, тёмная снизу, торец у стоек
  for (const y of boardY) {
    g.fillStyle(C.woodLight)
    g.fillRect(x0 - 2, y, x1 - x0 + 4, board)
    g.fillStyle(C.woodShine)
    g.fillRect(x0 - 2, y, x1 - x0 + 4, 1)
    g.fillStyle(C.woodDark)
    g.fillRect(x0 - 2, y + board - 1, x1 - x0 + 4, 1)
    strokes(g, x0 - 2, y + 1, x1 - x0 + 4, board - 2, C.woodDark, 0.4, 3, 7, false, y)
    strokes(g, x0 - 2, y + 1, x1 - x0 + 4, board - 2, C.woodShine, 0.35, 2, 5, false, y + 40)
  }

  // Нижняя рейка рамы
  g.fillStyle(C.wood)
  g.fillRect(x0 - 2, bottom - 3, x1 - x0 + 4, 3)
  g.fillStyle(C.woodDark)
  g.fillRect(x0 - 2, bottom - 1, x1 - x0 + 4, 1)

  // Стойки идут до пола; справа от тележки ручка заканчивается раньше стойки
  for (const x of [x0 - 2 - post, x1 + 2]) {
    g.fillStyle(C.wood)
    g.fillRect(x, top - 4, post, FLOOR_Y - top + 4)
    g.fillStyle(C.woodLight)
    g.fillRect(x, top - 4, 1, FLOOR_Y - top + 4)
    g.fillStyle(C.woodDark)
    g.fillRect(x + post - 1, top - 4, 1, FLOOR_Y - top + 4)
    strokes(g, x + 1, top - 4, post - 2, FLOOR_Y - top + 4, C.woodDark, 0.4, 5, 8, true, x)
    strokes(g, x + 1, top - 4, post - 2, FLOOR_Y - top + 4, C.woodShine, 0.3, 2, 5, true, x + 70)
    specks(g, x, top - 4, post, FLOOR_Y - top + 4, C.dark, 0.25, 0.01, x)
    // Подпятник
    g.fillStyle(C.dark)
    g.fillRect(x - 1, FLOOR_Y - 3, post + 2, 3)
  }

  // Верхняя балка
  g.fillStyle(C.wood)
  g.fillRect(x0 - 2 - post, top - 4, x1 - x0 + 4 + post * 2, 4)
  g.fillStyle(C.woodShine)
  g.fillRect(x0 - 2 - post, top - 4, x1 - x0 + 4 + post * 2, 1)
  g.fillStyle(C.woodDark)
  g.fillRect(x0 - 2 - post, top - 1, x1 - x0 + 4 + post * 2, 1)

  // Бирки ярусов на стойке: жёлтые пластинки
  for (const y of boardY) {
    g.fillStyle(C.yellow)
    g.fillRect(x0 - 2 - post + 1, y - 6, 2, 5)
    g.fillRect(x1 + 3, y - 6, 2, 5)
  }
}

/** Тележка сбоку: стальная палуба с бортиком, ручка с рукоятью справа, колёса на кронштейнах */
export function drawCart(g: G) {
  const { x0, x1, deckY, deckH, wheelY, wheelR, wheelX } = CART

  // Тень под тележкой
  g.fillStyle(C.dark, 0.35)
  g.fillRect(CART.x0 + 4, FLOOR_Y - 1, CART.x1 - CART.x0 - 8, 3)

  // Ручка
  g.fillStyle(C.dark)
  g.fillRect(x1 - 1, deckY - 51, 5, 51 + deckH)
  g.fillRect(x1 - 1, deckY - 51, 16, 5)
  g.fillStyle(C.steel)
  g.fillRect(x1, deckY - 50, 3, 50 + deckH)
  g.fillStyle(C.steelLight)
  g.fillRect(x1, deckY - 50, 1, 50)
  g.fillStyle(C.steel)
  g.fillRect(x1, deckY - 50, 14, 3)
  g.fillStyle(C.red)
  g.fillRect(x1 + 5, deckY - 51, 9, 5)
  g.fillStyle(shade(C.red, 0.3))
  g.fillRect(x1 + 5, deckY - 50, 9, 1)

  specks(g, x1, deckY - 50, 3, 50, C.dark, 0.35, 0.04, 17)
  strokes(g, x1, deckY - 50, 3, 50, 0x8a4a22, 0.6, 1, 3, true, 41)

  // Колёса: кронштейн от палубы, шина, ступица
  for (const x of wheelX) {
    g.fillStyle(C.dark)
    g.fillRect(x - 3, deckY + deckH, 6, wheelY - deckY - deckH)
    g.fillStyle(C.steelDark)
    g.fillRect(x - 2, deckY + deckH, 4, wheelY - deckY - deckH - 2)
    g.fillStyle(C.dark)
    g.fillCircle(x, wheelY, wheelR)
    g.fillStyle(0x2d2a27)
    g.fillCircle(x, wheelY, wheelR - 1.5)
    g.fillStyle(C.steel)
    g.fillCircle(x, wheelY, 2.5)
    g.fillStyle(C.steelLight)
    g.fillRect(x - 1, wheelY - 1, 1, 1)
  }

  // Палуба
  g.fillStyle(C.dark)
  g.fillRect(x0 - 1, deckY - 1, x1 - x0 + 2, deckH + 2)
  g.fillStyle(C.steel)
  g.fillRect(x0, deckY, x1 - x0, deckH)
  g.fillStyle(C.steelLight)
  g.fillRect(x0, deckY, x1 - x0, 1)
  g.fillStyle(C.steelDark)
  g.fillRect(x0, deckY + deckH - 2, x1 - x0, 2)
  // Потёртости: пятна ржавчины, царапины, вмятина, облупившаяся краска
  specks(g, x0, deckY + 1, x1 - x0, deckH - 2, 0x8a4a22, 0.5, 0.015, 21)
  specks(g, x0, deckY + 1, x1 - x0, deckH - 2, C.dark, 0.25, 0.015, 5)
  specks(g, x0, deckY + 1, x1 - x0, 1, C.steelDark, 0.8, 0.03, 9)
  strokes(g, x0 + 2, deckY + 1, x1 - x0 - 4, deckH - 3, C.steelLight, 0.4, 3, 6, false, 33)
  // Заклёпки по передней кромке
  g.fillStyle(C.steelDark)
  for (let x = x0 + 6; x < x1 - 4; x += 12) g.fillRect(x, deckY + 3, 1, 1)
  // Жёлтая предупреждающая полоса на торце
  g.fillStyle(C.yellow)
  g.fillRect(x0, deckY + 1, 3, deckH - 3)
}

// ---------- Коробки ----------

/**
 * Коробка из клеток размера s: картон, светлая кромка сверху и слева, тень снизу и справа,
 * тёмный контур по внешней границе (между соседними коробками в сетке он их и разделяет).
 * Подробности (шов крышки, швы клеток) — только на крупных клетках в сетке и в руке.
 */
export function paintBox(g: G, cells: Cell[], s: number, color: number) {
  const has = (r: number, c: number) => cells.some(([cr, cc]) => cr === r && cc === c)
  const light = shade(color, 0.3)
  const dark = shade(color, -0.25)
  const big = s >= 14

  for (const [r, c] of cells) {
    g.fillStyle(color)
    g.fillRect(c * s, r * s, s, s)
  }
  for (const [r, c] of cells) {
    const x = c * s
    const y = r * s
    const top = !has(r - 1, c)
    const bottom = !has(r + 1, c)
    const left = !has(r, c - 1)
    const right = !has(r, c + 1)
    if (top) {
      g.fillStyle(light)
      g.fillRect(x + 1, y + 1, s - 2, 1)
    }
    if (left) {
      g.fillStyle(light)
      g.fillRect(x + 1, y + 1, 1, s - 2)
    }
    if (bottom) {
      g.fillStyle(dark)
      g.fillRect(x + 1, y + s - 2, s - 2, big ? 2 : 1)
    }
    if (right) {
      g.fillStyle(dark)
      g.fillRect(x + s - 2, y + 1, 1, s - 2)
    }
    if (big) {
      // Шов крышки под верхней кромкой и едва заметные швы между клетками
      if (top) {
        g.fillStyle(C.dark, 0.2)
        g.fillRect(x + 1, y + 4, s - 2, 1)
      }
      g.fillStyle(C.dark, 0.1)
      if (!right) g.fillRect(x + s - 1, y + 1, 1, s - 1)
      if (!bottom) g.fillRect(x + 1, y + s - 1, s - 1, 1)
    }
  }
  g.fillStyle(C.dark)
  for (const [r, c] of cells) {
    const x = c * s
    const y = r * s
    if (!has(r - 1, c)) g.fillRect(x, y, s, 1)
    if (!has(r + 1, c)) g.fillRect(x, y + s - 1, s, 1)
    if (!has(r, c - 1)) g.fillRect(x, y, 1, s)
    if (!has(r, c + 1)) g.fillRect(x + s - 1, y, 1, s)
  }
}

/** Бокал из белых пикселей, левый верхний угол в (x, y): чаша, ножка и основание, 7 × 6 */
function glass(g: G, x: number, y: number) {
  g.fillStyle(0xffffff)
  ;[7, 5, 3, 1].forEach((w, i) => g.fillRect(x + (7 - w) / 2, y + i, w, 1))
  g.fillRect(x + 3, y + 4, 1, 1)
  g.fillRect(x + 1, y + 5, 5, 1)
}

/**
 * Наклейка с номером по центру (cx, cy). Обычная — светлая; у хрупкой коробки красная
 * и (на крупных клетках) с бокалом над номером. Размер считается от шрифта в сетке не больше клетки, на полке может выступать за коробку.
 * Возвращает центр текста номера.
 */
export function paintTag(g: G, cx: number, cy: number, s: number, font: number, chars: number, fragile: boolean) {
  const wide = Math.ceil(chars * font * 0.6) + 2
  const w = s >= 14 ? Math.min(s - 2, wide) : wide
  const h = font + 2
  const withGlass = fragile && s >= 14
  const total = withGlass ? h + 8 : h
  const left = Math.round(cx - w / 2)
  const top = Math.round(cy - total / 2)
  g.fillStyle(C.dark, 0.35)
  g.fillRect(left, top + 1, w, total)
  g.fillStyle(fragile ? C.red : C.paper)
  g.fillRect(left, top, w, total)
  if (withGlass) glass(g, left + Math.floor((w - 7) / 2), top + 1)
  return { x: left + w / 2, y: top + total - h / 2 }
}

/** Цвета картона: у каждой коробки свой, как в кладовой пролога */
export const BOX_COLORS = [0xc9a45c, 0x7a9a5a, 0xa85a4a, 0xd9d2c2, 0x7a95b0, 0xc98a4a, 0x8f7ab0, 0x6aa59a]
