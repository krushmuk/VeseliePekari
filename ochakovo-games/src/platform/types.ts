export type Haptic = 'tap' | 'select' | 'success' | 'warning' | 'error'

/**
 * Всё, что зависит от того, где запущена игра: сайт, Telegram (позже VK).
 * Игровой код работает только с этим интерфейсом.
 */
export interface Platform {
  name: 'web' | 'telegram'
  /** Ключи — только латиница, цифры, _ и - (ограничение Telegram CloudStorage) */
  storage: {
    get(key: string): Promise<string | null>
    set(key: string, value: string): Promise<void>
  }
  haptic(type: Haptic): void
  /** Есть системная кнопка «назад» (Telegram) — свою в интерфейсе не рисуем */
  nativeBack: boolean
  /** Показать системную «назад» с обработчиком; null — спрятать */
  setBack(handler: (() => void) | null): void
  /** Игра ушла в фон (свернули, переключили вкладку) или вернулась */
  onSuspend(cb: (suspended: boolean) => void): () => void
  /** Поделиться: системное окно, в Telegram — выбор чата; иначе ссылка копируется в буфер */
  share(text: string, url: string): Promise<'shared' | 'copied' | 'failed'>
  user: { id: string; name: string } | null
  /** Параметр запуска: t.me/<bot>/<app>?startapp=<значение> */
  startParam: string | null
}
