# CHANGELOG — «Наш год»

История изменений проекта. Краткие записи по версиям.
Актуальное состояние — в HANDOFF.md.

---

## v26 — 28.09.2026 — Рефакторинг app.js (вариант C)

### 26.1 Итог
Монолит app.js начал разбираться на ES-модули. app.js: 225 726 → 218 284 б (−7.4 КБ).
Создана папка js/ с 4 модулями. Приложение подключено как <script type="module"> (было и раньше).
Сайт проверен вживую — работает. Все коммиты в nashgod, запушены, дерево чистое.

### 26.2 Новые модули (js/)
- js/helpers.js (1877 б) — 9 чистых функций: gendered, escapeHtml, formatDate, plural, pluralDays, getInitials, hashString, urlBase64ToUint8Array, capitalize.
- js/dom.js — $ (getElementById) + vibrate.
- js/moon.js — initMoonModal, openMoonModal, closeMoonModal (модалка «Лунный календарь»).
- js/lessons-ui.js (159 строк) — 9 функций «Урока недели»: getWeekOfYear, getLessonForWeek, isLessonDayVisible, initLessons, renderLessonCard, openLessonModal, closeLessonModal, renderLessonsList, openLessonModalByWeek.

### 26.3 Импорты в app.js (после строки import helpers.js)
- import { gendered, escapeHtml, formatDate, plural, pluralDays, getInitials, hashString, urlBase64ToUint8Array, capitalize } from "./js/helpers.js";
- import { $, vibrate } from "./js/dom.js";
- import { initMoonModal, openMoonModal, closeMoonModal } from "./js/moon.js";
- import { initLessons, renderLessonsList } from "./js/lessons-ui.js";

### 26.4 Коммиты (nashgod)
- C-1: 1df181e — extract pure helpers to js/helpers.js
- C-2: ab1580e — extract dom.js ($, vibrate) and moon.js
- C-3: 0111638 — extract lessons-ui.js (урок недели, 9 функций)
До C: c6ffb91 (HANDOFF v25).

### 26.5 Проверки
- node --check всех файлов = OK (EXIT=0)
- tools/check.js зелёный: app.js 218284, style.css 181392, index.html 45826, sw.js 2244, CSS скобки 1129/1129
- git: ## main...origin/main, дерево чистое

### 26.6 Что дальше (следующий шаг — C-4)
Оставшиеся крупные секции завязаны на глобалы ядра и требуют модуля состояния:
- Слово дня, Фичи №2/3/8 (пауза / тихий день / обучение), Примирение (~969 строк), Ритм, ядро строки 1–3450.
- Глобалы: currentUser (145 исп.), currentCoupleId (74), db (73), currentCouple (47), auth (20), unsubCouple (7), cachedDay (7), cachedDayTime (4).
- C-4 = создать js/state.js с общими переменными (геттеры/сеттеры), затем выносить секции по одной.

### 26.7 Технические заметки
- Метод выноса: Node-скрипт через PowerShell here-string (@'...'@ + WriteAllText UTF-8 без BOM), резка app.js по номерам строк, добавление export, node --check, замена через Copy-Item.
- ГРАНИЦЫ (важно): секция «Урок недели» в старом app.js = строки 5269–5421 (резать L.slice(5268,5421)). Off-by-one при резке → SyntaxError.
- node --check работает с ESM-файлами (import) — EXIT=0 корректен.
- MCP в этой сессии часто рвал вызовы (Invalid tool format) — работать короткими командами.
- Имя модуля «Урока недели» — lessons-ui.js (НЕ lessons.js, чтобы не конфликтовать с данными lessons.js).
## v27 — 28.09.2026 — CSS: убраны 2 пустых правила

- Удалены 2 пустых правила CSS: #reconcile-btn{} и #new-conversation-btn{} (+ осиротевшие /* removed */). style.css: 181392 -> 181319 б.
- КОММИТ 90008fb (nashgod), 0aa08c9 (deploy).
- ПРОВЕРЕНО: пустых правил {} = 0; скобки 1127/1127; защитный блок body.state-reconcile ЦЕЛ (фикс чёрного экрана); check.js зелёный.
- ⛔ ВАЖНО: в style.css есть пустое правило ~строка 6249 (список body, body.screen-*, body.state-*) — это ФИКС ЧЁРНОГО ЭКРАНА (закрывает список селекторов). НЕ УДАЛЯТЬ!
- ОСТАВЛЕНЫ осознанно 3 предупреждения линтера VS Code: line-clamp x2 (строки 1482, 4835 — только -webkit-, без стандартного свойства) + защитное пустое правило (~6249). Сайт работает, не трогаем.

