import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Шрифты лежат в сборке (без запросов к Google Fonts — они нестабильны в РФ)
import '@fontsource-variable/unbounded'
import '@fontsource-variable/onest'
import './index.css'
import App from './App.tsx'
import { loadProgress } from './career/progress'
import { initPlatform } from './platform'

// Сначала определяем платформу (в Telegram — грузим его SDK) и читаем прогресс,
// чтобы первый экран сразу показал звёзды и открытые главы
void initPlatform().then(() => {
  loadProgress()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
