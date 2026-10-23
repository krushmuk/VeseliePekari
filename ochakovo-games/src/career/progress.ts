import { useSyncExternalStore } from 'react'
import { platform } from '../platform'
import { localStore } from '../platform/web'
import { CHAPTERS, type ChapterInfo } from './chapters'

// Прогресс игрока. Сохранение компактное (в Telegram CloudStorage до 4 КБ на ключ):
// { v: версия, s: { главa: [звёзды по уровням] }, i: [главы, где вступление уже показано] }

const KEY = 'progress'
const VERSION = 1

interface Save {
  v: number
  s: Record<string, number[]>
  i: string[]
}

let save: Save = { v: VERSION, s: {}, i: [] }
const listeners = new Set<() => void>()

/** ?unlock в адресе открывает все главы и уровни — для проверки */
const unlockAll = new URLSearchParams(location.search).has('unlock')

function parse(raw: string | null): Save | null {
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as Save
    // Здесь будут миграции старых версий сохранения
    if (data.v !== VERSION || typeof data.s !== 'object') return null
    return { v: VERSION, s: data.s ?? {}, i: Array.isArray(data.i) ? data.i : [] }
  } catch {
    return null
  }
}

/** Два сохранения (облако и устройство) объединяем: по каждому уровню лучший результат */
function merge(a: Save, b: Save): Save {
  const s: Record<string, number[]> = { ...a.s }
  for (const [id, stars] of Object.entries(b.s)) {
    const cur = s[id] ?? []
    const len = Math.max(cur.length, stars.length)
    s[id] = Array.from({ length: len }, (_, k) => Math.max(cur[k] ?? 0, stars[k] ?? 0))
  }
  return { v: VERSION, s, i: [...new Set([...a.i, ...b.i])] }
}

/**
 * Сразу берём сохранение с устройства, а облачное (Telegram) подмешиваем, когда придёт:
 * экран не ждёт сеть. Если в облаке нашлось новое — экраны обновятся сами.
 */
export function loadProgress() {
  const local = parse(localStore.get(KEY))
  if (local) save = merge(save, local)
  void platform.storage.get(KEY).then(raw => {
    const remote = parse(raw)
    const next = remote ? merge(save, remote) : save
    if (JSON.stringify(next) !== JSON.stringify(save)) commit(next)
    // На устройстве прогресс новее облачного (например, запись в облако не дошла) — догоняем облако
    else if (JSON.stringify(remote) !== JSON.stringify(save)) void platform.storage.set(KEY, JSON.stringify(save))
  })
}

function commit(next: Save) {
  save = next
  listeners.forEach(l => l())
  void platform.storage.set(KEY, JSON.stringify(save))
}

const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export const useProgress = () => useSyncExternalStore(subscribe, () => save)

// ---------- Чтение ----------

export const levelStars = (p: Save, chapterId: string, index: number) => p.s[chapterId]?.[index] ?? 0

export const chapterStars = (p: Save, chapter: ChapterInfo) =>
  chapter.levels.reduce((sum, _, k) => sum + levelStars(p, chapter.id, k), 0)

export const totalStars = (p: Save) => CHAPTERS.reduce((sum, c) => sum + chapterStars(p, c), 0)

export const maxStars = (chapter: ChapterInfo) => chapter.levels.length * 3

/** Глава освоена — экзамен (последний уровень) пройден */
export const isChapterDone = (p: Save, chapter: ChapterInfo) =>
  levelStars(p, chapter.id, chapter.levels.length - 1) > 0

/** Вступительная миссия хранится в списке `i` под служебным ключом */
const PROLOGUE = '_prologue'

export const isPrologueDone = (p: Save) => unlockAll || p.i.includes(PROLOGUE)

/** Главы доступны после вступительной миссии, порядок прохождения не важен */
export const isChapterOpen = (p: Save, _index: number) => isPrologueDone(p)

export function isLevelOpen(p: Save, chapterId: string, index: number) {
  return unlockAll || index === 0 || levelStars(p, chapterId, index - 1) > 0
}

export const isIntroSeen = (p: Save, chapterId: string) => p.i.includes(chapterId)

// ---------- Запись ----------

/** Сохраняет результат, если он лучше прежнего */
export function recordResult(chapterId: string, index: number, stars: number) {
  if (stars <= levelStars(save, chapterId, index)) return
  const list = [...(save.s[chapterId] ?? [])]
  while (list.length <= index) list.push(0)
  list[index] = stars
  commit({ ...save, s: { ...save.s, [chapterId]: list } })
}

export function markIntroSeen(chapterId: string) {
  if (save.i.includes(chapterId)) return
  commit({ ...save, i: [...save.i, chapterId] })
}

export const markPrologueDone = () => markIntroSeen(PROLOGUE)

export type Progress = Save
