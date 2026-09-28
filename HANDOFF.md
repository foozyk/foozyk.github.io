# HANDOFF — «Наш год» · v28 · 28.09.2026

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

## 3. Ключевые файлы
Рабочая папка: C:\Users\Юлия\Desktop\Наш год (репо nashgod) + C:\Users\Юлия\foozyk.github.io (прод Pages)
- index.html (45 826 б) — вся разметка, #loading (splash), SVG 132x132
- style.css (181 392 б) — стили. ПОСЛЕ чистки B: 214 099 -> 181 392 (-26 КБ)
- app.js (225 726 б) — вся логика + Web Push
- questions.js, words.js, lessons.js — данные
- sw.js (2 244 б) — Service Worker v24
- manifest.json — PWA-манифест
- icon.svg, icon-maskable.svg, PNG-иконки, apple-touch-icon.png
- .well-known/assetlinks.json — TWA (в репо foozyk.github.io)
- scripts/send-push.mjs + .github/workflows/daily-push.yml — push-рассылка
- .gitattributes — * text=auto + text/binary правила
- .gitignore — игнор *.bak*, _old.css, parser.js, rep.js, css-duplicates.txt, tools/*.png
- tools/check.js — проверка проекта (node --check + скобки CSS + размеры + git)
- tools/shot.js — скриншот сайта (Chrome headless)
- APK-проект: C:\nashgod-android (Bubblewrap)

## 4. Разделы приложения
- Сегодня — полароиды «Я»/партнёр, вопрос дня
- Игры — табы
- Мы — под-табы: Уроки, Луна, ...
- Архив
- Онбординг, Auth, Setup, Waiting
## 5. Что изменилось в v25

### 5.1 Чистка мёртвого CSS — вариант B (ГЛАВНОЕ)
- Из style.css удалено 1054 строки / 216 объявлений, 100% перекрытых более поздними правилами
- Размер: 214 099 -> 181 392 б (-26 КБ)
- КОММИТ 9c67ff1 (nashgod), 466f1dc (deploy)
- ПРОВЕРКА: сравнил ЭФФЕКТИВНЫЙ CSS после каскада «до» (_old.css) и «после». Результат: 0 потерянных свойств, 0 изменённых значений, 0 потерянных селекторов. Баланс скобок 1129/1129. Рендеринг не изменился.
- _old.css (7810 строк) сохранён как бэкап (в .gitignore)

### 5.2 Точечная чистка CSS (вариант A)
- КОММИТ 2638491 (nashgod), 258165f (deploy)
- Удалено: мёртвое правило .info-strip-b .ico (style.css, 5 строк) + неиспользуемый id="stats-grid" (index.html; класс .stats-grid оставлен)

### 5.3 .gitattributes
- КОММИТ a9cd42e (nashgod), d4465ba (deploy)
- Содержимое: * text=auto + *.css/html/js/json/md/svg/txt text + *.png/jpg/jpeg/ico/woff/woff2 binary
- ПРИМЕЧАНИЕ: варнинги LF->CRLF идут от core.autocrlf=true, .gitattributes их НЕ убирает

### 5.4 .gitignore обновлён
- КОММИТ d6bc353 (nashgod)
- Добавлен блок: *.bak, *.bak2, *.bak-*, _old.css, parser.js, rep.js, css-duplicates.txt
- Позже добавлено: tools/*.png

### 5.5 tools/ — утилиты проекта (НОВОЕ)
- КОММИТ 3fde9be (nashgod) — 'chore(tools): add check.js and shot.js helpers'
- tools/check.js (1474 б): node --check app.js; баланс скобок style.css; размеры файлов; git status nashgod+deploy. Запуск: node tools/check.js
- tools/shot.js (1122 б): скриншот сайта Chrome headless. Запуск: node tools/shot.js [desktop]. Сохраняет tools/shot-<mode>-<stamp>.png
- ВАЖНО: .ps1-версии не пошли (сохранялись битыми — кириллица+кавычки). .js через Node — надёжны.

### 5.6 Уборка локальных бэкапов
- Удалено 11 файлов *.bak* (~1.6 МБ): style.css.bak/.bak2/.bak-icon-*/.bak-deadcode-*/.bak-deadcode2-*/.bak-A-*/.bak-cleanup-B-*, index.html.bak-* (2), manifest.json.bak-*, icon.svg.bak-*
- Папка проекта: 37 файлов -> 26

