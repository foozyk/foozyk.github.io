# HANDOFF — «Наш год» (v21)

## 1. Что это
PWA для пар «Наш год — 365 вопросов». Один вопрос в день, ответы партнёров
открываются только когда ответили оба. Разделы: близость, примирение после
ссоры, договорённости. Реальные пользователи: Руслан (Android), Юлия (iPhone).
Этап: прод/поддержка — фиксы и полировка.

## 2. Стек
- Firebase Auth + Firestore (проект our-year-1082f)
- Чистые ES-модули, без сборки
- PWA + Bubblewrap TWA (проект C:/nashgod-android)
- Хостинг: GitHub Pages (foozyk.github.io), Jekyll отключён (.nojekyll)

## 3. Ключевые файлы
- index.html — разметка всех экранов (ссылка style.css?v=N — cache-bust!)
- style.css — вся стилистика (~8100 строк)
- app.js — логика (~5800 строк, ES-модуль)
- sw.js — Service Worker (v21, clean-slate)
- questions.js / words.js / lessons.js — контент
- firebase-config.js — ключи Firebase
- manifest.json, confetti.browser.min.js, icon-192/512.png
- .nojekyll — отключает Jekyll на GitHub Pages
- HANDOFF.md — этот документ

## 4. Разделы
- Сегодня — вопрос дня, полароиды, «что нас сближает»
- Разговор — разговоры, примирение, договорённости
- Ритм — лента по дням
- Мы — Слово дня, Луна, Игры (Квиз / Любовь / Правда), Уроки,
  Архив (хитмап / статистика / история)

## 5. Что изменилось
### 26.09.2026 (часть 1) — чёрный экран
1) В style.css был НЕЗАКРЫТЫЙ список CSS-селекторов (~стр. 7610): висячая
   запятая после body.state-reconcile, из-за чего display:none !important
   склеивался с body и применялся к САМОМУ <body> → страница исчезала.
   Фикс: закрыть список пустым правилом {} перед комментарием.
2) Старый Service Worker (nash-god-v20) держал устаревший CSS в кэше.
   Переписан на clean-slate v21: сносит все кэши, ничего не перехватывает.
Результат: сайт показывает экран «Сегодня». Работает на десктопе и телефоне.

### 26.09.2026 (часть 2) — стилистика модалок
3) .nojekyll: была опечатка (.nojekyl без второй L). Создан правильный
   .nojekyll, битый удалён. Jekyll отключён → Pages отдаёт файлы «как есть».
4) .topic-option: дублирующий старый блок (с backdrop-filter:blur(10px))
   удалён — он делал кнопки тем «мутными/светлыми».
5) .modal-content: берёт палитру текущего экрана через color-mix
   (--bg2 + 12% белого, --bg1 + 6% белого) — модалка в тон экрана, светлее.
6) Кнопки действия в модалках (#topic-confirm, #dlg-agr-submit,
   #save-agreement) — единый нейтральный «стеклянный» стиль
   (rgba(255,255,255,.08), тонкая граница, box-shadow:none).
   Убрано розовое свечение (var(--shadow-glow)).
7) Удалены мусорные файлы: app backup.js, index-backup.html,
   style-backup.css, style.css.bak + sw.js.bak и пр.

### 26.09.2026 (часть 3) — полароиды (мобильная посадка) — УТВЕРЖДЕНО
Полароиды на «Сегодня» подогнаны под телефон. Итог:
- База (десктоп >600px): .polaroid width 140px.
- Мобильный @media (max-width: 600px):
    .polaroid-stage { max-width:100% }
    .polaroid { width:132px }
    .polaroid.me { left: calc(50% - 126px) }
    .polaroid.partner { left: calc(50% - 6px) }
    .quick-ring { left: calc(100% - 8px) }
    .quick-ring .q-btn { width:22px; height:22px }
  Пара сближена (нахлёст ~12px) и по центру.
- Эмодзи-рейл (.quick-ring, 5 реакций 🥺🤗😘❤️🔥) — по тапу на полароид.
- Кэш: index.html → style.css?v=9 (при каждой правке CSS поднимать ?v=N).
- Коммиты: nashgod a7e9e84, foozyk.github.io 2260223.