## v28 — 28.09.2026 — «Пропустить день» (анти-боль)

### 28.1 Что сделано
Реализована анти-боль «Пропустить день» — третье состояние дня, отличное от «Тихого дня». Смысл: не провал, а честная пауза. День не считается как miss в теплокарте, вина снята явно.

### 28.2 Файлы
- **app.js:** добавлены функции `skipDayKey`, `isSkipDay`, `setSkipDay`, `applySkipDayState`, `openSkipModal`, `closeSkipModal`, `initSkipFeature`; синхронизация в `renderTodayMood` (читает `todayMoods.skip`); взаимоисключение с тихим днём в `setQuietDay`; флаг `skipDayActive`; `closeSkipModal` в `MODAL_CLOSE_FNS`
- **index.html:** кнопка `#skipIconBtn` (иконка-облачко) рядом с луной; блок `.skip-state` в карточке; модалка `#skip-modal`
- **style.css:** стили `.skip-icon`, `.question-card.is-skip`, `.skip-state*`, `.pulse-dot--skip`, `body.state-skip`
- **LEGEND-STATES.md (новый):** легенда трёх состояний дня

### 28.3 Хранение
- localStorage: `skip-{coupleId}-{YYYY-M-D}`
- Firestore: `couples/{coupleId}/moods/{day}.skip = { uid: true }`
- Автосброс по дате (как у quiet)

### 28.4 Поведение
- Свой вопрос прячется, появляется 🌫 + текст
- Партнёр видит 🌫 в серо-фиолетовом кружке (не miss)
- Взаимоисключение: включение «Пропустить» снимает «Тихий» и наоборот
- Никаких стриков/счётчиков/накоплений

### 28.5 Коммиты
- nashgod `f0e478f` — feat: Пропустить день (анти-боль) + LEGEND-STATES
- foozyk.github.io `606c3f5` — feat: Пропустить день (анти-боль) + LEGEND-STATES

### 28.6 Правило проекта
Реализовано ВНЕ правила «новые фичи не добавлять до месяца наблюдений» — по решению от 28.09.2026 как анти-боль, а не как новая фича.


---


---

## v29 — 28.09.2026 — UI-полировка + «Пропустить день»

### 🌫 Пропустить день (анти-боль)
- Кнопка-облачко рядом с луной на карточке вопроса
- Модалка: «Пропустим этот день. Завтра — новый. 🤍»
- Хранение: localStorage `skip-{coupleId}-{дата}`, Firestore `day.skip = { uid: true }`
- Партнёр видит облачко в серо-фиолетовом кружке (не miss)
- Взаимоисключение с «Тихим днём»
- LEGEND-STATES.md — легенда трёх состояний дня
- Коммиты: nashgod `f0e478f`, deploy `606c3f5`

### 🌤 Модалка погоды по клику
- Клик на виджет погоды → модалка с 8 полями:
  ощущается, влажность, ветер, давление, рассвет, закат, обновлено
- Кнопка «Закрыть» снизу убрана (достаточно крестика)
- Коммиты: nashgod `4d48c77`, deploy `24f2fda` (модалка)
- Коммиты: nashgod `cbe1b6f`, deploy `7365a18` (уборка кнопки)

### 🎨 Мелкие UI-правки
- weather-temp: только температура (влезает в sky-row на iPhone)
  - nashgod `11b3350`, deploy `29d83a8`
- Центрирование sky-row (вариант А) — луна и погода делят строку пополам
- «Мы» теперь открывается на табе **«Уроки»** (было — «Архив»)
- Убран курсив у цифр статистики (`.stat-value`, `.hm-stat-value`)
  - nashgod `0f0e370`, deploy `c8607c6`

### 📄 Документация
- HANDOFF поднят до v28 (раздел 8 «Пропустить день»)
  - nashgod `3abc59c`, deploy `a8a11f1`
- ROADMAP: пункт 4 «Пропустить день» помечен ✅ сделано
- Создан CHANGELOG.md (этот файл)

---

*

---

## v30 — 28.09.2026 — Рефакторинг: вынос модулей из app.js

