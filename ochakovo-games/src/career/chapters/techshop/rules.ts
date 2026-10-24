// Правила уровня «Смеситель»: что едет по трубе, реплики начальника смены и звёзды. Графики здесь нет.

export interface Ingredient {
  id: string
  name: string
  /** Короткая подпись для тесной технологической карты */
  short: string
  /** По технологической карте — должен попасть в смеситель */
  right: boolean
  /** Реплика начальника смены, если лишний ингредиент проскочил в чан */
  reply?: string
}

export const INGREDIENTS: Ingredient[] = [
  { id: 'malt', name: 'Ржаной солод', short: 'Солод', right: true },
  { id: 'water', name: 'Вода', short: 'Вода', right: true },
  { id: 'starter', name: 'Закваска', short: 'Закваска', right: true },
  { id: 'hop', name: 'Хмель', short: 'Хмель', right: false, reply: 'Ты что натворил?! Ты в квас хмель кинул? Мы что, пиво варим? Убери это немедленно!' },
  { id: 'apple', name: 'Яблочный сок', short: 'Яблоко', right: false, reply: 'Яблочный сок в квас? Это тебе не компот! Читай карту!' },
  { id: 'citric', name: 'Лимонная кислота', short: 'Кислота', right: false, reply: 'Лимонная кислота! Квас у нас с закваской, а не с лимоном. Следи внимательнее!' },
  { id: 'acetic', name: 'Уксусная кислота', short: 'Уксус', right: false, reply: 'Уксус?! Ты хочешь, чтобы партию вылили? Это не та кислота!' },
  { id: 'mint', name: 'Мята', short: 'Мята', right: false, reply: 'Мята — в чай, а не в квас! Ловить надо было!' },
]

/** Ингредиент для карт уровня 2: правильность зависит от смесителя, реплика — тоже */
const ing = (id: string, name: string, short: string, right: boolean, reply?: string): Ingredient => ({ id, name, short, right, reply })

/** Смеситель: рецепт на доске и всё, что едет к нему по ленте */
export interface Line {
  recipe: string
  pool: Ingredient[]
}

/** Уровень: смесители, время и темп. `compact` — две линии рядом, плашки и подписи мельче */
export interface LevelConfig {
  lines: Line[]
  compact: boolean
  /** Диалоги dialogs/<имя>.txt */
  intro: string
  outro: string
  speedAt: (progress: number) => number
  gapAt: (progress: number) => number
}

const KVASS: Line = {
  recipe: 'Квас «Очаковский»',
  pool: [
    ing('malt', 'Ржаной солод', 'Солод', true),
    ing('water', 'Вода', 'Вода', true),
    ing('starter', 'Закваска', 'Закваска', true),
    ing('orange', 'Апельсиновый сок', 'Апельсин', false, 'Апельсиновый сок в квас? Это же не фанта! Читай карту!'),
  ],
}

const LEMONADE: Line = {
  recipe: 'Лимонад «Ситро»',
  pool: [
    ing('water', 'Вода', 'Вода', true),
    ing('syrup', 'Сахарный сироп', 'Сироп', true),
    ing('orange', 'Апельсиновый сок', 'Апельсин', true),
    ing('gas', 'Газ CO2', 'Газ', true),
    ing('malt', 'Ржаной солод', 'Солод', false, 'Эй! Ты куда смотришь?! Там же лимонад! Зачем ты туда солод кинул? Это же не по карте!'),
    ing('yeast', 'Дрожжи', 'Дрожжи', false, 'Дрожжи в лимонад?! Он же у тебя забродит! Это не по карте!'),
    ing('hop', 'Хмель', 'Хмель', false, 'Хмель в лимонад? Здесь тебе не пивоварня! Убери!'),
  ],
}

export const LEVELS: LevelConfig[] = [
  {
    lines: [{ recipe: 'Квас «Очаковский»', pool: INGREDIENTS }],
    compact: false,
    intro: 'тех-уровень-1',
    outro: 'тех-уровень-1-финал',
    speedAt: p => 0.1 + 0.2 * p,
    gapAt: p => 0.3 - 0.06 * p,
  },
  {
    lines: [KVASS, LEMONADE],
    compact: true,
    intro: 'тех-уровень-2',
    outro: 'тех-уровень-2-финал',
    speedAt: p => 0.1 + 0.16 * p,
    gapAt: p => 0.38 - 0.06 * p,
  },
]

export const RIGHT_REPLY = 'Стой! Это по карте! Правильное не выбрасывай!'

export const MAX_ERRORS = 3

/** Время уровня, с: если за него не набралось три ошибки — уровень пройден */
export const TIME_LIMIT = 60

/** Следующий ингредиент ленты: правильный и лишний выпадают примерно поровну */
export function randomIngredient(pool: Ingredient[]): Ingredient {
  const want = Math.random() < 0.5
  const list = pool.some(i => i.right === want) ? pool.filter(i => i.right === want) : pool
  return list[Math.floor(Math.random() * list.length)]
}

export const starsFor = (won: boolean, errors: number) => (won ? Math.max(1, 3 - errors) : 0)
