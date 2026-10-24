import { Grid, type Palette } from '../bottling/pixel'

// Пиксель-арт уровней тех цеха по REF/v_neyronku_operator_tekh_tsekha.docx: иконки ингредиентов
// (мешок, капля, пакетик, яблоко, лимон, шишка, листик), смеситель и портрет начальника смены.
// Всё собирается на сетке Grid и рисуется в TechArt.tsx.

/** Матрица упорядоченного растрового сглаживания 2×2: даёт «пиксельные» переходы между оттенками без шума */
const BAYER = [0, 2, 3, 1]

/**
 * Объём заливки: клетки символа `ch` перекрашиваются в оттенки `levels` (от тёмного к светлому)
 * по освещённости v(x, y) ∈ 0…1; на границах оттенков — шахматная растушёвка
 */
function shade(g: Grid, ch: string, levels: string, v: (x: number, y: number) => number) {
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      if (g.get(x, y) !== ch) continue
      const d = (BAYER[(x & 1) + (y & 1) * 2] / 4 - 0.375) / levels.length
      const i = Math.floor(Math.min(0.999, Math.max(0, v(x, y) + d)) * levels.length)
      g.set(x, y, levels[i])
    }
}

export const ICON_PAL = {
  k: '#1b1f2e', // контур
  R: '#6e4b2c', // верёвка, тёмное дерево
  C: '#d9b48a', // мешковина
  c: '#c49a6c',
  Y: '#f4d35e', // зерно, лимон
  y: '#fff3b0',
  O: '#c9a227',
  p: '#dfe39a', // уксус
  b: '#4da3d9', // вода
  B: '#2f78b0',
  w: '#ffffff',
  W: '#f4ece0', // бумажный пакетик
  S: '#b7c5cf',
  r: '#cd004b', // фирменный красный
  a: '#d63a3a', // яблоко
  A: '#9c2323',
  n: '#6e4b2c',
  g: '#7bc67b', // листья, хмель
  G: '#4f9a4f',
  d: '#2f6b2f',
  l: '#cfe7ee', // стекло
  o: '#f2993a', // апельсин
  q: '#c9661c',
  u: '#d99a2b', // сахарный сироп
  U: '#9c6a14',
} satisfies Palette

const SPRITES: Record<string, string[]> = {
  malt: [
    '..cRRRRc..', '...CCCC...', '..CCCCCC..', '.CCCYYCCC.', '.CCYYYYCC.',
    '.CCCYYCCCc', '.CCCCCCCCc', '.CCCCCCCcc', '.CCCCCCCcc', '..cccccc..',
  ],
  water: [
    '....bb....', '....bb....', '...bbbb...', '...bwbb...', '..bbwbbb..',
    '.bbbwbbbB.', '.bbbbbbbB.', '.bbbbbbBB.', '..bbbbBB..', '...BBBB...',
  ],
  starter: [
    'SSSSSSSSSS', 'WWWWWWWWWW', 'WWWWWWWWWW', 'WWWrrrrWWW', 'WWrrWWrrWW',
    'WWrrWWrrWW', 'WWWrrrrWWW', 'WWWWWWWWWW', 'WWWWWWWWWW', 'SSSSSSSSSS',
  ],
  hop: [
    '....dd....', '....dg....', '...ggGgg..', '..gGgggGg.', '..ggGggGg.',
    '...gGgGg..', '...ggGgg..', '....gGg...', '.....gg...',
  ],
  apple: [
    '.....n.g..', '....n.gg..', '..aaa.aaa.', '.aaaaaaaaa', 'aawaaaaaaA',
    'aawaaaaaaA', 'aaaaaaaaaA', '.aaaaaaaaA', '..aaaaAA..', '...aAAA...',
  ],
  citric: [
    '....g.....', '...gg.....', '..YYYYYY..', '.YYyYYYYY.', 'YYyYYYYYYO',
    'YYYYYYYYYO', '.YYYYYYYO.', '..YYYOOO..',
  ],
  acetic: [
    '...rrrr...', '....ll....', '..llllll..', '.lppppppl.', '.lWrrrrWl.',
    '.lppppppl.', '.lppppppl.', '..llllll..',
  ],
  orange: [
    '.....ng...', '...oooooo.', '..oooooooq', '.ooowoooqq', '.ooowooooq',
    '.oooooooqq', '.oooooooqq', '..ooooooqq', '...qoooqq.', '....qqqq..',
  ],
  syrup: [
    '..rrrrrr..', '..rrrrrr..', '.llllllll.', '.luuuuuul.', '.luuyuuul.',
    '.luuuuuul.', '.luuuuUul.', '.luuuUUul.', '.llllllll.',
  ],
  gas: [
    '....rr....', '....dd....', '..SSSSSS..', '.SWSSSSSs.', '.SWSSSSSs.',
    '.SWwwwwSs.', '.SWwrrwSs.', '.SWwwwwSs.', '.SWSSSSSs.', '.ssssssss.',
  ],
  yeast: [
    '.WWWWWWWW.', 'WyyyyyyyyS', 'WyyyyyyyyS', 'WybbbbbbyS', 'WybwwwwbyS',
    'WybbbbbbyS', 'WyyyyyyyyS', '.SSSSSSSS.',
  ],
  mint: [
    '........gg', '.....gggGg', '...ggggGgG', '..gggGgggG', '..ggGgggG.',
    '.gggGggG..', '.dgggGG...', 'd.GGG.....', 'd.........',
  ],
}