### 5.7 Web Push уведомления (из v24)
- VAPID Public: BFhoiRSlifBwf9BDkR5CxiaanhPzenpaxEIKInodx0vawXYSzs26tbROTjPwPuWJRIRSYgFZi90uGZiwyzhFDN4
- sw.js v23 -> v24; app.js: registerPushSubscription(), unregisterPushSubscription(), urlBase64ToUint8Array()
- Firestore Rules: match /push_subscriptions/{userId} — allow read, write: if isSignedIn() && uid() == userId
- scripts/send-push.mjs + daily-push.yml (06:00 UTC = 09:00 MSK всем; 16:00 UTC = 19:00 MSK не ответившим)
- РЕЗУЛЬТАТ: первый push доставлен на Android Руслана 27.09.2026. iPhone Юли — ОТЛОЖЕНО

### 5.8 Фикс кэша заставки (из v24)
- SVG заставки растягивался -> width=132 height=132 в теге + style.css?v=12 + SW v24
- Правило: при правке CSS бампать ?v=N в index.html; при правке SW менять CACHE_NAME

### 5.9 Иконка + заставка / Keystore + APK (из v23–v24)
- Иконка «Зеркальные кавычки», фон #171516, rx=112
- Keystore SHA256 = 63:8E:E2:77:8B:44:16:3C:B1:B6:AB:2D:97:F3:FC:67:CE:FB:58:C8:21:68:5B:20:07:37:DC:BB:E9:A1:55:AC
- APK v6 установлен на Android
## 6. Затронутые файлы (v25)

