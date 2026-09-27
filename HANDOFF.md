# HANDOFF — «Наш год» · v23 · 27.09.2026

## 1. Что это
«Наш год — 365 вопросов» — PWA-приложение для пар (Руслан + Юля). Один вопрос в день, ответы открываются когда ответили оба. Плюс: игры, уроки, архив. Установлено как TWA-приложение на Android + PWA в браузере. Живёт по адресу https://foozyk.github.io.

## 2. Стек
- HTML + CSS + ванильный JS (без фреймворков)
- Firebase (Auth + Firestore)
- GitHub Pages (хостинг, репо `foozyk.github.io` и `nashgod`)
- Service Worker (v22, clean-slate)
- TWA (Trusted Web Activity) → APK через Bubblewrap 1.25.0
- Тема: тёплая палитра #171516 (тёмный), #b25a5a (терракота), #faf5ea (кремовый)

## 3. Ключевые файлы
Рабочая папка: `C:\Users\Юлия\Desktop\Наш год` (репо `nashgod`) + `C:\Users\Юлия\foozyk.github.io` (прод Pages)
- `index.html` — вся разметка, #loading (splash)
- `style.css` — ~222 КБ, стили + блок Splash
- `app.js` — ~224 КБ, вся логика
- `questions.js`, `words.js`, `lessons.js` — данные
- `sw.js` — Service Worker v22
- `manifest.json` — PWA-манифест
- `icon.svg`, `icon-maskable.svg` — векторные иконки
- `icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png`, `icon-1024.png`, `apple-touch-icon.png`
- `.well-known/assetlinks.json` — TWA-верификация (в репо `foozyk.github.io`)
- APK-проект: `C:\nashgod-android` (Bubblewrap, `twa-manifest.json`, `android.keystore`)

## 4. Разделы приложения
- **Сегодня** — полароиды «Я»/партнёр, вопрос дня
- **Игры** — табы
- **Мы** — под-табы: Уроки, Луна, ...
- **Архив**
- Онбординг, Auth, Setup, Waiting

## 5. Что изменилось в v23
1. **Новая иконка «Зеркальные кавычки» (вариант №8 «Навстречу»)**:
   - `icon.svg` — `rx=112`, слева терракотовая кавычка » (смотрит вправо), справа кремовая « (смотрит влево)
   - `icon-maskable.svg` — то же, но фон во весь квадрат, знак в safe-zone 78%
   - Экспортированы PNG: 192, 512, 1024, maskable-192, maskable-512, apple-touch-icon (180)
2. **HTML-заставка (`#loading`)** в `index.html`:
   - Лого (та же иконка), «Наш год», «365 вопросов друг другу»
   - CSS в `style.css`: блок `/* Splash */` с анимацией `splashIn` (fade + scale .85s)
   - Скрывается автоматически через `showScreen()` (когда `onAuthStateChanged` вызывает переход на `auth`/`onboarding`/`main` — `#loading` теряет `.active`)
3. **`manifest.json`**:
   - 4 иконки (`any` + `maskable` на 192 и 512)
   - `theme_color` = `#171516`, `background_color` = `#171516`
4. **`twa-manifest.json`** (APK):
   - `maskableIconUrl` = `icon-maskable-512.png` (было `icon-512.png`)
   - Цвета: все → `#171516` (были `#8B3A3A`/`#FBF3EC`/`#000000`)
   - Версии: `appVersionCode=6`, `versionName="6"` (Bubblewrap поднял с 4)
5. **Keystore пересоздан** (старый пароль потерян 27.09):
   - Новый `android.keystore`, alias `android`, DName = `CN=Ruslan Petrov, OU=Personal, O=foozyk, L=Moscow, ST=Moscow, C=RU`, RSA 2048, validity 10000 дней
   - SHA256 отпечаток: `63:8E:E2:77:8B:44:16:3C:B1:B6:AB:2D:97:F3:FC:67:CE:FB:58:C8:21:68:5B:20:07:37:DC:BB:E9:A1:55:AC`
6. **`.well-known/assetlinks.json`** обновлён на новый отпечаток — Google Digital Asset Links API подтвердил ✅
7. **APK v6** собран и установлен на телефон Юли — работает: новая иконка, заставка, БЕЗ адресной строки (standalone).

