window.MM_CONFIG = Object.freeze({
  // После публикации SaaS укажите публичный HTTPS endpoint приёма лидов.
  // Пример: https://app.magicmet.ru/api/public/v1/leads
  saasLeadEndpoint: '',

  // Необязательный endpoint для событий воронки.
  // Пример: https://app.magicmet.ru/api/public/v1/events
  saasEventEndpoint: '',

  // Пока SaaS endpoint не указан, форма продолжает работать через Netlify Forms.
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
