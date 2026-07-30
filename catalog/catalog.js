(() => {
  const productGroups = window.MM_PRODUCT_GROUPS || [];
  const grid = document.querySelector('#catalogGrid');
  const search = document.querySelector('#catalogSearch');
  const filters = document.querySelector('#catalogFilters');
  const count = document.querySelector('#catalogCount');
  const empty = document.querySelector('#catalogEmpty');
  const requestField = document.querySelector('#requestField');
  const selectedProduct = document.querySelector('#selectedProduct');
  const config = window.MM_CONFIG || {};
  const params = new URLSearchParams(location.search);
  const sessionId = localStorage.getItem('mm_session_id') || (crypto.randomUUID?.() || `mm-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  localStorage.setItem('mm_session_id', sessionId);

  let activeCategory = 'Все группы';
  let lastTrackedQuery = '';
  let searchTimer;

  function readAttribution() {
    try { return JSON.parse(localStorage.getItem('mm_attribution') || '{}'); }
    catch { return {}; }
  }

  function sendCatalogEvent(name, data = {}) {
    const payload = {
      eventId: crypto.randomUUID?.() || `mme-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name,
      data,
      sourceSystem: config.sourceSystem || 'magicmet-website',
      apiVersion: config.apiVersion || null,
      market: 'RU_CIS',
      path: location.pathname,
      url: location.href,
      occurredAt: new Date().toISOString(),
      sessionId,
      attribution: readAttribution()
    };

    let events = [];
    try { events = JSON.parse(localStorage.getItem('mm_events') || '[]'); }
    catch { events = []; }
    events.push(payload);
    localStorage.setItem('mm_events', JSON.stringify(events.slice(-100)));

    const endpoint = String(config.saasEventEndpoint || '').trim();
    if (endpoint) {
      const body = JSON.stringify(payload);
      if (navigator.sendBeacon) navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
      else fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
    }

    window.ym?.(window.MM_METRIKA_ID, 'reachGoal', name, data);
    window.gtag?.('event', name, data);
  }

  function normalize(value) {
    return String(value || '').toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').trim();
  }

  function categories() {
    return ['Все группы', ...new Set(productGroups.map((item) => item.category))];
  }

  function renderFilters() {
    if (!filters) return;
    filters.innerHTML = categories().map((category) => `<button class="catalog-filter${category === activeCategory ? ' is-active' : ''}" type="button" data-category="${category}">${category}</button>`).join('');
  }

  function cardTemplate(item, index) {
    const searchable = normalize([item.name, item.category, item.description, ...item.tags, ...(item.examples || []), ...(item.standards || [])].join(' '));
    return `<article class="card product-card" data-product-id="${item.id}" data-category="${item.category}" data-search="${searchable}">
      <span class="product-number">${String(index + 1).padStart(2, '0')}</span>
      <h3>${item.name}</h3>
      <p>${item.description}</p>
      <div class="product-tags">${item.tags.map((tag) => `<span>${tag}</span>`).join('')}</div>
      <div class="product-actions">
        <a href="group.html?id=${encodeURIComponent(item.id)}" data-open-product="${item.id}">Подробнее</a>
        <button type="button" data-select-product="${item.id}">Хочу купить →</button>
      </div>
    </article>`;
  }

  function currentItems() {
    const query = normalize(search?.value);
    return productGroups.filter((item) => {
      const categoryMatch = activeCategory === 'Все группы' || item.category === activeCategory;
      const haystack = normalize([item.name, item.category, item.description, ...item.tags, ...(item.examples || []), ...(item.standards || [])].join(' '));
      return categoryMatch && (!query || haystack.includes(query));
    });
  }

  function render() {
    const items = currentItems();
    if (grid) grid.innerHTML = items.map(cardTemplate).join('');
    if (count) count.textContent = items.length ? `Найдено товарных групп: ${items.length}` : 'Совпадений не найдено';
    if (empty) empty.hidden = items.length !== 0;
    renderFilters();
  }

  function trackSearch() {
    const query = normalize(search?.value);
    if (query === lastTrackedQuery) return;
    lastTrackedQuery = query;
    sendCatalogEvent(query ? 'catalog_search' : 'catalog_search_cleared', { query, category: activeCategory, resultCount: currentItems().length });
    if (query && currentItems().length === 0) sendCatalogEvent('catalog_no_results', { query, category: activeCategory });
  }

  filters?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    activeCategory = button.dataset.category;
    render();
    sendCatalogEvent('catalog_filter', { category: activeCategory, resultCount: currentItems().length });
  });

  search?.addEventListener('input', () => {
    render();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(trackSearch, 450);
  });

  grid?.addEventListener('click', (event) => {
    const details = event.target.closest('[data-open-product]');
    if (details) {
      const item = productGroups.find((product) => product.id === details.dataset.openProduct);
      if (item) sendCatalogEvent('product_group_open', { productGroupId: item.id, productGroup: item.name, category: item.category, searchQuery: normalize(search?.value) });
      return;
    }

    const button = event.target.closest('[data-select-product]');
    if (!button) return;
    const item = productGroups.find((product) => product.id === button.dataset.selectProduct);
    if (!item) return;

    const prefix = `Товарная группа: ${item.name}. `;
    if (requestField && !normalize(requestField.value).includes(normalize(item.name))) requestField.value = `${prefix}${requestField.value}`.trim();
    if (selectedProduct) {
      selectedProduct.hidden = false;
      selectedProduct.innerHTML = `<b>Выбрано:</b> ${item.name}<br><span>Добавьте марку, размер, объём, стандарт и город доставки.</span>`;
    }
    localStorage.setItem('mm_selected_product_group', JSON.stringify({ id: item.id, name: item.name, category: item.category }));
    sendCatalogEvent('product_group_select', { productGroupId: item.id, productGroup: item.name, category: item.category, searchQuery: normalize(search?.value) });
    document.querySelector('#request')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => requestField?.focus(), 450);
  });

  const initialQuery = params.get('q');
  const initialCategory = params.get('category');
  if (initialQuery && search) search.value = initialQuery;
  if (initialCategory && categories().includes(initialCategory)) activeCategory = initialCategory;
  render();
  if (initialQuery || initialCategory) sendCatalogEvent('catalog_landing_filter', { query: normalize(initialQuery), category: activeCategory, resultCount: currentItems().length });
})();