## 6. Затронутые файлы
**Репо `nashgod` (Desktop/Наш год)** — коммит `667bc25`:
- `icon.svg`, `icon-maskable.svg` (новые)
- `icon-192.png`, `icon-512.png` (обновлены)
- `icon-maskable-192.png`, `icon-maskable-512.png`, `icon-1024.png`, `apple-touch-icon.png` (новые)
- `index.html` (splash-блок)
- `style.css` (splash-стили)
- `manifest.json` (иконки + цвета)

**Репо `foozyk.github.io`** — коммиты:
- `6878440` — иконки + splash + manifest + SW v22 (задеплоено ранее 27.09)
- `d5f54f5` — assetlinks.json (новый SHA256)

**`C:\nashgod-android`**:
- `twa-manifest.json` (maskable, цвета, версии)
- `android.keystore` (пересоздан 27.09.2026)
- `android.keystore.old` (старый, пароль утерян — сохранён для истории)
- `app-release-signed.apk` (v6, 1527024 байт, 13:35:53)
- `app-release-bundle.aab` (v6, 1669359 байт, 13:36:05)

## 7. Что дальше
Приоритеты из прошлого HANDOFF:
1. **Тесты вживую** (Приоритет 1) — прогнать с Юлей базовые сценарии
2. **Push-уведомления** (Приоритет 3) — напоминание «сегодня новый вопрос»
3. Дальше — по обратной связи после месяца наблюдений (без новых фич до этого момента)

## 8. Риски
- **Keystore:** новый пароль ОБЯЗАТЕЛЬНО сохранён Русланом в надёжном месте. Потеря = пересоздание + переустановка APK + обновление assetlinks.json.
- **APK нельзя обновить «поверх»** при смене ключа — только переустановка (сделано 27.09, Юля переустановила).
- **Service Worker:** если чёрный экран — жать Ctrl+Shift+R 2–3 раза или чистить кэш. Проверить незакрытые списки селекторов в `style.css` (была проблема 26.09).
- **assetlinks.json:** формат критичен — отпечаток БЕЗ префикса `SHA256:`, только hex через двоеточия.
- **Кириллица в путях** (`C:\Users\Юлия\`) — при работе с MCP/native host даёт искажения UTF-8→cp866 (решено в `.bat` и манифесте).

## 9. Запретный список (НЕ ВОЗВРАЩАТЬ)
Забота, Пульс месяца, Пульс партнёра, Задачи, Календарь, Планы, Послания, Важные даты, Ритуал воскресенья, Память «Помнишь?», Голос, Фото как фича, Иконка-кардиограмма, Рефлексия, Совместный дневник, Мини-уроки в шапке Мы (только в под-табе Уроки), Бейджи/стрики/счётчик дней, Цветовые схемы, переключатель темы, Плашка #headerPause.

**Технические правила:**
- Не удалять данные Firestore без явного запроса
- Не вешать background на body (фон ломается) — только на `#main-screen::before` как fixed-слой
- Не переопределять `--nav-active` для состояний тихий день/примирение
- Полароиды: `--tx` во всех состояниях

## 10. Топ-5 на возврат
Новые фичи не добавлять до месяца наблюдений. Топ-5 на возврат:
- **T** — Я-сообщение
- **Q** — Копилка благодарностей
- **A** — Мостик
- **S** — Тихий час
- **J** — Слепой обмен

## 11. Технические заметки
- **Проверка assetlinks:** https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://foozyk.github.io&relation=delegate_permission/common.handle_all_urls
- **Проверка отпечатка APK:** `& "C:\Users\Юлия\.bubblewrap\jdk\jdk-17.0.11+9\bin\keytool.exe" -printcert -jarfile C:\nashgod-android\app-release-signed.apk`
- **Пересборка APK:** `cd C:\nashgod-android; bubblewrap build` (интерактивно, 2 пароля)
- **Bubblewrap сохраняет старый keystore** как `.old`, если пароль не подошёл
- **Keytool не отображает** вводимые символы при запросе пароля — это норма
- **Пароль keystore должен быть ASCII** (латиница + цифры + простые символы), кириллица вызывает ошибку `Password is not ASCII`
- **MCP Shell Local** работает, но в веб-чате расширение DeepSeek++ v1.14.0 не пробрасывает shell-инструменты в модель. В текущем чате они появились — возможно, обновление расширения исправило баг. В новых чатах может не работать.
- **Пароль нового keystore** — сохранён Русланом ЛИЧНО (не в этом файле)
- **Хранить `android.keystore` и пароль** вместе (архив в облаке)