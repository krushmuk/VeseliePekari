import type Phaser from 'phaser'
import { BOTTLE_TYPES, DEFECT, DEFECT_BOTTLE, type BottleType } from './bottleTypes'
import { BELT, BG, BIN, BOX, FILLER } from './config'
import { cylinderShade, Grid, PAL, pixelTexture, rectTexture } from './pixel'

// Эталонный набор спрайтов главы (этап 2 docs/CHAPTER-SORTING.md): бутылки, коробка,
// наклейки, лента, ящик возврата и фон цеха. Всё рисуется кодом по палитре PAL.

export const TEX = {
  bottle: (type: number) => `bottle-${type}`,
  sticker: (type: number) => `sticker-${type}`,
  stickerEmpty: 'sticker-empty',
  boxFront: `box-front-${BOX.w}`,
  boxBack: `box-back-${BOX.w}`,
  boxLid: `box-lid-${BOX.w}`,
  beltTop: 'belt-top',
  beltFrame: 'belt-frame',
  beltEnd: 'belt-end',
  bin: 'bin',
  filler: 'filler',
  bg: 'bg',
}

export function createSprites(scene: Phaser.Scene) {
  BOTTLE_TYPES.forEach((t, i) => {
    const pal = { ...PAL, ...t.colors }
    const rows = bottleRows(t)
    pixelTexture(scene, TEX.bottle(i), rows, pal, cylinderShade(rows, pal))
    pixelTexture(scene, TEX.sticker(i), stickerRows(t), pal)
  })
  {
    const pal = { ...PAL, ...DEFECT_BOTTLE.colors }
    const rows = bottleRows(DEFECT_BOTTLE)
    pixelTexture(scene, TEX.bottle(DEFECT), rows, pal, cylinderShade(rows, pal))
  }
  pixelTexture(scene, TEX.stickerEmpty, emptyStickerRows(), PAL)
  pixelTexture(scene, TEX.boxFront, boxFrontRows(BOX.w, BOX.h), PAL)
  pixelTexture(scene, TEX.boxBack, boxBackRows(BOX.w), PAL)
  pixelTexture(scene, TEX.boxLid, boxLidRows(BOX.w), PAL)
  pixelTexture(scene, TEX.beltTop, BELT_TOP, PAL)
  pixelTexture(scene, TEX.beltFrame, BELT_FRAME, PAL)
  pixelTexture(scene, TEX.beltEnd, BELT_END, PAL)
  pixelTexture(scene, TEX.bin, binRows(), PAL)
  rectTexture(scene, TEX.filler, FILLER.w, FILLER.h, drawFiller)
  rectTexture(scene, TEX.bg, BG.w, BG.h, drawBackground)
}

// ---------- Бутылки ----------

/** Упаковка по рисунку из bottleTypes.ts с контуром вокруг */
function bottleRows(t: Pick<BottleType, 'art'>) {
  const w = Math.max(...t.art.map(r => r.length))
  return new Grid(w + 2, t.art.length + 2).stamp(t.art, 1, 1).outline().rows()
}

/** Наклейка на коробке — логотип упаковки в рамке-контуре */
function stickerRows(t: BottleType) {
  return new Grid(11, 11).stamp(t.sticker, 1, 1).outline().rows()
}

/** Пустая коробка: красная пунктирная наклейка с «текстом» из точек, как на референсе */
function emptyStickerRows() {
  const g = new Grid(11, 11).rect(1, 1, 9, 9, 'l')
  for (let i = 1; i <= 9; i += 2) g.set(i, 1, 'L').set(i, 9, 'L').set(1, i, 'L').set(9, i, 'L')
  g.rect(3, 4, 2, 1, 'k').rect(6, 4, 2, 1, 'k').rect(3, 6, 3, 1, 'k').set(7, 6, 'k')
  return g.outline().rows()
}

// ---------- Коробка ----------

