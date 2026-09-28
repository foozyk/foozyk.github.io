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
Рабочая папка: C:\Users\Юлия\Desktop\Наш год (репо nashgod) + C:\Users\Юлия\Desktop\_tmp_ghio (прод Pages)
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

### Окружение (Python, Node)
- Python 3.12.10 установлен 28.09.2026 через winget: `winget install --id Python.Python.3.12 --scope user` (без прав админа).
- Путь: `C:\Users\Юлия\AppData\Local\Programs\Python\Python312\python.exe`, pip 25.0.1. numpy/pandas/sympy — нет.
- MCP: `python_status` → available:true; `python_exec` работает (изолированная песочница: без пакетов/сети, только временный cwd, 30 сек / 60 КБ кода).
- Баг хоста: в выводе путь показывается как `C:\Users\????\...` (кириллица «Юлия» бьётся) — косметика, всё работает.
- Правило: python_exec — только для расчётов; правки файлов проекта (CSS/HTML/git) — через shell+PowerShell.
- Node.js v24.21.0 уже стоял и работает.
### Команды git (полный путь, git не в PATH)
Скопируй в PowerShell (по одной строке):

$g = 'C:\Users\Юлия\AppData\Local\GitHubDesktop\app-3.6.6\resources\app\git\cmd\git.exe'
Set-Location -LiteralPath 'C:\Users\Юлия\Desktop\Наш год'
& $g status -sb
& $g add -A
& $g commit -m "сообщение"
& $g push origin main

Deploy-репо: Set-Location -LiteralPath 'C:\Users\Юлия\Desktop\_tmp_ghio'

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

### Текущее состояние репо (28.09.2026)
- nashgod HEAD: 22c63f7; deploy HEAD: c178f2f
- Оба ## main...origin/main (синхронны, дерево чистое)
- Сайт работает

### Рефакторинг app.js — вынос модулей (28.09.2026)
Стратегия: мост js/state.js (Object.defineProperties, геттеры/сеттеры) — app.js владеет переменными, модули читают/пишут через state.*. Вынос секции = удалить блок из app.js, создать модуль, добавить импорт. Проверки после каждого: node --check app.js + модуль, node tools/check.js, ручная проверка в приложении.
Вынесено: js/state.js (мост), js/word-of-day.js (108 стр), js/lesson-hint.js (69 стр), js/day-states.js (182 стр), js/pause.js (111 стр). app.js: 5820 → 5300 стр. ГРАБЛИ: regex-замена имени conversations попала в строку внутри doc() и порвала путь Firestore; импорты Firebase в модуль добавлять вручную.
Приём: колбэк вместо прямой связи (bindLessonHint(conv, renderDialogueContent)); для флагов — state.quietDayActive/skipDayActive (rw).
Скрипт выноса: .cjs (НЕ .mjs — require), p=process.argv[2], границы по номерам строк, латиница в коде.

## 12. Про память и надёжность (важно!)

- memory_save в веб-чате DeepSeek++ v1.14.0 НЕ работает — диалог авторизации не появляется, записи не сохраняются. НЕ полагаться на память.
- Источник истины: этот HANDOFF.md + git-история репо nashgod и foozyk.github.io.
- Перед началом работы в новом чате: прочитать HANDOFF.md (актуальная версия) и git log.

## 13. Что дальше (накопительно)

- [ВЫПОЛНЕНО] C-4: создан js/state.js — мост к ядру app.js через Object.defineProperties (геттеры/сеттеры). Модули читают/пишут state.currentUser, state.db и т.д. app.js не тронут, всё работает. Коммиты: nashgod 98a9df2, deploy cf6340d.
- [ВЫПОЛНЕНО] Вынос js/word-of-day.js (Слово дня, 108 стр). nashgod c139ca8.
- [ВЫПОЛНЕНО] Вынос js/lesson-hint.js (Обучение в моменте, 69 стр). nashgod fc6b367.
- [ВЫПОЛНЕНО] Вынос js/day-states.js (Тихий день + Пропустить день, 182 стр). nashgod 67a73d6.
- [ВЫПОЛНЕНО] Вынос js/pause.js (Пауза, 111 стр). nashgod 5e2d320, фикс 22c63f7.
- Далее: Примирение (~969 стр), Ритм, ядро 1-3450.
