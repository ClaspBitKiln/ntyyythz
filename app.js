const form = document.querySelector('#leadForm');
const statusNode = document.querySelector('#formStatus');
const submitButton = form?.querySelector('button[type="submit"]');
const requestField = document.querySelector('#requestField');
const sourceField = document.querySelector('#sourceField');

function uuid() {
  return globalThis.crypto?.randomUUID?.() || `mm-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const params = new URLSearchParams(location.search);
let previous = {};
try {
  previous = JSON.parse(localStorage.getItem('mm_attribution') || '{}');
} catch {
  previous = {};
}

const sessionId = localStorage.getItem('mm_session_id') || uuid();
localStorage.setItem('mm_session_id', sessionId);

const attribution = {
  sessionId,
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

function track(name, data = {}) {
  const payload = {
    name,
    data,
    market: attribution.market,
    path: location.pathname,
    time: new Date().toISOString(),
    sessionId
  };

  let events = [];
  try {
    events = JSON.parse(localStorage.getItem('mm_events') || '[]');
  } catch {
    events = [];
  }
  events.push(payload);
  localStorage.setItem('mm_events', JSON.stringify(events.slice(-100)));
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

track('page_view');

document.querySelectorAll('a[href^="tel:"]').forEach((link) => {
  link.addEventListener('click', () => track('phone_click', { phone: link.textContent.trim() }));
});

document.querySelectorAll('a[href^="mailto:"]').forEach((link) => {
  link.addEventListener('click', () => track('email_click', { email: link.textContent.trim() }));
});

form?.addEventListener('focusin', () => track('form_start'), { once: true });

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('');

  const name = form.elements.namedItem('name');
  const contact = form.elements.namedItem('contact');
  const request = form.elements.namedItem('request');
  const consent = form.elements.namedItem('consent');

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
  formData.set('form-name', 'lead');
  formData.set('externalLeadId', uuid());
  formData.set('submittedAt', new Date().toISOString());
  formData.set('source', JSON.stringify({ ...attribution, currentPage: location.href }));
  formData.set('pageTitle', document.title);

  setBusy(true);
  setStatus('Отправляем заявку…');
  track('lead_submit', {
    request: request.value.trim().slice(0, 160)
  });

  try {
    const response = await fetch('/', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: formData
    });

    if (!response.ok) throw new Error(`FORM_${response.status}`);

    form.reset();
    if (sourceField) sourceField.value = JSON.stringify(attribution);
    setStatus('Заявка отправлена. Менеджер подготовит цену и срок поставки.', 'success');
    track('lead_success');
  } catch (error) {
    console.warn('Form submission failed', error);
    setStatus('Не удалось отправить заявку. Позвоните по телефону +7 (351) 751-23-35 или напишите на m3@magicmet.ru.', 'error');
    track('lead_error');
  } finally {
    setBusy(false);
  }
});
