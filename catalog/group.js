(() => {
  const groups = window.MM_PRODUCT_GROUPS || [];
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const group = groups.find((item) => item.id === id) || groups[0];
  if (!group) return;

  const setText = (selector, value) => {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  };

  setText('#groupCategory', group.category);
  setText('#groupTitle', group.name);
  setText('#groupDescription', group.description);
  setText('#requestTitle', `Получить расчёт: ${group.name}`);

  const examples = document.querySelector('#groupExamples');
  const standards = document.querySelector('#groupStandards');
  const requestField = document.querySelector('#requestField');

  if (examples) {
    examples.innerHTML = (group.examples || group.tags || []).map((item) => `<span>${item}</span>`).join('');
  }
  if (standards) {
    const items = group.standards?.length ? group.standards : ['По ГОСТ, ТУ, чертежу или техническому заданию'];
    standards.innerHTML = items.map((item) => `<span>${item}</span>`).join('');
  }
  if (requestField) {
    requestField.placeholder = `Например: ${group.name}, марка, ГОСТ/ТУ, размер, количество, город доставки`;
    requestField.value = `Товарная группа: ${group.name}. `;
  }

  document.title = `${group.name} — купить с поставкой по РФ и СНГ | Мэджик Металл`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', `${group.name}: подбор по марке, стандарту, размеру и объёму. Поставка по РФ и СНГ, расчёт цены и срока по спецификации.`);

  const sessionId = localStorage.getItem('mm_session_id') || (crypto.randomUUID?.() || `mm-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  localStorage.setItem('mm_session_id', sessionId);
  localStorage.setItem('mm_selected_product_group', JSON.stringify({ id: group.id, name: group.name, category: group.category }));

  const config = window.MM_CONFIG || {};
  const payload = {
    eventId: crypto.randomUUID?.() || `mme-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: 'product_group_view',
    data: { productGroupId: group.id, productGroup: group.name, category: group.category },
    sourceSystem: config.sourceSystem || 'magicmet-website',
    apiVersion: config.apiVersion || null,
    market: 'RU_CIS',
    path: location.pathname,
    url: location.href,
    occurredAt: new Date().toISOString(),
    sessionId
  };

  let events = [];
  try { events = JSON.parse(localStorage.getItem('mm_events') || '[]'); } catch { events = []; }
  events.push(payload);
  localStorage.setItem('mm_events', JSON.stringify(events.slice(-100)));

  const endpoint = String(config.saasEventEndpoint || '').trim();
  if (endpoint) {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
    else fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  }
})();
