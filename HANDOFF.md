# HANDOFF — «Наш год» · v30 · 29.09.2026

## 1. Что это
«Наш год — 365 вопросов» — PWA-приложение для пар (Руслан + Юля). Один вопрос в день, ответы открываются когда ответили оба. Плюс: игры, уроки, архив. Установлено как TWA-приложение на Android + PWA в браузере. Живёт по адресу https://foozyk.github.io.

## 2. Стек
- HTML + CSS + ванильный JS (без фреймворков)
- Firebase (Auth + Firestore)
- GitHub Pages (хостинг, репо foozyk.github.io и nashgod)
- Service Worker (v24, clean-slate + push + notificationclick)
- TWA (Trusted Web Activity) → APK через Bubblewrap 1.25.0
- Web Push API (VAPID) + GitHub Actions как бесплатный cron
- Тема: тёплая палитра #171516, #b25a5a, #faf5ea
- Модульная структура: app.js + 11 модулей в js/

## 3. Ключевые файлы

### Пути (обход кириллицы)
- C:\nashgod — junction → C:\Users\Юлия\Desktop\Наш год (репо nashgod, источник)
- C:\ghio — junction → C:\Users\Юлия\Desktop\_tmp_ghio (репо foozyk.github.io, прод Pages)
- Все shell-команды выполнять через эти ASCII-пути. Прямые пути с кириллицей рвут Shell MCP.
- Если junction слетел — пересоздать от имени администратора: cmd /c mklink /J C:\nashgod "C:\Users\Юлия\Desktop\Наш год"  и  cmd /c mklink /J C:\ghio "C:\Users\Юлия\Desktop\_tmp_ghio"
- Git: C:\Program Files\Git\cmd\git.exe НЕ существует. Использовать: C:\Users\Юлия\AppData\Local\GitHubDesktop\app-3.6.6\resources\app\git\cmd\git.exe

### Файлы проекта (nashgod, актуальные размеры 29.09.2026)
- index.html (49 565 б) — вся разметка, #loading (splash), SVG 132x132
- style.css (185 213 б) — стили
- app.js (158 386 б) — ядро логики + Web Push (было 225 726 до рефакторинга)
- js/ — 11 модулей: helpers.js (1 877 б), dom.js (296 б), moon.js (755 б), lessons-ui.js (5 235 б), state.js (449 б), word-of-day.js (3 737 б), lesson-hint.js (2 678 б), day-states.js (5 937 б), pause.js (5 675 б), rhythm.js (13 312 б), dialogue.js (39 800 б)
- questions.js, words.js (305 041 б), lessons.js (40 842 б) — данные
- sw.js (2 244 б) — Service Worker v24
- manifest.json — PWA-манифест
- icon.svg, icon-maskable.svg, PNG-иконки, apple-touch-icon.png
- .well-known/assetlinks.json — TWA (в репо foozyk.github.io)
- scripts/send-push.mjs + .github/workflows/daily-push.yml — push-рассылка
- .gitattributes, .gitignore
- tools/check.js — проверка проекта (node --check + скобки CSS + размеры + git)
- tools/shot.js — скриншот сайта (Chrome headless)
- HANDOFF.md — этот документ
- CHANGELOG.md (15 345 б) — история версий v26–v30.4
- APK-проект: C:\nashgod-android (Bubblewrap)

