# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Документация, комментарии в коде и коммиты в проекте — на русском. Пишите так же.

## Состав репозитория

- `ochakovo-games/` — основной проект: мини-игры на React 19 + Phaser 4 + TypeScript (Vite). Вся активная разработка здесь.

## Команды (в `ochakovo-games/`)

```bash
npm run dev         # http://localhost:5173, доступен и с телефона в той же Wi-Fi (host: true)
npm run build       # tsc -b && vite build — это и есть проверка типов
npm run lint        # oxlint
npm run preview
```

Тестов нет. Параметры адреса для отладки: `?app` (игра «Профессии» без лендинга, как в Telegram), `?unlock` (все главы открыты), `?prologue` (проиграть пролог заново), `?debug` (консоль eruda на экране). Подробности теста в Telegram — `ochakovo-games/docs/TELEGRAM.md`; план игры «Профессии» — `ochakovo-games/docs/PLAN.md`.

## Архитектура `ochakovo-games`

**Запуск.** `main.tsx` сначала вызывает `initPlatform()` (в Telegram подгружает SDK) и `loadProgress()`, и только потом рендерит. `App.tsx` выбирает режим: в режиме приложения (`isAppMode()` — Telegram или `?app`) сразу открывается `career/CareerApp`, иначе — лендинг, с которого запускаются игры из `games/registry.ts`.

**Слой платформы (`src/platform/`).** Игровой код работает только с интерфейсом `Platform` (`types.ts`): хранилище, вибрация, кнопка «назад», пауза при сворачивании, пользователь, `startParam`. Реализации: `web.ts` и `telegram.ts`. Telegram определяется по `#tgWebAppData` в адресе; SDK берётся из локальной копии `public/telegram-web-app.js` (её не линтим и не правим вручную). «Назад» для экрана задаётся хуком `useBack(handler | null)`: системная кнопка Telegram плюс Escape; на сайте экран сам рисует кнопку, если `!platform.nativeBack`. Отступы под вырез — CSS-переменные `--safe-*` (`src/index.css`, класс `.tg`).

**Связка React ↔ Phaser.** Phaser рисует только игровой мир, весь интерфейс (HUD, меню, пауза) — React. Сцена получает объект `bridge` с колбэками (`onHud`, `onGameOver`, `onReady`); React управляет сценой через ссылку (`begin()`, `restartGame()`, `scene.pause()/resume()`). Встраивание — `games/shared/PhaserGame.tsx`. Каждая игра или глава — отдельный lazy-чанк, чтобы Phaser грузился только при запуске игры.

**Игра «Профессии» (`src/career/`).** Карта глав → глава → уровень. Главы и уровни описаны данными в `chapters.ts`. Механику главы подключают полем `component: lazy(() => import(...))` — это компонент с `LevelProps`: получает `levelIndex` и `paused`, по окончании вызывает `onFinish(0–3 звезды)`. Брифинг, пауза, итог и сохранение — в общей оболочке (`screens/LevelScreen.tsx`); пока у главы нет `component`, играется `StubLevel`. Глава с `fullscreen: true` занимает весь экран без шапки и фона оболочки, а кнопку паузы рисует сама (через `onPause` из `LevelProps`). Прогресс (`progress.ts`) сначала читается с устройства, затем подмешивается Telegram CloudStorage (лимит 4 КБ на ключ), и по каждому уровню берётся лучший результат.

**Отдельные игры (`src/games/`).** Новая игра — папка `src/games/<id>/` (компонент по умолчанию с `props: { onExit }`) плюс запись в `registry.ts`. Сейчас в реестре только «Профессии» — это главная кнопка «Играть» на лендинге. Звуки синтезируются через WebAudio (`shared/sfx.ts`).

**Стили.** Стили лендинга лежат под `.landing` (`landing.css`), чтобы не задевать игры.

**Ограничения.** `vite.config.ts` использует `base: './'` (сборка должна работать из любого подкаталога).
