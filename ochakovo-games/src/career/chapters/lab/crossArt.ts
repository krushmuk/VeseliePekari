import type Phaser from 'phaser'
import { MACHINE, ORDER_NOTE, TAG } from './config'
import { drawText, shade, textWidth } from './art'

// Графика уровня «Скрещивание»: яблоки, бирки, машина с двумя чашами и нишей для результата.
// Как и в art.ts, всё рисуется целыми пикселями; стена и стол — drawBackdrop из art.ts.

type G = Phaser.GameObjects.Graphics

const APPLE = [
  '.....s.lll..',
  '.....s.ll...',
  '..bbbbsbbb..',
  '.bhhbbbbbbd.',
  '.bhbbbbbbbd.',
  'bbbbbbbbbbdd',
  'bbbbbbbbbbdd',
  'bbbbbbbbbbdd',
  '.bbbbbbbbbd.',
  '.bbbbbbbbdd.',
  '..bbbbbbdd..',
  '...bbddd....',
]
const APPLE_BIG = [
  '.......s..lll...',
  '.......s.llll...',
  '....bbbbsbbbb...',
  '..bbbbbbbbbbbbd.',
  '.bhhbbbbbbbbbbdd',
  '.bhbbbbbbbbbbbdd',
  'bbbbbbbbbbbbbbdd',
  'bbbbbbbbbbbbbbdd',
  'bbbbbbbbbbbbbbdd',
  'bbbbbbbbbbbbbbdd',
  '.bbbbbbbbbbbbddd',
  '.bbbbbbbbbbbbdd.',
  '..bbbbbbbbbbdd..',
  '...bbbbbbbddd...',
  '....bbbbdddd....',
  '......dddd......',
]

const lerp = (a: number, b: number, t: number) => {
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t)
  return (ch(16) << 16) | (ch(8) << 8) | ch(0)
}

/** Цвет яблока по доле кислинки: сладкое — красное, сбалансированное — жёлтое, кислое — зелёное */
export function appleColor(sweet: number, sour: number) {
  const t = sour / (sweet + sour)
  return t < 0.5 ? lerp(0xd8312f, 0xe8c93a, t * 2) : lerp(0xe8c93a, 0x6cc04a, (t - 0.5) * 2)
}

/** Яблоко 12×12 (16×16 с big) с центром в (cx, cy) */
export function drawApple(g: G, cx: number, cy: number, color: number, dim = false, big = false): G {
  const rows = big ? APPLE_BIG : APPLE
  const x0 = cx - rows[0].length / 2
  const y0 = cy - rows.length / 2
  const palette: Record<string, number> = {
    b: color, d: shade(color, -0.3), h: shade(color, 0.45), s: 0x5a3517, l: 0x4d9c3c,
  }
  rows.forEach((row, j) =>
    [...row].forEach((c, i) => {
      if (c === '.') return
      g.fillStyle(palette[c], dim ? 0.55 : 1)
      g.fillRect(x0 + i, y0 + j, 1, 1)
    }),
  )
  return g
}

const INK = 0x2b3236

const centered = (g: G, text: string, cx: number, y: number, color: number) =>
  drawText(g, text, Math.round(cx - textWidth(text) / 2), y, color)

/** Бумажная бирка под яблоком на столе: тень, светлый лист и красная полоска сверху; текст пишет сцена */
export function drawTag(g: G, cx: number, top: number) {
  const x = cx - TAG.w / 2
  g.fillStyle(0x7e929b, 0.5)
  g.fillRect(x + 1, top + TAG.h, TAG.w, 1)
  g.fillStyle(0x8a9296)
  g.fillRect(x, top, TAG.w, TAG.h)
  g.fillStyle(0xf6f3ea)
  g.fillRect(x + 1, top + 1, TAG.w - 2, TAG.h - 2)
  g.fillStyle(0xcd004b)
  g.fillRect(x, top, TAG.w, 1)
}

/** Листок с заказом, как в главе «Склад»: тень, светлый лист, загнутый уголок и красное поле слева; текст пишет сцена */
export function drawNote(g: G) {
  const { x, y, w, h } = ORDER_NOTE
  g.fillStyle(0x000000, 0.3)
  g.fillRect(x + 1, y + 1, w, h)
  g.fillStyle(0xf1ece0)
  g.fillRect(x, y, w, h)
  g.fillStyle(0xc9c2b0)
  g.fillRect(x, y + h - 1, w, 1)
  g.fillStyle(0x8a8174)
  g.fillTriangle(x + w - 5, y, x + w, y, x + w, y + 5)
  g.fillStyle(0xa89f8a)
  g.fillTriangle(x + w - 5, y, x + w - 5, y + 5, x + w, y + 5)
  g.fillStyle(0xcd004b)
  g.fillRect(x + 3, y + 3, 1, h - 6)
}

export const statsText = (sweet: number, sour: number) => `С${String(sweet).replace('.', ',')} К${String(sour).replace('.', ',')}`