## 4. Разделы приложения
- Сегодня — полароиды «Я»/партнёр, вопрос дня
- Игры — табы
- Мы — под-табы: Уроки, Луна, ...
- Архив
- Онбординг, Auth, Setup, Waiting
- Splash (#loading) — экран загрузки с анимацией

## 5. Что изменилось в v30 (28–29.09.2026)

### 5.1 Вынос модулей из app.js (главное)
Монолит app.js разобран на ES-модули. app.js: 225 726 → 158 386 б (−67 КБ). Создана папка js/ с 11 модулями. Импорт через script type=module src=app.js.

Порядок выносов:
- v30 (28.09) — js/state.js: мост к ядру через Object.defineProperties. nashgod 98a9df2, deploy cf6340d.
- v30 (28.09) — js/word-of-day.js (Слово дня, 108 стр). nashgod c139ca8, deploy 2f04936.
- v30 (28.09) — js/lesson-hint.js (Обучение в моменте, 69 стр). nashgod fc6b367, deploy 7d51c8d.
- v30 (28.09) — js/day-states.js (Тихий день + Пропустить день, 182 стр). nashgod 67a73d6, deploy f455a05.
- v30.1 (28.09) — js/pause.js (Пауза, 111 стр). nashgod 5e2d320, deploy b08b6b3. Фикс: nashgod 22c63f7 (путь Firestore conversations + импорт firebase).
- v30.2 (28.09) — js/rhythm.js (Ритм, 295 стр). nashgod 2a0ca2a, deploy 594e406.
- v30.3 (28.09) — js/dialogue.js (Примирение, 967 стр, 26 экспортов). nashgod b0782bf, deploy 7e2d9ef.

Грабли:
- regex-замена имён переменных попадает в строковые литералы внутри doc(db, "couples", currentCoupleId, "conversations", ...) и портит путь Firestore. Проверять.
- regex-замена _currentDialogueId превратила объявление в let state._currentDialogueId (невалидно). Объявление вернули в app.js.
- Импорты Firebase в модуль добавлять вручную (относительно js/).
- Приём: колбэк вместо прямой связи (bindLessonHint(conv, renderDialogueContent)); для флагов — state.quietDayActive/skipDayActive (rw).
- Скрипт выноса — .cjs (НЕ .mjs — нужен require), p = process.argv[2], границы по номерам строк, латиница в коде.

### 5.2 Cache-bust app.js (фикс кнопки примирения у партнёра)
- В index.html было script type=module src=app.js БЕЗ версии.
- У партнёра из HTTP-кэша жил старый app.js без импорта js/dialogue.js → initDialogue() не вызывался → onclick на #reconcile-btn не навешивался. Кнопка видна, но мертва.
- ФИКС: src=app.js?v=13 в ОБОИХ репо. Заодно style.css?v=12 → ?v=13. nashgod c842042, deploy 90ce8a8.
- ПРАВИЛО: при каждом выносе кода из app.js в модуль — бампать ?v= у app.js в index.html в ОБОИХ репо.

### 5.3 Splash: анимация «Дыхание» + новая надпись
- Анимация скобок логотипа: левая группа < (красная #b25a5a) и правая > (светлая #faf5ea) плавно сходятся на ±28 ед. и расходятся, цикл 1.6s ease-in-out infinite alternate. Живёт всё время загрузки.
- index.html: g class="splash-br splash-br--left" и g class="splash-br splash-br--right".
- style.css (~6751-6758): @keyframes brLeft/brRight + правила #loading .splash-br--left/right. В @media (prefers-reduced-motion) добавлено #loading .splash-br { animation: none; }.
- Надпись: 365 вопросов друг другу → Каждый день — вдвоём. Старая сужала приложение до одной функции; новая отражает идею целиком.
- Коммиты: nashgod ff846cb, deploy b68e1eb. УТВЕРЖДЕНО как финальный вид — не менять без явного запроса.
- Проверка вживую — ОЖИДАЕТСЯ.

### 5.4 Инфраструктура (вне кода)
- Junction-ы C:\nashgod и C:\ghio созданы 29.09.2026.
- Python 3.12.10: C:\Users\Юлия\AppData\Local\Programs\Python\Python312\python.exe (pip 25.0.1). MCP python_exec работает.
- MCP Shell Local переустановлен/починен.
- Через Python удобно делать замены в файлах с кириллицей — кодировка не страдает.

## 6. Затронутые файлы (v30)

### Репо nashgod (C:\nashgod) — коммиты (новые сверху):
44f32db — docs: CHANGELOG v30.4
ff846cb — feat: splash breathing animation + new tagline
c842042 — fix: cache-bust app.js v=13
ec13b91 — docs: v30.3 — вынос Примирения в dialogue.js
b0782bf — refactor: вынос Примирения в js/dialogue.js (−967 строк, −38 КБ)
6d480b3 — docs: v30.2
2a0ca2a — refactor: вынос Ритма в js/rhythm.js (−295 строк)
de46b6a — docs: v30.1
22c63f7 — fix(pause): путь Firestore + импорт firebase
5e2d320 — refactor: вынос Паузы в js/pause.js (−111 строк)
9ccc034 — docs: HANDOFF+CHANGELOG рефакторинг v30
67a73d6 — refactor: Тихий день + Пропустить день в js/day-states.js (−182 строки)
fc6b367 — refactor: Обучение в моменте в js/lesson-hint.js (−69 строк)
7550fb1 — chore: убрать временный скрипт выноса
c139ca8 — refactor: Слово дня в js/word-of-day.js (−108 строк)
ba992a2 — docs+fix: C-4 выполнена
98a9df2 — refactor(C-4): js/state.js
954e7bf — docs: окружение (Python + Node) в HANDOFF
4c393a7 — docs: перенос v26-v28 в CHANGELOG
8a79dd4 — docs: создан CHANGELOG.md с записью v29

### Репо foozyk.github.io (C:\ghio):
11766b4 — docs: sync CHANGELOG v30.4
b68e1eb — feat: splash breathing animation + new tagline
90ce8a8 — fix: cache-bust app.js v=13
d5f5375 — docs: sync v30.3
7e2d9ef — refactor: синхронизация dialogue.js
7a8ffee — docs: sync v30.2
594e406 — refactor: синхронизация rhythm.js
c5621f4 — docs: sync v30.1
c178f2f — fix(pause): sync
b08b6b3 — refactor: синхронизация pause.js
1c8f4c9 — docs: sync HANDOFF+CHANGELOG v30
f455a05 — refactor: синхронизация day-states.js
7d51c8d — refactor: синхронизация lesson-hint.js
2f04936 — refactor: синхронизация word-of-day.js
472195f — docs+fix: синхронизация HANDOFF и check.js
cf6340d — refactor(C-4): js/state.js
9d6045d — docs: окружение (Python + Node) в HANDOFF
9228520 — docs: синхронизация HANDOFF/CHANGELOG
846cdc8 — docs: создан CHANGELOG.md с записью v29

Оба репо запушены, main = origin/main.

## 7. Что дальше
1. Проверка вживую (Приоритет 1) — кнопка примирения у Юли после сброса кэша; splash «Дыхание» + надпись. Юле — жёсткий Ctrl+Shift+R или инкогнито.
2. Тесты вживую — прогнать с Юлей: Пауза, Ритм, Слово дня, Обучение в моменте, Тихий день, Пропустить день, Примирение.
3. Продолжить вынос модулей — в app.js осталось ядро (секции ~1–3450: Today, разговоры, Мы, Игры, Архив).
4. Push на iPhone Юли — отложено.
5. Опционально: массовая дедупликация 159 групп дублей CSS — делать аккуратно, проверять скриншотами.
6. Не добавлять новые фичи до месяца наблюдений.

## 8. Риски
- Cache-bust app.js: при выносе кода из app.js в модуль — бампать ?v= у app.js в index.html в ОБОИХ репо.
- CSS-дубли: архитектурная особенность, не баг. style.css — многослойный override-пирог (159 групп дублей). Массовая дедупликация ОПАСНА вслепую. Не резать без проверки вида.
- Keystore: пароль сохранён Русланом ЛИЧНО. Потеря = пересоздание + переустановка APK + обновление assetlinks.json.
- Service Worker: при чёрном экране — Ctrl+Shift+R 2–3 раза. Проверить незакрытые списки селекторов в style.css (была проблема 26.09).
- assetlinks.json: отпечаток БЕЗ префикса SHA256:, только hex через двоеточия.
- Кириллица в путях: использовать junction-ы C:\nashgod и C:\ghio. Прямые пути с «Юлия»/«Наш год» рвут Shell MCP.
- Git не в PATH: полный путь C:\Users\Юлия\AppData\Local\GitHubDesktop\app-3.6.6\resources\app\git\cmd\git.exe. C:\Program Files\Git НЕ существует.
- Shell MCP: длинные команды обрываются, короткие могут выполниться ДВАЖДЫ. Протокол: «2 сбоя — стоп», только короткие команды, операции идемпотентны.
- .ps1-скрипты сохраняются БИТЫМИ (кириллица+кавычки) — использовать .js (Node) или Python.
- Вложенные code fence в markdown рвут рендер DeepSeek++ — не вкладывать ``` в ```.
- Web Push iOS: только iOS 16.4+, PWA на домашнем экране.
- GitHub Actions cron: время в UTC.
- core.autocrlf=true: варнинги LF/CRLF при коммите (косметика).

## 9. Запретный список (НЕ ВОЗВРАЩАТЬ)
Забота, Пульс месяца, Пульс партнёра, Задачи, Календарь, Планы, Послания, Важные даты, Ритуал воскресенья, Память «Помнишь?», Голос, Фото как фича, Иконка-кардиограмма, Рефлексия, Совместный дневник, Мини-уроки в шапке Мы (только в под-табе Уроки), Бейджи/стрики/счётчик дней, Цветовые схемы, переключатель темы, Плашка #headerPause.

Плюс правила:
- Не удалять данные Firestore без явного запроса.
- Не вешать background на body (фон ломается) — только на #main-screen::before как fixed-слой.
- Не переопределять --nav-active для состояний тихий день / примирение.
- Полароиды: --tx во всех состояниях.
- Новые фичи не добавлять до месяца наблюдений.
- Splash: анимация «Дыхание» + надпись «Каждый день — вдвоём» — УТВЕРЖДЕНО как истина, не менять.
- Полароиды 132px (мобильный) / 140px (десктоп) — УТВЕРЖДЕНО, не менять.

## 10. Топ-5 на возврат (после месяца наблюдений)
- T — Я-сообщение
- Q — Копилка благодарностей
- A — Мостик
- S — Тихий час (пауза 60 мин внутри дня)
- J — Слепой обмен

## 11. Технические заметки
- Keystore SHA256: 63:8E:E2:77:8B:44:16:3C:B1:B6:AB:2D:97:F3:FC:67:CE:FB:58:C8:21:68:5B:20:07:37:DC:BB:E9:A1:55:AC
- VAPID Public: BFhoiRSlifBwf9BDkR5CxiaanhPzenpaxEIKInodx0vawXYSzs26tbROTjPwPuWJRIRSYgFZi90uGZiwyzhFDN4
- APK: v6 установлен на Android Руслана. Bubblewrap 1.25.0.
- Firestore Rules: match /push_subscriptions/{userId} — allow read, write: if isSignedIn() && uid() == userId.
- Push-расписание: 06:00 UTC (09:00 MSK) всем; 16:00 UTC (19:00 MSK) не ответившим.
- Service Worker: CACHE_NAME = nash-god-v24, clean-slate + push + notificationclick.
- Правило кэша: при правке CSS бампать ?v=N в index.html; при правке SW менять CACHE_NAME.
- Проверка проекта: node tools/check.js.
- Скриншоты: node tools/shot.js (мобильный) / node tools/shot.js desktop (1280x900).
- Python для массовых замен: io.open(path, 'r', encoding='utf-8') / io.open(..., 'w', encoding='utf-8', newline='').
- МСP local_file_read иногда сбоит по формату — использовать JSON-тело {"path":"C:/nashgod/HANDOFF.md"}.

## 12. Про память и надёжность
- memory_save в веб-чате DeepSeek++ — РАБОТАЕТ (проверено 29.09.2026). Это отличается от состояния в HANDOFF v28, где память считалась нерабочей.
- Источник истины — этот HANDOFF.md + CHANGELOG.md + git-история репо nashgod и foozyk.github.io. Память — вспомогательный слой.
- Перед началом работы в новом чате: прочитать HANDOFF.md (актуальная версия) и git log.

## 13. Что дальше (накопительно)
- [ВЫПОЛНЕНО] C-4: js/state.js — мост к ядру. nashgod 98a9df2, deploy cf6340d.
- [ВЫПОЛНЕНО] Вынос js/word-of-day.js. nashgod c139ca8.
- [ВЫПОЛНЕНО] Вынос js/lesson-hint.js. nashgod fc6b367.
- [ВЫПОЛНЕНО] Вынос js/day-states.js. nashgod 67a73d6.
- [ВЫПОЛНЕНО] Вынос js/pause.js. nashgod 5e2d320, фикс 22c63f7.
- [ВЫПОЛНЕНО] Вынос js/rhythm.js. nashgod 2a0ca2a.
- [ВЫПОЛНЕНО] Вынос js/dialogue.js. nashgod b0782bf.
- [ВЫПОЛНЕНО] Cache-bust app.js v=13 + splash «Дыхание». nashgod c842042, ff846cb.
- [ВЫПОЛНЕНО] CHANGELOG.md актуализирован до v30.4. nashgod 44f32db.
- [ОТКРЫТО] Проверка вживую кнопки примирения у Юли и splash.
- [ОТКРЫТО] Вынос ядра app.js (секции ~1–3450: Today, разговоры, Мы, Игры, Архив).