/** Иконка ингредиента 12×12 с контуром */
export function iconRows(id: string): string[] {
  const sprite = SPRITES[id]
  const g = new Grid(12, 12)
  g.stamp(sprite, 1, Math.floor((12 - sprite.length) / 2))
  shade(g, 'C', 'cCC', x => 0.9 - x * 0.08)
  shade(g, 'b', 'Bbb', (x, y) => 0.9 - (x + y) * 0.04)
  shade(g, 'o', 'qoo', (x, y) => 0.95 - (x + y) * 0.04)
  shade(g, 'a', 'Aaa', (x, y) => 0.95 - (x + y) * 0.04)
  shade(g, 'g', 'Ggg', (x, y) => 0.9 - (x + y) * 0.05)
  g.outline('k')
  return g.rows()
}

/** Смеситель: стальной чан с заклёпками, входная труба сверху, смотровое окно, ножки */
export const VAT_W = 60
export const VAT_H = 44
/** Окно в чане (клетки сетки): внутри него HTML рисует пузыри */
export const VAT_WINDOW = { x: 13, y: 18, w: 34, h: 14 }

export const VAT_PAL = {
  k: '#1b1f2e',
  W: '#e3ebf0',
  S: '#b7c5cf',
  s: '#7f909c',
  d: '#4f5d6a',
  O: '#e0632e',
  f: '#23363b',
} satisfies Palette

export function vatRows(): string[] {
  const g = new Grid(VAT_W, VAT_H)
  // входная труба: широкая, с фланцем
  g.rect(23, 0, 14, 9, 's')
  g.rect(20, 7, 20, 3, 'd')
  g.rect(20, 7, 20, 1, 's')
  // корпус и скошенная крышка
  g.rect(4, 13, 52, 26, 's')
  for (let i = 0; i < 3; i++) g.rect(4 + i * 2, 10 + i, 52 - i * 4, 1, 's')
  // ножки
  g.rect(7, 39, 4, 5, 's')
  g.rect(49, 39, 4, 5, 's')
  // объём цилиндров: свет слева, к правому краю темнеет, у самого края — отражённый свет
  shade(g, 's', 'dsSW', x => {
    if (x >= 23 && x < 37) return 0.95 - (x - 23) * 0.07
    if (x < 20 || x > 40) return Math.min(1, 0.8 - Math.abs((x - 4) / 52 - 0.26) * 1.35 + (x > 53 ? 0.2 : 0))
    return 0.3
  })
  // пояса, заклёпки с тенью, стыки листов
  g.rect(4, 14, 52, 1, 'd')
  g.rect(4, 36, 52, 1, 'd')
  g.rect(4, 15, 52, 1, 'S')
  g.rect(4, 37, 52, 1, 'S')
  for (let x = 7; x < 54; x += 4) {
    g.set(x, 16, 'W')
    g.set(x + 1, 17, 'd')
    g.set(x, 34, 'W')
    g.set(x + 1, 35, 'd')
  }
  for (const x of [18, 30, 42]) for (let y = 18; y < 33; y++) if (y % 4 !== 3) g.set(x, y, 'd')
  // окно: тёмная рама и блик на стекле
  g.rect(VAT_WINDOW.x - 1, VAT_WINDOW.y - 1, VAT_WINDOW.w + 2, VAT_WINDOW.h + 2, 'k')
  g.rect(VAT_WINDOW.x, VAT_WINDOW.y, VAT_WINDOW.w, VAT_WINDOW.h, 'f')
  g.rect(VAT_WINDOW.x - 2, VAT_WINDOW.y - 2, VAT_WINDOW.w + 4, 1, 'd')
  g.rect(VAT_WINDOW.x - 2, VAT_WINDOW.y + VAT_WINDOW.h + 1, VAT_WINDOW.w + 4, 1, 'W')
  // боковые трубы, справа вентиль
  g.rect(56, 21, 4, 3, 's')
  g.rect(56, 21, 4, 1, 'S')
  g.rect(58, 19, 2, 7, 'O')
  g.rect(0, 28, 4, 3, 's')
  g.rect(0, 28, 4, 1, 'S')
  // подошвы ножек
  g.rect(5, 43, 8, 1, 'd')
  g.rect(47, 43, 8, 1, 'd')
  g.outline('k')
  return g.rows()
}

