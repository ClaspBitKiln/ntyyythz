import { test, expect } from '@playwright/test';

test('поиск и выбранная товарная группа передаются вместе с заявкой', async ({ page }) => {
  let submittedBody = '';

  await page.route('**/*', async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      submittedBody = request.postData() || '';
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      return;
    }
    await route.continue();
  });

  await page.goto('/catalog/');
  await page.locator('#catalogSearch').fill('09Г2С');
  await page.waitForTimeout(550);
  await page.locator('[data-select-product="sheet-hot"]').click();

  await page.locator('#leadForm [name="name"]').fill('Тестовый покупатель');
  await page.locator('#leadForm [name="contact"]').fill('buyer@example.com');
  await page.locator('#leadForm [name="request"]').fill('Лист 09Г2С 10×1500×6000, 12 тонн');
  await page.locator('#leadForm [name="consent"]').check();
  await page.locator('#leadForm button[type="submit"]').click();

  await expect(page.locator('#formStatus')).toContainText('Заявка отправлена');
  expect(submittedBody).toContain('leadPayload');
  expect(submittedBody).toContain('journey');
  expect(submittedBody).toContain('catalog_search');
  expect(submittedBody).toContain('product_group_select');
  expect(submittedBody).toContain('sheet-hot');
});
