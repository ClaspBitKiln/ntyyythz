import { test, expect } from '@playwright/test';

async function mockFormSubmission(page) {
  await page.route('**/', async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      return;
    }
    await route.continue();
  });
}

test('главная страница открывается и содержит ключевые блоки', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Мэджик Металл/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Единый поставщик');
  await expect(page.getByRole('heading', { name: /Срочная авиадоставка/i })).toBeVisible();
  await expect(page.locator('#leadForm')).toBeVisible();
  await expect(page.getByText('Санкт-Петербург', { exact: false })).toHaveCount(0);
});

test('текстовая заявка отправляется', async ({ page }) => {
  await mockFormSubmission(page);
  await page.goto('/#request');

  await page.locator('[name="product"]').fill('Труба бесшовная 159×8, 5 тонн');
  await page.locator('[name="name"]').fill('Тестовый клиент');
  await page.locator('[name="phone"]').fill('+7 900 000-00-00');
  await page.locator('[name="consent"]').check();
  await page.getByRole('button', { name: 'Отправить заявку' }).click();

  await expect(page.locator('#formStatus')).toContainText('Заявка отправлена');
});

test('можно отправить заявку только с файлом', async ({ page }) => {
  await mockFormSubmission(page);
  await page.goto('/#request');

  await page.locator('[name="file"]').setInputFiles({
    name: 'specification.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('test specification')
  });
  await page.locator('[name="name"]').fill('Тестовый клиент');
  await page.locator('[name="phone"]').fill('+7 900 000-00-00');
  await page.locator('[name="consent"]').check();
  await page.getByRole('button', { name: 'Отправить заявку' }).click();

  await expect(page.locator('#formStatus')).toContainText('Заявка отправлена');
});

test('мобильная версия не имеет горизонтальной прокрутки', async ({ page }) => {
  await page.goto('/');
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  await expect(page.locator('.mobile-actions')).toBeVisible();
});