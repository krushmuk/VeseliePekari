import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

export interface GameProps {
  onExit: () => void
}

export interface GameInfo {
  id: string
  title: string
  description: string
  emoji: string
  /** Компонент игры грузится отдельным чанком только при запуске (вместе с Phaser) */
  component?: LazyExoticComponent<ComponentType<GameProps>>
}

// Чтобы добавить игру: создайте папку в src/games/<id> с компонентом по умолчанию
// и добавьте сюда запись.
export const GAMES: GameInfo[] = [
  {
    id: 'career',
    title: 'Профессии',
    description: 'Пройди путь по профессиям завода: глава за главой',
    emoji: '🏭',
    component: lazy(() => import('../career/CareerApp')),
  },
]