### Репо nashgod (Desktop/Наш год) — коммиты:
- 2638491 — cleanup: remove dead .info-strip-b .ico + unused id=stats-grid
- 9c67ff1 — cleanup: remove 216 fully-overridden CSS declarations (dead code) -26KB
- a9cd42e — chore: add .gitattributes (text=auto, explicit binary rules)
- d6bc353 — chore(gitignore): ignore local cleanup artifacts
- 3fde9be — chore(tools): add check.js and shot.js helpers; ignore tools/*.png

### Репо foozyk.github.io (прод Pages) — коммиты:
- 258165f — cleanup: remove dead .info-strip-b .ico + unused id=stats-grid
- 466f1dc — cleanup: remove 216 fully-overridden CSS declarations (dead code) -26KB
- d4465ba — chore: add .gitattributes

### Ранее в v24 (контекст):
- nashgod: 0901a9c (push), f7ff466, a63d46f (чистка -7271 б), 0244ef3 (splash fix)
- deploy: 5459c37, 3066fb9, 2d772f4, 65bbf97

## 7. Что дальше
1. Push на iPhone Юли — отложено (чек-лист в разделе 11)
2. Тесты вживую (Приоритет 1) — прогнать с Юлей базовые сценарии
3. Опционально: массовая дедупликация 159 групп дублей CSS — ТЕПЕРЬ РЕАЛЬНА, т.к. я ВИЖУ скриншоты (проверка глазами до/после). Делать аккуратно.
4. Дальше — по обратной связи после месяца наблюдений (без новых фич)

## 8. Риски
- CSS-дубли — архитектурная особенность, не баг. style.css — многослойный override-пирог (159 групп дублей). Массовая дедупликация ОПАСНА вслепую, но теперь есть проверка скриншотами. Не резать без проверки вида!
- Keystore: пароль сохранён Русланом ЛИЧНО. Потеря = пересоздание + переустановка APK + обновление assetlinks.json
- Service Worker: при чёрном экране — Ctrl+Shift+R 2–3 раза. Проверить незакрытые списки селекторов в style.css (была проблема 26.09)
- assetlinks.json: отпечаток БЕЗ префикса SHA256:, только hex через двоеточия
- Кириллица в путях: PowerShell ломает cd — нужен Set-Location -LiteralPath. Python нет — Node.js
- Git не в PATH: полный путь C:\Users\Юлия\AppData\Local\GitHubDesktop\app-3.6.6\resources\app\git\cmd\git.exe
- Shell MCP: длинные команды обрываются, короткие могут выполниться ДВАЖДЫ. Протокол: «2 сбоя — стоп», только короткие команды, операции идемпотентны
- .ps1-скрипты сохраняются БИТЫМИ (кириллица+кавычки) — использовать .js (Node)
- Web Push iOS: только iOS 16.4+, PWA на домашнем экране
- GitHub Actions cron: время в UTC
- core.autocrlf=true: варнинги LF/CRLF (косметика, не ошибка)
## 9. Запретный список (НЕ ВОЗВРАЩАТЬ)
Забота, Пульс месяца, Пульс партнёра, Задачи, Календарь, Планы, Послания, Важные даты, Ритуал воскресенья, Память «Помнишь?», Голос, Фото как фича, Иконка-кардиограмма, Рефлексия, Совместный дневник, Мини-уроки в шапке Мы (только в под-табе Уроки), Бейджи/стрики/счётчик дней, Цветовые схемы, переключатель темы, Плашка #headerPause.

Технические правила:
- Не удалять данные Firestore без явного запроса
- Не вешать background на body — только на #main-screen::before как fixed-слой
- Не переопределять --nav-active для состояний тихий день/примирение
- Полароиды: --tx во всех состояниях

## 10. Топ-5 на возврат
Новые фичи не добавлять до месяца наблюдений. Топ-5 на возврат:
- T — Я-сообщение
- Q — Копилка благодарностей
- A — Мостик
- S — Тихий час
- J — Слепой обмен
## 11. Технические заметки

### Проверки и полезные ссылки
- Проверка assetlinks: https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://foozyk.github.io&relation=delegate_permission/common.handle_all_urls
- Firestore Rules: https://console.firebase.google.com/project/our-year-1082f/firestore/rules
- Репо: github.com/foozyk/nashgod (исходники), github.com/foozyk/foozyk.github.io (прод)

### Инструменты (папка tools/, в git)
- node tools/check.js — проверка: node --check app.js + баланс скобок CSS + размеры файлов + git status обоих репо
- node tools/shot.js [desktop] — скриншот сайта через Chrome headless. Мобильный: node tools/shot.js; десктоп: node tools/shot.js desktop. Сохраняет tools/shot-<mode>-<stamp>.png
- ВАЖНО: Chrome headless снимает только splash/экран до логина (интерфейс «Сегодня» требует Firebase-auth). Для интерфейса после входа — скриншот от пользователя.
- Артефакты чистки CSS (в .gitignore, на диске): _old.css, parser.js, rep.js, css-duplicates.txt

### Команды git (полный путь, git не в PATH)
Скопируй в PowerShell (по одной строке):

$g = 'C:\Users\Юлия\AppData\Local\GitHubDesktop\app-3.6.6\resources\app\git\cmd\git.exe'
Set-Location -LiteralPath 'C:\Users\Юлия\Desktop\Наш год'
& $g status -sb
& $g add -A
& $g commit -m "сообщение"
& $g push origin main

Deploy-репо: Set-Location -LiteralPath 'C:\Users\Юлия\foozyk.github.io'

### Зрение (НОВОЕ в v25)
- Я ВИЖУ скриншоты, прикреплённые в чат (проверено 27.09 на скриншоте приложения с телефона)
- Алгоритм UI-правок: пользователь снимает «до» → я правлю → снимает «после» → я проверяю

### Чек-лист push на iPhone Юли (отложено)
1. iOS 16.4+
2. Открыть https://foozyk.github.io в Safari
3. Поделиться → «На экран Домой»
4. Открыть с домашнего экрана (не из Safari)
5. Разрешить уведомления
6. Проверить, что подписка появилась в Firestore push_subscriptions

### Баланс-факты style.css (после чистки B)
- Строк: 6756 (было 7810)
- Правил: 1049 (было 1265)
- Скобки { }: 1129/1129
- Размер: 181 392 б

### Текущее состояние репо (27.09.2026)
- nashgod HEAD: 3fde9be; deploy HEAD: d4465ba
- Оба ## main...origin/main (синхронны, дерево чистое)
- Сайт работает

## 12. Что изменилось в v26 (28.09.2026) — рефакторинг app.js, вариант C

### 12.1 Итог
Монолит app.js начал разбираться на ES-модули. app.js: 225 726 → 218 284 б (−7.4 КБ).
Создана папка js/ с 4 модулями. Приложение подключено как <script type="module"> (было и раньше).
Сайт проверен вживую — работает. Все коммиты в nashgod, запушены, дерево чистое.

### 12.2 Новые модули (js/)
- js/helpers.js (1877 б) — 9 чистых функций: gendered, escapeHtml, formatDate, plural, pluralDays, getInitials, hashString, urlBase64ToUint8Array, capitalize.
- js/dom.js — $ (getElementById) + vibrate.
- js/moon.js — initMoonModal, openMoonModal, closeMoonModal (модалка «Лунный календарь»).
- js/lessons-ui.js (159 строк) — 9 функций «Урока недели»: getWeekOfYear, getLessonForWeek, isLessonDayVisible, initLessons, renderLessonCard, openLessonModal, closeLessonModal, renderLessonsList, openLessonModalByWeek.

### 12.3 Импорты в app.js (после строки import helpers.js)
- import { gendered, escapeHtml, formatDate, plural, pluralDays, getInitials, hashString, urlBase64ToUint8Array, capitalize } from "./js/helpers.js";
- import { $, vibrate } from "./js/dom.js";
- import { initMoonModal, openMoonModal, closeMoonModal } from "./js/moon.js";
- import { initLessons, renderLessonsList } from "./js/lessons-ui.js";

### 12.4 Коммиты (nashgod)
- C-1: 1df181e — extract pure helpers to js/helpers.js
- C-2: ab1580e — extract dom.js ($, vibrate) and moon.js
- C-3: 0111638 — extract lessons-ui.js (урок недели, 9 функций)
До C: c6ffb91 (HANDOFF v25).

### 12.5 Проверки
- node --check всех файлов = OK (EXIT=0)
- tools/check.js зелёный: app.js 218284, style.css 181392, index.html 45826, sw.js 2244, CSS скобки 1129/1129
- git: ## main...origin/main, дерево чистое

### 12.6 Что дальше (следующий шаг — C-4)
Оставшиеся крупные секции завязаны на глобалы ядра и требуют модуля состояния:
- Слово дня, Фичи №2/3/8 (пауза / тихий день / обучение), Примирение (~969 строк), Ритм, ядро строки 1–3450.
- Глобалы: currentUser (145 исп.), currentCoupleId (74), db (73), currentCouple (47), auth (20), unsubCouple (7), cachedDay (7), cachedDayTime (4).
- C-4 = создать js/state.js с общими переменными (геттеры/сеттеры), затем выносить секции по одной.

### 12.7 Технические заметки
- Метод выноса: Node-скрипт через PowerShell here-string (@'...'@ + WriteAllText UTF-8 без BOM), резка app.js по номерам строк, добавление export, node --check, замена через Copy-Item.
- ГРАНИЦЫ (важно): секция «Урок недели» в старом app.js = строки 5269–5421 (резать L.slice(5268,5421)). Off-by-one при резке → SyntaxError.
- node --check работает с ESM-файлами (import) — EXIT=0 корректен.
- MCP в этой сессии часто рвал вызовы (Invalid tool format) — работать короткими командами.
- Имя модуля «Урока недели» — lessons-ui.js (НЕ lessons.js, чтобы не конфликтовать с данными lessons.js).
## 13. v27 (28.09.2026) — CSS: убраны 2 пустых правила, 3 предупреждения оставлены

- Удалены 2 пустых правила CSS: #reconcile-btn{} и #new-conversation-btn{} (+ осиротевшие /* removed */). style.css: 181392 -> 181319 б.
- КОММИТ 90008fb (nashgod), 0aa08c9 (deploy).
- ПРОВЕРЕНО: пустых правил {} = 0; скобки 1127/1127; защитный блок body.state-reconcile ЦЕЛ (фикс чёрного экрана); check.js зелёный.
- ⛔ ВАЖНО: в style.css есть пустое правило ~строка 6249 (список body, body.screen-*, body.state-*) — это ФИКС ЧЁРНОГО ЭКРАНА (закрывает список селекторов). НЕ УДАЛЯТЬ!
- ОСТАВЛЕНЫ осознанно 3 предупреждения линтера VS Code: line-clamp x2 (строки 1482, 4835 — только -webkit-, без стандартного свойства) + защитное пустое правило (~6249). Сайт работает, не трогаем.