Вынесены секции в ES-модули через мост js/state.js:
- js/state.js — мост к ядру (Object.defineProperties, геттеры/сеттеры). Коммиты: 98a9df2.
- js/word-of-day.js — Слово дня (5 функций, 108 стр). Коммиты: c139ca8.
- js/lesson-hint.js — Обучение в моменте (6 функций, 69 стр). Коммиты: fc6b367.
- js/day-states.js — Тихий день + Пропустить день (14 функций, 182 стр). Коммиты: 67a73d6.

app.js: 5820 → 5461 стр. Механика: колбэки (bindLessonHint(conv, renderDialogueContent)), state.quietDayActive/skipDayActive (rw). Проверки: node --check, tools/check.js, ручная в приложении (Слово дня, Обучение, Тихий/Пропустить — работают).

Осталось: Пауза в разговорах (~135 стр, 6-8 точек связи), Примирение, Ритм.

---

## v30.1 — 28.09.2026 — Вынос Паузы в js/pause.js

- js/pause.js: 12 функций паузы в разговорах. Мост state расширен (ro): conversations, currentConversationId, _currentDialogueId, openConversation, renderDialogueContent.
- app.js: 5461 → 5300 стр. Коммиты: nashgod 5e2d320, deploy b08b6b3.
- БАГ при выносе: regex-замена имени conversations испортила строковый аргумент в doc() и не был импортирован Firebase. Фикс: nashgod 22c63f7, deploy c178f2f. Проверено — работает.

---

## v30.2 — 28.09.2026 — Вынос Ритма в js/rhythm.js

- js/rhythm.js: 12 функций (initRhythm, renderRhythm, renderRhythmTimeline, renderPulseStrip, listenForJournalNotes, getDayDate, dayFromTimestamp, loadRhythmData, collectEventsByDay, openNoteSheet, closeNoteSheet, saveNote).
- Мост state расширен (ro): currentView, getQuestionForDay, getDialogueFeelingInfo, initReveal. Переменные Ритма (journalNotes, rhythmFilter, _rhythmCache, _noteDayKey) переехали в модуль.
- app.js: 5300 → 4939 стр. Коммиты: nashgod 2a0ca2a, deploy 594e406.
- Проверка в приложении — ОЖИДАЕТСЯ (Ритм-лента, пульс-полоса, заметка дня).

---

## v30.3 — 28.09.2026 — Вынос Примирения в js/dialogue.js

- js/dialogue.js: 26 экспортов, 38 функций, 967 строк (DIALOGUE_FEELINGS, DIALOGUE_ICONS, openFeelingPicker, renderDialogueContent, все render*/sign*/save* функции). Импорт Firebase + pause.js + helpers.
- Мост state дополнен (rw): _currentDialogueId (добавлен set), partnerProfile, myProfile (get+set).
- app.js: 196682 -> 158386 б (-38 КБ), 4939 -> 3974 стр. Коммиты: nashgod b0782bf, deploy 7e2d9ef.
- ГРАБЛИ: regex-замена _currentDialogueId превратила объявление в 'let state._currentDialogueId' (невалидно) - объявление вернули в app.js. При замене имён переменных проверять объявления.
- Проверка в приложении - ОЖИДАЕТСЯ (примирение: чувство, шаги invite/talking/signing/done, подписи).

## v30.4 — 29.09.2026 — Cache-bust app.js + splash «Дыхание»

### 30.4.1 Cache-bust app.js (фикс кнопки примирения у партнёра)
- В index.html было `<script type="module" src="app.js"></script>` — БЕЗ версии. Старый app.js из HTTP-кэша браузера не содержал import из dialogue.js (после выноса Примирения коммитом b0782bf), поэтому initDialogue() не вызывался и onclick на #reconcile-btn не навешивался. Кнопка визуально есть — но мертва.
- ФИКС: `src="app.js?v=13"` в ОБОИХ репо. Заодно `style.css?v=12` → `?v=13`.
- Коммиты: nashgod c842042, deploy 90ce8a8.
- ПРАВИЛО: при каждом выносе кода из app.js в модуль — бампать `?v=` у app.js в index.html в обоих репо.

