const { test, expect } = require('@playwright/test');

const fixture = '/tests/browser/visual-redesign-v3-fixture.html';

async function noHorizontalOverflow(page) {
  const size = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth
  }));
  expect(size.scroll).toBeLessThanOrEqual(size.viewport + 1);
}

test.describe('visual redesign v3', () => {
  test('desktop applies the new product language without changing the shell contract', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(fixture);

    await noHorizontalOverflow(page);
    await expect(page.locator('.sidebar')).toBeVisible();
    expect(await page.locator('.sidebar').evaluate(el => Math.round(el.getBoundingClientRect().width))).toBe(240);
    await expect(page.locator('.mobile-bottom-dock')).toHaveCSS('display', 'none');
    await expect(page.locator('.metric').first()).toHaveCSS('border-radius', '18px');
    await expect(page.locator('.panel').first()).toHaveCSS('border-radius', '20px');

    const primaryBackground = await page.locator('.btn-primary').evaluate(el => getComputedStyle(el).backgroundImage);
    expect(primaryBackground).toContain('linear-gradient');

    const sidebarBackground = await page.locator('.sidebar').evaluate(el => getComputedStyle(el).backgroundImage);
    expect(sidebarBackground).toContain('linear-gradient');

    await page.screenshot({ path: 'test-results/redesign-v3-desktop.png', fullPage: true });
  });

  test('mobile keeps navigation usable while applying glass header and redesigned dock', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(fixture);

    await noHorizontalOverflow(page);
    await expect(page.locator('.mobile-top')).toBeVisible();
    await expect(page.locator('.mobile-bottom-dock')).toBeVisible();
    expect(await page.locator('.mobile-bottom-dock .mobile-dock-item').count()).toBe(5);
    await expect(page.locator('.mobile-top')).toHaveCSS('border-radius', '17px');
    await expect(page.locator('.mobile-bottom-dock')).toHaveCSS('border-radius', '20px');

    const headerBackdrop = await page.locator('.mobile-top').evaluate(el => getComputedStyle(el).backdropFilter || getComputedStyle(el).webkitBackdropFilter);
    expect(headerBackdrop).not.toBe('none');

    const dockBox = await page.locator('.mobile-bottom-dock').boundingBox();
    expect(dockBox.x).toBeGreaterThanOrEqual(5);
    expect(dockBox.x + dockBox.width).toBeLessThanOrEqual(385);

    await page.screenshot({ path: 'test-results/redesign-v3-mobile.png', fullPage: true });
  });

  test('very narrow mobile remains overflow-safe', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(fixture);
    await noHorizontalOverflow(page);
    await expect(page.locator('.mobile-bottom-dock')).toBeVisible();
    await page.screenshot({ path: 'test-results/redesign-v3-mobile-320.png', fullPage: true });
  });
});
