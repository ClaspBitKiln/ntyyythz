import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'desktop-1280', width: 1280, height: 720 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-360', width: 360, height: 800 }
];

for (const viewport of viewports) {
  test(`визуальный снимок главной страницы: ${viewport.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/', { waitUntil: 'networkidle' });

    await expect(page).toHaveTitle(/Мэджик Металл/);
    await expect(page.locator('body')).not.toContainText(['m3', 'magicmet.ru'].join('@'));
    await expect(page.locator('body')).toContainText('m1@magicmet.ru');

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);

    await page.screenshot({
      path: testInfo.outputPath(`${viewport.name}-full-page.png`),
      fullPage: true,
      animations: 'disabled'
    });
  });
}

test('ключевые элементы заявки доступны', async ({ page }) => {
  await page.goto('/#request', { waitUntil: 'networkidle' });
  await expect(page.locator('#leadForm')).toBeVisible();
  await expect(page.locator('#leadForm [name="name"]')).toBeVisible();
  await expect(page.locator('#leadForm [name="contact"]')).toBeVisible();
  await expect(page.locator('#leadForm [name="request"]')).toBeVisible();
  await expect(page.locator('#leadForm button[type="submit"]')).toBeVisible();
});
