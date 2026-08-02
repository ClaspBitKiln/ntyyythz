# Интеграция сайта с SaaS

## Зафиксированный маршрут заявки

Браузер отправляет JSON только на относительный адрес сайта:

```text
POST /api/leads
```

Netlify перенаправляет этот адрес в серверную функцию `netlify/functions/lead.js`. Токен SaaS никогда не передаётся в браузер.

Серверная функция после валидации отправляет нормализованную заявку:

```text
POST {SAAS_API_URL}/integrations/site/v1/leads
```

Обязательные серверные заголовки:

- `Authorization: Bearer {SAAS_SITE_INGEST_TOKEN}`
- `Content-Type: application/json`
- `Accept: application/json`
- `Idempotency-Key: {externalLeadId}`
- `X-Tenant-Id: {SAAS_TENANT_ID}`
- `X-Correlation-Id: {netlifyRequestId | externalLeadId}`

## Переменные окружения Netlify

Обязательные:

- `SAAS_API_URL`
- `SAAS_SITE_INGEST_TOKEN`
- `SAAS_TENANT_ID`

Необязательная:

- `SAAS_SOURCE_ID` — по умолчанию `magicmet-website`.

Эти значения являются серверными секретами. Их запрещено добавлять в HTML, `site-config.js`, клиентский JavaScript, репозиторий или логи.

## Идемпотентность и ответ

`externalLeadId` создаётся в браузере один раз и используется:

- как `Idempotency-Key` при передаче в SaaS;
- в основном JSON payload;
- в резервной записи Netlify Forms.

Успешный LeadGateway возвращает HTTP 202. Повторная отправка с тем же `externalLeadId` не должна создавать вторую заявку.

## Резервный канал

Если LeadGateway недоступен или отклоняет заявку, браузер отправляет ту же заявку в Netlify Forms с тем же `externalLeadId`. Получатель уведомлений: `m1@magicmet.ru`.

Fallback считается подтверждённым только после реальной canary-заявки из итогового Deploy Preview и проверки записи в Netlify Forms и письма на `m1@magicmet.ru`.

## Текущая форма

MVP требует имя, телефон или e-mail, текст заявки и согласие на обработку персональных данных. Загрузка файлов пока не включена. Её нельзя добавлять до утверждения хранения, проверки файлов и сквозной передачи вложений.

## Проверки перед выпуском

1. `npm run check:js`
2. `npm run validate:html`
3. `npm run check:contacts`
4. `npm run test:gateway`
5. полный Playwright desktop/mobile с visual baseline;
6. Lighthouse;
7. реальная canary-заявка в Deploy Preview;
8. подтверждение обязательных Netlify env;
9. подтверждение rate limit/abuse-защиты публичного `/api/leads`.

Production и SaaS не изменяются из этой ветки.