## 14. v28 (28.09.2026) — «Пропустить день» (анти-боль)

### 14.1 Что сделано
Реализована анти-боль «Пропустить день» — третье состояние дня, отличное от «Тихого дня». Смысл: не провал, а честная пауза. День не считается как miss в теплокарте, вина снята явно.

### 14.2 Файлы
- **app.js:** добавлены функции `skipDayKey`, `isSkipDay`, `setSkipDay`, `applySkipDayState`, `openSkipModal`, `closeSkipModal`, `initSkipFeature`; синхронизация в `renderTodayMood` (читает `todayMoods.skip`); взаимоисключение с тихим днём в `setQuietDay`; флаг `skipDayActive`; `closeSkipModal` в `MODAL_CLOSE_FNS`
- **index.html:** кнопка `#skipIconBtn` (иконка-облачко) рядом с луной; блок `.skip-state` в карточке; модалка `#skip-modal`
- **style.css:** стили `.skip-icon`, `.question-card.is-skip`, `.skip-state*`, `.pulse-dot--skip`, `body.state-skip`
- **LEGEND-STATES.md (новый):** легенда трёх состояний дня

### 14.3 Хранение
- localStorage: `skip-{coupleId}-{YYYY-M-D}`
- Firestore: `couples/{coupleId}/moods/{day}.skip = { uid: true }`
- Автосброс по дате (как у quiet)

