const { test, expect } = require('@playwright/test');

test('initial boot hides legacy/intermediate renders until final route is ready', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tests/browser/boot-stability-fixture.html');

  const body = page.locator('body');
  const app = page.locator('#app');
  const boot = page.locator('#gc-boot-screen');

  await expect(body).toHaveClass(/gc-booting/);
  await expect(boot).toBeVisible();
  await expect(app.locator('[data-screen="legacy"]')).toBeAttached();
  await expect(app).toHaveCSS('visibility', 'hidden');
  await expect(app).toHaveCSS('opacity', '0');

  await page.evaluate(() => window.__bootFixture.renderIntermediate());
  await expect(app.locator('[data-screen="intermediate"]')).toBeAttached();
  await expect(app).toHaveCSS('visibility', 'hidden');
  await expect(app).toHaveCSS('opacity', '0');

  await page.evaluate(() => window.__bootFixture.release());
  await expect(app.locator('[data-screen="final"]')).toBeVisible();
  await expect(body).not.toHaveClass(/gc-booting/);
  await expect(body).toHaveClass(/gc-boot-ready/);
  await expect(page.locator('[data-screen="legacy"]')).toHaveCount(0);
  await expect(page.locator('[data-screen="intermediate"]')).toHaveCount(0);

  const renders = await page.evaluate(() => ({
    final: window.__bootFixture.finalRenders,
    intermediate: window.__bootFixture.intermediateRenders
  }));
  expect(renders.final).toBe(1);
  expect(renders.intermediate).toBe(1);
});
