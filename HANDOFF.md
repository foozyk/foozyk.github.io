# HANDOFF — «Наш год» (v22)

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
   запятая после body.state-reconcile → display:none !important попадал на
   САМ <body> → страница исчезала. Фикс: закрыть список пустым правилом {}.
2) Старый Service Worker (nash-god-v20) держал устаревший CSS в кэше.
   Переписан на clean-slate v21: сносит все кэши, ничего не перехватывает.

### 26.09.2026 (часть 2) — стилистика модалок
3) .nojekyll: была опечатка (.nojekyl без второй L) — исправлено.
4) .topic-option: удалён старый дублирующий блок с backdrop-filter:blur(10px).
5) .modal-content: палитра экрана через color-mix.
6) Кнопки модалок (#topic-confirm, #dlg-agr-submit, #save-agreement) —
   нейтральный стеклянный стиль, убрано розовое свечение.
7) Удалены мусорные файлы (бэкапы, zip).

### 26.09.2026 (часть 3) — полароиды (мобильная посадка) — УТВЕРЖДЕНО
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
- Кэш: index.html → style.css?v=10.
- Коммиты: nashgod a7e9e84, foozyk.github.io 2260223.

### 26.09.2026 (часть 4) — закрытые разговоры (isConvClosed)
Проблема: разговор с созданной договорённостью оставался «активным»
(статус «Оба написали», корзина). Причина: закрытие завязано только на
флаг conv.hasAgreement, который ставится ЛИШЬ в момент создания
договорённости (saveAgreement, fromConversation), а у старых разговоров
флага нет.
Решение — функция isConvClosed(conv) в app.js (после `let unsubAgreements = null;`):
  function isConvClosed(conv){ if(!conv) return false; if(conv.hasAgreement)
  return true; return (agreements||[]).some(function(x){
  return x.fromConversation === conv.id; }); }
Все 4 проверки conv.hasAgreement заменены на isConvClosed(conv):
  ~2846 статус «✓ Закрыто»; ~2857 убрать корзину (delBtn.remove());
  ~3027/3049 read-only (скрыть Обновить/Договориться/Мне нужно время,
  textarea readOnly). ВНУТРИ функции остаётся conv.hasAgreement.
Коммиты: nashgod 101fa00, foozyk.github.io 9e2b677. Проверка: node --check → 0.

## 6. Затронутые файлы
- style.css — селекторы, модалки, мобильные полароиды
- app.js — isConvClosed + read-only закрытых разговоров (nashgod 101fa00)
- index.html — ссылка style.css?v=10
- sw.js — clean-slate v21
- HANDOFF.md — v19 → v20 → v21 → v22
- .nojekyll — создан/исправлен
- questions.js, words.js, lessons.js — НЕ трогали

## 7. Что дальше
1) Убрать мёртвый код (чистка мёртвых CSS-правил / неиспользуемых функций).
2) ПРИОРИТЕТ: тесты вживую; push-уведомления (низкий).

## 8. Риски
- ГЛАВНЫЙ: правки идут в ДВА репо (nashgod + foozyk.github.io). Если забыть
  синк в foozyk.github.io — на сайте ничего не появится.
- Старый SW может «залипнуть» на телефоне/PWA → очистить кэш / переустановить.
- Незакрытые селекторы могут снова появиться → проверять баланс { } в CSS.
- Дубли правил в CSS — удалять старые блоки целиком.
- Браузерный кеш маскирует правки → поднимать ?v=N, проверять getComputedStyle.
- Shell MCP в сессии 26.09 был нестабилен (длинные/кириллица/многострочные
  команды рвались и дублировались). Надёжный обход: команды выполняет
  пользователь в своём PowerShell, ассистент диктует.

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
  Процесс: правка → коммит+пуш в nashgod → копировать app.js/style.css/
  index.html в _tmp_ghio → коммит+пуш в foozyk.github.io. Скрипта автосинка
  нет. НЕ удалять служебные файлы деплоя: .nojekyll,
  .well-known/assetlinks.json, _config.yml, HANDOFF.md.
- Фон: только #main-screen::before (fixed-слой). На body — нельзя.
- Service Worker: активация нового — закрыть ВСЕ вкладки сайта или
  Application → Service Workers → Unregister + Clear site data.
- Jekyll: отключён через .nojekyll (две L!).
- Модалка .modal-content: color-mix(--bg2 88% + #fff 12%) / (--bg1 94% + #fff 6%).
- Кнопки модалок — одно правило, box-shadow:none.
- Проверка при чёрном экране (обход родителей в Console):
  (function(){var el=document.getElementById('main-screen'),r=[];while(el)
  {var cs=getComputedStyle(el);r.push((el.id||el.className||el.tagName)+
  ':disp='+cs.display);el=el.parentElement}return r.join(' | ')})()
  Если body: disp=none — виноват незакрытый список селекторов в CSS.
- Проверка синтаксиса JS: node --check app.js → EXIT=0.