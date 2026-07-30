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
