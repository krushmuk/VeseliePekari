// Маскот «Очаково»: лохматый зелёный комочек в красной кепке «ОЧАК», синей тельняшке и больших красных кроссовках
// (по наброску из REF/маскот.jpg). Рисуется кодом на сетке W×H целыми пикселями; ячейка — цвет или null.

export const MASCOT_W = 46
export const MASCOT_H = 57

export const MC = {
  k: '#1b1f2e', // контур
  g: '#8fcf6a', // шерсть
  gl: '#b4e58e',
  gd: '#5fa650',
  r: '#e0495a', // кепка и кроссовки
  rl: '#f0808a',
  rd: '#a62d44',
  w: '#f1f2f3',
  wd: '#bfc5c9', // тень козырька
  hat: '#e3c88f', // шляпа
  hl: '#f0dcae',
  hatd: '#b8975c',
  band: '#8a5a3c',
  vest: '#f58220', // жилет-спецовка
  vd: '#c75a12',
  refl: '#e4eaed',
  btn: '#7fa6d6',
  jacket: '#8b5a35', // пиджак
  jd: '#5f3b20',
  tie: '#1f5a35', // галстук
  tieDk: '#123a22',
  rb: '#2f6b3f', // резиновые сапоги
  rbd: '#1d4a2b',
  rbl: '#58a06a',
  bt: '#8b5a35', // рабочие ботинки
  btd: '#5f3b20',
  lace: '#ecdcae',
  sole: '#2b2118',
  sl: '#3f7fe0', // шлёпки
  sld: '#2a58a8',
  p2: '#f28a24', // тыква
  pd: '#c4561a',
  pl: '#ffb860',
  stem: '#6d8f2e',
  stemd: '#47601d',
  n: '#2e3a5c', // тельняшка
  nl: '#566a9a',
  e: '#f1f2f3', // глаза
  p: '#1b1f2e', // зрачки
}

type Cell = { c: string; z: number } | null

const rnd = (x: number, y = 0) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}

// Буквы кепки 3×5
const GLYPHS: Record<string, string[]> = {
  О: ['111', '101', '101', '101', '111'],
  Ч: ['101', '101', '111', '001', '001'],
  А: ['010', '101', '111', '101', '101'],
  К: ['101', '101', '110', '101', '101'],
}

/** Шерсть-чешуя как у хмелевой шишки: ряды черепицей, у каждой чешуйки тёмная нижняя кромка и светлый верх */
function scaleShade(x: number, y: number) {
  const row = Math.floor(y / 4)
  const lx = (x + (row % 2) * 3) % 6
  const ly = y % 4
  if (ly === 3 && lx >= 1 && lx <= 4) return MC.gd
  if (ly === 2 && (lx === 0 || lx === 5)) return MC.gd
  if (ly === 0 && (lx === 2 || lx === 3)) return MC.gl
  return MC.g
}

export type HeadWear = 'cap' | 'helmet' | 'hat' | 'pumpkin'

export type FeetWear = 'sneakers' | 'boots' | 'rubber' | 'slippers'

export type BodyWear = 'stripes' | 'vest' | 'coat' | 'blazer'

