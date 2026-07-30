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

test('форма не отправляется без текста заявки', async ({ page }) => {
  await page.goto('/#request');

  await page.locator('#leadForm [name="name"]').fill('Тестовый клиент');
  await page.locator('#leadForm [name="contact"]').fill('test@example.com');
  await page.locator('#leadForm [name="consent"]').check();
  await page.locator('#leadForm button[type="submit"]').click();

  await expect(page.locator('#formStatus')).toContainText('Напишите, какая продукция требуется');
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