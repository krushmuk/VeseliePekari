// Правила уровня «Скрещивание»: сорта, заказы, лимиты. Графики здесь нет.

/** Сорт яблок: сладость и кислинка. У выведенных сортов бывают дробные значения */
export interface Apple {
  id: string
  name: string
  sweet: number
  sour: number
  /** Базовые сорта лежат на полке с начала, выведенные появляются после скрещивания */
  base: boolean
}

export const BASE_APPLES: Apple[] = [
  { id: 'A', name: 'Дикое', sweet: 2, sour: 8, base: true },
  { id: 'B', name: 'Сладкое', sweet: 9, sour: 2, base: true },
  { id: 'V', name: 'Баланс', sweet: 5, sour: 5, base: true },
  { id: 'G', name: 'Кислое', sweet: 3, sour: 9, base: true },
  { id: 'D', name: 'Приторное', sweet: 10, sour: 1, base: true },
]

export interface Order {
  sweet: number
  sour: number
  /** Минимум скрещиваний, за которое заказ выполним (проверено перебором) */
  minCrosses: number
}

/** Три сорта: два простых и один в два шага */
export const ORDERS: Order[] = [
  { sweet: 6, sour: 4.5, minCrosses: 1 }, // Дикое + Приторное
  { sweet: 7, sour: 3.5, minCrosses: 1 }, // Сладкое + Сбалансированное
  { sweet: 8.5, sour: 2.25, minCrosses: 2 }, // (Сладкое + Сбалансированное) + Приторное
]

/** Запас скрещиваний сверх минимума: лимит нужен, чтобы нельзя было перебирать бесконечно */
export const SPARE_CROSSES = 3
export const crossLimit = (order: Order) => order.minCrosses + SPARE_CROSSES

/** Сколько заказов можно провалить (кончились скрещивания), прежде чем уровень считается проваленным */
export const MAX_FAILS = 3

export const sameApple = (a: { sweet: number; sour: number }, b: { sweet: number; sour: number }) =>
  a.sweet === b.sweet && a.sour === b.sour

/** Среднее арифметическое родителей */
export function cross(a: Apple, b: Apple, id: string): Apple {
  return { id, name: `Гибрид ${id}`, sweet: (a.sweet + b.sweet) / 2, sour: (a.sour + b.sour) / 2, base: false }
}

export type Verdict = 'perfect' | 'sour' | 'cloying' | 'miss'

/** Попал ли гибрид в заказ; кислятина и приторность — крайние значения */
export function judge(apple: Apple, order: Order): Verdict {
  if (sameApple(apple, order)) return 'perfect'
  if (apple.sour >= 8) return 'sour'
  if (apple.sweet >= 8 && apple.sour <= 2) return 'cloying'
  return 'miss'
}

/** Звёзды: три — без проваленных заказов, две — один, одна — два; проигрыш — 0 */
export const starsFor = (fails: number) => (fails >= MAX_FAILS ? 0 : 3 - fails)

export const REPLIES = {
  perfect: 'О, да это же шедевр! Идеальный баланс! Такой сорт точно пойдёт в производство!',
  sour: 'Фу, это же невозможно пить! Ты что, хочешь, чтобы у клиентов скулы свело? Пробуй ещё!',
  cloying: 'Фу, это же невозможно пить! Слишком приторно, зубы слипнутся! Пробуй ещё!',
  miss: 'Не то. Посчитай среднее и подумай, какие сорта нужны.',
  clone: 'Эй, это же просто клонирование! Нужно смешивать разное, чтобы получить что-то новое!',
  dup: 'Такой сорт у нас уже есть. Попробуй другую пару.',
  fail: 'Скрещивания кончились, материал на исходе. Начнём заказ заново.',
}

/** Число в виде «4,5» */
export const fmt = (n: number) => String(n).replace('.', ',')
