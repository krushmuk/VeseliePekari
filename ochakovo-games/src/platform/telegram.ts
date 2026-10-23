import type { TgWebApp } from './telegram-types'
import type { Platform } from './types'
import { localStore, onDocumentHidden } from './web'

/** Цвет шапки и фона Telegram под фон игры (см. --app-bg в career.css) */
const APP_BG = '#2a1305'
const CLOUD_TIMEOUT = 3000

/**
 * Telegram передаёт параметры запуска в hash адреса (#tgWebAppData=…).
 * Запоминаем факт запуска на сессию: после перезагрузки страницы hash может пропасть.
 */
export function isTelegramLaunch() {
  const KEY = 'ochakovo_tg'
  try {
    if (/tgWebApp(Data|Platform|Version)=/.test(location.hash)) {
      sessionStorage.setItem(KEY, '1')
      return true
    }
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Скрипт Telegram грузим только внутри Telegram: обычным посетителям сайта он не нужен.
 * Копия лежит в public/: telegram.org из России отвечает медленно (до нескольких секунд).
 * Обновлять: curl -o public/telegram-web-app.js https://telegram.org/js/telegram-web-app.js
 */
export function loadTelegramSdk(): Promise<TgWebApp | null> {
  if (window.Telegram?.WebApp) return Promise.resolve(window.Telegram.WebApp)
  return new Promise(resolve => {
    const script = document.createElement('script')
    script.src = `${import.meta.env.BASE_URL}telegram-web-app.js`
    script.onload = () => resolve(window.Telegram?.WebApp ?? null)
    script.onerror = () => resolve(null)
    document.head.appendChild(script)
  })
}

export function createTelegramPlatform(tg: TgWebApp): Platform {
  const at = (v: string) => tg.isVersionAtLeast(v)

  tg.ready()
  tg.expand()
  // Без этого свайп вниз внутри игры сворачивает мини-приложение
  if (at('7.7')) tg.disableVerticalSwipes?.()
  if (at('6.1')) {
    tg.setHeaderColor(APP_BG)
    tg.setBackgroundColor(APP_BG)
  }
  if (at('7.10')) tg.setBottomBarColor?.(APP_BG)
  // Отступы Telegram (--tg-safe-area-*) подключаются в CSS через этот класс
  document.documentElement.classList.add('tg')

  const cloud = at('6.9') ? tg.CloudStorage : null
  const haptics = at('6.1') ? tg.HapticFeedback : null
  let backHandler: (() => void) | null = null

  const user = tg.initDataUnsafe.user
  return {
    name: 'telegram',
    storage: {
      // Облако — основное хранилище (прогресс на всех устройствах), localStorage — запасное
      // на случай ошибки или долгого ответа
      get: key =>
        new Promise(resolve => {
          const local = localStore.get(key)
          if (!cloud) return resolve(local)
          const timer = setTimeout(() => resolve(local), CLOUD_TIMEOUT)
          cloud.getItem(key, (error, value) => {
            clearTimeout(timer)
            resolve(error || !value ? local : value)
          })
        }),
      set: async (key, value) => {
        localStore.set(key, value)
        cloud?.setItem(key, value)
      },
    },
    haptic: type => {
      if (!haptics) return
      if (type === 'tap') haptics.impactOccurred('light')
      else if (type === 'select') haptics.selectionChanged()
      else haptics.notificationOccurred(type)
    },
    nativeBack: at('6.1'),
    setBack: handler => {
      if (!at('6.1')) return
      if (backHandler) tg.BackButton.offClick(backHandler)
      backHandler = handler
      if (handler) {
        tg.BackButton.onClick(handler)
        tg.BackButton.show()
      } else {
        tg.BackButton.hide()
      }
    },
    onSuspend: cb => {
      const off = onDocumentHidden(cb)
      const on = () => cb(false)
      const offEv = () => cb(true)
      // activated/deactivated (Bot API 8.0): приложение свернули в шторку Telegram
      tg.onEvent('activated', on)
      tg.onEvent('deactivated', offEv)
      return () => {
        off()
        tg.offEvent('activated', on)
        tg.offEvent('deactivated', offEv)
      }
    },
    user: user ? { id: String(user.id), name: user.first_name } : null,
    startParam: tg.initDataUnsafe.start_param ?? null,
  }
}
