import { lazy, Suspense, useState } from 'react'
import { GAMES } from './games/registry'
import { isAppMode } from './platform'
import { Landing } from './screens/landing/Landing'

const CareerApp = lazy(() => import('./career/CareerApp'))

export default function App() {
  const [gameId, setGameId] = useState<string | null>(null)
  // После выхода из игры возвращаем игрока к блоку игры, а не в начало лендинга
  const [returned, setReturned] = useState(false)
  const Game = GAMES.find(g => g.id === gameId)?.component

  // В Telegram (и с ?app) сразу игра «Профессии», без лендинга
  if (isAppMode()) {
    return (
      <Suspense fallback={<div className="loading">Загрузка…</div>}>
        <CareerApp />
      </Suspense>
    )
  }

  if (Game) {
    return (
      <Suspense fallback={<div className="loading">Загрузка…</div>}>
        <Game
          onExit={() => {
            setGameId(null)
            setReturned(true)
          }}
        />
      </Suspense>
    )
  }

  return <Landing onPlay={setGameId} scrollTo={returned ? 'game' : undefined} />
}
