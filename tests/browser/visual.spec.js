const { test, expect } = require('@playwright/test');

const fixture = '/tests/browser/visual-fixture.html';

async function noHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth
  }));
  expect(overflow.scroll).toBeLessThanOrEqual(overflow.viewport + 1);
}

async function openFixture(page, width, height) {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(fixture);
}

async function metricColumns(page) {
  return page.locator('.metrics').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
}

function closeEnough(a, b, tolerance = 4) {
  return Math.abs(a - b) <= tolerance;
}

test.describe('responsive design system', () => {
  test('desktop keeps readable content, fixed sidebar and no mobile dock', async ({ page }) => {
    await openFixture(page, 1440, 900);
    await noHorizontalOverflow(page);

    const sidebar = page.locator('.sidebar');
    const main = page.locator('.main');
    const metrics = page.locator('.metric');

    await expect(sidebar).toBeVisible();
    expect(await sidebar.evaluate(el => Math.round(el.getBoundingClientRect().width))).toBe(240);
    expect(await main.evaluate(el => el.getBoundingClientRect().left)).toBeGreaterThanOrEqual(239);
    expect(await metrics.count()).toBe(4);
    expect(await metricColumns(page)).toBe(4);
    await expect(page.locator('.mobile-bottom-dock')).toHaveCSS('display', 'none');

    const primaryHeight = await page.locator('.btn-primary').first().evaluate(el => el.getBoundingClientRect().height);
    expect(primaryHeight).toBeGreaterThanOrEqual(42);

    await page.screenshot({ path: 'test-results/desktop-maintenance.png', fullPage: true });
  });

  test('phone uses bottom dock, aligned header, off-canvas navigation, compact KPIs and stacked cards', async ({ page }) => {
    await openFixture(page, 390, 844);
    await noHorizontalOverflow(page);

    const toggle = page.locator('.mobile-nav-toggle');
    const sidebar = page.locator('.sidebar');
    const mobileBrand = page.locator('.mobile-top .brand');
    const mobileBrandTitle = page.locator('.mobile-top .brand strong');
    const dock = page.locator('.mobile-bottom-dock');

    await expect(toggle).toBeVisible();
    await expect(mobileBrand).toBeVisible();
    await expect(mobileBrandTitle).toBeVisible();
    await expect(dock).toBeVisible();
    expect(await dock.locator('.mobile-dock-item').count()).toBe(5);

    const activeDockItem = dock.locator('.mobile-dock-item.active');
    await expect(activeDockItem).toHaveCount(1);
    await expect(activeDockItem).toContainText('Manutenções');
    await expect(activeDockItem).toHaveAttribute('aria-current', 'page');

    const toggleBox = await toggle.boundingBox();
    const brandBox = await mobileBrand.boundingBox();
    expect(toggleBox.width).toBeGreaterThanOrEqual(44);
    expect(toggleBox.height).toBeGreaterThanOrEqual(44);
    expect(brandBox.x).toBeGreaterThan(toggleBox.x + toggleBox.width);
    expect(closeEnough(toggleBox.y + toggleBox.height / 2, brandBox.y + brandBox.height / 2, 8)).toBe(true);

    const brandColor = await mobileBrandTitle.evaluate(el => getComputedStyle(el).color);
    expect(brandColor).not.toBe('rgb(247, 248, 251)');
    expect(brandColor).not.toBe('rgba(0, 0, 0, 0)');

    const reducedMotionState = await sidebar.evaluate(el => ({
      requested: matchMedia('(prefers-reduced-motion: reduce)').matches,
      transitionDuration: getComputedStyle(el).transitionDuration
    }));
    expect(reducedMotionState.requested).toBe(true);
    expect(['0s', '0ms']).toContain(reducedMotionState.transitionDuration);

    const hiddenX = await sidebar.evaluate(el => el.getBoundingClientRect().x);
    expect(hiddenX).toBeLessThan(0);

    await dock.locator('.mobile-dock-more').click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(async () => Math.round(await sidebar.evaluate(el => el.getBoundingClientRect().x))).toBe(0);
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(async () => await sidebar.evaluate(el => el.getBoundingClientRect().x)).toBeLessThan(0);

    const iconBox = await page.locator('.top-actions .icon-btn').boundingBox();
    const avatarBox = await page.locator('.top-actions .avatar').boundingBox();
    expect(closeEnough(iconBox.y, avatarBox.y, 3)).toBe(true);

    await expect(page.locator('#maintenance-table thead')).toHaveCSS('display', 'none');
    const firstRow = page.locator('#maintenance-table tbody tr').first();
    const firstCell = firstRow.locator('td').first();
    await expect(firstCell).toHaveAttribute('data-label', 'Manutenção');
    await expect(firstCell).toHaveCSS('text-align', 'left');

    const actionButtons = firstRow.locator('.row-actions .btn');
    const firstActionBox = await actionButtons.nth(0).boundingBox();
    const secondActionBox = await actionButtons.nth(1).boundingBox();
    expect(closeEnough(firstActionBox.y, secondActionBox.y, 3)).toBe(true);
    expect(await metricColumns(page)).toBe(2);

    const dockBox = await dock.boundingBox();
    expect(dockBox.x).toBeGreaterThanOrEqual(5);
    expect(dockBox.x + dockBox.width).toBeLessThanOrEqual(385);

    await noHorizontalOverflow(page);
    await page.screenshot({ path: 'test-results/mobile-maintenance.png', fullPage: true });
  });

  test('very narrow phone keeps dock usable and falls back to one KPI per row', async ({ page }) => {
    await openFixture(page, 320, 700);
    expect(await metricColumns(page)).toBe(1);
    await expect(page.locator('.mobile-bottom-dock')).toBeVisible();
    const labels = page.locator('.mobile-dock-label');
    expect(await labels.count()).toBe(5);
    await noHorizontalOverflow(page);
    await page.screenshot({ path: 'test-results/narrow-mobile-maintenance.png', fullPage: true });
  });

  test('dynamically inserted rows are enhanced without duplicating navigation or dock', async ({ page }) => {
    await openFixture(page, 390, 844);

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
    expect(await page.locator('.mobile-bottom-dock').count()).toBe(1);
  });
});