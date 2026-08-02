# Связка сайта «Мэджик Металл» с SaaS

Сайт является первым публичным этапом единой воронки продаж. Его задача — привести посетителя из поиска, рекламы или прямого перехода к заявке и передать в SaaS не только контакт, но и контекст обращения.

## Поток данных

1. Посетитель открывает главную страницу или каталог.
2. Сайт создаёт анонимный `sessionId` и сохраняет UTM-метки, referrer и первую страницу входа.
3. Действия фиксируются как события воронки: переход в каталог, поиск, фильтр, отсутствие результатов, просмотр или выбор товарной группы, начало формы, звонок и e-mail.
4. При отправке формы создаётся стабильный `externalLeadId`.
5. К заявке прикладывается безопасная история текущей сессии: до 30 событий без введённых контактных данных.
6. Заявка отправляется в публичный endpoint SaaS.
7. SaaS создаёт или обновляет лид, сохраняет источник и запускает процесс:
   `получил заявку → рассчитал прибыль → сформировал КП → поставил следующее касание`.
8. Пока endpoint SaaS не настроен, заявка отправляется через Netlify Forms, чтобы сайт не терял обращения.

## Настройка endpoint

В файле `site-config.js` указываются:

```js
window.MM_CONFIG = Object.freeze({
  saasLeadEndpoint: 'https://app.magicmet.ru/api/public/v1/leads',
  saasEventEndpoint: 'https://app.magicmet.ru/api/public/v1/events',
  formFallbackEndpoint: '/',
  sourceSystem: 'magicmet-website',
  apiVersion: '2026-07-30'
});
```

Секретные ключи нельзя размещать в браузере. Публичные endpoints должны иметь rate limit, проверку Origin, антиспам и серверную валидацию.

## Контракт заявки

```json
{
  "externalLeadId": "uuid",
  "sourceSystem": "magicmet-website",
  "apiVersion": "2026-07-30",
  "submittedAt": "2026-07-30T14:00:00.000Z",
  "leadType": "request_to_quote",
  "market": "RU_CIS",
  "contact": {
    "name": "Иван",
    "value": "+7 900 000-00-00"
  },
  "request": {
    "text": "Лист 09Г2С 10×1500×6000, 12 тонн, Ташкент",
    "pageTitle": "Каталог промышленной продукции — Мэджик Металл",
    "pageUrl": "https://www.magicmet.ru/catalog/?utm_source=yandex"
  },
  "consent": {
    "personalData": true,
    "capturedAt": "2026-07-30T14:00:00.000Z"
  },
  "attribution": {
    "sessionId": "uuid",
    "utm_source": "yandex",
    "utm_medium": "cpc",
    "utm_campaign": "metal",
    "referrer": "...",
    "landingPage": "...",
    "currentPage": "..."
  },
  "journey": {
    "sessionId": "uuid",
    "eventCount": 5,
    "recentEvents": [
      {
        "eventId": "uuid",
        "name": "catalog_search",
        "occurredAt": "2026-07-30T13:58:00.000Z",
        "path": "/catalog/",
        "data": {
          "query": "09г2с",
          "category": "Все группы",
          "resultCount": 2
        }
      }
    ],
    "intent": {
      "selectedProductGroups": ["Лист горячекатаный"],
      "searchQueries": ["09г2с"],
      "noResultQueries": [],
      "lastCatalogCategory": "Листовой прокат"
    }
  }
}
```

Запрос содержит заголовок:

```text
X-Idempotency-Key: <externalLeadId>
```

SaaS обязан использовать его для защиты от дублей при повторной отправке.

## Минимальный ответ SaaS

Успешный ответ:

```json
{
  "ok": true,
  "leadId": "lead_123",
  "externalLeadId": "uuid"
}
```

HTTP-статусы:

- `201` — лид создан;
- `200` — повторный запрос распознан, существующий лид возвращён;
- `400` — ошибка структуры данных;
- `429` — превышен лимит;
- `500` — внутренняя ошибка.

При любом неуспешном ответе сайт пробует резервный канал формы.

## События воронки

Endpoint событий принимает:

- `page_view`;
- `catalog_navigation_click`;
- `catalog_landing_filter`;
- `catalog_search`;
- `catalog_search_cleared`;
- `catalog_no_results`;
- `catalog_filter`;
- `product_group_view`;
- `product_group_select`;
- `form_start`;
- `phone_click`;
- `email_click`;
- `lead_submit`;
- `lead_saas_error`;
- `lead_success`;
- `lead_error`.

Каждое событие содержит `eventId`, `sessionId`, время, URL, источник и дополнительные данные. В SaaS события связываются с лидом по `sessionId` после получения формы.

## Поля лида в SaaS

Обязательные стабильные поля:

- `id` — внутренний ID SaaS;
- `external_lead_id` — ID с сайта;
- `source_system` — `magicmet-website`;
- `session_id`;
- `contact_name`;
- `contact_value`;
- `request_text`;
- `market`;
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`;
- `referrer`, `landing_page`, `current_page`;
- `selected_product_groups`;
- `catalog_search_queries`;
- `catalog_no_result_queries`;
- `journey_events` или отдельная таблица событий;
- `status`;
- `responsible_manager_id`;
- `next_action_at`;
- `created_at`.

## Статусы воронки

Рекомендуемый минимальный набор:

1. `new` — новая заявка;
2. `qualified` — потребность подтверждена;
3. `calculation` — считается закупка, логистика и прибыль;
4. `quote_prepared` — КП подготовлено;
5. `quote_sent` — КП отправлено;
6. `follow_up` — назначено следующее касание;
7. `won` — заказ получен;
8. `lost` — отказ с обязательной причиной.

## Принципы конфиденциальности

- До формы используется только случайный анонимный `sessionId`.
- Fingerprinting и попытки определить личность посетителя не применяются.
- В `journey.recentEvents` не включаются введённые контактные данные и тексты прошлых заявок.
- История связывается с человеком только после его добровольной отправки формы и согласия на обработку персональных данных.

## Следующее подключение

После готовности SaaS необходимо указать реальные HTTPS endpoints в `site-config.js`, настроить CORS для домена сайта, idempotency, rate limit, серверную валидацию и уведомление ответственного менеджера на `m1@magicmet.ru`.
