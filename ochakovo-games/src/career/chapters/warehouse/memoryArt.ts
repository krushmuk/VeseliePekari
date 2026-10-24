import type Phaser from 'phaser'
import { MEMORY } from './memoryRules'
import { C, FLOOR_Y, paintTag, shade } from './art'

// Графика уровня «Сверка»: стеллаж 5×5 и закрытые картонные коробки с наклейкой-кодом.
// Целые пиксели поля, как и в остальной графике склада.

type G = Phaser.GameObjects.Graphics

/** Размер коробки и расстановка: колонки и ярусы, пиксели поля */
export const SHELF = { x0: 10, x1: 140, top: 34, pitchX: 26, pitchY: 44, board: 4, boxW: 22, boxH: 28 }

/** Левый верхний угол коробки в ряду row, колонке col */
export const boxPos = (row: number, col: number) => ({
  x: SHELF.x0 + col * SHELF.pitchX + (SHELF.pitchX - SHELF.boxW) / 2,
  y: SHELF.top + (row + 1) * SHELF.pitchY - SHELF.board - SHELF.boxH,
})

/** Стеллаж на фоне стены: ниша, доски ярусов, две стойки до пола и верхняя балка */
export function drawShelf(g: G) {
  const { x0, x1, top, pitchY, board } = SHELF
  const bottom = FLOOR_Y
  const post = 4
  g.fillStyle(C.niche)
  g.fillRect(x0, top, x1 - x0, bottom - top)
  g.fillStyle(C.woodDark, 0.5)
  for (let x = x0; x < x1; x += 13) g.fillRect(x, top, 1, bottom - top)

  for (let i = 1; i <= MEMORY.tiers; i++) {
    const y = top + i * pitchY - board
    g.fillStyle(C.wood)
    g.fillRect(x0 - post, y, x1 - x0 + post * 2, board)
    g.fillStyle(C.woodShine)
    g.fillRect(x0 - post, y, x1 - x0 + post * 2, 1)
    g.fillStyle(C.woodDark)
    g.fillRect(x0 - post, y + board - 1, x1 - x0 + post * 2, 1)
  }
  for (const x of [x0 - post, x1]) {
    g.fillStyle(C.woodLight)
    g.fillRect(x, top - 4, post, bottom - top + 4)
    g.fillStyle(C.woodShine)
    g.fillRect(x, top - 4, 1, bottom - top + 4)
    g.fillStyle(C.woodDark)
    g.fillRect(x + post - 1, top - 4, 1, bottom - top + 4)
  }
  g.fillStyle(C.wood)
  g.fillRect(x0 - post, top - 4, x1 - x0 + post * 2, 4)
  g.fillStyle(C.woodShine)
  g.fillRect(x0 - post, top - 4, x1 - x0 + post * 2, 1)
  g.fillStyle(C.woodDark)
  g.fillRect(x0 - post, top - 1, x1 - x0 + post * 2, 1)
  // Тень от стеллажа на полу
  g.fillStyle(0x000000, 0.25)
  g.fillRect(x0 - post, FLOOR_Y + 1, x1 - x0 + post * 2, 3)
}

/**
 * Коробка 22×28 в (0, 0) графики: картон, кромки, полоса скотча на крышке и наклейка.
 * Закрытая — со штрихкодом на наклейке (bars: столбики по пикселю, true — чёрный), открытая — с жёлтой рамкой
 * и наклейкой под код. Возвращает центр текста на наклейке.
 */
export function paintMemoryBox(g: G, color: number, chars: number, open: boolean, bars: boolean[]) {
  const { boxW: w, boxH: h } = SHELF
  g.clear()
  g.fillStyle(color)
  g.fillRect(0, 0, w, h)
  g.fillStyle(shade(color, 0.3))
  g.fillRect(1, 1, w - 2, 1)
  g.fillRect(1, 1, 1, h - 2)
  g.fillStyle(shade(color, -0.25))
  g.fillRect(1, h - 3, w - 2, 2)
  g.fillRect(w - 2, 1, 1, h - 2)
  // Крышка: шов и скотч по центру
  g.fillStyle(C.dark, 0.2)
  g.fillRect(1, 7, w - 2, 1)
  g.fillStyle(shade(color, 0.45), 0.8)
  g.fillRect(w / 2 - 2, 1, 4, 7)
  g.fillStyle(C.dark)
  g.fillRect(0, 0, w, 1)
  g.fillRect(0, h - 1, w, 1)
  g.fillRect(0, 0, 1, h)
  g.fillRect(w - 1, 0, 1, h)
  if (open) {
    g.lineStyle(1, C.yellow)
    g.strokeRect(-0.5, -0.5, w + 1, h + 1)
  }
  if (open) return paintTag(g, w / 2, 18, w, 7, chars, false)
  // Штрихкод: светлая наклейка и чёрные полосы разной ширины
  const x = Math.round((w - bars.length) / 2)
  g.fillStyle(C.dark, 0.35)
  g.fillRect(x - 2, 14, bars.length + 4, 11)
  g.fillStyle(C.paper)
  g.fillRect(x - 2, 13, bars.length + 4, 11)
  g.fillStyle(C.dark)
  bars.forEach((on, i) => on && g.fillRect(x + i, 15, 1, 7))
  return { x: w / 2, y: 18 }
}

/** Случайный штрихкод ширины 14: крайние полосы чёрные, внутри полосы по 1–2 пикселя */
export function randomBars() {
  const bars: boolean[] = []
  while (bars.length < 14) {
    const on = bars.length % 2 === 0
    const width = 1 + Math.floor(Math.random() * 2)
    for (let i = 0; i < width && bars.length < 14; i++) bars.push(on)
  }
  bars[13] = true
  return bars
}
