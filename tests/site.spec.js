import { test, expect } from '@playwright/test';

async function mockFormSubmission(page) {
  await page.route('**/*', async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      return;
    }
    await route.continue();
  });
}

test('общая страница открывается для России и СНГ', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Мэджик Металл/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Единый поставщик');
  await expect(page.getByText('доставку по РФ и СНГ', { exact: false })).toBeVisible();
  await expect(page.locator('#delivery')).toContainText('Доставка по РФ и СНГ');
  await expect(page.getByRole('heading', { name: /Срочная авиадоставка/i })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Узбекистан' })).toHaveCount(0);
  await expect(page.getByText('Санкт-Петербург', { exact: false })).toHaveCount(0);
});

test('с главной страницы доступен полный каталог', async ({ page }) => {
  await page.goto('/');

  const catalogLink = page.locator('[data-mm-catalog-link="header"]');
  await expect(catalogLink).toBeVisible();
  await expect(catalogLink).toHaveAttribute('href', '/catalog/');
});

test('форма содержит только три пользовательских поля', async ({ page }) => {
  await page.goto('/#request');

  await expect(page.locator('#leadForm [name="name"]')).toBeVisible();
  await expect(page.locator('#leadForm [name="contact"]')).toBeVisible();
  await expect(page.locator('#leadForm [name="request"]')).toBeVisible();
  await expect(page.locator('#leadForm [name="company"]')).toHaveCount(0);
  await expect(page.locator('#leadForm [name="city"]')).toHaveCount(0);
});

test('текстовая заявка отправляется через три поля', async ({ page }) => {
  await mockFormSubmission(page);
  await page.goto('/#request');

  await page.locator('#leadForm [name="name"]').fill('Тестовый клиент');
  await page.locator('#leadForm [name="contact"]').fill('+7 900 000-00-00');
  await page.locator('#leadForm [name="request"]').fill('Труба бесшовная 159×8, 5 тонн');
  await page.locator('#leadForm [name="consent"]').check();
  await page.locator('#leadForm button[type="submit"]').click();

  await expect(page.locator('#formStatus')).toContainText('Заявка отправлена');
});

test('при ошибке LeadGateway заявка уходит в Netlify Forms с тем же externalLeadId', async ({ page }) => {
  let gatewayPayload;
  let fallbackBody = '';

  await page.route('**/*', async (route) => {
    const request = route.request();
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/leads') {
      gatewayPayload = request.postDataJSON();
      await route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({ accepted: false, error: 'SAAS_UNAVAILABLE' })
      });
      return;
    }
    if (request.method() === 'POST') {
      fallbackBody = request.postData() || '';
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      return;
    }
    await route.continue();
  });

  await page.goto('/#request');
  await page.locator('#leadForm [name="name"]').fill('Fallback Тест');
  await page.locator('#leadForm [name="contact"]').fill('fallback@example.com');
  await page.locator('#leadForm [name="request"]').fill('Труба 159×8, 5 тонн');
  await page.locator('#leadForm [name="consent"]').check();
  await page.locator('#leadForm button[type="submit"]').click();

  await expect(page.locator('#formStatus')).toContainText('Заявка отправлена');
  expect(gatewayPayload.externalLeadId).toBeTruthy();

  expect(fallbackBody).toContain('name="form-name"');
  expect(fallbackBody).toContain('name="externalLeadId"');
  expect(fallbackBody).toContain('name="leadPayload"');
  expect(fallbackBody).toContain(gatewayPayload.externalLeadId);
  expect(fallbackBody).toContain('magicmet-website');
});

test('форма не отправляется без текста заявки', async ({ page }) => {
  await page.goto('/#request');

  await page.locator('#leadForm [name="name"]').fill('Тестовый клиент');
  await page.locator('#leadForm [name="contact"]').fill('test@example.com');
  await page.locator('#leadForm [name="consent"]').check();
  await page.locator('#leadForm button[type="submit"]').click();

  await expect(page.locator('#formStatus')).toContainText('Напишите, какая продукция требуется');
});

test('каталог содержит 22 товарные группы и фильтруется поиском', async ({ page }) => {
  await page.goto('/catalog/');

  await expect(page).toHaveTitle(/Каталог промышленной продукции/);
  await expect(page.locator('.product-card')).toHaveCount(22);

  await page.locator('#catalogSearch').fill('09Г2С');
  await expect(page.locator('.product-card')).toHaveCount(2);
  await expect(page.locator('#catalogCount')).toContainText('2');

  await page.waitForTimeout(550);
  const events = await page.evaluate(() => JSON.parse(localStorage.getItem('mm_events') || '[]'));
  expect(events.some((event) => event.name === 'catalog_search' && event.data.query === '09г2с')).toBeTruthy();
});

test('выбор товарной группы переносит контекст в заявку', async ({ page }) => {
  await page.goto('/catalog/');

  await page.locator('[data-select-product="pipe-seamless-hot"]').click();
  await expect(page.locator('#requestField')).toHaveValue(/Трубы бесшовные горячедеформированные/);
  await expect(page.locator('#selectedProduct')).toContainText('Трубы бесшовные горячедеформированные');

  const events = await page.evaluate(() => JSON.parse(localStorage.getItem('mm_events') || '[]'));
  expect(events.some((event) => event.name === 'product_group_select' && event.data.productGroupId === 'pipe-seamless-hot')).toBeTruthy();
});

test('заявка из каталога отправляется в ту же воронку', async ({ page }) => {
  await mockFormSubmission(page);
  await page.goto('/catalog/#request');

  await page.locator('#leadForm [name="name"]').fill('Каталог Тест');
  await page.locator('#leadForm [name="contact"]').fill('catalog@example.com');
  await page.locator('#leadForm [name="request"]').fill('Лист 09Г2С 10 мм, 12 тонн');
  await page.locator('#leadForm [name="consent"]').check();
  await page.locator('#leadForm button[type="submit"]').click();

  await expect(page.locator('#formStatus')).toContainText('Заявка отправлена');
  const events = await page.evaluate(() => JSON.parse(localStorage.getItem('mm_events') || '[]'));
  expect(events.some((event) => event.name === 'lead_success')).toBeTruthy();
});

test('мобильная версия не имеет горизонтальной прокрутки', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  await expect(page.locator('.mobile-actions')).toBeVisible();
});

test('каталог не имеет горизонтальной прокрутки на 390 px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/catalog/');

  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  await expect(page.locator('.mobile-bar')).toBeVisible();
});
