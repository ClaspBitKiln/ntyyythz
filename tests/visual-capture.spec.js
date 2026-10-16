import { test, expect } from '@playwright/test';

const deterministicHero = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
    <defs>
      <linearGradient id="steel" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#17376d"/>
        <stop offset="0.55" stop-color="#647996"/>
        <stop offset="1" stop-color="#9ba8b5"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="900" fill="url(#steel)"/>
    <path d="M0 690L360 330l170 170 210-260 460 450v210H0z" fill="#102b63" opacity=".48"/>
    <g fill="#dce8f6" opacity=".28">
      <circle cx="180" cy="170" r="56"/><circle cx="860" cy="180" r="82"/>
      <circle cx="980" cy="430" r="34"/><circle cx="550" cy="690" r="68"/>
    </g>
  </svg>`;

test.beforeEach(async ({ page }) => {
  await page.route('https://images.unsplash.com/**', (route) => route.fulfill({
    status: 200,
    contentType: 'image/svg+xml',
    body: deterministicHero
  }));
});

test('главная страница совпадает с утверждённым visual baseline', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  await expect(page).toHaveTitle(/Мэджик Металл/);
  await expect(page.locator('body')).not.toContainText('m3@magicmet.ru');
  await expect(page.locator('body')).toContainText('m1@magicmet.ru');
  await expect(page.locator('.hero-visual')).toBeVisible();
  await expect(page).toHaveScreenshot('homepage-full-page.png', {
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
    scale: 'css',
    threshold: 0.15,
    maxDiffPixelRatio: 0.001
  });
});

test('ключевые элементы заявки доступны', async ({ page }) => {
  await page.goto('/#request', { waitUntil: 'networkidle' });
  await expect(page.locator('#leadForm')).toBeVisible();
  await expect(page.locator('#leadForm [name="name"]')).toBeVisible();
  await expect(page.locator('#leadForm [name="contact"]')).toBeVisible();
  await expect(page.locator('#leadForm [name="request"]')).toBeVisible();
  await expect(page.locator('#leadForm button[type="submit"]')).toBeVisible();
});