/** Грустный смайлик 7×7 */
export function drawSad(g: G, x: number, y: number) {
  g.fillStyle(0xffd24a)
  g.fillRect(x + 1, y, 5, 7)
  g.fillRect(x, y + 1, 7, 5)
  g.fillStyle(INK)
  g.fillRect(x + 2, y + 2, 1, 1)
  g.fillRect(x + 4, y + 2, 1, 1)
  g.fillRect(x + 2, y + 5, 3, 1)
  g.fillRect(x + 1, y + 6, 1, 1)
  g.fillRect(x + 5, y + 6, 1, 1)
}

/** Кнопка «СКРЕСТИТЬ» на машине: красная, когда можно нажать, серая, когда нет */
export function drawButton(g: G, enabled: boolean) {
  const { cx, cy } = MACHINE.button
  const w = 44
  const x = cx - w / 2
  const face = enabled ? 0xcd004b : 0x707a80
  g.fillStyle(0x000000, 0.3)
  g.fillRect(x + 1, cy - 5, w, 12)
  g.fillStyle(shade(face, -0.45))
  g.fillRect(x, cy - 6, w, 12)
  g.fillStyle(face)
  g.fillRect(x + 1, cy - 6, w - 2, 10)
  g.fillStyle(shade(face, 0.4))
  g.fillRect(x + 1, cy - 6, w - 2, 1)
  centered(g, 'СКРЕСТИТЬ', cx, cy - 4, enabled ? 0xffffff : 0xc4ccd0)
}

/** Чаша: полукруг с кромкой; яблоко кладут сверху */
function drawBowl(g: G, cx: number) {
  const y = MACHINE.bowlY
  const rows = [18, 17, 15, 12, 8]
  g.fillStyle(0x000000, 0.25)
  g.fillRect(cx - 9, y + 10, 18, 1)
  rows.forEach((w, j) => {
    g.fillStyle(j === 0 ? 0xdfe6e9 : shade(0x9aa7ae, -0.06 * j))
    g.fillRect(cx - w, y + j * 2 - 6, w * 2, 2)
  })
  g.fillStyle(0x4b565c)
  g.fillRect(cx - 17, y - 6, 34, 1)
  g.fillStyle(0xdfe6e9)
  g.fillRect(cx - 18, y - 7, 36, 1)
}

/** Машина целиком, без яблок и кнопки: корпус, чаши, трубы, смеситель с окошком и ниша результата */
export function drawMachine(g: G) {
  const { x, y, w, h, bowlL, bowlR, slot } = MACHINE
  // тень на столе и стене
  g.fillStyle(0x6f8590, 0.4)
  g.fillRect(x + 3, y + h, w, 4)
  // корпус
  g.fillStyle(0x56626a)
  g.fillRect(x, y, w, h)
  g.fillStyle(0x8e9ba2)
  g.fillRect(x + 1, y + 1, w - 2, h - 2)
  g.fillStyle(0xb4c0c6)
  g.fillRect(x + 1, y + 1, w - 2, 1)
  g.fillStyle(0x6f7c84)
  g.fillRect(x + 1, y + h - 3, w - 2, 2)
  g.fillRect(x + w - 3, y + 1, 2, h - 2)
  // заклёпки
  g.fillStyle(0x56626a)
  for (const [rx, ry] of [[x + 3, y + 3], [x + w - 5, y + 3], [x + 3, y + h - 5], [x + w - 5, y + h - 5]]) g.fillRect(rx, ry, 2, 2)
  // панель с чашами
  g.fillStyle(0x5d696f)
  g.fillRect(x + 6, y + 24, w - 12, 26)
  // трубы: из чаш вниз и к смесителю
  const pipe = (px: number, py: number, pw: number, ph: number) => {
    g.fillStyle(0x3d474d)
    g.fillRect(px, py, pw, ph)
    g.fillStyle(0xc2cdd2)
    g.fillRect(px + 1, py + 1, Math.max(1, pw - 2), Math.max(1, ph - 2))
  }
  pipe(bowlL - 2, MACHINE.bowlY + 8, 4, 12)
  pipe(bowlR - 2, MACHINE.bowlY + 8, 4, 12)
  pipe(bowlL - 2, MACHINE.bowlY + 18, 36, 4)
  pipe(bowlR - 34, MACHINE.bowlY + 18, 36, 4)
  drawBowl(g, bowlL)
  drawBowl(g, bowlR)
  // смеситель с окошком
  g.fillStyle(0x3d474d)
  g.fillRect(63, 44, 24, 18)
  g.fillStyle(0xcfe7ee)
  g.fillRect(65, 46, 20, 14)
  g.fillStyle(0xffffff, 0.6)
  g.fillRect(66, 47, 1, 8)
  g.fillStyle(0x6a7479)
  g.fillRect(70, 50, 10, 6)
  g.fillStyle(0x3d474d)
  g.fillRect(72, 52, 6, 2)
  // желоб вниз
  pipe(73, 60, 4, 4)
  // ниша результата
  g.fillStyle(0x2f373c)
  g.fillRect(slot.x, slot.y, slot.w, slot.h)
  g.fillStyle(0xdde5e8)
  g.fillRect(slot.x + 1, slot.y + 1, slot.w - 2, slot.h - 1)
  g.fillStyle(0xf6f3ea)
  g.fillRect(slot.x + 2, slot.y + slot.h - 7, slot.w - 4, 6)
}
