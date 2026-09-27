# HANDOFF — «Наш год» · v24 · 27.09.2026

## 1. Что это
«Наш год — 365 вопросов» — PWA-приложение для пар (Руслан + Юля). Один вопрос в день, ответы открываются когда ответили оба. Плюс: игры, уроки, архив. Установлено как TWA-приложение на Android + PWA в браузере. Живёт по адресу https://foozyk.github.io.

## 2. Стек
- HTML + CSS + ванильный JS (без фреймворков)
- Firebase (Auth + Firestore)
- GitHub Pages (хостинг, репо foozyk.github.io и nashgod)
- Service Worker (v24, clean-slate)
- TWA (Trusted Web Activity) → APK через Bubblewrap 1.25.0
- Web Push API (VAPID) + GitHub Actions как бесплатный cron — НОВОЕ в v24
- Тема: тёплая палитра #171516, #b25a5a, #faf5ea

## 3. Ключевые файлы
Рабочая папка: C:\Users\Юлия\Desktop\Наш год (репо nashgod) + C:\Users\Юлия\foozyk.github.io (прод Pages)
- index.html (45 842 б) — вся разметка, #loading (splash), SVG с width=132/height=132
- style.css (214 099 б) — стили + блок Splash
- app.js (225 726 б) — вся логика + Web Push (registerPushSubscription, unregisterPushSubscription)
- questions.js, words.js, lessons.js — данные
- sw.js (2 244 б) — Service Worker v24 (clean-slate + push + notificationclick)
- manifest.json — PWA-манифест
- icon.svg, icon-maskable.svg — векторные иконки (зеркальные кавычки)
- icon-192.png, icon-512.png, icon-maskable-192.png, icon-maskable-512.png, icon-1024.png, apple-touch-icon.png
- .well-known/assetlinks.json — TWA-верификация (в репо foozyk.github.io)
- scripts/send-push.mjs — НОВОЕ: Node-скрипт рассылки push
- .github/workflows/daily-push.yml — НОВОЕ: cron 09:00 и 19:00 MSK
- APK-проект: C:\nashgod-android (Bubblewrap, twa-manifest.json, android.keystore)

## 4. Разделы приложения
- Сегодня — полароиды «Я»/партнёр, вопрос дня
- Игры — табы
- Мы — под-табы: Уроки, Луна, ...
- Архив
- Онбординг, Auth, Setup, Waiting

## 5. Что изменилось в v24

### 5.1 Web Push уведомления (НОВОЕ)
- VAPID-ключи сгенерированы, Public: BFhoiRSlifBwf9BDkR5CxiaanhPzenpaxEIKInodx0vawXYSzs26tbROTjPwPuWJRIRSYgFZi90uGZiwyzhFDN4
- sw.js v23 → v24: обработчики push и notificationclick
- app.js: registerPushSubscription(), unregisterPushSubscription(), urlBase64ToUint8Array(); вызов из initNotifications(); VAPID_PUBLIC_KEY
- Firestore Rules: добавлен блок match /push_subscriptions/{userId} { allow read, write: if isSignedIn() && uid() == userId; }
- Firestore коллекция push_subscriptions — хранит subscription + uid + coupleId + updatedAt + userAgent
- scripts/send-push.mjs — читает все подписки, шлёт через web-push, удаляет мёртвые (410 Gone)
- .github/workflows/daily-push.yml — cron: 09:00 MSK = 06:00 UTC (morning, всем), 19:00 MSK = 16:00 UTC (evening, только не ответившим)
- GitHub Secrets (репо nashgod): VAPID_PUBLIC, VAPID_PRIVATE, FIREBASE_SERVICE_ACCOUNT
- РЕЗУЛЬТАТ: первый живой push доставлен на Android Руслана 27.09.2026 (~15:20 MSK). Push на iPhone Юли — ОТЛОЖЕНО по решению Руслана (чек-лист в разделе 11)

### 5.2 Фикс кэша заставки
- Проблема: SVG заставки растягивался на весь экран, потому что CSS не применялся (старый style.css в кэше браузера + SW)
- Решение: (а) width=132 height=132 прямо в теге SVG в index.html; (б) style.css?v=11 → ?v=12; (в) SW nash-god-v23 → v24
- Правило на будущее: при правке CSS — обязательно бампать ?v=N в index.html; при правке SW — менять CACHE_NAME

### 5.3 Чистка мёртвого CSS
- Удалено 41 блок мёртвых CSS-правил, -7271 байт
- Шаг 1 (коммит f7ff466): 6 блоков от ЗАПРЕЩЁННЫХ фич — .badges, .badges-row, .badges-row .badge, .badges-row .badge-accent, .theme-badge, .streak-badge (−928 б)
- Шаг 2 (коммит a63d46f): 35 блоков старой вёрстки — .header*, .ornament*, .tape, .polaroid-img, .gear-btn, .bottom-nav, .progress-wrap, .widgets-row, .moon-info/.moon-advice, .weather-info, .info-*, .tip-*, .question-label, .mood-partner-name, .size-N (защищён от случайного удаления) (−6343 б)
- Проверки: баланс { } = 1346/1346, ( ) = 1779/1779, живые классы (.retro-word, .status-dot, .ans, .you, .both-done, .mine-done, .history-answer) не тронуты

