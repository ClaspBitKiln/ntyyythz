import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { afterEach, beforeEach, describe, test } from 'node:test';
import { handler } from '../netlify/functions/lead.js';

const ENV_KEYS = [
  'SAAS_API_URL',
  'SAAS_SITE_INGEST_TOKEN',
  'SAAS_TENANT_ID',
  'SAAS_SOURCE_ID'
];

const originalFetch = globalThis.fetch;
const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

function payload(overrides = {}) {
  return {
    externalLeadId: '3ef65221-47bc-4b03-a98f-84de03f378ba',
    sourceSystem: 'magicmet-website',
    apiVersion: '2026-07-31',
    submittedAt: '2026-08-02T09:00:00.000Z',
    leadType: 'request_to_quote',
    market: 'RU_CIS',
    contact: { name: 'Иван', value: 'buyer@example.com' },
    request: {
      text: 'Лист 09Г2С 10×1500×6000, 12 тонн',
      pageTitle: 'Каталог',
      pageUrl: 'https://www.magicmet.ru/catalog/'
    },
    consent: {
      personalData: true,
      capturedAt: '2026-08-02T09:00:00.000Z'
    },
    attribution: { sessionId: 'session-12345678', utm_source: 'yandex' },
    journey: { intent: { searchQueries: ['09г2с'] } },
    technical: { browserLanguage: 'ru' },
    ...overrides
  };
}

function event(body = payload(), overrides = {}) {
  return {
    httpMethod: 'POST',
    headers: { 'content-type': 'application/json', 'x-nf-request-id': 'nf-request-123' },
    body: JSON.stringify(body),
    ...overrides
  };
}

function bodyOf(result) {
  return JSON.parse(result.body);
}

