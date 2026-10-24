import type Phaser from 'phaser'
import { FIELD, PRESS } from './config'

// Фон второй локации: кирпичная стена со стёршейся олимпийской символикой, бетонный пол
// и корпус большого старого гидравлического пресса. Рисуется один раз примитивами.

/** Область фона шире поля: на экранах другой пропорции по краям видно продолжение стены */
const AREA = { x: -165, y: -70, w: 480, h: 302 }
const FLOOR_Y = PRESS.bottom
const BRICK = { w: 14, h: 6 }

const C = {
  mortar: 0x3f2622,
  bricks: [0x8a4b3a, 0x7a4233, 0x9a5742, 0x6f3b2e, 0x84483a],
  dark: 0x14110f,
  steel: 0x4b5a52,
  steelLight: 0x65776c,
  steelDark: 0x2f3a35,
  rust: 0x8a4a22,
  chrome: 0xc9d3d6,
  rivet: 0x1d2420,
  floor: 0x4a4a48,
  floorLine: 0x333331,
}

/** Дешёвый детерминированный «случайный» ряд: фон не должен меняться между запусками */
const hash = (a: number, b: number) => {
  const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return n - Math.floor(n)
}

/** Олимпийские кольца: цвет и центр относительно середины знака */
const RINGS: [number, number, number][] = [
  [0x2a6fb5, -21, 0],
  [0xd9b83a, -10.5, 9],
  [0x1c1c1c, 0, 0],
  [0x3a9a5a, 10.5, 9],
  [0xc0382f, 21, 0],
]

export function drawBackdrop(g: Phaser.GameObjects.Graphics) {
  brickWall(g)
  olympicRings(g, FIELD.w / 2, 46)
  floor(g)
  press(g)
}

function brickWall(g: Phaser.GameObjects.Graphics) {
  g.fillStyle(C.mortar)
  g.fillRect(AREA.x, AREA.y, AREA.w, FLOOR_Y - AREA.y)
  const rows = Math.ceil((FLOOR_Y - AREA.y) / BRICK.h)
  for (let row = 0; row < rows; row++) {
    const y = AREA.y + row * BRICK.h
    const shift = row % 2 ? BRICK.w / 2 : 0
    for (let x = AREA.x - BRICK.w + shift; x < AREA.x + AREA.w; x += BRICK.w) {
      const k = hash(x, y)
      g.fillStyle(C.bricks[Math.floor(k * C.bricks.length)])
      g.fillRect(x + 1, y + 1, BRICK.w - 1, BRICK.h - 1)
      // светлая кромка и редкие тёмные кирпичи — стена неровная, закопчённая
      g.fillStyle(0xffffff, 0.06)
      g.fillRect(x + 1, y + 1, BRICK.w - 1, 1)
      if (k > 0.9) {
        g.fillStyle(C.dark, 0.25)
        g.fillRect(x + 1, y + 1, BRICK.w - 1, BRICK.h - 1)
      }
    }
  }
  // Копоть сверху: плавное затемнение полосами
  for (let i = 0; i < 6; i++) {
    g.fillStyle(C.dark, 0.1)
    g.fillRect(AREA.x, AREA.y, AREA.w, 40 + i * 10 - 30)
  }
}

/** Выцветшие кольца: бледные штрихи и «выеденные» временем пятна поверх них */
function olympicRings(g: Phaser.GameObjects.Graphics, cx: number, cy: number) {
  for (const [color, dx, dy] of RINGS) {
    g.lineStyle(2, color, 0.4)
    g.strokeCircle(cx + dx, cy + dy, 10)
  }
  // Облупленные места: кирпич и раствор проступают сквозь краску
  for (let i = 0; i < 90; i++) {
    const x = cx - 34 + hash(i, 1) * 68
    const y = cy - 12 + hash(i, 2) * 34
    const w = 1 + Math.floor(hash(i, 3) * 3)
    const h = 1 + Math.floor(hash(i, 4) * 2)
    g.fillStyle(i % 3 ? C.bricks[i % C.bricks.length] : C.mortar, 0.85)
    g.fillRect(Math.round(x), Math.round(y), w, h)
  }
}

