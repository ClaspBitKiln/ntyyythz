# Связка сайта «Мэджик Металл» с SaaS

Сайт является первым публичным этапом единой воронки продаж. Его задача — привести посетителя из поиска, рекламы или прямого перехода к заявке и передать в SaaS не только контакт, но и контекст обращения.

## Поток данных

1. Посетитель открывает страницу сайта.
2. Сайт создаёт анонимный `sessionId` и сохраняет UTM-метки, referrer и первую страницу входа.
3. Действия посетителя фиксируются как события воронки: просмотр страницы, просмотр товарной группы, начало формы, звонок, e-mail, отправка заявки.
4. При отправке формы создаётся стабильный `externalLeadId`.
5. Заявка отправляется в публичный endpoint SaaS.
6. SaaS создаёт или обновляет лид, сохраняет источник и запускает процесс:
   `получил заявку → рассчитал прибыль → сформировал КП → поставил следующее касание`.
7. Пока endpoint SaaS не настроен, заявка отправляется через Netlify Forms, чтобы сайт не терял обращения.

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
    "pageTitle": "...",
    "pageUrl": "https://www.magicmet.ru/?utm_source=yandex"
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
- `product_group_view`;
- `form_start`;
- `phone_click`;
- `email_click`;
- `lead_submit`;
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

## Дальнейшее развитие

Следующие страницы каталога должны использовать тот же `sessionId`, `externalLeadId`, формат атрибуции и события. Это позволит объединять SEO-трафик, просмотр продукции, расчёт, КП и работу менеджера в одной истории клиента без переделки публичной формы.
