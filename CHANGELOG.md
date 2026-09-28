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

Формат записи: `## vN — дата — краткое название`, далее подразделы по типам правок.*
*Хочешь проверить, что было в предыдущих версиях — ищи в HANDOFF.md или git log.*