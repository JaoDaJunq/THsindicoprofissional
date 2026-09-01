const { test, expect } = require('@playwright/test');

const fixture = '/tests/browser/visual-fixture.html';

async function noHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth
  }));
  expect(overflow.scroll).toBeLessThanOrEqual(overflow.viewport + 1);
}

test.describe('responsive design system', () => {
  test('desktop keeps readable content, fixed sidebar and no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(fixture);
    await noHorizontalOverflow(page);

    const sidebar = page.locator('.sidebar');
    const main = page.locator('.main');
    const metrics = page.locator('.metric');

    await expect(sidebar).toBeVisible();
    expect(await sidebar.evaluate(el => Math.round(el.getBoundingClientRect().width))).toBe(240);
    expect(await main.evaluate(el => el.getBoundingClientRect().left)).toBeGreaterThanOrEqual(239);
    expect(await metrics.count()).toBe(4);

    const columns = await page.locator('.metrics').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(4);

    const primaryHeight = await page.locator('.btn-primary').first().evaluate(el => el.getBoundingClientRect().height);
    expect(primaryHeight).toBeGreaterThanOrEqual(42);

    await page.screenshot({ path: 'test-results/desktop-maintenance.png', fullPage: true });
  });

  test('phone uses off-canvas navigation and stacked data cards', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(fixture);
    await noHorizontalOverflow(page);

    const toggle = page.locator('.mobile-nav-toggle');
    await expect(toggle).toBeVisible();
    const toggleBox = await toggle.boundingBox();
    expect(toggleBox.width).toBeGreaterThanOrEqual(44);
    expect(toggleBox.height).toBeGreaterThanOrEqual(44);

    const hiddenX = await page.locator('.sidebar').evaluate(el => el.getBoundingClientRect().x);
    expect(hiddenX).toBeLessThan(0);

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const openX = await page.locator('.sidebar').evaluate(el => Math.round(el.getBoundingClientRect().x));
    expect(openX).toBe(0);

    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await expect(page.locator('#maintenance-table thead')).toHaveCSS('display', 'none');
    const firstCell = page.locator('#maintenance-table tbody tr').first().locator('td').first();
    await expect(firstCell).toHaveAttribute('data-label', 'Manutenção');

    const columns = await page.locator('.metrics').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(1);

    await noHorizontalOverflow(page);
    await page.screenshot({ path: 'test-results/mobile-maintenance.png', fullPage: true });
  });

  test('dynamically inserted table rows are enhanced without duplicating navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(fixture);

    await page.evaluate(() => {
      const row = document.createElement('tr');
      row.innerHTML = '<td>Inspeção nova</td><td>Ed. Ametista</td><td>01/03/2027</td><td>Anual</td><td>Normal</td><td>Em dia</td><td><button class="btn">Abrir</button></td>';
      document.querySelector('#maintenance-table tbody').appendChild(row);
      document.body.appendChild(document.createElement('div'));
      document.body.appendChild(document.createElement('div'));
    });

    const lastRow = page.locator('#maintenance-table tbody tr').last();
    await expect(lastRow.locator('td').nth(0)).toHaveAttribute('data-label', 'Manutenção');
    await expect(lastRow.locator('td').nth(6)).toHaveAttribute('data-label', 'Ações');
    expect(await page.locator('.mobile-nav-toggle').count()).toBe(1);
    expect(await page.locator('.mobile-nav-backdrop').count()).toBe(1);
  });
});
