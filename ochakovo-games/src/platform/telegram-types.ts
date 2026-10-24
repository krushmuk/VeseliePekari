// Минимальные типы Telegram Web App — только то, чем пользуется игра.
// Полное описание: https://core.telegram.org/bots/webapps

type Callback = () => void

export interface TgBackButton {
  isVisible: boolean
  show(): void
  hide(): void
  onClick(cb: Callback): void
  offClick(cb: Callback): void
}

export interface TgHapticFeedback {
  impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void
  notificationOccurred(type: 'error' | 'success' | 'warning'): void
  selectionChanged(): void
}

export interface TgCloudStorage {
  setItem(key: string, value: string, cb?: (error: string | null, ok?: boolean) => void): void
  getItem(key: string, cb: (error: string | null, value?: string) => void): void
}

export interface TgWebApp {
  initData: string
  initDataUnsafe: {
    user?: { id: number; first_name: string; last_name?: string; username?: string }
    start_param?: string
  }
  version: string
  platform: string
  isExpanded: boolean
  isFullscreen?: boolean
  BackButton: TgBackButton
  HapticFeedback: TgHapticFeedback
  CloudStorage: TgCloudStorage
  isVersionAtLeast(version: string): boolean
  ready(): void
  openTelegramLink(url: string): void
  expand(): void
  close(): void
  disableVerticalSwipes?(): void
  setHeaderColor(color: string): void
  setBackgroundColor(color: string): void
  setBottomBarColor?(color: string): void
  onEvent(event: string, cb: Callback): void
  offEvent(event: string, cb: Callback): void
}

declare global {
  interface Window {
    Telegram?: { WebApp: TgWebApp }
  }
}