### 5.4 Иконка + заставка (были в v23, подтверждены в v24)
- Новая иконка «Зеркальные кавычки» (вариант «Навстречу»): слева терракотовая, справа кремовая, фон #171516, rx=112
- HTML-заставка #loading — лого + «Наш год» + «365 вопросов друг другу», fade-in splashIn, скрывается через showScreen()

### 5.5 Keystore + APK (были в v23)
- Keystore пересоздан (SHA256 = 63:8E:E2:77:8B:44:16:3C:B1:B6:AB:2D:97:F3:FC:67:CE:FB:58:C8:21:68:5B:20:07:37:DC:BB:E9:A1:55:AC)
- assetlinks.json обновлён, Google подтвердил
- APK v6 (appVersionCode=6) подписан и установлен на Android

## 6. Затронутые файлы (v24)

### Репо nashgod (Desktop/Наш год) — коммиты:
- 0901a9c — feat(push): Web Push (VAPID) + GitHub Actions daily cron
- f7ff466 — chore(cleanup): remove dead CSS from banned features (6 блоков, −928 б)
- a63d46f — chore(cleanup): remove 35 more dead CSS blocks (−6343 б)
- 0244ef3 — fix(splash): constrain SVG to 132x132, bump style.css ?v=12 и SW v24

### Репо foozyk.github.io (прод Pages) — коммиты:
- 5459c37 — feat(push): SW v23 + app.js Web Push
- 3066fb9 — chore(cleanup): remove dead CSS from banned features
- 2d772f4 — chore(cleanup): remove 35 more dead CSS blocks
- 65bbf97 — fix(splash): constrain SVG + bump CSS/SW cache versions

## 7. Что дальше
1. Push на iPhone Юли — отложено. Чек-лист в разделе 11
2. Тесты вживую (Приоритет 1) — прогнать с Юлей базовые сценарии
3. Опционально: добить остатки мёртвого CSS (.size-1..5, .weather-info, .tip-emoji, .ico как compound + 4 сиротских ID в HTML)
4. Опционально: почистить .bak-файлы (7 штук в Desktop/Наш год)
5. Дальше — по обратной связи после месяца наблюдений (без новых фич до этого момента)

## 8. Риски
- Keystore: новый пароль сохранён Русланом ЛИЧНО. Потеря = пересоздание + переустановка APK + обновление assetlinks.json
- APK нельзя обновить поверх при смене ключа — только переустановка (сделано 27.09)
- Service Worker: при чёрном экране — Ctrl+Shift+R 2–3 раза или чистить кэш. Проверить незакрытые списки селекторов в style.css (была проблема 26.09)
- assetlinks.json: формат критичен — отпечаток БЕЗ префикса SHA256:, только hex через двоеточия
- Кириллица в путях: PowerShell ломает cd на пробелы+кириллицу → нужен Set-Location -LiteralPath. Python не установлен — использовать Node.js
- Git не в PATH: вызывать через C:\Users\Юлия\AppData\Local\GitHubDesktop\app-3.6.6\resources\app\git\cmd\git.exe
- Web Push iOS: только iOS 16.4+, PWA должна быть на домашнем экране, разрешение даёт пользователь вручную
- GitHub Actions cron: время в UTC (09:00 MSK = 06:00 UTC, 19:00 MSK = 16:00 UTC). Может задерживаться на 5–15 мин

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
- Firestore push_subscriptions: https://console.firebase.google.com/project/our-year-1082f/firestore/data/~2Fpush_subscriptions
- GitHub Actions: https://github.com/foozyk/nashgod/actions
- GitHub Secrets: https://github.com/foozyk/nashgod/settings/secrets/actions
- Firebase Admin SDK: https://console.firebase.google.com/project/our-year-1082f/settings/serviceaccounts/adminsdk
- Пересборка APK: cd C:\nashgod-android; bubblewrap build (интерактивно, 2 пароля)

### ЧЕК-ЛИСТ: как включить push на iPhone Юли (когда вернёмся)
1. Проверить, что у Юли iOS 16.4+
2. Убедиться, что PWA добавлена на домашний экран (Safari → Поделиться → На экран Домой)
3. Открыть PWA с иконки (НЕ в Safari!)
4. Шестерёнка ⚙️ → Уведомления → нажать ДВАЖДЫ (выкл → вкл)
5. iOS покажет «Разрешить уведомления?» → Разрешить
6. Проверить Firestore push_subscriptions — должен появиться 2-й документ (userAgent iPhone)
7. Запустить workflow: GitHub Actions → Daily push notifications → Run workflow → morning → Run
8. Проверить, что push дошёл

### Сохранение пароля keystore
КРИТИЧНО: пароль от android.keystore (создан 27.09.2026) сохранён Русланом ЛИЧНО в надёжном месте. НЕ в этом файле. При потере — пересоздание keystore + переустановка APK + обновление assetlinks.json.

### Git через полный путь (PowerShell)
$git = 'C:\Users\Юлия\AppData\Local\GitHubDesktop\app-3.6.6\resources\app\git\cmd\git.exe'
Set-Location -LiteralPath 'C:\Users\Юлия\Desktop\Наш год'
& $git status --short

### Файлы-бэкапы (Desktop/Наш год) — накопились, можно удалить
- style.css.bak, style.css.bak2, style.css.bak-icon-20260927-120225
- style.css.bak-deadcode-20260927, style.css.bak-deadcode2-20260927
- index.html.bak-20260927-120225, manifest.json.bak-20260927-120225, icon.svg.bak-20260927-120225