export function buildMascot(head: HeadWear = 'cap', body: BodyWear = 'stripes', feet: FeetWear = 'sneakers'): (string | null)[][] {
  const g: Cell[][] = Array.from({ length: MASCOT_H }, () => Array<Cell>(MASCOT_W).fill(null))
  const put = (x: number, y: number, c: string, z: number) => {
    if (x < 0 || y < 0 || x >= MASCOT_W || y >= MASCOT_H) return
    const cur = g[y][x]
    if (!cur || z >= cur.z) g[y][x] = { c, z }
  }
  const rect = (x0: number, y0: number, x1: number, y1: number, c: string, z: number) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, c, z)
  }

  // --- Ноги и обувь (z 1–2) ---
  if (feet === 'slippers') {
    // Босые ножки в синих шлёпках: плоская подошва и перемычка между пальцами
    for (const lx of [17, 26])
      for (let y = 43; y <= 52; y++) for (let x = lx; x <= lx + 2; x++) put(x, y, scaleShade(x, y), 1)
    const slipper = (x0: number, x1: number, toeRight: boolean) => {
      for (let y = 50; y <= 53; y++) for (let x = x0 + 1; x <= x1 - 1; x++) put(x, y, scaleShade(x, y), 2) // ступня
      rect(x0, 54, x1, 55, MC.sl, 2) // подошва
      rect(x0, 55, x1, 55, MC.sld, 2)
      const cx = toeRight ? x0 + 7 : x1 - 7
      rect(cx - 3, 51, cx + 3, 52, MC.sl, 3) // ремешок поперёк ступни
      rect(cx, 52, cx, 53, MC.sld, 3) // перемычка
    }
    slipper(9, 22, false)
    slipper(25, 38, true)
  } else {
    for (const lx of [17, 26]) rect(lx, 43, lx + 2, 51, MC.w, 1)
    const shoe = (x0: number, x1: number, toeRight: boolean) => {
      if (feet === 'rubber') {
        // Высокие тёмно-зелёные сапоги: голенище до колен, блик и отворот
        const sx0 = toeRight ? x0 : x1 - 6
        rect(sx0, 43, sx0 + 6, 52, MC.rb, 2)
        rect(x0, 50, x1, 54, MC.rb, 2) // стопа
        rect(sx0, 43, sx0 + 6, 44, MC.rbd, 2) // отворот
        rect(sx0 + 1, 45, sx0 + 1, 51, MC.rbl, 3) // блик
        rect(toeRight ? x1 - 2 : x0 + 1, 51, toeRight ? x1 - 1 : x0 + 2, 52, MC.rbl, 3)
        rect(x0, 53, x1, 55, MC.rbd, 2) // подошва
        for (let x = x0; x <= x1; x += 2) put(x, 55, MC.k, 2)
      } else if (feet === 'boots') {
        // Рабочие ботинки: коричневая кожа, невысокое голенище, шнуровка и толстая подошва
        const sx0 = toeRight ? x0 : x1 - 6
        rect(sx0, 46, sx0 + 6, 50, MC.bt, 2)
        rect(x0, 50, x1, 54, MC.bt, 2)
        rect(sx0, 46, sx0 + 6, 46, MC.btd, 2) // манжета
        rect(sx0 + 2, 47, sx0 + 4, 47, MC.lace, 3) // шнурки
        rect(sx0 + 2, 49, sx0 + 4, 49, MC.lace, 3)
        rect(toeRight ? x1 - 3 : x0, 50, toeRight ? x1 : x0 + 3, 51, MC.btd, 2) // носок
        rect(x0, 54, x1, 55, MC.sole, 2) // подошва
        for (let x = x0; x <= x1; x += 3) put(x, 55, MC.k, 2)
      } else {
        rect(x0, 50, x1, 54, MC.r, 2)
        rect(x0, 50, x1, 50, MC.rl, 2)
        for (let x = x0; x <= x1; x++) put(x, 55, x % 2 ? MC.w : MC.rd, 2) // волнистая подошва
        for (let x = x0; x <= x1; x++) put(x, 54, MC.w, 2)
        // шнурки
        const lx = toeRight ? x0 + 4 : x1 - 6
        for (let i = 0; i < 3; i++) rect(lx + i * 2, 50, lx + i * 2, 51, MC.w, 3)
      }
    }
    shoe(9, 22, false)
    shoe(25, 38, true)
  }

  // --- Тельняшка (z 3) ---
  for (let y = 33; y <= 44; y++) {
    const half = y > 40 ? 10 : 9 + (y > 36 ? 1 : 0)
    for (let x = 23 - half; x <= 22 + half; x++) put(x, y, y % 3 === 0 ? MC.nl : MC.n, 3)
  }
  // рукава и руки
  rect(10, 34, 13, 38, MC.n, 3)
  rect(32, 34, 35, 38, MC.n, 3)
  for (const [x0, x1] of [[9, 12], [33, 36]])
    for (let y = 39; y <= 41; y++) for (let x = x0; x <= x1; x++) put(x, y, scaleShade(x, y), 3)

  // --- Одежда поверх тельняшки (z 3.5, ниже головы) ---
  // Клетка рисуется, контур кладётся вокруг области
  const garment = (x0: number, x1: number, y0: number, y1: number, cell: (x: number, y: number) => string | null) => {
    for (let y = y0 - 1; y <= y1 + 1; y++)
      for (let x = x0 - 1; x <= x1 + 1; x++) {
        const c = cell(x, y)
        if (c) put(x, y, c, 3.5)
        else if ([cell(x - 1, y), cell(x + 1, y), cell(x, y - 1), cell(x, y + 1)].some(Boolean)) put(x, y, MC.k, 3.4)
      }
  }
  const inBox = (x: number, y: number, x0: number, x1: number, y0: number, y1: number) =>
    x >= x0 && x <= x1 && y >= y0 && y <= y1

  if (body === 'vest') {
    // Спецовка: оранжевый жилет со светоотражающими полосами и молнией
    garment(14, 30, 35, 44, (x, y) => {
      const d = Math.abs(x - 22)
      if (!inBox(x, y, 14, 30, 35, 44)) return null
      if (y <= 38 && d <= 38 - y) return null // вырез
      if (d === 0) return MC.k // молния
      if (y === 40 || y === 43) return MC.refl
      return d >= 8 ? MC.vd : MC.vest
    })
  } else if (body === 'blazer') {
    // Коричневый пиджак: белая рубашка в вырезе, тёмно-зелёный галстук, лацканы, карман и манжеты
    garment(11, 33, 33, 45, (x, y) => {
      const half = y > 40 ? 11 : 10
      const d = x - 22.5
      if (Math.abs(d) > half || y > 45) return null
      const gap = y <= 38 ? 2 : y === 39 ? 1 : 0.5 // разрез борта
      if (y >= 37 && Math.abs(d) < gap + 0.5) return MC.tie
      if (y >= 37 && y <= 40 && Math.abs(d) < gap + 2.5) return MC.jd // лацкан
      return y === 45 || Math.abs(d) > half - 1.5 ? MC.jd : MC.jacket
    })
    for (const [x0, x1] of [[10, 13], [32, 35]]) {
      garment(x0, x1, 34, 38, (x, y) => (inBox(x, y, x0, x1, 34, 38) ? (y === 38 ? MC.w : MC.jacket) : null))
    }
    // рубашка в вырезе над галстуком
    for (const [x, y] of [[20, 37], [21, 37], [24, 37], [25, 37], [21, 38], [24, 38]]) put(x, y, MC.w, 3.6)
    rect(22, 37, 23, 37, MC.tie, 3.6) // узел
    rect(22, 38, 23, 43, MC.tie, 3.6) // галстук
    rect(22, 44, 23, 44, MC.tieDk, 3.6) // кончик
    rect(22, 41, 23, 41, MC.tieDk, 3.6) // полоска
    rect(15, 41, 18, 41, MC.jd, 3.6) // клапан кармана
    put(27, 42, MC.jd, 3.6) // пуговица
  } else if (body === 'coat') {
    // Белый халат: длинные полы, рукава, лацканы, пуговицы и карман
    garment(11, 33, 33, 46, (x, y) => {
      const half = y > 40 ? 11 : 10
      if (Math.abs(x - 22.5) > half) return null
      if (y === 46) return MC.wd
      return x - 22.5 > half - 2 || y === 45 ? MC.wd : MC.w
    })
    garment(10, 13, 34, 38, (x, y) => (inBox(x, y, 10, 13, 34, 38) ? (y === 38 ? MC.wd : MC.w) : null))
    garment(32, 35, 34, 38, (x, y) => (inBox(x, y, 32, 35, 34, 38) ? (y === 38 ? MC.wd : MC.w) : null))
    for (let y = 37; y <= 46; y++) put(22, y, MC.k, 3.6) // борт
    for (const y of [40, 43]) put(24, y, MC.btn, 3.6) // пуговицы
    put(21, 37, MC.k, 3.6)
    put(23, 37, MC.k, 3.6)
    rect(15, 42, 19, 42, MC.k, 3.6) // карман
    rect(15, 43, 19, 44, MC.wd, 3.6)
  }

  // --- Шерстяная голова (z 4) ---
  const cx = 22.5
  const cy = 22
  for (let y = 4; y < 36; y++) {
    for (let x = 0; x < MASCOT_W; x++) {
      const dx = (x - cx) / 15
      const dy = (y - cy) / 14.5
      const a = Math.atan2(dy, dx)
      const tuft = 1 + 0.07 * Math.sin(a * 9) + 0.09 * rnd(Math.floor(a * 7 + 20))
      if (dx * dx + dy * dy <= tuft * tuft) {
        put(x, y, scaleShade(x, y), 4)
      }
    }
  }

  // --- Головной убор (z 5) ---
  if (head === 'cap') {
    for (let y = 3; y <= 13; y++) {
      const half = Math.round(13 * Math.sqrt(Math.max(0, 1 - ((13 - y) / 10.5) ** 2)))
      for (let x = 22 - half; x <= 22 + half; x++) put(x, y, y === 13 ? MC.rd : MC.r, 5)
    }
    rect(24, 13, 41, 15, MC.w, 5) // козырёк
    rect(24, 15, 41, 15, MC.wd, 5)
    rect(21, 0, 23, 1, MC.w, 5) // помпон
    rect(22, 2, 22, 2, MC.w, 5)
    rect(17, 5, 27, 5, MC.rl, 5)
    // надпись
    'ОЧАК'.split('').forEach((ch, i) => {
      GLYPHS[ch].forEach((row, dy) =>
        [...row].forEach((v, dx) => v === '1' && put(15 + i * 4 + dx, 7 + dy, MC.w, 6)),
      )
    })
  } else if (head === 'helmet') {
    // Белая каска: купол во всю голову, гребень по центру, небольшой козырёк справа, красная эмблема
    for (let y = 3; y <= 13; y++) {
      const half = Math.round(14 * Math.sqrt(Math.max(0, 1 - ((13 - y) / 10.5) ** 2)))
      for (let x = 22 - half; x <= 22 + half; x++) put(x, y, y === 13 ? MC.wd : MC.w, 5)
    }
    rect(26, 13, 39, 14, MC.w, 5) // небольшой козырёк справа
    rect(26, 14, 39, 14, MC.wd, 5)
    rect(21, 3, 23, 12, MC.wd, 5) // гребень
    rect(18, 4, 19, 8, MC.wd, 5) // блик-тень слева
    rect(26, 4, 27, 8, MC.wd, 5)
    rect(21, 8, 23, 10, MC.r, 6) // эмблема
    rect(22, 9, 22, 9, MC.w, 6)
  } else if (head === 'pumpkin') {
    // Половинка хеллоуинской тыквы, надвинутая на лоб: рёбра, зелёный хвостик и вырезанные глаза
    for (let y = 3; y <= 16; y++) {
      const half = Math.round(15 * Math.sqrt(Math.max(0, 1 - ((16 - y) / 13) ** 2)))
      for (let x = 22 - half; x <= 22 + half; x++) {
        const rib = [0, 5, 10].some(o => Math.abs(x - 22) === Math.round(o * (half / 15)) && (o > 0 || y > 3))
        put(x, y, y === 16 ? MC.pd : rib ? MC.pd : MC.p2, 5)
      }
    }
    rect(10, 6, 14, 6, MC.pl, 6) // блик
    rect(9, 7, 10, 9, MC.pl, 6)
    // вырезанные глаза-треугольники
    for (const cx of [16, 28])
      for (let i = 0; i < 4; i++) rect(cx - i, 9 + i, cx + i, 9 + i, MC.k, 7)
    rect(21, 0, 23, 2, MC.stem, 5) // хвостик
    rect(23, 0, 25, 0, MC.stem, 5)
    rect(21, 2, 23, 2, MC.stemd, 5)
  } else if (head === 'hat') {
    // Бежевая шляпа: широкие поля, невысокая тулья с коричневой лентой
    for (let y = 2; y <= 11; y++) {
      const half = y === 2 ? 8 : y === 3 ? 10 : 11
      for (let x = 22 - half; x <= 22 + half; x++) put(x, y, y === 2 ? MC.hl : MC.hat, 5)
    }
    rect(11, 9, 33, 10, MC.band, 6) // лента
    for (let x = 1; x <= 43; x++) {
      const edge = Math.abs(x - 22)
      const y0 = edge > 17 ? 11 : 12 // поля слегка загнуты вверх по краям
      rect(x, y0, x, 14, MC.hat, 5)
      put(x, 14, MC.hatd, 5)
    }
    rect(4, 12, 40, 12, MC.hl, 5)
  }

  // --- Лицо (z 7): сонные глаза, взгляд в сторону, улыбка ---
  const eye = (ex: number, ey: number, rx: number, ry: number) => {
    for (let y = -ry; y <= ry; y++)
      for (let x = -rx; x <= rx; x++) {
        const d = (x / (rx + 0.4)) ** 2 + (y / (ry + 0.4)) ** 2
        if (d <= 1) put(ex + x, ey + y, MC.e, 7)
        else if (d <= 1.9) put(ex + x, ey + y, MC.k, 7)
      }
    // зрачок смещён вправо
    rect(ex + rx - 2, ey, ex + rx - 1, ey + 1, MC.p, 8)
    // тяжёлое веко
    rect(ex - rx - 1, ey - ry, ex + rx + 1, ey - ry, MC.k, 8)
    rect(ex - rx, ey - ry + 1, ex + rx, ey - ry + 1, MC.gd, 7)
  }
  eye(15, 21, 4, 3)
  eye(28, 20, 3, 2)
  for (let x = 12; x <= 33; x++) {
    const t = (x - 22.5) / 11
    put(x, Math.round(25 + 3.4 * (1 - t * t)), MC.k, 8)
  }
  rect(11, 26, 11, 27, MC.k, 8)
  rect(34, 25, 34, 26, MC.k, 8)

  // Контур: пустая клетка рядом с закрашенной — чёрная; на стыке слоёв граница у нижнего слоя
  const out: (string | null)[][] = g.map(row => row.map(cell => cell?.c ?? null))
  for (let y = 0; y < MASCOT_H; y++)
    for (let x = 0; x < MASCOT_W; x++) {
      const cell = g[y][x]
      const nb = [g[y - 1]?.[x], g[y + 1]?.[x], g[y]?.[x - 1], g[y]?.[x + 1]]
      if (!cell && nb.some(Boolean)) out[y][x] = MC.k
      else if (cell && cell.z <= 5 && nb.some(n => n && n.z > cell.z && n.z <= 5 && n.z - cell.z >= 1 && cell.z >= 4)) {
        // голова под кепкой / тельняшка под головой
        out[y][x] = MC.k
      }
    }
  return out
}
