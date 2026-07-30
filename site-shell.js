(() => {
  const config = window.MM_CONFIG || {};

  function uuid() {
    return crypto.randomUUID?.() || `mm-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function attribution() {
    try {
      return JSON.parse(localStorage.getItem('mm_attribution') || '{}');
    } catch {
      return {};
    }
  }

  function track(name, data = {}) {
    const sessionId = localStorage.getItem('mm_session_id') || uuid();
    localStorage.setItem('mm_session_id', sessionId);

    const payload = {
      eventId: uuid(),
      name,
      data,
      sourceSystem: config.sourceSystem || 'magicmet-website',
      apiVersion: config.apiVersion || null,
      market: 'RU_CIS',
      path: location.pathname,
      url: location.href,
      occurredAt: new Date().toISOString(),
      sessionId,
      attribution: attribution()
    };

    let events = [];
    try {
      events = JSON.parse(localStorage.getItem('mm_events') || '[]');
    } catch {
      events = [];
    }
    events.push(payload);
    localStorage.setItem('mm_events', JSON.stringify(events.slice(-100)));

    const endpoint = String(config.saasEventEndpoint || '').trim();
    if (!endpoint) return;
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
    } else {
      fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
    }
  }

  function catalogUrl() {
    return '/catalog/';
  }

  function addCatalogNavigation() {
    if (location.pathname.startsWith('/catalog')) return;

    const nav = document.querySelector('.site-header nav, .header nav');
    if (nav && !nav.querySelector('[data-mm-catalog-link]')) {
      const link = document.createElement('a');
      link.href = catalogUrl();
      link.textContent = 'Каталог';
      link.dataset.mmCatalogLink = 'header';
      nav.insertBefore(link, nav.firstChild);
    }

    const strip = document.querySelector('.assortment-strip');
    if (strip && !strip.querySelector('[data-mm-catalog-link]')) {
      const link = document.createElement('a');
      link.href = catalogUrl();
      link.className = 'mm-catalog-cta';
      link.textContent = 'Открыть полный каталог →';
      link.dataset.mmCatalogLink = 'products';
      strip.append(link);
    }

    const mobileActions = document.querySelector('.mobile-actions');
    if (mobileActions && !mobileActions.querySelector('[data-mm-catalog-link]')) {
      const link = document.createElement('a');
      link.href = catalogUrl();
      link.textContent = 'Каталог';
      link.dataset.mmCatalogLink = 'mobile';
      mobileActions.insertBefore(link, mobileActions.lastElementChild);
    }
  }

  function addStyles() {
    if (document.querySelector('#mm-shell-styles')) return;
    const style = document.createElement('style');
    style.id = 'mm-shell-styles';
    style.textContent = `
      .mm-catalog-cta{display:inline-flex;align-items:center;justify-content:center;margin-left:auto;padding:10px 14px;border-radius:10px;background:#1748df;color:#fff!important;text-decoration:none;font-weight:800;white-space:nowrap}
      @media(max-width:760px){.mm-catalog-cta{width:100%;margin:8px 0 0}.mobile-actions{grid-template-columns:repeat(3,1fr)!important}.mobile-actions a{font-size:12px}}
    `;
    document.head.append(style);
  }

  function bindTracking() {
    document.addEventListener('click', (event) => {
      const link = event.target.closest('[data-mm-catalog-link]');
      if (!link) return;
      track('catalog_navigation_click', { placement: link.dataset.mmCatalogLink });
    });
  }

  addStyles();
  addCatalogNavigation();
  bindTracking();
})();
