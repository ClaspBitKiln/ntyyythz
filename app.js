const form = document.querySelector('#leadForm');
const statusNode = document.querySelector('#formStatus');
const submitButton = form?.querySelector('button[type="submit"]');
const sourceField = document.querySelector('#sourceField');
const config = window.MM_CONFIG || {};

function uuid() {
  return globalThis.crypto?.randomUUID?.() || `mm-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

const params = new URLSearchParams(location.search);
const previous = safeJsonParse(localStorage.getItem('mm_attribution') || '{}', {});
const sessionId = localStorage.getItem('mm_session_id') || uuid();
localStorage.setItem('mm_session_id', sessionId);

const attribution = {
  sessionId,
  sourceSystem: config.sourceSystem || 'magicmet-website',
  market: 'RU_CIS',
  utm_source: params.get('utm_source') || previous.utm_source || null,
  utm_medium: params.get('utm_medium') || previous.utm_medium || null,
  utm_campaign: params.get('utm_campaign') || previous.utm_campaign || null,
  utm_term: params.get('utm_term') || previous.utm_term || null,
  utm_content: params.get('utm_content') || previous.utm_content || null,
  yclid: params.get('yclid') || previous.yclid || null,
  gclid: params.get('gclid') || previous.gclid || null,
  referrer: previous.referrer || document.referrer || null,
  landingPage: previous.landingPage || location.href,
  currentPage: location.href,
  pageTitle: document.title,
  browserLanguage: navigator.language || null,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null
};

localStorage.setItem('mm_attribution', JSON.stringify(attribution));
if (sourceField) sourceField.value = JSON.stringify(attribution);

function sendEventToSaas(payload) {
  const endpoint = String(config.saasEventEndpoint || '').trim();
  if (!endpoint) return;

  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
    return;
  }

  fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true
  }).catch(() => {});
}

function track(name, data = {}) {
  const payload = {
    eventId: uuid(),
    name,
    data,
    sourceSystem: config.sourceSystem || 'magicmet-website',
    apiVersion: config.apiVersion || null,
    market: attribution.market,
    path: location.pathname,
    url: location.href,
    occurredAt: new Date().toISOString(),
    sessionId,
    attribution
  };

  const events = safeJsonParse(localStorage.getItem('mm_events') || '[]', []);
  events.push(payload);
  localStorage.setItem('mm_events', JSON.stringify(events.slice(-100)));

  sendEventToSaas(payload);
  window.ym?.(window.MM_METRIKA_ID, 'reachGoal', name, data);
  window.gtag?.('event', name, data);
}

function setStatus(message, type = '') {
  if (!statusNode) return;
  statusNode.textContent = message;
  statusNode.className = `form-status field-wide ${type}`.trim();
}

function setBusy(isBusy) {
  if (!submitButton) return;
  submitButton.disabled = isBusy;
  submitButton.textContent = isBusy ? 'Отправляем…' : 'Отправить заявку';
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
}

function buildJourneyContext() {
  const allowedEvents = new Set([
    'page_view',
    'catalog_navigation_click',
    'catalog_landing_filter',
    'catalog_search',
    'catalog_search_cleared',
    'catalog_no_results',
    'catalog_filter',
    'product_group_view',
    'product_group_select',
    'phone_click',
    'email_click',
    'form_start'
  ]);

  const events = safeJsonParse(localStorage.getItem('mm_events') || '[]', [])
    .filter((event) => event?.sessionId === sessionId && allowedEvents.has(event?.name))
    .slice(-30)
    .map((event) => ({
      eventId: event.eventId || null,
      name: event.name,
      occurredAt: event.occurredAt || event.time || null,
      path: event.path || null,
      data: event.data || {}
    }));

  const selectedProductGroups = uniqueValues(events.flatMap((event) => {
    if (!['product_group_select', 'product_group_view'].includes(event.name)) return [];
    return [event.data?.productGroup || event.data?.productGroupId];
  }));

  const searchQueries = uniqueValues(events.flatMap((event) => (
    event.name === 'catalog_search' ? [event.data?.query] : []
  )));

  const noResultQueries = uniqueValues(events.flatMap((event) => (
    event.name === 'catalog_no_results' ? [event.data?.query] : []
  )));

  return {
    sessionId,
    eventCount: events.length,
    recentEvents: events,
    intent: {
      selectedProductGroups,
      searchQueries,
      noResultQueries,
      lastCatalogCategory: [...events].reverse().find((event) => event.data?.category)?.data?.category || null
    }
  };
}

function buildLeadPayload(formData, externalLeadId, submittedAt) {
  return {
    externalLeadId,
    sourceSystem: config.sourceSystem || 'magicmet-website',
    apiVersion: config.apiVersion || null,
    submittedAt,
    leadType: 'request_to_quote',
    market: attribution.market,
    contact: {
      name: String(formData.get('name') || '').trim(),
      value: String(formData.get('contact') || '').trim()
    },
    request: {
      text: String(formData.get('request') || '').trim(),
      pageTitle: document.title,
      pageUrl: location.href
    },
    consent: {
      personalData: formData.get('consent') === 'on',
      capturedAt: submittedAt
    },
    attribution: { ...attribution, currentPage: location.href },
    journey: buildJourneyContext(),
    technical: {
      sessionId,
      browserLanguage: navigator.language || null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null
    }
  };
}

async function submitToSaas(payload) {
  const endpoint = String(config.saasLeadEndpoint || '').trim();
  if (!endpoint) return { delivered: false, reason: 'not_configured' };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Idempotency-Key': payload.externalLeadId
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error(`SAAS_${response.status}`);
  return { delivered: true, channel: 'saas' };
}

async function submitToFallback(formData, payload) {
  formData.set('form-name', 'lead');
  formData.set('externalLeadId', payload.externalLeadId);
  formData.set('submittedAt', payload.submittedAt);
  formData.set('sourceSystem', payload.sourceSystem);
  formData.set('source', JSON.stringify(payload.attribution));
  formData.set('journey', JSON.stringify(payload.journey));
  formData.set('leadPayload', JSON.stringify(payload));
  formData.set('pageTitle', document.title);

  const encodedBody = new URLSearchParams();
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') encodedBody.append(key, value);
  }

  const response = await fetch(config.formFallbackEndpoint || '/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      Accept: 'application/json'
    },
    body: encodedBody.toString()
  });

  if (!response.ok) throw new Error(`FORM_${response.status}`);
  return { delivered: true, channel: 'fallback' };
}

track('page_view');

document.querySelectorAll('a[href^="tel:"]').forEach((link) => {
  link.addEventListener('click', () => track('phone_click', { phone: link.textContent.trim() }));
});

document.querySelectorAll('a[href^="mailto:"]').forEach((link) => {
  link.addEventListener('click', () => track('email_click', { email: link.textContent.trim() }));
});

document.querySelectorAll('.product-card, .product').forEach((card) => {
  card.addEventListener('click', () => {
    track('product_group_view', { productGroup: card.querySelector('h3')?.textContent?.trim() || null });
  });
});

form?.addEventListener('focusin', () => track('form_start'), { once: true });

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('');

  const name = form.elements.namedItem('name');
  const contact = form.elements.namedItem('contact');
  const request = form.elements.namedItem('request');
  const consent = form.elements.namedItem('consent');
  const website = form.elements.namedItem('website');

  if (website?.value) return;
  if (!name?.value.trim()) {
    setStatus('Укажите имя.', 'error');
    name?.focus();
    return;
  }
  if (!contact?.value.trim()) {
    setStatus('Укажите телефон или e-mail.', 'error');
    contact?.focus();
    return;
  }
  if (!request?.value.trim()) {
    setStatus('Напишите, какая продукция требуется.', 'error');
    request?.focus();
    return;
  }
  if (!consent?.checked) {
    setStatus('Подтвердите согласие на обработку персональных данных.', 'error');
    consent?.focus();
    return;
  }

  const formData = new FormData(form);
  const externalLeadId = uuid();
  const submittedAt = new Date().toISOString();
  const payload = buildLeadPayload(formData, externalLeadId, submittedAt);

  setBusy(true);
  setStatus('Отправляем заявку…');
  track('lead_submit', {
    externalLeadId,
    request: payload.request.text.slice(0, 160),
    selectedProductGroups: payload.journey.intent.selectedProductGroups,
    searchQueries: payload.journey.intent.searchQueries
  });

  try {
    let result;
    try {
      result = await submitToSaas(payload);
    } catch (saasError) {
      console.warn('SaaS submission failed, using fallback', saasError);
      track('lead_saas_error', { externalLeadId, message: saasError.message });
      result = { delivered: false, reason: 'saas_error' };
    }

    if (!result.delivered) result = await submitToFallback(formData, payload);

    form.reset();
    if (sourceField) sourceField.value = JSON.stringify(attribution);
    setStatus('Заявка отправлена. Менеджер подготовит цену и срок поставки.', 'success');
    track('lead_success', { externalLeadId, channel: result.channel });
  } catch (error) {
    console.warn('Lead submission failed', error);
    setStatus('Не удалось отправить заявку. Позвоните по телефону +7 (351) 751-23-35 или напишите на m1@magicmet.ru.', 'error');
    track('lead_error', { externalLeadId, message: error.message });
  } finally {
    setBusy(false);
  }
});
