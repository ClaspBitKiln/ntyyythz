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

async function expectNoHorizontalOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

test('главная содержит ключевой оффер и шесть товарных направлений', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Мэджик Металл/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Единый поставщик');
  await expect(page.locator('#products .product')).toHaveCount(6);
  await expect(page.locator('#delivery')).toContainText('Доставка по РФ и СНГ');
});

test('блок опыта присутствует и содержит четыре компетенции', async ({ page }) => {
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

test('основные CTA ведут к заявке и телефону', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('a[href="#request"]')).not.toHaveCount(0);
  await expect(page.locator('a[href^="tel:+73517512335"]')).not.toHaveCount(0);
});

test('форма содержит обязательные пользовательские поля', async ({ page }) => {
  await page.goto('/#request');
  await expect(page.locator('#leadForm [name="name"]')).toBeVisible();
  await expect(page.locator('#leadForm [name="contact"]')).toBeVisible();
  await expect(page.locator('#leadForm [name="request"]')).toBeVisible();
  await expect(page.locator('#leadForm [name="consent"]')).toBeVisible();
});

test('заявка отправляется через общую воронку', async ({ page }) => {
  await mockFormSubmission(page);
  await page.goto('/#request');
  await page.locator('#leadForm [name="name"]').fill('Тестовый клиент');
  await page.locator('#leadForm [name="contact"]').fill('+7 900 000-00-00');
  await page.locator('#leadForm [name="request"]').fill('Поковка по чертежу, требуется расчёт');
  await page.locator('#leadForm [name="consent"]').check();
  await page.locator('#leadForm button[type="submit"]').click();
  await expect(page.locator('#formStatus')).toContainText('Заявка отправлена');
});

test('форма последовательно отклоняет заявку без обязательных данных', async ({ page }) => {
  await page.goto('/#request');
  const form = page.locator('#leadForm');

  await form.locator('button[type="submit"]').click();
  await expect(page.locator('#formStatus')).toHaveText('Укажите имя.');

  await form.locator('[name="name"]').fill('Тестовый клиент');
  await form.locator('button[type="submit"]').click();
  await expect(page.locator('#formStatus')).toHaveText('Укажите телефон или e-mail.');

  await form.locator('[name="contact"]').fill('+7 900 000-00-00');
  await form.locator('button[type="submit"]').click();
  await expect(page.locator('#formStatus')).toHaveText('Напишите, какая продукция требуется.');

  await form.locator('[name="request"]').fill('Лист 09Г2С, требуется расчёт');
  await form.locator('button[type="submit"]').click();
  await expect(page.locator('#formStatus')).toHaveText('Подтвердите согласие на обработку персональных данных.');
});

test('клик по товарному направлению сохраняется в journey', async ({ page }) => {
  await page.goto('/');
  await page.locator('#products .product').first().click();

  const events = await page.evaluate(() => JSON.parse(localStorage.getItem('mm_events') || '[]'));
  expect(events.some((event) => (
    event.name === 'product_group_view' && event.data?.productGroup === 'Листовой прокат'
  ))).toBeTruthy();
});

test('страница не имеет горизонтальной прокрутки', async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
    { width: 360, height: 800 }
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expectNoHorizontalOverflow(page);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/catalog/');
  await expectNoHorizontalOverflow(page);
});

test('контактный блок содержит офис и все основные телефоны', async ({ page }) => {
  await page.goto('/#contacts');
  await expect(page.locator('#contacts')).toContainText('ул. Гостевая, 3, офис 306');
  await expect(page.locator('#contacts')).toContainText('+7 (351) 751-23-35');
  await expect(page.locator('#contacts')).toContainText('+7 (964) 244-08-31');
});

test('каталог доступен с origin главной страницы', async ({ page }) => {
  await page.goto('/');
  const catalogUrl = new URL('/catalog/', page.url()).toString();
  const response = await page.request.get(catalogUrl);
  expect(response.ok()).toBeTruthy();

  await page.goto(catalogUrl);
  await expect(page).toHaveTitle(/Каталог/);
  await expect(page.locator('.product-card')).toHaveCount(22);
});