beforeEach(() => {
  process.env.SAAS_API_URL = 'https://saas.example.test/';
  process.env.SAAS_SITE_INGEST_TOKEN = 'test-ingest-secret';
  process.env.SAAS_TENANT_ID = '019f21bd-fa86-79a2-beb6-f2f3c74371d8';
  process.env.SAAS_SOURCE_ID = 'magicmet-website';
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

describe('LeadGateway request validation', () => {
  test('rejects methods other than POST', async () => {
    const result = await handler(event(payload(), { httpMethod: 'GET' }));
    assert.equal(result.statusCode, 405);
    assert.deepEqual(bodyOf(result), { accepted: false, error: 'METHOD_NOT_ALLOWED' });
  });

  test('requires application/json', async () => {
    const result = await handler(event(payload(), { headers: { 'content-type': 'text/plain' } }));
    assert.equal(result.statusCode, 415);
    assert.deepEqual(bodyOf(result), { accepted: false, error: 'UNSUPPORTED_MEDIA_TYPE' });
  });

  test('rejects invalid JSON', async () => {
    const result = await handler(event(payload(), { body: '{invalid' }));
    assert.equal(result.statusCode, 400);
    assert.deepEqual(bodyOf(result), { accepted: false, error: 'INVALID_JSON' });
  });

  test('rejects invalid payload fields before calling SaaS', async () => {
    let fetchCalled = false;
    globalThis.fetch = async () => {
      fetchCalled = true;
      throw new Error('must not be called');
    };

    const invalidPayloads = [
      payload({ externalLeadId: 'short' }),
      payload({ contact: { name: '', value: 'buyer@example.com' } }),
      payload({ contact: { name: 'Иван', value: '' } }),
      payload({ request: { text: '' } }),
      payload({ consent: { personalData: false } })
    ];

    for (const invalid of invalidPayloads) {
      const result = await handler(event(invalid));
      assert.equal(result.statusCode, 422);
      assert.equal(bodyOf(result).error, 'VALIDATION_ERROR');
    }
    assert.equal(fetchCalled, false);
  });

  test('fails safely when SaaS environment is incomplete', async () => {
    delete process.env.SAAS_SITE_INGEST_TOKEN;
    const result = await handler(event());
    assert.equal(result.statusCode, 503);
    assert.deepEqual(bodyOf(result), {
      accepted: false,
      error: 'SAAS_NOT_CONFIGURED',
      retryable: true
    });
  });
});

describe('LeadGateway SaaS contract', () => {
  test('sends the exact URL, headers and normalized payload and returns 202', async () => {
    let captured;
    globalThis.fetch = async (url, options) => {
      captured = { url, options };
      return new Response(JSON.stringify({
        ok: true,
        requestId: 'request-123',
        companyId: null,
        contactId: 'contact-123',
        status: 'DRAFT',
        externalLeadId: payload().externalLeadId,
        duplicate: false
      }), { status: 202, headers: { 'content-type': 'application/json' } });
    };

    const result = await handler(event());
    const upstreamPayload = JSON.parse(captured.options.body);

    assert.equal(captured.url, 'https://saas.example.test/integrations/site/v1/leads');
    assert.equal(captured.options.method, 'POST');
    assert.deepEqual(captured.options.headers, {
      Authorization: 'Bearer test-ingest-secret',
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Idempotency-Key': payload().externalLeadId,
      'X-Tenant-Id': '019f21bd-fa86-79a2-beb6-f2f3c74371d8',
      'X-Correlation-Id': 'nf-request-123'
    });
    assert.deepEqual(upstreamPayload, {
      schemaVersion: 1,
      externalLeadId: payload().externalLeadId,
      source: 'magicmet-website',
      sourceSystem: 'magicmet-website',
      submittedAt: '2026-08-02T09:00:00.000Z',
      leadType: 'request_to_quote',
      market: 'RU_CIS',
      contact: { name: 'Иван', value: 'buyer@example.com' },
      request: {
        text: 'Лист 09Г2С 10×1500×6000, 12 тонн',
        pageTitle: 'Каталог',
        pageUrl: 'https://www.magicmet.ru/catalog/'
      },
      consent: {
        personalData: true,
        capturedAt: '2026-08-02T09:00:00.000Z',
        privacyVersion: '2026-07-30'
      },
      attribution: { sessionId: 'session-12345678', utm_source: 'yandex' },
      journey: { intent: { searchQueries: ['09г2с'] } },
      technical: { browserLanguage: 'ru', receivedAt: upstreamPayload.technical.receivedAt }
    });
    assert.match(upstreamPayload.technical.receivedAt, /^2026-|^20\d{2}-/);
    assert.equal(result.statusCode, 202);
    assert.deepEqual(bodyOf(result), {
      accepted: true,
      requestId: 'request-123',
      companyId: null,
      contactId: 'contact-123',
      status: 'DRAFT',
      externalLeadId: payload().externalLeadId,
      correlationId: 'nf-request-123'
    });
  });

  test('maps upstream failures without leaking the upstream body', async () => {
    globalThis.fetch = async () => new Response(
      JSON.stringify({ message: 'private upstream detail' }),
      { status: 503, headers: { 'content-type': 'application/json' } }
    );

    const result = await handler(event());
    assert.equal(result.statusCode, 502);
    assert.deepEqual(bodyOf(result), {
      accepted: false,
      error: 'SAAS_REJECTED_LEAD',
      retryable: true,
      correlationId: 'nf-request-123'
    });
  });

  test('maps an aborted upstream request to a retryable timeout', async () => {
    globalThis.fetch = async () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      throw error;
    };

    const result = await handler(event());
    assert.equal(result.statusCode, 502);
    assert.deepEqual(bodyOf(result), {
      accepted: false,
      error: 'SAAS_TIMEOUT',
      retryable: true,
      correlationId: 'nf-request-123'
    });
  });
});

test('Netlify protects the public lead route with an IP rate limit', async () => {
  const config = await readFile(new URL('../netlify.toml', import.meta.url), 'utf8');
  assert.match(config, /from\s*=\s*"\/api\/leads"[\s\S]*?\[redirects\.rate_limit\][\s\S]*?window_limit\s*=\s*10/);
  assert.match(config, /window_size\s*=\s*60/);
  assert.match(config, /aggregate_by\s*=\s*\["ip",\s*"domain"\]/);
});