/** Передняя стенка: свет слева, тень справа, сгиб сверху, значки в углу */
function boxFrontRows(w: number, h: number) {
  const g = new Grid(w + 2, h + 2)
  g.rect(1, 1, w, h, 'c')
  g.rect(1, 1, 2, h, 'C')
  g.rect(w - 2, 1, 3, h, 'r')
  g.rect(1, 1, w, 1, 'C')
  g.rect(1, h, w, 1, 'R')
  // два значка-квадратика в правом нижнем углу
  for (const x of [w - 13, w - 8]) g.rect(x, h - 6, 4, 4, 'R').rect(x + 1, h - 5, 2, 2, 'c')
  return g.outline().rows()
}

/** Открытые клапаны и тёмная внутренность. Ширина больше стенки на 3 пикселя с каждой стороны */
function boxBackRows(w: number) {
  const W = w + 8
  const g = new Grid(W, 8)
  g.rect(4, 3, w, 5, 'R').rect(4, 3, w, 1, 'r')
  for (let j = 0; j < 5; j++) {
    g.rect(j, j + 1, 4, 1, j < 2 ? 'C' : 'c')
    g.rect(W - 4 - j, j + 1, 4, 1, j < 2 ? 'c' : 'r')
  }
  return g.outline().rows()
}

/** Закрытые клапаны со скотчем — коробка готова */
function boxLidRows(w: number) {
  const g = new Grid(w + 2, 6)
  const cx = (w + 2) / 2
  g.rect(1, 1, w, 4, 'c').rect(1, 1, w, 1, 'C').rect(w - 2, 1, 3, 4, 'r')
  g.rect(cx - 4, 1, 8, 4, 'l').rect(cx - 4, 4, 8, 1, 'S')
  g.rect(cx, 1, 1, 4, 'R')
  return g.outline().rows()
}

// ---------- Лента ----------

/** Полотно ленты (плитка, едет): контур сверху и стыки пластин */
const BELT_TOP = ['kkkkkkkk', 'BBBBBBBb', 'BBBBBBBb', 'bbbbbbbb']

/** Рама с роликами (плитка, стоит) */
const BELT_FRAME = [
  'WWWWWWWWWWWWWWWW',
  'SSSSSSSSSSSSSSSS',
  'SSSSSkkkkkkSSSSS',
  'SSSSkddddddkSSSS',
  'SSSSkdkkkkdkSSSS',
  'SSSSkdkWWkdkSSSS',
  'SSSSkdkkkkdkSSSS',
  'SSSSkddddddkSSSS',
  'SSSSSkkkkkkSSSSS',
  'ssssssssssssssss',
  'kkkkkkkkkkkkkkkk',
]

/** Скруглённый конец ленты справа */
const BELT_END = [
  'kkkkkk..',
  'BBBBBBk.',
  'BBBBBBk.',
  'bbbbbbbk',
  'WWWWWWWk',
  'SSSSSSsk',
  'SSSSSSsk',
  'SSSSSSsk',
  'SSSSSSsk',
  'SSSSSSsk',
  'SSSSSSsk',
  'SSSSSSsk',
  'SSSSSSk.',
  'sssssk..',
  'kkkkk...',
]

// ---------- Ящик возврата ----------

function binRows() {
  const g = new Grid(16, 20)
  g.rect(1, 1, 14, 18, 'd').rect(1, 1, 14, 2, 's')
  // жёлто-чёрная полоса «осторожно»
  for (let y = 4; y < 7; y++) for (let x = 1; x < 15; x++) g.set(x, y, ((x + y) >> 1) % 2 ? 'Y' : 'k')
  g.rect(5, 8, 1, 10, 's').rect(10, 8, 1, 10, 's')
  g.rect(13, 3, 2, 16, 'b')
  return g.outline().rows()
}

// ---------- Разливочный автомат ----------

type Rect = (x: number, y: number, w: number, h: number, c: keyof typeof PAL) => void

