window.MM_CONFIG = Object.freeze({
  // Заявки всегда идут на серверный адаптер сайта.
  // SaaS URL и токен не должны попадать в браузер.
  saasLeadEndpoint: '/api/leads',

  // Необязательный публичный endpoint обезличенных событий воронки.
  // Оставить пустым до отдельного подключения аналитики.
  saasEventEndpoint: '',

  // Резервный канал Netlify Forms на время недоступности SaaS.
  formFallbackEndpoint: '/',

  // Временный единый контактный адрес и получатель уведомлений.
  contactEmail: 'm1@magicmet.ru',

  // Стабильный идентификатор источника для CRM/SaaS.
  sourceSystem: 'magicmet-website',
  apiVersion: '2026-07-31'
});

(() => {
  const config = window.MM_CONFIG;
  const current = document.currentScript;

  const applyContactEmail = () => {
    const email = config.contactEmail;

    document.querySelectorAll('a[href^="mailto:"]').forEach((link) => {
      link.href = `mailto:${email}`;
      if ((link.textContent || '').includes('@magicmet.ru')) {
        link.textContent = email;
      }
    });

    document.querySelectorAll('script[type="application/ld+json"]').forEach((node) => {
      try {
        const data = JSON.parse(node.textContent || '{}');
        if (data && typeof data === 'object' && data['@type'] === 'Organization') {
          data.email = email;
          node.textContent = JSON.stringify(data);
        }
      } catch {
        // Не блокируем сайт при ошибке сторонней JSON-LD разметки.
      }
    });
  };

  const loadApprovedMobileFix = () => {
    if (!document.querySelector('.slice-top') || document.querySelector('link[data-mm-approved-mobile]')) return;
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = '/approved-mobile.css';
    style.dataset.mmApprovedMobile = 'true';
    document.head.append(style);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      applyContactEmail();
      loadApprovedMobileFix();
    }, { once: true });
  } else {
    applyContactEmail();
    loadApprovedMobileFix();
  }

  if (!current || document.querySelector('script[data-mm-site-shell]')) return;
  const shell = document.createElement('script');
  shell.src = new URL('site-shell.js', current.src).href;
  shell.defer = true;
  shell.dataset.mmSiteShell = 'true';
  document.head.append(shell);
})();
