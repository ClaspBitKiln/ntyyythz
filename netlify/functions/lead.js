const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store'
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify(body)
  };
}

function text(value, maxLength = 5000) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function isUuidLike(value) {
  return /^[0-9a-z-]{16,80}$/i.test(value);
}

function validateLead(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return 'Некорректное тело запроса.';
  }

  if (!isUuidLike(text(input.externalLeadId, 80))) {
    return 'Некорректный идентификатор заявки.';
  }

  if (!text(input.contact?.name, 160)) {
    return 'Не указано имя.';
  }

  if (!text(input.contact?.value, 320)) {
    return 'Не указан телефон или e-mail.';
  }

  if (!text(input.request?.text, 5000)) {
    return 'Не указана требуемая продукция.';
  }

  if (input.consent?.personalData !== true) {
    return 'Не подтверждено согласие на обработку персональных данных.';
  }

  return null;
}

function normalizePayload(input) {
  const now = new Date().toISOString();

  return {
    schemaVersion: 1,
    externalLeadId: text(input.externalLeadId, 80),
    source: process.env.SAAS_SOURCE_ID || 'magicmet-website',
    sourceSystem: text(input.sourceSystem, 80) || 'magicmet-website',
    submittedAt: text(input.submittedAt, 64) || now,
    leadType: text(input.leadType, 80) || 'request_to_quote',
    market: text(input.market, 40) || 'RU_CIS',
    contact: {
      name: text(input.contact?.name, 160),
      value: text(input.contact?.value, 320)
    },
    request: {
      text: text(input.request?.text, 5000),
      pageTitle: text(input.request?.pageTitle, 300) || null,
      pageUrl: text(input.request?.pageUrl, 2000) || null
    },
    consent: {
      personalData: true,
      capturedAt: text(input.consent?.capturedAt, 64) || now,
      privacyVersion: text(input.consent?.privacyVersion, 64) || '2026-07-30'
    },
    attribution: input.attribution && typeof input.attribution === 'object'
      ? input.attribution
      : {},
    journey: input.journey && typeof input.journey === 'object'
      ? input.journey
      : {},
    technical: {
      ...(input.technical && typeof input.technical === 'object' ? input.technical : {}),
      receivedAt: now
    }
  };
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return response(405, { accepted: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const contentType = String(event.headers['content-type'] || event.headers['Content-Type'] || '');
  if (!contentType.toLowerCase().includes('application/json')) {
    return response(415, { accepted: false, error: 'UNSUPPORTED_MEDIA_TYPE' });
  }

  if ((event.body || '').length > 128_000) {
    return response(413, { accepted: false, error: 'PAYLOAD_TOO_LARGE' });
  }

  let input;
  try {
    input = JSON.parse(event.body || '{}');
  } catch {
    return response(400, { accepted: false, error: 'INVALID_JSON' });
  }

  const validationError = validateLead(input);
  if (validationError) {
    return response(422, {
      accepted: false,
      error: 'VALIDATION_ERROR',
      message: validationError
    });
  }

  const saasBaseUrl = String(process.env.SAAS_API_URL || '').replace(/\/+$/, '');
  const token = String(process.env.SAAS_SITE_INGEST_TOKEN || '');
  const tenantId = String(process.env.SAAS_TENANT_ID || '');

  if (!saasBaseUrl || !token || !tenantId) {
    console.error('LeadGateway is not configured: missing SaaS environment variables');
    return response(503, {
      accepted: false,
      error: 'SAAS_NOT_CONFIGURED',
      retryable: true
    });
  }

  const payload = normalizePayload(input);
  const endpoint = `${saasBaseUrl}/integrations/site/v1/leads`;
  const correlationId = event.headers['x-nf-request-id'] || payload.externalLeadId;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Idempotency-Key': payload.externalLeadId,
        'X-Tenant-Id': tenantId,
        'X-Correlation-Id': correlationId
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const raw = await upstream.text();
    let upstreamBody = {};
    try {
      upstreamBody = raw ? JSON.parse(raw) : {};
    } catch {
      upstreamBody = { message: raw.slice(0, 500) };
    }

    if (!upstream.ok) {
      console.error('SaaS lead intake failed', {
        status: upstream.status,
        correlationId,
        externalLeadId: payload.externalLeadId
      });

      return response(upstream.status >= 500 ? 502 : upstream.status, {
        accepted: false,
        error: 'SAAS_REJECTED_LEAD',
        retryable: upstream.status >= 500,
        correlationId
      });
    }

    return response(202, {
      accepted: true,
      requestId: upstreamBody.requestId || null,
      companyId: upstreamBody.companyId || null,
      contactId: upstreamBody.contactId || null,
      status: upstreamBody.status || 'NEW',
      externalLeadId: payload.externalLeadId,
      correlationId
    });
  } catch (error) {
    const isTimeout = error?.name === 'AbortError';
    console.error('LeadGateway transport error', {
      error: error?.message,
      isTimeout,
      correlationId,
      externalLeadId: payload.externalLeadId
    });

    return response(502, {
      accepted: false,
      error: isTimeout ? 'SAAS_TIMEOUT' : 'SAAS_UNAVAILABLE',
      retryable: true,
      correlationId
    });
  } finally {
    clearTimeout(timeout);
  }
}
