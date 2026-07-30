(() => {
  if (location.pathname.endsWith('/uz/catalog.html')) {
    const catalogStyles = document.createElement('link');
    catalogStyles.rel = 'stylesheet';
    catalogStyles.href = '../uz-catalog.css';
    document.head.appendChild(catalogStyles);
  }

  const forms = [...document.querySelectorAll('.uz-lead-form')];
  const params = new URLSearchParams(location.search);

  function uuid() {
    return globalThis.crypto?.randomUUID?.() || `mm-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

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
    market: 'UZ',
    regionPage: 'Uzbekistan',
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
    browserLanguage: navigator.language || null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null
  };

  localStorage.setItem('mm_attribution', JSON.stringify(attribution));
  document.querySelectorAll('.js-source').forEach((field) => {
    field.value = JSON.stringify(attribution);
  });

  function track(name, data = {}) {
    const payload = {
      name,
      data,
      market: 'UZ',
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
    localStorage.setItem('mm_events', JSON.stringify(events.slice(-150)));
    window.ym?.(window.MM_METRIKA_ID, 'reachGoal', name, data);
    window.gtag?.('event', name, data);
  }

  function fillRequest(text) {
    const targetForm = document.querySelector('#request .uz-lead-form') || forms[0];
    const field = targetForm?.querySelector('.js-request');
    if (!field) return;
    const existing = field.value.trim();
    field.value = existing ? `${existing}\n${text}` : text;
    document.querySelector('#request')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => field.focus(), 450);
    track('product_prefill', { product: text });
  }

  document.querySelectorAll('[data-product]').forEach((node) => {
    node.addEventListener('click', (event) => {
      event.preventDefault();
      fillRequest(node.dataset.product || node.textContent.trim());
    });
  });

  document.querySelectorAll('a[href^="tel:"]').forEach((link) => {
    link.addEventListener('click', () => track('phone_click', { phone: link.textContent.trim() }));
  });

  document.querySelectorAll('a[href^="mailto:"]').forEach((link) => {
    link.addEventListener('click', () => track('email_click', { email: link.textContent.trim() }));
  });

  function setStatus(form, message, type = '') {
    const status = form.querySelector('.uz-form-status');
    if (!status) return;
    status.textContent = message;
    status.className = `uz-form-status ${type}`.trim();
  }

  function setBusy(form, busy) {
    const button = form.querySelector('button[type="submit"]');
    if (!button) return;
    button.disabled = busy;
    button.textContent = busy ? 'Отправляем…' : 'Отправить заявку';
  }

  forms.forEach((form) => {
    form.addEventListener('focusin', () => track('form_start', { form: form.getAttribute('name') }), { once: true });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      setStatus(form, '');

      const name = form.elements.namedItem('name');
      const contact = form.elements.namedItem('contact');
      const request = form.elements.namedItem('request');
      const consent = form.elements.namedItem('consent');

      if (!name?.value.trim()) {
        setStatus(form, 'Укажите имя.', 'error');
        name?.focus();
        return;
      }
      if (!contact?.value.trim()) {
        setStatus(form, 'Укажите телефон или e-mail.', 'error');
        contact?.focus();
        return;
      }
      if (!request?.value.trim()) {
        setStatus(form, 'Напишите, какая продукция требуется.', 'error');
        request?.focus();
        return;
      }
      if (!consent?.checked) {
        setStatus(form, 'Подтвердите согласие на обработку персональных данных.', 'error');
        consent?.focus();
        return;
      }

      const formData = new FormData(form);
      formData.set('externalLeadId', uuid());
      formData.set('submittedAt', new Date().toISOString());
      formData.set('market', 'UZ');
      formData.set('source', JSON.stringify({ ...attribution, currentPage: location.href }));
      formData.set('pageTitle', document.title);

      setBusy(form, true);
      setStatus(form, 'Отправляем заявку…');
      track('lead_submit', {
        form: form.getAttribute('name'),
        request: request.value.trim().slice(0, 160)
      });

      try {
        const response = await fetch(location.pathname, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: formData
        });
        if (!response.ok) throw new Error(`FORM_${response.status}`);

        form.reset();
        form.querySelectorAll('.js-source').forEach((field) => {
          field.value = JSON.stringify(attribution);
        });
        setStatus(form, 'Заявка отправлена. Менеджер подготовит цену и срок поставки.', 'success');
        track('lead_success', { form: form.getAttribute('name') });
      } catch (error) {
        console.warn('Form submission failed', error);
        setStatus(form, 'Не удалось отправить заявку. Напишите на m3@magicmet.ru или позвоните +7 (351) 751-23-35.', 'error');
        track('lead_error', { form: form.getAttribute('name') });
      } finally {
        setBusy(form, false);
      }
    });
  });

  track('page_view', { market: 'UZ' });
})();
