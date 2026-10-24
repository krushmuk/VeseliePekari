import type Phaser from 'phaser'
import { FIELD, WALL_H } from './config'

// Графика главы «Лаборант»: стакан кваса, этикетка с данными пробы, золотая подставка и стол.
// Всё рисуется целыми пикселями поля — камера увеличивает его целым числом раз, поэтому края чёткие.
// Стена и полка пока заглушки: фон за столом сделаем отдельно и согласуем.

type G = Phaser.GameObjects.Graphics

const AREA = { x: -300, w: FIELD.w + 600, bottom: 460 }

/** Детерминированный «случайный» ряд: узор стола не должен меняться между запусками */
export const hash = (a: number, b: number) => {
  const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return n - Math.floor(n)
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

// ---------- Мелкий шрифт 3×5 ----------

const FONT: Record<string, string> = {
  '0': '### #.# #.# #.# ###',
  '1': '.#. ##. .#. .#. ###',
  '2': '### ..# ### #.. ###',
  '3': '### ..# ### ..# ###',
  '4': '#.# #.# ### ..# ..#',
  '5': '### #.. ### ..# ###',
  '6': '### #.. ### #.# ###',
  '7': '### ..# ..# .#. .#.',
  '8': '### #.# ### #.# ###',
  '9': '### #.# ### ..# ###',
  '-': '... ... ### ... ...',
  Э: '##. ..# .## ..# ##.',
  Т: '### .#. .#. .#. .#.',
  А: '.#. #.# ### #.# #.#',
  Л: '.## #.# #.# #.# #.#',
  О: '### #.# #.# #.# ###',
  Н: '#.# #.# ### #.# #.#',
  Б: '### #.. ##. #.# ##.',
  Г: '### #.. #.. #.. #..',
  Д: '.#### .#..# .#..# .#..# #####',
  Е: '### #.. ##. #.. ###',
  И: '#..# #..# #.## ##.# #..#',
  К: '#.# ##. #.. ##. #.#',
  П: '### #.# #.# #.# #.#',
  Р: '##. #.# ##. #.. #..',
  С: '.## #.. #.. #.. .##',
  В: '##. #.# ##. #.# ##.',
  Ш: '#.# #.# #.# ### ###',
  Ь: '#.. #.. ##. #.# ##.',
  '!': '.#. .#. .#. ... .#.',
  ',': '... ... ... .#. #..',
  '.': '... ... ... ... .#.',
}

/** Ширина буквы: у большинства 3, у И и Д шире */
const glyphWidth = (ch: string) => (FONT[ch] ? FONT[ch].indexOf(' ') : 3)

/** Ширина строки шрифта в пикселях: буквы и по 1 между ними */
export const textWidth = (text: string) => [...text].reduce((w, ch) => w + glyphWidth(ch) + 1, -1)

export function drawText(g: G, text: string, x: number, y: number, color: number) {
  g.fillStyle(color)
  let px = x
  for (const ch of text) {
    const rows = (FONT[ch] ?? '').split(' ')
    rows.forEach((row, j) => [...row].forEach((c, i) => c === '#' && g.fillRect(px + i, y + j, 1, 1)))
    px += glyphWidth(ch) + 1
  }
}

// ---------- Стакан ----------

const GLASS = { edge: 0x4f7f93, base: 0xcfe7ee, foam: 0xf8efd6, foamDark: 0xf1e4bd, shadow: 0x7d8f97 }

/** Стакан с квасом вокруг центра (0, 0): тень на столе, стенки, толстое дно, жидкость с пеной и бликом */
export function drawGlass(g: G, w: number, h: number, liquid: number): G {
  const x0 = -w / 2
  const y0 = -h / 2

  g.fillStyle(GLASS.shadow, 0.3)
  g.fillRect(x0 + 2, y0 + h, w - 1, 1)
  g.fillStyle(GLASS.shadow, 0.16)
  g.fillRect(x0 + 4, y0 + h + 1, w - 4, 1)

  // жидкость: правый край в тени, дно темнее, пена сверху
  const lx = x0 + 1
  const lw = w - 2
  const ly = y0 + 3
  const lh = h - 7
  g.fillStyle(liquid)
  g.fillRect(lx, ly, lw, lh)
  g.fillStyle(shade(liquid, -0.18))
  g.fillRect(lx + lw - 2, ly, 2, lh)
  g.fillRect(lx, ly + lh - 1, lw, 1)
  g.fillStyle(0xffffff, 0.3)
  g.fillRect(lx + 1, ly + 4, 1, lh - 8)
  g.fillStyle(GLASS.foam)
  g.fillRect(lx, ly, lw, 1)
  g.fillStyle(GLASS.foamDark)
  for (let i = 0; i < lw; i++) if (hash(i, w) < 0.6) g.fillRect(lx + i, ly + 1, 1, 1)

  // стенки; нижние углы срезаны, чтобы стакан не был острым
  g.fillStyle(GLASS.edge)
  g.fillRect(x0, y0, 1, h - 1)
  g.fillRect(x0 + w - 1, y0, 1, h - 1)
  g.fillRect(x0 + 1, y0 + h - 1, w - 2, 1)
  // толстое стеклянное дно
  g.fillStyle(GLASS.base)
  g.fillRect(lx, y0 + h - 4, lw, 3)
  g.fillStyle(0xffffff)
  g.fillRect(lx, y0 + h - 4, lw, 1)
  // кромка и блик на стекле над жидкостью
  g.fillRect(x0, y0, 2, 1)
  g.fillRect(x0 + w - 2, y0, 2, 1)
  g.fillStyle(0xffffff, 0.55)
  g.fillRect(lx, y0 + 1, 1, 2)
  return g
}

// ---------- Этикетка ----------

export interface LabelTag {
  /** Номер пробы */
  num: number
  /** Партия из экспериментального цеха */
  batch: number
}

const LABEL_INK = 0x2b3236

/** Этикетка w×h с красной полоской, номером пробы и партией: «07» и «Э-3» */
export function drawLabel(g: G, w: number, h: number, tag: LabelTag): G {
  g.fillStyle(0x8a9296)
  g.fillRect(0, 0, w, h)
  g.fillStyle(0xf6f3ea)
  g.fillRect(1, 1, w - 2, h - 2)
  g.fillStyle(0xcd004b)
  g.fillRect(0, 0, w, 1)
  const num = String(tag.num).padStart(2, '0')
  const batch = `Э-${tag.batch}`
  drawText(g, num, Math.floor((w - textWidth(num)) / 2), 2, LABEL_INK)
  drawText(g, batch, Math.floor((w - textWidth(batch)) / 2), 8, 0x6a7479)
  return g
}

// ---------- Золотая подставка ----------

/** Подставка «ЭТАЛОН» шириной 38 и высотой 10: сверху грань, спереди надпись */
export function drawPlate(g: G, cx: number, top: number) {
  const w = 38
  const x = cx - w / 2
  g.fillStyle(0x000000, 0.14)
  g.fillRect(x + 2, top + 10, w, 1)
  g.fillStyle(0xf6d65c)
  g.fillRect(x + 2, top, w - 4, 2)
  g.fillStyle(0xd9a521)
  g.fillRect(x, top + 2, w, 8)
  g.fillStyle(0xf3c94a)
  g.fillRect(x, top + 2, w, 1)
  g.fillStyle(0xa87f14)
  g.fillRect(x, top + 2, 1, 8)
  g.fillRect(x + w - 1, top + 2, 1, 8)
  const tx = cx - Math.floor(textWidth('ЭТАЛОН') / 2)
  drawText(g, 'ЭТАЛОН', tx, top + 4, 0xffe58a)
  drawText(g, 'ЭТАЛОН', tx, top + 3, 0x4a3604)
  g.fillStyle(0x8a6a10)
  g.fillRect(x, top + 9, w, 1)
}

// ---------- Стена, полка и стол ----------

/** Фон: заглушка стены, полка под эталоном и лабораторный стол. Выходит за поле — на других экранах видно продолжение */
export function drawBackdrop(g: G, shelfY?: number) {
  wall(g)
  if (shelfY !== undefined) shelf(g, shelfY)
  table(g)
}

/** Деревянная полка под подставкой эталона */
function shelf(g: G, shelfY: number) {
  // только в центре, на двух кронштейнах, с тенью на стене
  const sw = 84
  const sx = FIELD.w / 2 - sw / 2
  g.fillStyle(0x6f8590, 0.35)
  g.fillRect(sx + 2, shelfY + 6, sw, 3)
  g.fillStyle(0x5a3517)
  for (const bx of [sx + 8, sx + sw - 12]) g.fillRect(bx, shelfY + 5, 4, 7)
  g.fillStyle(0x7a4a22)
  for (const bx of [sx + 8, sx + sw - 12]) g.fillRect(bx, shelfY + 5, 1, 7)
  g.fillStyle(0xb07a3e)
  g.fillRect(sx, shelfY, sw, 5)
  g.fillStyle(0xd09a58)
  g.fillRect(sx, shelfY, sw, 1)
  g.fillStyle(0x8b5a2b)
  g.fillRect(sx, shelfY + 3, sw, 1)
  g.fillStyle(0x5a3517)
  g.fillRect(sx, shelfY + 4, sw, 1)
  g.fillRect(sx, shelfY, 1, 5)
  g.fillRect(sx + sw - 1, shelfY, 1, 5)
  g.fillStyle(0x5a3517, 0.45)
  for (let i = 0; i < 6; i++) g.fillRect(sx + 4 + Math.floor(hash(i, 5) * (sw - 18)), shelfY + 1 + (i % 2) * 2, 4 + (i % 3) * 2, 1)
}

/** Тени у стены над столешницей */
const wallShadow = (g: G) => {
  g.fillStyle(0x9fb0b6, 0.35)
  g.fillRect(AREA.x, WALL_H - 3, AREA.w, 1)
  g.fillStyle(0x9fb0b6, 0.2)
  g.fillRect(AREA.x, WALL_H - 5, AREA.w, 2)
}

/** Беленая кирпичная кладка: кирпичи в шахматном порядке, у каждого свой светлый тон, швы темнее */
function wall(g: G) {
  const top = -300
  g.fillStyle(0xaab6bb)
  g.fillRect(AREA.x, top, AREA.w, WALL_H - top)
  const bw = 20
  const bh = 8
  const tones = [0xe9eef0, 0xdfe6e9, 0xd5dde1, 0xe4eaec]
  for (let row = 0, y = top; y < WALL_H; row++, y += bh) {
    const x0 = AREA.x - (row % 2 ? bw / 2 : 0)
    for (let col = 0, x = x0; x < AREA.x + AREA.w; col++, x += bw) {
      const bhh = Math.min(bh - 1, WALL_H - y - 1)
      g.fillStyle(tones[Math.floor(hash(col + 9, row + 4) * tones.length)])
      g.fillRect(x + 1, y + 1, bw - 1, bhh)
      g.fillStyle(0xffffff, 0.6)
      g.fillRect(x + 1, y + 1, bw - 1, 1)
      g.fillStyle(0xaab6bb, 0.5)
      g.fillRect(x + 1, y + bhh, bw - 1, 1)
    }
  }
  for (let i = 0; i < 140; i++) {
    g.fillStyle(0x8fa1a8, 0.35)
    g.fillRect(AREA.x + Math.floor(hash(i, 7) * AREA.w), top + Math.floor(hash(i, 8) * (WALL_H - top)), 1, 1)
  }
}

const TOP = { base: 0xb3c3ca }

/**
 * Стол: гладкая серо-голубая столешница без швов и полос. Тон темнее стакана, чтобы тот не сливался со столом;
 * тень у стены, пятна и царапины
 */
function table(g: G) {
  wallShadow(g)

  // передняя кромка у стены
  g.fillStyle(0x7e929b)
  g.fillRect(AREA.x, WALL_H, AREA.w, 1)
  g.fillStyle(0xd8e3e7)
  g.fillRect(AREA.x, WALL_H + 1, AREA.w, 1)

  g.fillStyle(TOP.base)
  g.fillRect(AREA.x, WALL_H + 2, AREA.w, AREA.bottom)

  // тень у задней кромки: три полосы, затухающие вниз
  ;[0.28, 0.16, 0.08].forEach((a, i) => {
    g.fillStyle(0x6f8590, a)
    g.fillRect(AREA.x, WALL_H + 2 + i, AREA.w, 1)
  })

  // потёртости: тёмные пятнышки и короткие царапины вдоль стола
  for (let i = 0; i < 260; i++) {
    const px = AREA.x + Math.floor(hash(i, 1) * AREA.w)
    const py = WALL_H + 4 + Math.floor(hash(i, 2) * (AREA.bottom - WALL_H - 4))
    g.fillStyle(0x7e929b, 0.4)
    if (i % 3 === 0) g.fillRect(px, py, 2 + Math.floor(hash(i, 3) * 4), 1)
    else g.fillRect(px, py, 1, 1)
  }
}
