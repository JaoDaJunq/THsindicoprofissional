const { test, expect } = require('@playwright/test');

async function open(page, hash='#/condominio/c1/tarefas') {
  await page.setViewportSize({width:390,height:844});
  await page.goto(`/tests/browser/ux-v2-fixture.html${hash}`);
  await page.waitForSelector('.ux-contextbar');
}

test('mobile header keeps search aligned at far right', async ({page}) => {
  await open(page);
  const menu = await page.locator('.mobile-nav-toggle').boundingBox();
  const search = await page.locator('.ux-command-mobile').boundingBox();
  expect(menu.x).toBeLessThan(40);
  expect(search.x + search.width).toBeGreaterThan(350);
});

test('workspace breadcrumb exposes explicit Início shortcut', async ({page}) => {
  await open(page);
  const home = page.locator('.ux-breadcrumb .ux-home-shortcut');
  await expect(home).toBeVisible();
  await expect(home).toContainText('Início');
  await home.click();
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/');
});

test('workspace More sheet exposes return to main overview', async ({page}) => {
  await open(page);
  await page.locator('.mobile-dock-more').click();
  const home = page.locator('.mobile-more-home');
  await expect(home).toBeVisible();
  await expect(home).toContainText('Visão geral');
  await home.click();
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/');
});

test('mobile brand works as home shortcut', async ({page}) => {
  await open(page);
  const brand = page.locator('.mobile-top .brand');
  await expect(brand).toHaveAttribute('role','link');
  await brand.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/');
});

test('quick-create floats higher than dock top', async ({page}) => {
  await open(page);
  const dock = await page.locator('.mobile-bottom-dock').boundingBox();
  const create = await page.locator('.ux-quick-create-dock').boundingBox();
  expect(create.y).toBeLessThan(dock.y - 5);
});
