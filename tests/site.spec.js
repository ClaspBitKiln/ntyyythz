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

test('главная страница открывается и содержит ключевые блоки', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Мэджик Металл/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Единый поставщик');
  await expect(page.getByRole('heading', { name: /Срочная авиадоставка/i })).toBeVisible();
  await expect(page.locator('#leadForm')).toBeVisible();
  await expect(page.locator('#leadForm [name="name"]')).toBeVisible();
  await expect(page.locator('#leadForm [name="contact"]')).toBeVisible();
  await expect(page.locator('#leadForm [name="request"]')).toBeVisible();
  await expect(page.getByText('Санкт-Петербург', { exact: false })).toHaveCount(0);
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

test('страница Узбекистана содержит прямое предложение и короткую форму', async ({ page }) => {
  await page.goto('/uz/');

  await expect(page).toHaveTitle(/Узбекистан/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Узбекистан');
  await expect(page.locator('.uz-lead-form').first().locator('[name="name"]')).toBeVisible();
  await expect(page.locator('.uz-lead-form').first().locator('[name="contact"]')).toBeVisible();
  await expect(page.locator('.uz-lead-form').first().locator('[name="request"]')).toBeVisible();
  await expect(page.getByText('Санкт-Петербург', { exact: false })).toHaveCount(0);
});

test('узбекская версия страницы открывается', async ({ page }) => {
  await page.goto('/uz/uz/');

  await expect(page).toHaveTitle(/O‘zbekistonga metalloprokat/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('O‘zbekistonga');
  await expect(page.getByRole('button', { name: 'Ariza yuborish' }).first()).toBeVisible();
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
