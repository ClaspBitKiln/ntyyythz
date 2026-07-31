window.MM_CONFIG = Object.freeze({
  // Заявки всегда идут на серверный адаптер сайта.
  // SaaS URL и токен не должны попадать в браузер.
  saasLeadEndpoint: '/api/leads',

  // Необязательный публичный endpoint обезличенных событий воронки.
  // Оставить пустым до отдельного подключения аналитики.
  saasEventEndpoint: '',

  // Резервный канал Netlify Forms на время недоступности SaaS.
  formFallbackEndpoint: '/',

  // Стабильный идентификатор источника для CRM/SaaS.
  sourceSystem: 'magicmet-website',
  apiVersion: '2026-07-30'
});

(() => {
  const current = document.currentScript;
  if (!current || document.querySelector('script[data-mm-site-shell]')) return;
  const shell = document.createElement('script');
  shell.src = new URL('site-shell.js', current.src).href;
  shell.defer = true;
  shell.dataset.mmSiteShell = 'true';
  document.head.append(shell);
})();
