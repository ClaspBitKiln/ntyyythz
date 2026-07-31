const form = document.querySelector('#leadForm');
const statusNode = document.querySelector('#formStatus');
const submitButton = form?.querySelector('button[type="submit"]');

const params = new URLSearchParams(window.location.search);
const setValue = (id, value) => {
  const node = document.getElementById(id);
  if (node) node.value = value || '';
};

setValue('landingPage', window.location.href);
setValue('referrer', document.referrer);
setValue('utmSource', params.get('utm_source'));
setValue('utmMedium', params.get('utm_medium'));
setValue('utmCampaign', params.get('utm_campaign'));

const encodeForm = (formData) => {
  const body = new URLSearchParams();
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) continue;
    body.append(key, String(value));
  }
  return body;
};

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  const formData = new FormData(form);
  const payload = {
    name: String(formData.get('name') || '').trim(),
    contact: String(formData.get('contact') || '').trim(),
    message: String(formData.get('message') || '').trim(),
    source: 'magicmet-website',
    attribution: {
      landingPage: String(formData.get('landingPage') || ''),
      referrer: String(formData.get('referrer') || ''),
      utmSource: String(formData.get('utm_source') || ''),
      utmMedium: String(formData.get('utm_medium') || ''),
      utmCampaign: String(formData.get('utm_campaign') || '')
    }
  };

  submitButton.disabled = true;
  statusNode.textContent = 'Отправляем заявку…';

  try {
    const endpoint = window.MM_CONFIG?.saasLeadEndpoint || '/api/leads';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error('Lead gateway unavailable');

    statusNode.textContent = 'Заявка отправлена. Менеджер свяжется с вами.';
    statusNode.className = 'form-status success';
    form.reset();
    setValue('landingPage', window.location.href);
    setValue('referrer', document.referrer);
  } catch (error) {
    try {
      const fallback = await fetch('/', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: encodeForm(formData).toString()
      });
      if (!fallback.ok) throw new Error('Netlify fallback unavailable');
      statusNode.textContent = 'Заявка отправлена. Менеджер свяжется с вами.';
      statusNode.className = 'form-status success';
      form.reset();
    } catch {
      statusNode.textContent = 'Не удалось отправить. Позвоните: +7 (351) 751-23-35.';
      statusNode.className = 'form-status error';
    }
  } finally {
    submitButton.disabled = false;
  }
});
