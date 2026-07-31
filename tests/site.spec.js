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

test('главная использует согласованный визуальный эталон', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Мэджик Металл/);
  await expect(page.locator('.slice-top')).toBeVisible();
  await expect(page.locator('.slice-bottom')).toBeVisible();
  const background = await page.locator('.slice-top').evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(background).toContain('approved-homepage.webp');
});

test('блок опыта встроен между частями согласованного макета', async ({ page }) => {
  await page.goto('/#experience');
  await expect(page.getByRole('heading', { name: 'Опыт в промышленном снабжении' })).toBeVisible();
  await expect(page.locator('.proof')).toHaveCount(4);
  await expect(page.locator('#experience')).toContainText('ГОСТ · ТУ · чертежи');
  await expect(page.locator('#experience')).toContainText('РФ и страны СНГ');
});

test('публичный runtime использует m1 и не показывает m3', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toContainText('m1@magicmet.ru');
  await expect(page.locator('body')).not.toContainText('m3@magicmet.ru');
  await expect(page.locator('a[href="mailto:m1@magicmet.ru"]')).toBeVisible();
});

test('форма содержит три основных пользовательских поля', async ({ page }) => {
  await page.setViewportSize({ width: 941, height: 900 });
  await page.goto('/#request');
  await expect(page.locator('#leadForm [name="name"]')).toBeVisible();
  await expect(page.locator('#leadForm [name="contact"]')).toBeVisible();
  await expect(page.locator('#leadForm [name="request"]')).toBeVisible();
  await expect(page.locator('#leadForm [name="consent"]')).toBeVisible();
});

test('заявка отправляется через общую воронку', async ({ page }) => {
  await page.setViewportSize({ width: 941, height: 900 });
  await mockFormSubmission(page);
  await page.goto('/#request');
  await page.locator('#leadForm [name="name"]').fill('Тестовый клиент');
  await page.locator('#leadForm [name="contact"]').fill('+7 900 000-00-00');
  await page.locator('#leadForm [name="request"]').fill('Поковка по чертежу, требуется расчёт');
  await page.locator('#leadForm [name="consent"]').check();
  await page.locator('#leadForm button[type="submit"]').click();
  await expect(page.locator('#formStatus')).toContainText('Заявка отправлена');
});

test('страница не имеет горизонтальной прокрутки', async ({ page }) => {
  const viewports = [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
    { width: 360, height: 800 }
  ];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  }
});

test('каталог остаётся доступным по прямому адресу', async ({ page }) => {
  await page.goto('/catalog/');
  await expect(page).toHaveTitle(/Каталог/);
  await expect(page.locator('.product-card')).toHaveCount(22);
});
