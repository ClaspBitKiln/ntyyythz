(() => {
  if (location.pathname.endsWith('/uz/catalog.html')) {
    const catalogStyles = document.createElement('link');
    catalogStyles.rel = 'stylesheet';
    catalogStyles.href = '../uz-catalog.css';
    document.head.appendChild(catalogStyles);
  }

  const industryPages = [
    ['Машиностроение и ремонт', 'mashinostroenie-remont.html'],
    ['Энергетика и котельные', 'energetika-kotelnye.html'],
    ['Нефтегаз и химия', 'neftegaz-himiya.html'],
    ['Металлоконструкции', 'metallokonstrukcii.html'],
    ['Электротехника и цветные металлы', 'elektrotehnika-cvetnye-metally.html']
  ];

  const pathParts = location.pathname.split('/').filter(Boolean);
  const fileName = pathParts.at(-1) || '';
  const inUzFolder = pathParts.includes('uz');
  const relativePrefix = inUzFolder && pathParts.length > 2 ? '../' : '';
  const industryBase = location.pathname.includes('/uz/uz/') ? '../' : '';

  document.querySelectorAll('.uz-nav nav').forEach((nav) => {
    if (!nav.querySelector('a[href*="otrasli.html"]')) {
      const link = document.createElement('a');
      link.href = `${industryBase}otrasli.html`;
      link.textContent = 'Отрасли';
      nav.insertBefore(link, nav.querySelector('a[href*="#request"],a[href*="catalog"]') || null);
    }
  });

  const industryFileNames = new Set(['otrasli.html', ...industryPages.map(([, href]) => href)]);
  if (document.body.dataset.market === 'UZ' && !industryFileNames.has(fileName)) {
    const requestSection = document.querySelector('#request');
    if (requestSection && !document.querySelector('.js-industry-links')) {
      const section = document.createElement('section');
      section.className = 'uz-section uz-priority js-industry-links';
      section.innerHTML = `
        <div class="uz-shell">
          <div class="uz-heading">
            <div><p class="uz-kicker">Решения по отраслям</p><h2>Выберите задачу вашего предприятия</h2></div>
            <a href="${industryBase}otrasli.html">Все отрасли →</a>
          </div>
          <div class="uz-catalog-grid">
            ${industryPages.map(([title, href]) => `<article><h3>${title}</h3><p>Продукция, типовые параметры заявки и связанные разделы каталога.</p><a href="${industryBase}${href}">Открыть решение →</a></article>`).join('')}
          </div>
        </div>`;
      requestSection.before(section);
    }
  }

  const forms = [...document.querySelectorAll('.uz-lead-form')];
  const params = new URLSearchParams(location.search);
  const isUzbek = document.documentElement.lang.toLowerCase().startsWith('uz');
  const language = isUzbek ? 'uz' : 'ru';
  const messages = isUzbek
    ? {
        sending: 'Yuborilmoqda…',
        submit: 'Ariza yuborish',
        name: 'Ismingizni kiriting.',
        contact: 'Telefon yoki e-mailni kiriting.',
        request: 'Qaysi mahsulot kerakligini yozing.',
        consent: 'Shaxsiy ma’lumotlarni qayta ishlashga rozilikni tasdiqlang.',
        success: 'Ariza yuborildi. Menejer narx va yetkazib berish muddatini tayyorlaydi.',
        error: 'Arizani yuborib bo‘lmadi. m3@magicmet.ru manziliga yozing yoki +7 (351) 751-23-35 raqamiga qo‘ng‘iroq qiling.'
      }
    : {
        sending: 'Отправляем…',
        submit: 'Отправить заявку',
        name: 'Укажите имя.',
        contact: 'Укажите телефон или e-mail.',
        request: 'Напишите, какая продукция требуется.',
        consent: 'Подтвердите согласие на обработку персональных данных.',
        success: 'Заявка отправлена. Менеджер подготовит цену и срок поставки.',
        error: 'Не удалось отправить заявку. Напишите на m3@magicmet.ru или позвоните +7 (351) 751-23-35.'
      };

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
    language,
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
    pagePath: location.pathname,
    pageTitle: document.title,
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
      language,
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

  document.querySelectorAll('.js-industry-links a, a[href*="otrasli.html"], a[href*="mashinostroenie-remont"], a[href*="energetika-kotelnye"], a[href*="neftegaz-himiya"], a[href*="metallokonstrukcii"], a[href*="elektrotehnika-cvetnye-metally"]').forEach((link) => {
    link.addEventListener('click', () => track('industry_link_click', { href: link.getAttribute('href'), text: link.textContent.trim() }));
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
    button.textContent = busy ? messages.sending : messages.submit;
  }

  async function submitLead(form, formData) {
    const apiUrl = globalThis.MM_LEAD_API_URL;
    if (apiUrl) {
      const payload = Object.fromEntries(formData.entries());
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`LEAD_API_${response.status}`);
      return response;
    }

    const response = await fetch(location.pathname, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: formData
    });
    if (!response.ok) throw new Error(`FORM_${response.status}`);
    return response;
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
        setStatus(form, messages.name, 'error');
        name?.focus();
        return;
      }
      if (!contact?.value.trim()) {
        setStatus(form, messages.contact, 'error');
        contact?.focus();
        return;
      }
      if (!request?.value.trim()) {
        setStatus(form, messages.request, 'error');
        request?.focus();
        return;
      }
      if (!consent?.checked) {
        setStatus(form, messages.consent, 'error');
        consent?.focus();
        return;
      }

      const formData = new FormData(form);
      formData.set('externalLeadId', uuid());
      formData.set('submittedAt', new Date().toISOString());
      formData.set('market', 'UZ');
      formData.set('language', language);
      formData.set('source', JSON.stringify({ ...attribution, currentPage: location.href }));
      formData.set('pageTitle', document.title);
      formData.set('pagePath', location.pathname);

      setBusy(form, true);
      setStatus(form, messages.sending);
      track('lead_submit', {
        form: form.getAttribute('name'),
        request: request.value.trim().slice(0, 160)
      });

      try {
        await submitLead(form, formData);
        form.reset();
        form.querySelectorAll('.js-source').forEach((field) => {
          field.value = JSON.stringify(attribution);
        });
        setStatus(form, messages.success, 'success');
        track('lead_success', { form: form.getAttribute('name') });
      } catch (error) {
        console.warn('Form submission failed', error);
        setStatus(form, messages.error, 'error');
        track('lead_error', { form: form.getAttribute('name'), mode: globalThis.MM_LEAD_API_URL ? 'api' : 'netlify' });
      } finally {
        setBusy(form, false);
      }
    });
  });

  track('page_view', { market: 'UZ', language });
})();