function floor(g: Phaser.GameObjects.Graphics) {
  g.fillStyle(C.floor)
  g.fillRect(AREA.x, FLOOR_Y, AREA.w, AREA.h - (FLOOR_Y - AREA.y) + 40)
  g.fillStyle(C.dark)
  g.fillRect(AREA.x, FLOOR_Y, AREA.w, 1)
  for (let x = AREA.x; x < AREA.x + AREA.w; x += 24) {
    g.fillStyle(C.floorLine)
    g.fillRect(x, FLOOR_Y + 2, 1, 60)
  }
}

/** Корпус пресса: основание с отсеками, верхняя балка и два гидроцилиндра по бокам жёлоба */
function press(g: Phaser.GameObjects.Graphics) {
  const left = PRESS.x0 - 4
  const width = PRESS.step * 3 + 3
  const top = PRESS.top - 18

  // Корпус
  g.fillStyle(C.dark)
  g.fillRect(left - 1, top - 1, width + 2, FLOOR_Y - top + 5)
  g.fillStyle(C.steel)
  g.fillRect(left, top, width, FLOOR_Y - top + 3)
  g.fillStyle(C.steelLight)
  g.fillRect(left, top, width, 1)
  g.fillStyle(C.steelDark)
  g.fillRect(left, FLOOR_Y + 1, width, 2)
  // Разводы ржавчины
  for (let i = 0; i < 14; i++) {
    g.fillStyle(C.rust, 0.5)
    g.fillRect(left + 2 + Math.floor(hash(i, 7) * (width - 6)), top + 4 + Math.floor(hash(i, 8) * 30), 1, 4 + Math.floor(hash(i, 9) * 14))
  }
  // Заклёпки по периметру и между секциями
  g.fillStyle(C.rivet)
  for (let x = left + 3; x < left + width - 2; x += 8) {
    g.fillRect(x, top + 3, 2, 2)
    g.fillRect(x, FLOOR_Y - 3, 2, 2)
  }
  // Проёмы секций: тёмная рамка вокруг (сами секции рисует сцена)
  for (let i = 0; i < 3; i++) {
    g.fillStyle(C.dark)
    g.fillRect(PRESS.x0 + i * PRESS.step - 2, PRESS.top - 2, PRESS.w + 4, PRESS.bottom - PRESS.top + 4)
  }

  // Верхняя балка над секциями
  const beamY = PRESS.top - 24
  g.fillStyle(C.dark)
  g.fillRect(left - 3, beamY - 1, width + 6, 10)
  g.fillStyle(C.steelLight)
  g.fillRect(left - 2, beamY, width + 4, 8)
  g.fillStyle(C.steel)
  g.fillRect(left - 2, beamY + 4, width + 4, 4)

  // Гидроцилиндры: корпус, блестящий шток и колпак. Стоят по бокам, ветки жёлоба их не задевают
  for (const x of [left + 8, left + width - 24]) {
    g.fillStyle(C.dark)
    g.fillRect(x - 1, 55, 18, beamY - 54)
    g.fillStyle(C.steelDark)
    g.fillRect(x, 80, 16, beamY - 80)
    g.fillStyle(C.steelLight)
    g.fillRect(x + 2, 80, 3, beamY - 80)
    // шток
    g.fillStyle(C.dark)
    g.fillRect(x + 3, 56, 10, 25)
    g.fillStyle(C.chrome)
    g.fillRect(x + 4, 57, 8, 23)
    g.fillStyle(0xffffff, 0.5)
    g.fillRect(x + 5, 57, 2, 23)
    // колпак и хомуты
    g.fillStyle(C.steel)
    g.fillRect(x - 1, 50, 18, 6)
    g.fillStyle(C.rivet)
    g.fillRect(x - 1, 82, 18, 2)
    g.fillRect(x - 1, beamY - 8, 18, 2)
  }

  // Манометр на балке
  const gx = FIELD.w / 2 + 40
  g.fillStyle(C.dark)
  g.fillCircle(gx, beamY + 4, 6)
  g.fillStyle(0xe9e4cf)
  g.fillCircle(gx, beamY + 4, 4)
  g.lineStyle(1, 0xb0303a)
  g.lineBetween(gx, beamY + 4, gx + 2, beamY + 1)
}
