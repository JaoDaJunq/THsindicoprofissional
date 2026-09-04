const { test, expect } = require('@playwright/test');

async function open(page, viewport={width:390,height:844}) {
  await page.setViewportSize(viewport);
  await page.goto('/tests/browser/resident-v2-fixture.html#/morador/home');
  await page.waitForSelector('.resident-v2-active');
}

test('resident desktop keeps full sidebar with consistent svg icons', async ({page}) => {
  await open(page,{width:1280,height:820});
  await expect(page.locator('.resident-sidebar')).toBeVisible();
  await expect(page.locator('.resident-nav .resident-v2-nav-icon svg.ux-icon')).toHaveCount(7);
  await expect(page.locator('.resident-mobile-dock')).toBeHidden();
  await expect(page.locator('.resident-nav a.active')).toContainText('Início');
});

test('resident mobile uses app dock and surfaces unread notifications on More', async ({page}) => {
  await open(page);
  await expect(page.locator('.resident-sidebar')).toBeHidden();
  await expect(page.locator('.resident-mobile-dock')).toBeVisible();
  await expect(page.locator('.resident-mobile-dock .resident-dock-item')).toHaveCount(5);
  await expect(page.locator('.resident-v2-mobile-brand')).toBeVisible();
  await expect(page.locator('.resident-mobile-dock .resident-dock-icon svg.ux-icon')).toHaveCount(4);
  await expect(page.locator('.resident-dock-more > b')).toHaveText('3');
  await expect(page.locator('.resident-dock-more')).toHaveAttribute('aria-label', /3 notificações não lidas/);
});

test('resident More sheet contains calendar unit and notifications', async ({page}) => {
  await open(page);
  await page.locator('.resident-dock-more').click();
  await expect(page.locator('.resident-more-sheet')).toBeVisible();
  await expect(page.locator('.resident-more-sheet')).toContainText('Calendário');
  await expect(page.locator('.resident-more-sheet')).toContainText('Minha unidade');
  await expect(page.locator('.resident-more-sheet')).toContainText('Notificações');
  await expect(page.locator('.resident-more-sheet')).toContainText('3 não lidas');
  await page.keyboard.press('Escape');
  await expect(page.locator('.resident-more-overlay')).toHaveCount(0);
});

test('resident clickable cards are keyboard accessible', async ({page}) => {
  await open(page);
  const card = page.locator('.resident-card[role="link"]').filter({hasText:'comunicados'}).first();
  await expect(card).toHaveAttribute('tabindex','0');
  await card.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/morador/announcements');
});

test('resident mobile has no horizontal overflow at 390 and 320', async ({page}) => {
  for (const width of [390,320]) {
    await open(page,{width,height:780});
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow).toBe(false);
  }
});
