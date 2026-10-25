# ОЧАКОВО — «The Game»
by Весёлые Пекари \
Лендинг и игра о профессиях на заводе ОЧАКОВО: оператор цеха розлива, лаборант, оператор технологического цеха. Проходите уровни, зарабатывайте звёзды и наряжайте маскота Очака.

Работает в браузере на компьютере и телефоне.

**Играть:** https://pekari.site \
[**Аналитика**](https://drive.google.com/drive/folders/1AvrgyHfkJRCUR6r9xFbKsByx84Q9gSn8) \
[**Пояснительная записка**](https://docs.google.com/document/d/1FSxcg5Lw1w3YeeLsiMpA87QOLwY1GRRe/edit?usp=drivesdk&ouid=102107674969235479607&rtpof=true&sd=true)

## Стек

React 19 · Phaser 4 · TypeScript · Vite

## Запуск

Весь код — в папке `ochakovo-games/`.

```bash
cd ochakovo-games
npm install
npm run dev      # http://localhost:5173
npm run build    # сборка в dist/ (проверка типов + статические файлы)
```

Для отладки доступны параметры адреса: `?app` (игра без лендинга), `?unlock` (все главы открыты), `?prologue` (повторить пролог), `?debug` (консоль на экране).

## Структура

- `ochakovo-games/` — игры и лендинг