/** Начальник смены: мужчина 45–50 лет, крепкий, тёмно-синяя спецовка с логотипом «Очаково», каска, суровый, но добрый взгляд, рация в руке */
export const FOREMAN_W = 36
export const FOREMAN_H = 52

export const FOREMAN_PAL = {
  k: '#1b1f2e',
  h: '#e0a98a', // кожа
  H: '#b97b5e', // кожа в тени
  q: '#d4806c', // нос, румянец
  b: '#3a2c24', // брови
  e: '#f4ece0', // белок глаза
  z: '#8d949b', // щетина, седина
  M: '#6e302c', // рот
  Y: '#f4d35e', // каска
  y: '#fff3b0',
  Z: '#c9a227',
  N: '#1f3a6e', // спецовка
  n: '#16294d',
  m: '#3c5fa0',
  r: '#cd004b',
  W: '#f4ece0',
  T: '#2a3036', // рация
  t: '#4b545c',
  s: '#7f909c',
  G: '#6ee06e', // индикатор рации
} satisfies Palette

export function foremanRows(): string[] {
  const g = new Grid(FOREMAN_W, FOREMAN_H)
  const ellipse = (cx: number, cy: number, rx: number, ry: number, c: string, keep?: (x: number, y: number) => boolean) => {
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < g.w; x++) {
        const dx = (x + 0.5 - cx) / rx
        const dy = (y + 0.5 - cy) / ry
        if (dx * dx + dy * dy <= 1 && (!keep || keep(x, y))) g.set(x, y, c)
      }
  }

  // Спецовка: широкие плечи
  const half = (y: number) => [9, 11, 13, 14, 15][y - 33] ?? 16
  for (let y = 33; y < g.h; y++) {
    g.rect(18 - half(y), y, half(y) * 2, 1, 'N')
    g.set(18 - half(y) + 1, y, 'm')
    g.rect(18 + half(y) - 4, y, 3, 1, 'n')
  }
  // воротник, молния
  g.rect(13, 33, 4, 3, 'n')
  g.rect(19, 33, 4, 3, 'n')
  for (let y = 36; y < g.h; y++) g.set(18, y, y % 2 ? 's' : 'n')
  // логотип «О» на груди
  g.stamp(['.rrrr.', 'rr..rr', 'rr..rr', 'rr..rr', 'rr..rr', '.rrrr.'], 7, 40)
  // световозвращающая полоса
  g.rect(2, 48, 32, 1, 'W')

  // Рация в руке справа от зрителя
  g.rect(26, 40, 5, 10, 'T')
  g.rect(27, 41, 3, 3, 't')
  g.set(28, 46, 'G')
  g.rect(30, 36, 1, 4, 'T')
  g.rect(24, 46, 3, 4, 'h')

  // Шея и голова
  g.rect(15, 29, 6, 5, 'H')
  ellipse(18, 18, 8.5, 9.5, 'h')
  g.rect(9, 17, 2, 4, 'h')
  g.rect(25, 17, 2, 4, 'h')
  // щетина на челюсти
  for (let y = 22; y < 28; y++)
    for (let x = 11; x < 25; x++) {
      const inside = g.get(x, y) === 'h'
      if (inside && (x * 7 + y * 13) % 5 < 2 && y > 22 + Math.abs(x - 18) / 4) g.set(x, y, 'z')
    }

  // Каска: купол, козырёк, гребень
  ellipse(18, 11.5, 10.5, 7.5, 'Y', (_, y) => y <= 11)
  g.rect(7, 12, 22, 2, 'Y')
  g.rect(7, 13, 22, 1, 'Z')
  g.rect(16, 4, 4, 8, 'y')
  g.rect(24, 6, 3, 6, 'Z')

  // Суровый взгляд: нахмуренные брови, но глаза мягкие
  g.rect(12, 15, 5, 1, 'b')
  g.rect(20, 15, 5, 1, 'b')
  g.set(16, 16, 'b')
  g.set(20, 16, 'b')
  g.rect(13, 17, 3, 1, 'e')
  g.rect(21, 17, 3, 1, 'e')
  g.set(14, 17, 'k')
  g.set(22, 17, 'k')
  g.rect(13, 18, 3, 1, 'H')
  g.rect(21, 18, 3, 1, 'H')
  // нос, морщины у глаз
  g.rect(17, 19, 2, 3, 'H')
  g.rect(17, 22, 2, 1, 'q')
  g.set(11, 19, 'H')
  g.set(25, 19, 'H')
  // рот: прямой, уголки чуть вверх — «ворчливый, но справедливый»
  g.rect(15, 25, 6, 1, 'M')
  g.set(14, 24, 'H')
  g.set(21, 24, 'H')

  // объём: свет слева сверху, складки на ткани
  for (let y = 36; y < g.h; y++) for (const x of [10, 11, 25, 26]) if (g.get(x, y) === 'N' && (y + x) % 5 < 3) g.set(x, y, 'n')
  shade(g, 'N', 'nNNm', (x, y) => 0.95 - (x - 2) * 0.02 - Math.max(0, y - 40) * 0.01)
  shade(g, 'h', 'Hhh', x => 1.0 - Math.max(0, x - 17) * 0.06)
  shade(g, 'Y', 'ZYy', (x, y) => 0.9 - (x - 8) * 0.03 + (y < 7 ? 0.1 : 0))
  g.outline('k')
  return g.rows()
}

