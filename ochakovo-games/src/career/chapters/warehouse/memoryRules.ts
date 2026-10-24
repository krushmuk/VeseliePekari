// Правила уровня «Сверка»: раздача кодов по коробкам и оценка. Графики здесь нет.

import { LABEL_LETTERS, LABEL_NUMBERS } from './config'

/** Стеллаж: 5 коробок в ряду, 5 ярусов, 8 пар (остальные 9 коробок без пары) */
export const MEMORY = { cols: 5, tiers: 5, pairs: 8 }

/** Коробок без пары на стеллаже: все остальные места */
export const SINGLES = MEMORY.cols * MEMORY.tiers - MEMORY.pairs * 2

function shuffle<T>(items: T[]) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}

/** Коды по местам стеллажа: каждый код пары встречается дважды, остальные — по одному раз, все вперемешку */
export function dealCodes() {
  const all = shuffle([...LABEL_LETTERS].flatMap(l => LABEL_NUMBERS.map(n => `${l}${n}`)))
  const codes = all.slice(0, MEMORY.pairs + SINGLES)
  return shuffle([...codes.slice(0, MEMORY.pairs), ...codes.slice(0, MEMORY.pairs), ...codes.slice(MEMORY.pairs)])
}

/** Время прохождения, до которого дают три и две звезды, секунд. Ограничения по времени нет: дольше — одна звезда */
export const STAR_TIMES = { three: 60, two: 100 }

/** Звёзды по общему времени сверки: все пары найдены — 1, не дольше 100 с — 2, не дольше 60 с — 3. Ошибки на звёзды не влияют */
export function starsFor(seconds: number) {
  if (seconds <= STAR_TIMES.three) return 3
  return seconds <= STAR_TIMES.two ? 2 : 1
}