### 30.4.2 Splash: анимация скобок «Дыхание» + новая надпись
- Анимация: левая группа скобок '<' сдвигается на +28 ед., правая '>' на −28 ед., цикл 1.6s ease-in-out infinite alternate. Живёт всё время загрузки.
- index.html: группам SVG добавлены классы `splash-br splash-br--left` (красная #b25a5a) и `splash-br splash-br--right` (светлая #faf5ea).
- style.css (~6751-6758): @keyframes brLeft/brRight + правила #loading .splash-br--left/right. В reduced-motion добавлено `#loading .splash-br { animation: none; }`.
- Надпись под логотипом: `365 вопросов друг другу` → `Каждый день — вдвоём` (старая сужала приложение до одной функции, новая отражает идею целиком).
- УТВЕРЖДЕНО пользователем как финальный вид (не менять без явного запроса).
- Коммиты: nashgod ff846cb, deploy b68e1eb.
- Проверка в приложении — ОЖИДАЕТСЯ (открыть сайт в инкогнито/Ctrl+Shift+R).

---

## v30.5 — 29.09.2026 — Инструменты, инфраструктура, HANDOFF v30.5

### 30.5.1 tools/check.js — расширен до 9 секций
- Блок 3: сверка импортов app.js с экспортами js/*.js (ловит опечатки и забытые export).
- Блок 3b: cache-bust версии (app.js?v= в index.html, import dialogue.js?v= в app.js).
- Блок 5: синхронизация nashgod ↔ ghio по размерам index.html/style.css/app.js.
- Блок 8: проверка вложенных code fence в md-файлах (HANDOFF, CHANGELOG, SESSION-LOG, README, ROADMAP, LEGEND-STATES).
- Блок 9 (новое, коммит 3fb583d): сравнение CACHE_NAME в sw.js с версией в шапке файла. WARN при рассинхроне.
- Коммиты: nashgod fa20b25, a51a18f, 3fb583d.

### 30.5.2 tools/backup.js — бэкап перед правкой
- node tools/backup.js app.js style.css → <файл>.bak-YYYYMMDD-HHMMSS.
- Коммит: nashgod a51a18f.

### 30.5.3 tools/release.js — релиз одной командой
- Авто-бамп ?v=, копирование в ghio, коммит + пуш.
- Коммит: nashgod fa20b25.

### 30.5.4 UI-тест (puppeteer-core)
- tools/login.js — сохраняет Firebase Auth из IndexedDB firebaseLocalStorageDb (НЕ из cookies — первая версия это не учитывала).
- tools/ui-test.js — headless-прогон со скриншотами в tools/ui-shots/.
- Коммиты: nashgod 40ef532, 00ecbbb.
- ВАЖНО: оба ходят на прод по зашитому URL. Полная изоляция (тестовый аккаунт + coupleId + guard) — отложена. См. HANDOFF §13.

### 30.5.5 GitHub Action post-deploy-check.yml (ghio)
- При пуше в main: HTTP 200 по 22 файлам прода + cache-bust ?v= в index.html + syntax всех JS.
- Первый прогон — success.
- Коммит: ghio a4632e5.

### 30.5.6 .gitignore и .bat-меню
- .gitignore: добавлено /*.bat — локальные .bat не засоряют репо. Коммит nashgod d35c99e.
- 5 .bat в корне (check, backup, release, ui-test, login) + «Наш год.bat» на рабочем столе. UTF-8 без BOM, chcp 65001, cd в C:\nashgod. cp866 не работает.

### 30.5.7 fix(dialogue): guard openDialogueModal + cache-bust v14
- Защита от повторного открытия модалки примирения.
- Повторный бамп app.js?v=13 → ?v=14.
- Коммиты: nashgod f9b39ca, deploy 91d9acb.

### 30.5.8 Диагноз кнопки примирения — ЗАКРЫТ
- UI-тест: у Руслана «Открыть его» работает (03 → модалка, 04 → «Ждём Юлю»). Код корректен.
- Проблема Юли — её кэш/PWA/Service Worker. Дальше: тест в инкогнито.

### 30.5.9 Правила проекта
- Распределение отчётов: HANDOFF (состояние) / CHANGELOG (история версий) / SESSION-LOG (журнал сессий) / память (правила и факты). Коммит nashgod ba58a96.
- memory_update — ТОЛЬКО с точным ID из контекста. Иначе memory_save.
- memory_save требует поле tags (массив строк). Без него — Invalid memory payload.

### 30.5.10 HANDOFF v30.5
- Актуализированы разделы 3 (размеры файлов), 5 (инструменты, диагностика), 8 (риски ui-test), 13 (накопительно).
- Коммиты: nashgod b8af594, ghio f14346c.

---

Формат записи: `## vN — дата — краткое название`, далее подразделы по типам правок.*
*Хочешь проверить, что было в предыдущих версиях — ищи в HANDOFF.md или git log.*