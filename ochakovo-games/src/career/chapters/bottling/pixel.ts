import type Phaser from 'phaser'

// Пиксель-арт кодом. Спрайт — массив строк, каждый символ — цвет из палитры, '.' — прозрачный.
// Простые спрайты пишутся строками прямо в sprites.ts, сложные (бутылки, коробки) собираются
// на сетке Grid: залить формы, потом обвести контуром автоматически.

/** Символ → цвет */
export type Palette = Record<string, string>

/** Общая палитра главы по референсам REF/конвейер (docs/CHAPTER-SORTING.md, п. 3) */
export const PAL = {
  k: '#1b1f2e', // контур
  // сталь
  W: '#e3ebf0',
  S: '#b7c5cf',
  s: '#7f909c',
  d: '#4f5d6a',
  // лента
  B: '#3b4266',
  b: '#2a2f4a',
  // картон
  C: '#d9b48a',
  c: '#c49a6c',
  r: '#9c7148',
  R: '#6e4b2c',
  // наклейка
  L: '#b0303a',
  l: '#f4ece0',
  // цех
  f: '#23363b',
  F: '#2f4a4f',
  g: '#3e6363',
  G: '#587f7a',
  // балки, акцент
  O: '#e0632e',
  o: '#a8431d',
  // лампы, экраны
  Y: '#f4d35e',
  y: '#fff3b0',
} satisfies Palette

/** Сетка символов: на ней рисуют формы, а потом превращают в строки спрайта */
export class Grid {
  readonly w: number
  readonly h: number
  private cells: string[]

  constructor(w: number, h: number) {
    this.w = w
    this.h = h
    this.cells = Array.from({ length: w * h }, () => '.')
  }

  get(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.cells[y * this.w + x] : '.'
  }

  set(x: number, y: number, c: string) {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.cells[y * this.w + x] = c
    return this
  }

  rect(x: number, y: number, w: number, h: number, c: string) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c)
    return this
  }

  /** Вставить готовый спрайт-строки; '.' не перекрывает то, что под ним */
  stamp(rows: readonly string[], x: number, y: number) {
    rows.forEach((row, j) => [...row].forEach((c, i) => c !== '.' && this.set(x + i, y + j, c)))
    return this
  }

  /** Обвести контуром все прозрачные клетки, соседние (по стороне) с закрашенными */
  outline(c = 'k') {
    const add: [number, number][] = []
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y) !== '.') continue
        const near = [this.get(x - 1, y), this.get(x + 1, y), this.get(x, y - 1), this.get(x, y + 1)]
        if (near.some(n => n !== '.' && n !== c)) add.push([x, y])
      }
    for (const [x, y] of add) this.set(x, y, c)
    return this
  }

  rows(): string[] {
    return Array.from({ length: this.h }, (_, y) => this.cells.slice(y * this.w, (y + 1) * this.w).join(''))
  }
}

/** Смешать два цвета #rrggbb: t = 0 — первый, 1 — второй */
function mix(a: string, b: string, t: number) {
  const ch = (c: string, i: number) => parseInt(c.slice(1 + i * 2, 3 + i * 2), 16)
  const v = [0, 1, 2].map(i => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t))
  return `#${v.map(x => x.toString(16).padStart(2, '0')).join('')}`
}

/**
 * Объём цилиндра (банка, бутылка): в каждой строке второй слева пиксель — блик,
 * правая четверть — в тени. Контур не трогаем
 */
export function cylinderShade(rows: readonly string[], palette: Palette, outline = 'k') {
  return (x: number, y: number, color: string) => {
    const row = rows[y]
    if (row[x] === outline) return color
    let a = x
    let b = x
    while (a > 0 && row[a - 1] !== '.' && row[a - 1] !== outline) a--
    while (b < row.length - 1 && row[b + 1] !== '.' && row[b + 1] !== outline) b++
    const n = b - a + 1
    if (n >= 4 && x === a + 1) return mix(color, '#ffffff', 0.45)
    if (n >= 4 && x >= a + Math.ceil(n * 0.75)) return mix(color, palette[outline], 0.3)
    return color
  }
}

/**
 * Создаёт текстуру 1:1 из строк. Неизвестный символ или строки разной длины — ошибка в спрайте.
 * `tint` меняет цвет отдельного пикселя — например, объём из cylinderShade
 */
export function pixelTexture(
  scene: Phaser.Scene,
  key: string,
  rows: readonly string[],
  palette: Palette,
  tint?: (x: number, y: number, color: string) => string,
) {
  if (scene.textures.exists(key)) return
  const h = rows.length
  const w = rows[0].length
  const tex = scene.textures.createCanvas(key, w, h)
  if (!tex) return
  const g = tex.getContext()
  rows.forEach((row, y) => {
    if (row.length !== w) throw new Error(`Спрайт ${key}: строка ${y} длиной ${row.length}, ожидалось ${w}`)
    ;[...row].forEach((c, x) => {
      if (c === '.') return
      const color = palette[c]
      if (!color) throw new Error(`Спрайт ${key}: нет цвета для «${c}»`)
      g.fillStyle = tint ? tint(x, y, color) : color
      g.fillRect(x, y, 1, 1)
    })
  })
  tex.refresh()
}

/** Текстура, нарисованная прямоугольниками по палитре — для больших картинок вроде фона */
export function rectTexture(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (rect: (x: number, y: number, w: number, h: number, c: keyof typeof PAL) => void) => void,
) {
  if (scene.textures.exists(key)) return
  const tex = scene.textures.createCanvas(key, w, h)
  if (!tex) return
  const g = tex.getContext()
  draw((x, y, rw, rh, c) => {
    g.fillStyle = PAL[c]
    g.fillRect(x, y, rw, rh)
  })
  tex.refresh()
}
