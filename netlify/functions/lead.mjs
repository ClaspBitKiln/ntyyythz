import crypto from 'node:crypto';

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  },
  body: JSON.stringify(body),
});

const clean = (value, max = 1000) =>
  String(value ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max);

const normalizePhone = (value) => {
  const digits = clean(value, 32).replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return null;
  return `+${digits}`;
};

const isEmail = (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const parseBody = (event) => {
  const type = event.headers?.['content-type'] || event.headers?.['Content-Type'] || '';
  if (type.includes('application/json')) return JSON.parse(event.body || '{}');
  return Object.fromEntries(new URLSearchParams(event.body || ''));
};

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { accepted: false, error: 'METHOD_NOT_ALLOWED' });

  let input;
  try {
    input = parseBody(event);
  } catch {
    return json(400, { accepted: false, error: 'INVALID_BODY' });
  }

  // Hidden field. Bots commonly fill it; real users never see it.
  if (clean(input.website, 200)) return json(202, { accepted: true });

  const name = clean(input.name, 120);
  const phone = normalizePhone(input.phone);
  const email = clean(input.email, 200).toLowerCase();
  const description = clean(input.product || input.description, 4000);

  if (!name || !phone || !description) {
    return json(422, { accepted: false, error: 'VALIDATION_ERROR', fields: ['name', 'phone', 'product'] });
  }
  if (!isEmail(email)) return json(422, { accepted: false, error: 'INVALID_EMAIL' });
  if (input.personalData !== true && input.personalData !== 'true' && input.consent !== 'on') {
    return json(422, { accepted: false, error: 'CONSENT_REQUIRED' });
  }

  const apiUrl = process.env.SAAS_API_URL?.replace(/\/$/, '');
  const token = process.env.SAAS_SITE_INGEST_TOKEN;
  const tenantId = process.env.SAAS_TENANT_ID;
  if (!apiUrl || !token || !tenantId) {
    return json(503, { accepted: false, error: 'SAAS_NOT_CONFIGURED' });
  }

  const externalLeadId = clean(input.externalLeadId, 64) || crypto.randomUUID();
  let attribution = {};
  try {
    attribution = typeof input.attribution === 'string' ? JSON.parse(input.attribution) : (input.attribution || {});
  } catch {
    attribution = {};
  }

  const payload = {
    schemaVersion: 1,
    externalLeadId,
    source: process.env.SAAS_SOURCE_ID || 'magicmet-website',
    tenantId,
    submittedAt: new Date().toISOString(),
    contact: { name, phone, email: email || null },
    company: {
      name: clean(input.company, 250) || null,
      inn: clean(input.inn, 20) || null,
    },
    request: {
      productCategory: clean(input.productCategory, 250) || null,
      description,
      quantity: clean(input.quantity, 120) || null,
      country: clean(input.country, 120) || null,
      city: clean(input.city, 180) || null,
      comment: clean(input.comment, 2000) || null,
    },
    attachment: null,
    attribution: {
      sessionId: clean(attribution.sessionId, 64) || null,
      landingPage: clean(attribution.landingPage || attribution.landing_page, 1000) || null,
      referrer: clean(attribution.referrer, 1000) || null,
      utmSource: clean(attribution.utmSource || attribution.utm_source, 250) || null,
      utmMedium: clean(attribution.utmMedium || attribution.utm_medium, 250) || null,
      utmCampaign: clean(attribution.utmCampaign || attribution.utm_campaign, 250) || null,
      utmTerm: clean(attribution.utmTerm || attribution.utm_term, 500) || null,
      utmContent: clean(attribution.utmContent || attribution.utm_content, 500) || null,
      yclid: clean(attribution.yclid, 250) || null,
      gclid: clean(attribution.gclid, 250) || null,
    },
    consent: {
      personalData: true,
      privacyVersion: process.env.PRIVACY_VERSION || '2026-07-30',
      acceptedAt: new Date().toISOString(),
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${apiUrl}/integrations/site/v1/leads`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'idempotency-key': externalLeadId,
        'x-correlation-id': externalLeadId,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('SaaS lead ingest failed', { status: response.status, externalLeadId, result });
      return json(502, { accepted: false, error: 'SAAS_REJECTED', externalLeadId });
    }
    return json(202, { accepted: true, externalLeadId, requestId: result.requestId || null });
  } catch (error) {
    console.error('SaaS lead ingest unavailable', { externalLeadId, error: String(error) });
    return json(503, { accepted: false, error: 'SAAS_UNAVAILABLE', externalLeadId });
  } finally {
    clearTimeout(timeout);
  }
};
