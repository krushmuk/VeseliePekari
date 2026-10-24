import { Grid, type Palette } from '../pixel'

// Пиксельный портрет мастера пресса: пожилой заводской работник со стажем, ещё советской закалки.
// Кепка, седые усы, красная спецовка с фирменным значком, кувалда на плече.
// Собирается на сетке Grid, как спрайты главы; рисуется в MasterArt.tsx.

export const MASTER_W = 36
export const MASTER_H = 52

export const MASTER_PAL = {
  k: '#1b1f2e', // контур
  h: '#e0a98a', // кожа
  H: '#b97b5e', // кожа в тени, морщины
  q: '#d4806c', // румянец, кончик носа
  w: '#c4c8cc', // седина
  W: '#f0f2f4', // седина на свету
  m: '#8d949b', // усы в тени
  M: '#6e302c', // рот
  c: '#3b4266', // кепка
  C: '#56608e', // кепка на свету
  D: '#262b44', // козырёк
  r: '#cd004b', // фирменный красный
  R: '#8f0035', // красный в тени
  p: '#e8366f', // красный на свету
  t: '#5b6770', // рубашка
  T: '#3f4a52', // рубашка в тени
  y: '#f4ece0', // белый значок
  o: '#8b5a2b', // дерево рукояти
  O: '#b07a3e', // дерево на свету
  s: '#7f909c', // сталь
  S: '#b7c5cf', // сталь на свету
  g: '#2d2a28', // грязь, масло
} satisfies Palette

/** Детерминированный «случайный» ряд: портрет не должен меняться между запусками */
const hash = (a: number, b: number) => {
  const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return n - Math.floor(n)
}

export function masterRows(): string[] {
  const g = new Grid(MASTER_W, MASTER_H)
  const ellipse = (cx: number, cy: number, rx: number, ry: number, c: string, keep?: (x: number, y: number) => boolean) => {
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < g.w; x++) {
        const dx = (x + 0.5 - cx) / rx
        const dy = (y + 0.5 - cy) / ry
        if (dx * dx + dy * dy <= 1 && (!keep || keep(x, y))) g.set(x, y, c)
      }
  }

  // Спецовка: плечи расширяются к груди
  const half = (y: number) => [8, 10, 12, 13, 14][y - 33] ?? 15
  for (let y = 33; y < g.h; y++) g.rect(18 - half(y), y, half(y) * 2, 1, 'r')
  // свет слева, тень справа, шов по плечу
  for (let y = 34; y < g.h; y++) {
    g.set(18 - half(y) + 1, y, 'p')
    g.rect(18 + half(y) - 4, y, 3, 1, 'R')
  }
  g.rect(10, 33, 8, 1, 'p')
  // рубашка в вырезе, отвороты воротника и молния
  const v = [4, 4, 3, 3, 2, 2, 1]
  v.forEach((h, i) => {
    g.rect(18 - h, 34 + i, h * 2, 1, 't')
    g.rect(18, 34 + i, h, 1, 'T')
  })
  g.rect(12, 33, 2, 4, 'R')
  g.rect(22, 33, 2, 4, 'R')
  for (let y = 41; y < g.h; y++) g.set(18, y, y % 2 ? 's' : 'S')
  // нагрудный карман слева и значок справа
  g.rect(7, 42, 7, 5, 'R')
  g.rect(8, 43, 5, 3, 'r')
  g.set(10, 42, 'S')
  g.stamp(['yyyyyyy', 'yryyryy', 'yrrrrry', 'yyyyyyy'], 22, 42)

  // Кувалда на плече: стальной боёк сверху, деревянная рукоять, рука держит её снизу
  g.rect(25, 26, 9, 6, 's')
  g.rect(25, 26, 9, 1, 'S')
  g.rect(25, 26, 1, 6, 'S')
  g.rect(32, 27, 2, 5, 'g')
  g.rect(29, 32, 2, 13, 'o')
  g.rect(29, 32, 1, 13, 'O')
  g.rect(27, 43, 6, 5, 'h')
  g.rect(27, 45, 6, 1, 'H')
  g.rect(28, 47, 4, 1, 'H')

  // Шея и голова
  g.rect(14, 29, 8, 5, 'h')
  g.rect(14, 29, 8, 2, 'H')
  ellipse(18, 19.5, 8, 10.5, 'h')
  // уши и седина по бокам
  g.rect(9, 17, 2, 5, 'h')
  g.rect(25, 17, 2, 5, 'h')
  g.rect(9, 18, 1, 3, 'H')
  g.rect(26, 18, 1, 3, 'H')
  g.rect(9, 12, 2, 5, 'w')
  g.rect(25, 12, 2, 5, 'w')
  g.set(9, 12, 'm')
  g.set(26, 12, 'm')

  // Кепка: тулья, козырёк, тень на лбу, значок
  ellipse(18, 11.5, 10, 7.5, 'c', (_, y) => y <= 11)
  for (const [x, y] of [[12, 7], [13, 6], [14, 5], [11, 8], [12, 8], [15, 5]]) g.set(x, y, 'C')
  g.set(18, 4, 'C')
  g.rect(8, 12, 20, 1, 'c')
  g.rect(10, 13, 16, 1, 'D')
  g.rect(11, 14, 14, 1, 'H')
  g.rect(17, 9, 2, 2, 'r')

  // Лицо: брови, прищуренные глаза с мешками, морщины, нос, румянец
  g.rect(12, 16, 5, 1, 'w')
  g.rect(19, 16, 5, 1, 'w')
  g.set(15, 15, 'w')
  g.set(20, 15, 'w')
  g.set(11, 15, 'm')
  g.set(24, 15, 'm')
  g.rect(13, 18, 2, 1, 'k')
  g.rect(21, 18, 2, 1, 'k')
  g.rect(13, 19, 2, 1, 'H')
  g.rect(21, 19, 2, 1, 'H')
  g.set(11, 18, 'H')
  g.set(24, 18, 'H')
  g.rect(11, 19, 1, 3, 'H')
  g.rect(24, 19, 1, 3, 'H')
  g.rect(17, 18, 1, 3, 'H')
  g.rect(17, 21, 2, 1, 'q')
  g.set(18, 20, 'h')
  g.rect(12, 20, 2, 1, 'q')
  g.rect(22, 20, 2, 1, 'q')

  // Густые седые усы, свисающие по краям рта
  g.rect(13, 22, 10, 1, 'm')
  g.rect(11, 23, 14, 1, 'w')
  for (const x of [13, 14, 21, 22]) g.set(x, 23, 'W')
  g.rect(11, 24, 5, 1, 'm')
  g.rect(20, 24, 5, 1, 'm')
  g.rect(16, 24, 4, 1, 'M')
  g.rect(11, 25, 2, 1, 'm')
  g.rect(23, 25, 2, 1, 'm')
  // щетина на подбородке
  for (let y = 26; y < 30; y++)
    for (let x = 13; x < 23; x++) if (hash(x, y) > 0.55) g.set(x, y, hash(y, x) > 0.5 ? 'w' : 'm')

  g.outline('k')

  // Грязь и масло на спецовке — после контура, чтобы не обводились
  for (let i = 0; i < 16; i++) {
    const x = 5 + Math.floor(hash(i, 21) * 26)
    const y = 36 + Math.floor(hash(i, 22) * 15)
    if (g.get(x, y) === 'r' || g.get(x, y) === 'R') g.set(x, y, 'g')
  }
  return g.rows()
}