/** Плитка кирпичной стены 32×16 клеток (кирпич 16×8, смещение рядов): у каждого кирпича свой оттенок, сверху блик, снизу тень, швы тёмные. Масштабируется в CSS без сглаживания */
export function wallUrl(): string {
  try {
    const W = 32
    const H = 16
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) return 'none'
    const base = ['#7a4636', '#86503c', '#6e3f31', '#8a5540']
    const draw = (x: number, y: number, w: number, h: number, c: string) => {
      ctx.fillStyle = c
      ctx.fillRect(x, y, w, h)
    }
    draw(0, 0, W, H, '#3a221a')
    for (let row = 0; row < 2; row++)
      for (let col = -1; col < 3; col++) {
        const x = col * 16 + (row ? 8 : 0)
        const y = row * 8
        draw(x + 1, y + 1, 15, 7, base[(row * 3 + col + 4) % base.length])
        draw(x + 1, y + 1, 15, 1, '#a86a50')
        draw(x + 1, y + 7, 15, 1, '#54301f')
      }
    return `url(${canvas.toDataURL()})`
  } catch {
    return 'none'
  }
}

/** Рисует плитку по строкам-символам (1 символ = 1 клетка) и отдаёт как url() для CSS */
function tileUrl(rows: string[], pal: Record<string, string>): string {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = rows[0].length
    canvas.height = rows.length
    const ctx = canvas.getContext('2d')
    if (!ctx) return 'none'
    rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (!pal[ch]) return
        ctx.fillStyle = pal[ch]
        ctx.fillRect(x, y, 1, 1)
      }),
    )
    return `url(${canvas.toDataURL()})`
  } catch {
    return 'none'
  }
}

// Палитра общая с лентой цеха розлива (bottling/pixel.ts): сталь W/S/s/d, полотно B/b, контур k
const BELT_PAL = { k: '#1b1f2e', W: '#e3ebf0', S: '#b7c5cf', s: '#7f909c', d: '#4f5d6a', B: '#3b4266', b: '#2a2f4a', h: '#4b5483', g: '#20243a' }

/** Плитка полотна ленты 16×8: стык пластин, блик, рифление, тень снизу. Едет вниз */
const BELT_TILE = [
  'gggggggggggggggg',
  'hhhhhhhhhhhhhhhh',
  'BBBBBBBBBBBBBBBB',
  'BBhBBBBBBBBBBhBB',
  'BBbBBBBggBBBBbBB',
  'BBBBBBBBBBBBBBBB',
  'BBBBBBBBBBBBBBBB',
  'bbbbbbbbbbbbbbbb',
]

/** Боковины ленты 3×8: стальной борт с контуром у полотна и болтом посередине. Стоят на месте */
const RAIL_L = ['WSk', 'WSk', 'WSk', 'Wdk', 'sdk', 'WSk', 'WSk', 'sSk']
const RAIL_R = ['ksd', 'ksd', 'ksd', 'kSd', 'kdd', 'ksd', 'ksd', 'kdd']

/** Плитки ленты тех цеха: полотно и два борта */
export function beltUrls(): { belt: string; railL: string; railR: string } {
  return { belt: tileUrl(BELT_TILE, BELT_PAL), railL: tileUrl(RAIL_L, BELT_PAL), railR: tileUrl(RAIL_R, BELT_PAL) }
}