/** Автомат слева, из окна которого выезжают бутылки. Стоит поверх начала ленты */
function drawFiller(r: Rect) {
  const { w, h } = FILLER
  // корпус
  r(0, 8, w, h - 8, 'k')
  r(1, 9, w - 2, h - 10, 'S')
  r(1, 9, w - 2, 1, 'W')
  r(w - 5, 9, 4, h - 10, 's')
  r(1, h - 4, w - 2, 3, 'd')
  // головки розлива сверху и лампа
  for (const x of [8, 20, 32]) {
    r(x - 1, 2, 8, 7, 'k')
    r(x, 3, 6, 5, 's')
    r(x, 3, 6, 1, 'S')
  }
  r(w - 13, 0, 8, 9, 'k')
  r(w - 12, 1, 6, 7, 'Y')
  r(w - 12, 1, 2, 2, 'y')
  // смотровое окно с бутылками внутри
  r(5, 14, 30, 16, 'k')
  r(6, 15, 28, 14, 'b')
  for (const x of [9, 17, 25]) {
    r(x, 19, 4, 10, 'G')
    r(x + 1, 17, 2, 2, 'G')
    r(x, 22, 1, 6, 'g')
  }
  r(6, 15, 28, 1, 'B')
  // окно выдачи на ленту: шторка из резиновых полос
  const winY = h - (FILLER.bottom - BELT.y) - 28
  r(w - 16, winY - 1, 14, 30, 'k')
  r(w - 15, winY, 12, 28, 'b')
  for (let x = w - 14; x < w - 3; x += 3) r(x, winY, 2, 24, 'B')
  // табличка и кнопки
  r(5, 34, 22, 9, 'k')
  r(6, 35, 20, 7, 'Y')
  r(8, 37, 12, 1, 'o')
  r(8, 39, 8, 1, 'o')
  r(30, 35, 5, 5, 'k')
  r(31, 36, 3, 3, 'L')
}

// ---------- Фон цеха ----------

/**
 * Фон шире и выше поля: на экранах другой пропорции по краям видно продолжение цеха.
 * Наверху стены — трубы и шкафы, ниже, за лентой, — ровная стена без деталей,
 * чтобы бутылки хорошо читались. Координаты — в системе поля, сдвиг на BG делает r().
 */
