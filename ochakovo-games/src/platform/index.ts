import { useEffect, useLayoutEffect, useRef } from 'react'
import { createTelegramPlatform, isTelegramLaunch, loadTelegramSdk } from './telegram'
import type { Platform } from './types'
import { createWebPlatform } from './web'

export type { Haptic, Platform } from './types'

/** Текущая платформа. Доступна после initPlatform() — до первого рендера (см. main.tsx) */
export let platform: Platform = createWebPlatform()

export async function initPlatform() {
  if (isTelegramLaunch()) {
    const tg = await loadTelegramSdk()
    // Без initData это не Telegram (например, адрес открыли в браузере): остаёмся на web
    if (tg?.initData) platform = createTelegramPlatform(tg)
  }
  if (platform.startParam === 'debug' || new URLSearchParams(location.search).has('debug')) {
    void loadDebugConsole()
  }
}

/**
 * Режим приложения: сразу игра, без лендинга. Включён в Telegram;
 * в браузере — параметром ?app (так удобно проверять вёрстку на ПК).
 */
export const isAppMode = () => platform.name !== 'web' || new URLSearchParams(location.search).has('app')

/**
 * Консоль разработчика прямо на экране телефона (eruda): ?debug в адресе
 * или startapp=debug в ссылке на мини-приложение.
 */
function loadDebugConsole() {
  return new Promise<void>(resolve => {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/eruda@3'
    script.onload = () => {
      ;(window as unknown as { eruda?: { init(): void } }).eruda?.init()
      resolve()
    }
    script.onerror = () => resolve()
    document.head.appendChild(script)
  })
}

/**
 * Действие «назад» для текущего экрана: системная кнопка Telegram и Escape на ПК.
 * На сайте экран дополнительно рисует свою кнопку (если !platform.nativeBack).
 * null — у экрана нет «назад».
 */
export function useBack(handler: (() => void) | null) {
  const ref = useRef(handler)
  useLayoutEffect(() => {
    ref.current = handler
  })
  const active = handler !== null

  useEffect(() => {
    if (!active) return
    const fire = () => ref.current?.()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fire()
    }
    platform.setBack(fire)
    window.addEventListener('keydown', onKey)
    return () => {
      platform.setBack(null)
      window.removeEventListener('keydown', onKey)
    }
  }, [active])
}
