# Очаково — мини-игры

Сборник мини-игр на React + Phaser 4 + TypeScript (Vite). Работает в браузере на компьютере и телефоне;
рассчитан на перенос в VK Mini Apps и Telegram Mini Apps.

## Команды

```bash
npm install       # зависимости
npm run dev       # разработка: http://localhost:5173 (и с телефона по IP компьютера в той же Wi-Fi)
npm run build     # сборка в dist/ — статические файлы для любого хостинга
npm run preview   # посмотреть собранную версию
npm run lint      # проверка кода
```

Игра «Профессии» без лендинга (как в Telegram): `http://localhost:5173/?app`.
Все главы открыты: `?unlock`. Консоль на экране телефона: `?debug`.
Тест в Telegram — [docs/TELEGRAM.md](docs/TELEGRAM.md), план разработки — [docs/PLAN.md](docs/PLAN.md).

## Структура

```
src/
  App.tsx                 переключение: лендинг ↔ игра (после выхода — назад к блоку игры)
  screens/landing/        лендинг «Квас» — точка входа в игры
    Landing.tsx           секции страницы; шапка, первый экран и карточка-бокал запускают игру
    Bubbles.tsx           всплывающие пузырьки
    landing.css           стили, все под .landing, чтобы не задевать игры
  assets/landing/         фото для лендинга
  platform/               сайт / Telegram: хранилище, вибрация, кнопка «назад», пауза при сворачивании
  career/                 игра «Профессии»: карта глав → глава → уровень
    chapters.ts           главы и уровни (данные); у главы без своей механики — заглушка уровня
    progress.ts           звёзды и открытые уровни, сохранение (устройство + Telegram CloudStorage)
    CareerApp.tsx         переключение экранов
    screens/              MapScreen, ChapterScreen, LevelScreen (брифинг, пауза, итог), StubLevel
  games/
    registry.ts           список игр (добавлять новые сюда)
    shared/
      PhaserGame.tsx      встраивание Phaser в React (чёткая картинка на retina)
      sfx.ts              синтезированные звуки WebAudio
```

## Как устроена связка React ↔ Phaser

- Phaser рисует только игровой мир. Весь интерфейс (HUD, меню, кнопки) — React.
- Сцена получает объект `bridge` с колбэками (например, `onHud`, `onReady`).
- React управляет сценой через ссылку на неё: `begin()`, `restartGame()`, `scene.pause()/resume()`.
- Каждая игра — отдельный чанк (`lazy` в `registry.ts`): Phaser загружается только при запуске игры.

## Новая игра

1. Создайте папку `src/games/<id>/` с React-компонентом по умолчанию (`props: { onExit }`)
   (при необходимости — со сценой Phaser).
2. Добавьте запись в `src/games/registry.ts`. Первая готовая игра реестра — главная кнопка «Играть»
   на лендинге, остальные готовые появятся кнопками рядом в карточке игры.

## Механика для главы «Профессий»

1. Создайте компонент уровней главы (`props: LevelProps` из `career/chapters.ts`): он получает
   номер уровня и `paused`, а по окончании вызывает `onFinish(звёзды 0–3)`. Брифинг, пауза, итог
   и сохранение — в общей оболочке, их делать не нужно. Phaser — через `games/shared/PhaserGame`.
2. Укажите его в главе: `component: lazy(() => import('./driver/DriverLevels'))`.