function drawBackground(rect: Rect) {
  const r: Rect = (x, y, w, h, c) => rect(x - BG.x, y - BG.y, w, h, c)
  const left = BG.x
  const right = BG.x + BG.w
  const W = BG.w
  const bottom = BG.y + BG.h
  const floorY = BOX.zoneY
  const railY = 70

  // Потолок и верх стены со швами панелей
  r(left, BG.y, W, 16 - BG.y, 'f')
  r(left, 16, W, BELT.y - 16, 'F')
  for (let x = left + 2; x < right; x += 30) {
    r(x, 16, 1, railY - 16, 'f')
    r(x + 1, 16, 1, railY - 16, 'g')
  }

  // Фермы перекрытия: видны на высоких экранах над балкой
  const trussTop = -34
  const trussBottom = -6
  for (const y of [trussTop, trussBottom]) {
    r(left, y - 1, W, 1, 'k')
    r(left, y, W, 2, 'F')
    r(left, y + 2, W, 1, 'k')
  }
  const span = trussBottom - trussTop - 3
  for (let x0 = left - (left % 20) - 20, k = 0; x0 < right; x0 += 20, k++)
    for (let t = 0; t < span; t++) {
      const x = x0 + Math.round((t * 20) / span)
      r(k % 2 ? x0 + 20 - (x - x0) : x, trussTop + 3 + t, 2, 1, 'F')
    }

  // Балка под потолком с заклёпками
  r(left, 8, W, 1, 'k')
  r(left, 9, W, 5, 'O')
  r(left, 14, W, 1, 'o')
  r(left, 15, W, 1, 'k')
  for (let x = left + 4; x < right; x += 12) r(x, 11, 1, 1, 'o')

  // Лампы и свет под ними (дизеринг)
  for (const lx of [-150, -70, 10, 114, 194, 274]) {
    r(lx, 16, 1, 3, 'k')
    r(lx + 25, 16, 1, 3, 'k')
    r(lx - 1, 19, 28, 5, 'k')
    r(lx, 20, 26, 3, 'y')
    r(lx, 20, 26, 1, 'Y')
  }

  // Труба с фланцами
  r(left, 27, W, 1, 'k')
  r(left, 28, W, 1, 'S')
  r(left, 29, W, 3, 's')
  r(left, 32, W, 1, 'd')
  r(left, 33, W, 1, 'k')
  for (let x = left + 10; x < right; x += 40) {
    r(x - 1, 25, 6, 11, 'k')
    r(x, 26, 4, 9, 'd')
    r(x, 26, 1, 9, 's')
  }
  // отвод трубы вниз к правому шкафу
  r(124, 33, 6, 6, 'k')
  r(125, 33, 4, 6, 's')
  r(125, 33, 1, 6, 'S')

  // Шкафы управления высоко на стене
  for (const x of [-120, 24, 108, 200]) cabinet(r, x, 39, 34, 27)

  // Поручень-отбойник: ниже него стена ровная
  r(left, railY, W, 1, 'k')
  r(left, railY + 1, W, 1, 'S')
  r(left, railY + 2, W, 1, 's')
  r(left, railY + 3, W, 1, 'k')
  r(left, railY + 4, W, 1, 'f')

  // Оранжевые колонны
  for (const cx of [-30, 150]) {
    r(cx - 1, 16, 8, floorY - 16, 'k')
    r(cx, 16, 6, floorY - 16, 'O')
    r(cx + 4, 16, 2, floorY - 16, 'o')
  }

  // Под лентой (от автомата до ящика возврата) тень и опоры
  r(FILLER.x, BELT.y, BIN.x + 16 - FILLER.x, floorY - BELT.y, 'f')
  for (const lx of [14, 60, 106]) {
    r(lx - 1, BELT.y + 14, 6, floorY - BELT.y - 12, 'k')
    r(lx, BELT.y + 14, 4, floorY - BELT.y - 12, 'S')
    r(lx + 3, BELT.y + 14, 1, floorY - BELT.y - 12, 'd')
    r(lx - 3, floorY - 1, 10, 3, 'k')
    r(lx - 2, floorY, 8, 1, 's')
  }

  // Пол: плитка и жёлто-чёрная линия безопасности
  r(left, floorY, W, bottom - floorY, 'g')
  for (let x = left; x < right; x += 16) r(x, floorY + 6, 1, bottom - floorY, 'F')
  for (let y = floorY + 22; y < bottom; y += 22) r(left, y, W, 1, 'F')
  r(left, floorY, W, 1, 'k')
  for (let x = left; x < right; x++) for (let y = floorY + 1; y < floorY + 5; y++) r(x, y, 1, 1, ((x + y) >> 2) % 2 ? 'Y' : 'k')
  r(left, floorY + 5, W, 1, 'k')

  // Стол упаковки: столешница во всю ширину, коробки стоят на ней, ножки — между коробками
  r(left, BOX.y - 1, W, 1, 'k')
  r(left, BOX.y, W, 1, 'W')
  r(left, BOX.y + 1, W, 3, 'S')
  r(left, BOX.y + 4, W, 1, 's')
  r(left, BOX.y + 5, W, 1, 'k')
  r(left, BOX.y + 6, W, 2, 'F')
  for (let x = -152; x < right; x += 50) {
    r(x - 1, BOX.y + 6, 6, bottom - BOX.y, 'k')
    r(x, BOX.y + 6, 4, bottom - BOX.y, 's')
    r(x + 3, BOX.y + 6, 1, bottom - BOX.y, 'd')
  }
}

function cabinet(r: Rect, x: number, y: number, w: number, h: number) {
  r(x - 1, y - 1, w + 2, h + 2, 'k')
  r(x, y, w, h, 'd')
  r(x, y, w, 1, 's')
  r(x + 3, y + 3, w - 6, h - 6, 's')
  r(x + 3, y + 3, w - 6, 1, 'S')
  // экран
  r(x + 5, y + 5, w - 10, 9, 'k')
  r(x + 6, y + 6, w - 12, 7, 'Y')
  r(x + 7, y + 8, w - 18, 1, 'o')
  r(x + 7, y + 10, w - 22, 1, 'o')
  // кнопки
  r(x + 6, y + 17, 4, 4, 'k')
  r(x + 7, y + 18, 2, 2, 'L')
  r(x + 12, y + 17, 4, 4, 'k')
  r(x + 13, y + 18, 2, 2, 'O')
  r(x + 18, y + 17, 4, 4, 'k')
  r(x + 19, y + 18, 2, 2, 'G')
}
