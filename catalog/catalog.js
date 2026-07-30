(() => {
  const productGroups = [
    { id: 'sheet-hot', category: 'Листовой прокат', name: 'Лист горячекатаный', description: 'Углеродистые, низколегированные и специальные стали. Подбор по марке, толщине, ширине, длине и стандарту.', tags: ['Ст3', '09Г2С', 'ГОСТ'] },
    { id: 'sheet-cold', category: 'Листовой прокат', name: 'Лист холоднокатаный', description: 'Тонколистовой холоднокатаный прокат для производства, штамповки, корпусов и металлоконструкций.', tags: ['08пс', '08Ю', 'х/к'] },
    { id: 'sheet-stainless', category: 'Нержавеющие стали', name: 'Нержавеющий лист', description: 'Холоднокатаный и горячекатаный лист, матовая, зеркальная, шлифованная и рифлёная поверхность.', tags: ['AISI 304', 'AISI 316', '12Х18Н10Т'] },
    { id: 'sheet-galvanized', category: 'Листовой прокат', name: 'Оцинкованный лист и рулон', description: 'Оцинкованный прокат в листах и рулонах для производства, строительства и защитных конструкций.', tags: ['оцинковка', 'рулон', 'лист'] },
    { id: 'round-hot', category: 'Сортовой прокат', name: 'Круг горячекатаный', description: 'Круглый прокат конструкционных, легированных, инструментальных и специальных марок стали.', tags: ['круг', 'пруток', 'спецсталь'] },
    { id: 'square-strip', category: 'Сортовой прокат', name: 'Квадрат, полоса и шестигранник', description: 'Сортовой прокат стандартных и специальных марок для механической обработки и изготовления деталей.', tags: ['квадрат', 'полоса', 'шестигранник'] },
    { id: 'forgings', category: 'Поковки', name: 'Поковки и кованые заготовки', description: 'Кольца, диски, валы, плиты, круги и заготовки по ГОСТ, ТУ, эскизам и чертежам.', tags: ['кольца', 'валы', 'диски'] },
    { id: 'pipe-seamless-hot', category: 'Трубная продукция', name: 'Трубы бесшовные горячедеформированные', description: 'Трубы общего назначения, нефтегазового, энергетического и машиностроительного применения.', tags: ['бесшовные', 'г/д', 'ГОСТ 8732'] },
    { id: 'pipe-seamless-cold', category: 'Трубная продукция', name: 'Трубы бесшовные холоднодеформированные', description: 'Точные трубы небольших диаметров и толщин, включая легированные и специальные марки.', tags: ['х/д', 'точные', 'ГОСТ 8734'] },
    { id: 'pipe-stainless', category: 'Нержавеющие стали', name: 'Нержавеющие трубы', description: 'Бесшовные и электросварные трубы круглого и профильного сечения из коррозионностойких сталей.', tags: ['AISI 304', 'AISI 321', 'нержавейка'] },
    { id: 'pipe-welded', category: 'Трубная продукция', name: 'Электросварные трубы и обечайки', description: 'Прямошовные и спиралешовные трубы, заготовки и обечайки по техническим требованиям заказчика.', tags: ['э/с', 'обечайка', 'прямошовная'] },
    { id: 'pipe-profile', category: 'Трубная продукция', name: 'Профильные трубы', description: 'Квадратные и прямоугольные трубы для металлоконструкций, машиностроения и строительных проектов.', tags: ['профильная', 'квадратная', 'прямоугольная'] },
    { id: 'angle', category: 'Фасонный прокат', name: 'Уголок стальной', description: 'Равнополочный и неравнополочный уголок из углеродистых и низколегированных сталей.', tags: ['уголок', '09Г2С', 'Ст3'] },
    { id: 'beam', category: 'Фасонный прокат', name: 'Балка двутавровая', description: 'Нормальные, широкополочные и колонные двутавры для промышленных и строительных конструкций.', tags: ['двутавр', 'балка', 'колонная'] },
    { id: 'channel', category: 'Фасонный прокат', name: 'Швеллер', description: 'Горячекатаный и гнутый швеллер для несущих, рамных и вспомогательных конструкций.', tags: ['швеллер', 'гнутый', 'г/к'] },
    { id: 'pipeline-parts', category: 'Трубопроводная арматура', name: 'Соединительные детали трубопроводов', description: 'Отводы, тройники, переходы, фланцы, заглушки и детали по стандартам или чертежам.', tags: ['отвод', 'тройник', 'фланец'] },
    { id: 'heads-plugs', category: 'Трубопроводная арматура', name: 'Днища и заглушки', description: 'Эллиптические и плоские днища, заглушки и элементы аппаратов по технической документации.', tags: ['днище', 'заглушка', 'аппарат'] },
    { id: 'nonferrous', category: 'Цветные металлы', name: 'Цветные металлы и сплавы', description: 'Алюминий, медь, латунь, бронза, титан и прокат из цветных металлов по спецификации.', tags: ['алюминий', 'медь', 'титан'] },
    { id: 'welding', category: 'Материалы и комплектующие', name: 'Сварочные материалы', description: 'Электроды, проволока, прутки и флюсы для углеродистых, нержавеющих и специальных сталей.', tags: ['электроды', 'проволока', 'флюс'] },
    { id: 'fasteners', category: 'Материалы и комплектующие', name: 'Крепёж и метизы', description: 'Болты, гайки, шпильки, шайбы и специальный крепёж, включая жаропрочные и коррозионностойкие исполнения.', tags: ['болты', 'шпильки', 'гайки'] },
    { id: 'equipment', category: 'Оборудование', name: 'Промышленное оборудование', description: 'Оборудование, узлы, запасные части и комплектующие по опросным листам и техническим заданиям.', tags: ['оборудование', 'узлы', 'ЗИП'] },
    { id: 'custom', category: 'Оборудование', name: 'Нестандартные изделия и комплектующие', description: 'Изготовление деталей, сборочных единиц и металлоконструкций по чертежу или техническому заданию.', tags: ['по чертежу', 'ТЗ', 'изготовление'] }
  ];

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
    try {
      return JSON.parse(localStorage.getItem('mm_attribution') || '{}');
    } catch {
      return {};
    }
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
    try {
      events = JSON.parse(localStorage.getItem('mm_events') || '[]');
    } catch {
      events = [];
    }
    events.push(payload);
    localStorage.setItem('mm_events', JSON.stringify(events.slice(-100)));

    const endpoint = String(config.saasEventEndpoint || '').trim();
    if (endpoint) {
      const body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
      } else {
        fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
      }
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
    filters.innerHTML = categories().map((category) => (
      `<button class="catalog-filter${category === activeCategory ? ' is-active' : ''}" type="button" data-category="${category}">${category}</button>`
    )).join('');
  }

  function cardTemplate(item, index) {
    const searchable = normalize([item.name, item.category, item.description, ...item.tags].join(' '));
    return `<article class="card product-card" data-product-id="${item.id}" data-category="${item.category}" data-search="${searchable}">
      <span class="product-number">${String(index + 1).padStart(2, '0')}</span>
      <h3>${item.name}</h3>
      <p>${item.description}</p>
      <div class="product-tags">${item.tags.map((tag) => `<span>${tag}</span>`).join('')}</div>
      <div class="product-actions">
        <button type="button" data-select-product="${item.id}">Хочу купить →</button>
      </div>
    </article>`;
  }

  function currentItems() {
    const query = normalize(search?.value);
    return productGroups.filter((item) => {
      const categoryMatch = activeCategory === 'Все группы' || item.category === activeCategory;
      const searchMatch = !query || normalize([item.name, item.category, item.description, ...item.tags].join(' ')).includes(query);
      return categoryMatch && searchMatch;
    });
  }

  function render() {
    const items = currentItems();
    grid.innerHTML = items.map(cardTemplate).join('');
    count.textContent = items.length ? `Найдено товарных групп: ${items.length}` : 'Совпадений не найдено';
    empty.hidden = items.length !== 0;
    renderFilters();
  }

  function trackSearch() {
    const query = normalize(search?.value);
    if (query === lastTrackedQuery) return;
    lastTrackedQuery = query;
    sendCatalogEvent(query ? 'catalog_search' : 'catalog_search_cleared', {
      query,
      category: activeCategory,
      resultCount: currentItems().length
    });
    if (query && currentItems().length === 0) {
      sendCatalogEvent('catalog_no_results', { query, category: activeCategory });
    }
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
    const button = event.target.closest('[data-select-product]');
    const card = event.target.closest('[data-product-id]');
    const id = button?.dataset.selectProduct || card?.dataset.productId;
    if (!id) return;

    const item = productGroups.find((product) => product.id === id);
    if (!item) return;

    const prefix = `Товарная группа: ${item.name}. `;
    if (requestField && !normalize(requestField.value).includes(normalize(item.name))) {
      requestField.value = `${prefix}${requestField.value}`.trim();
    }
    if (selectedProduct) {
      selectedProduct.hidden = false;
      selectedProduct.innerHTML = `<b>Выбрано:</b> ${item.name}<br><span>Добавьте марку, размер, объём, стандарт и город доставки.</span>`;
    }

    sendCatalogEvent('product_group_select', {
      productGroupId: item.id,
      productGroup: item.name,
      category: item.category,
      searchQuery: normalize(search?.value)
    });

    document.querySelector('#request')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => requestField?.focus(), 450);
  });

  const initialQuery = params.get('q');
  const initialCategory = params.get('category');
  if (initialQuery && search) search.value = initialQuery;
  if (initialCategory && categories().includes(initialCategory)) activeCategory = initialCategory;

  render();
  if (initialQuery || initialCategory) {
    sendCatalogEvent('catalog_landing_filter', {
      query: normalize(initialQuery),
      category: activeCategory,
      resultCount: currentItems().length
    });
  }
})();