## 6. Затронутые файлы
- style.css — селекторы, .topic-option, .modal-content, кнопки модалок,
  мобильные полароиды (последнее: nashgod a7e9e84)
- index.html — ссылка style.css?v=9 (cache-bust)
- sw.js — clean-slate v21
- HANDOFF.md — v19 → v20 → v21
- .nojekyll — создан/исправлен
- app.js, words.js, lessons.js, questions.js — НЕ трогали

## 7. Что дальше
1) Синхронизировать HANDOFF (этот файл) в деплой-репо foozyk.github.io.
2) Убрать мёртвый код (чистка мёртвых CSS-правил / неиспользуемых функций).
3) ПРИОРИТЕТ: тесты вживую; push-уведомления (низкий).

## 8. Риски
- ГЛАВНЫЙ: правки идут в ДВА репо (nashgod + foozyk.github.io). Если забыть
  синк в foozyk.github.io — на сайте ничего не появится (уже случалось!).
- Старый SW может «залипнуть» на телефоне/PWA → очистить кэш / переустановить.
- Незакрытые селекторы могут снова появиться → проверять баланс { } в CSS.
- Дубли правил в CSS — удалять старые блоки целиком, не полагаться на перекрытие.
- Браузерный кеш маскирует правки → при «не поменялось» проверять
  getComputedStyle в Console; поднимать ?v=N.

## 9. Запретный список
Не возвращать: Забота, Пульс месяца, Пульс партнёра, Задачи, Календарь,
Планы, Послания, Важные даты, Ритуал воскресенья, Память «Помнишь?»,
Голос, Фото как фича, Иконка-кардиограмма, Рефлексия, Совместный дневник,
Мини-уроки в шапке «Мы» (только под-таб Уроки), Бейджи/стрики/счётчик дней,
Цветовые схемы, переключатель темы, Плашка #headerPause.
Технически: не удалять данные Firestore без запроса; не вешать background
на body (только #main-screen::before); не переопределять --nav-active для
тихого дня/примирения; полароиды — --tx во всех состояниях.

## 10. Топ-5 на возврат
T (Я-сообщение), Q (Копилка благодарностей), A (Мостик),
S (Тихий час), J (Слепой обмен).
Новые фичи не добавлять до месяца наблюдений.

## 11. Технические заметки
- ДЕПЛОЙ: источник C:/Users/Юлия/Desktop/«Наш год» → репо foozyk/nashgod.
  Сайт отдаётся из C:/Users/Юлия/Desktop/_tmp_ghio → репо foozyk.github.io.
  Процесс: правка в источнике → коммит+пуш в nashgod → копировать style.css
  и index.html в _tmp_ghio → коммит+пуш в foozyk.github.io. Скрипта автосинка
  нет, только вручную. НЕ удалять служебные файлы деплоя: .nojekyll,
  .well-known/assetlinks.json, _config.yml, HANDOFF.md.
- Фон: только #main-screen::before (fixed-слой). На body — нельзя.
- Service Worker: активация нового — закрыть ВСЕ вкладки сайта или
  Application → Service Workers → Unregister + Clear site data.
- Jekyll: отключён через .nojekyll (две L!). Если назвать .nojekyl — не работает.
- Модалка .modal-content: color-mix(--bg2 88% + #fff 12%) сверху,
  color-mix(--bg1 94% + #fff 6%) снизу.
- Кнопки модалок (#topic-confirm, #dlg-agr-submit, #save-agreement) —
  одно правило, нейтральные, box-shadow:none.
- Проверка при чёрном экране (обход родителей в Console):
  (function(){var el=document.getElementById('main-screen'),r=[];while(el)
  {var cs=getComputedStyle(el);r.push((el.id||el.className||el.tagName)+
  ':disp='+cs.display);el=el.parentElement}return r.join(' | ')})()
  Если body: disp=none — виноват незакрытый список селекторов в CSS.
- Проверка баланса скобок: { vs } в style.css.