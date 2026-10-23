import type { Haptic, Platform } from './types'

const PREFIX = 'ochakovo_'

export const localStore = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(PREFIX + key)
    } catch {
      return null // хранилище недоступно (приватный режим и т.п.)
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(PREFIX + key, value)
    } catch {
      // см. выше
    }
  },
}

// Вибрация в браузере есть только на Android; на iOS и ПК вызов просто ничего не делает
const VIBRATION: Record<Haptic, number | number[]> = {
  tap: 8,
  select: 5,
  success: [12, 60, 18],
  warning: [20, 40, 20],
  error: 40,
}

export function onDocumentHidden(cb: (hidden: boolean) => void) {
  const handler = () => cb(document.hidden)
  document.addEventListener('visibilitychange', handler)
  return () => document.removeEventListener('visibilitychange', handler)
}

export function createWebPlatform(): Platform {
  return {
    name: 'web',
    storage: {
      get: async key => localStore.get(key),
      set: async (key, value) => localStore.set(key, value),
    },
    haptic: type => navigator.vibrate?.(VIBRATION[type]),
    nativeBack: false,
    setBack: () => {},
    onSuspend: onDocumentHidden,
    user: null,
    startParam: new URLSearchParams(location.search).get('startapp'),
  }
}
