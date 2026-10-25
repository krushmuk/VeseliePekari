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

/** Системное окно «Поделиться» (с картинкой, если поддерживается); иначе копируем текст со ссылкой в буфер обмена */
export async function webShare(text: string, url: string, image?: Blob): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (navigator.share) {
      const files = image ? [new File([image], 'ochak.png', { type: 'image/png' })] : []
      if (files.length && navigator.canShare?.({ files })) {
        // ссылку кладём в текст: при отправке файла она иначе может потеряться
        await navigator.share({ files, text: `${text} ${url}` })
      } else {
        await navigator.share({ text, url })
      }
      return 'shared'
    }
    await navigator.clipboard.writeText(`${text} ${url}`)
    return 'copied'
  } catch {
    return 'failed' // закрыли окно или нет доступа к буферу
  }
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
    share: webShare,
    user: null,
    startParam: new URLSearchParams(location.search).get('startapp'),
  }
}
