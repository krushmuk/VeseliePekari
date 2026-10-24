import { unlockAll, type Progress } from './progress'

// Элементы кастомизации маскота по слотам-слоям. Покупаются за звёзды с баланса.
// Первый элемент слота — стандартный: бесплатный и надет, пока не выбран другой.

export type CosmeticSlot = 'head' | 'body' | 'feet'

export interface Cosmetic {
  id: string
  title: string
  slot: CosmeticSlot
  /** Цена в звёздах; 0 — стандартный элемент */
  cost: number
}

export const SLOTS: { id: CosmeticSlot; title: string }[] = [
  { id: 'head', title: 'Головной убор' },
  { id: 'body', title: 'Одежда' },
  { id: 'feet', title: 'Обувь' },
]

/** Список-заготовка: названия и цены можно менять */
export const COSMETICS: Cosmetic[] = [
  { id: 'cap', title: 'Кепка «ОЧАК»', slot: 'head', cost: 0 },
  { id: 'helmet', title: 'Каска', slot: 'head', cost: 2 },
  { id: 'hat', title: 'Шляпа', slot: 'head', cost: 5 },
  { id: 'pumpkin', title: 'Тыква', slot: 'head', cost: 5 },

  { id: 'stripes', title: 'Тельняшка', slot: 'body', cost: 0 },
  { id: 'vest', title: 'Жилет', slot: 'body', cost: 2 },
  { id: 'coat', title: 'Лабораторный халат', slot: 'body', cost: 2 },
  { id: 'blazer', title: 'Пиджак с галстуком', slot: 'body', cost: 5 },

  { id: 'sneakers', title: 'Кроссовки', slot: 'feet', cost: 0 },
  { id: 'boots', title: 'Рабочие ботинки', slot: 'feet', cost: 3 },
  { id: 'slippers', title: 'Синие шлёпки', slot: 'feet', cost: 2 },
  { id: 'rubber', title: 'Резиновые сапоги', slot: 'feet', cost: 5 },
]

export const itemsOf = (slot: CosmeticSlot) => COSMETICS.filter(c => c.slot === slot)

/** Элемент доступен: стандартный или куплен (с ?unlock — все) */
export const isOwned = (p: Progress, item: Cosmetic) => unlockAll || item.cost === 0 || !!p.o?.includes(item.id)

/** Надетый элемент слота: выбранный и купленный, иначе стандартный */
export function equippedIn(p: Progress, slot: CosmeticSlot): Cosmetic {
  const items = itemsOf(slot)
  const chosen = items.find(c => c.id === p.e?.[slot])
  return chosen && isOwned(p, chosen) ? chosen : items[0]
}