### 14.4 Поведение
- Свой вопрос прячется, появляется 🌫 + текст
- Партнёр видит 🌫 в серо-фиолетовом кружке (не miss)
- Взаимоисключение: включение «Пропустить» снимает «Тихий» и наоборот
- Никаких стриков/счётчиков/накоплений

### 14.5 Коммиты
- nashgod `f0e478f` — feat: Пропустить день (анти-боль) + LEGEND-STATES
- foozyk.github.io `606c3f5` — feat: Пропустить день (анти-боль) + LEGEND-STATES

### 14.6 Правило проекта
Реализовано ВНЕ правила «новые фичи не добавлять до месяца наблюдений» — по решению от 28.09.2026 как анти-боль, а не как новая фича.

## 15. Про память и надёжность (важно!)

- memory_save в веб-чате DeepSeek++ v1.14.0 НЕ работает — диалог авторизации не появляется, записи не сохраняются. НЕ полагаться на память.
- Источник истины: этот HANDOFF.md + git-история репо nashgod и foozyk.github.io.
- Перед началом работы в новом чате: прочитать HANDOFF.md (актуальная версия) и git log.

## 16. Что дальше (накопительно)

- C-4: создать js/state.js (общие переменные ядра: currentUser, currentCoupleId, db, currentCouple, auth, unsubCouple, cachedDay, cachedDayTime). Разблокирует вынос Слова дня, Фич №2/3/8, Примирения, Ритма.
- После C-4 — вынос оставшихся крупных секций по одной.
