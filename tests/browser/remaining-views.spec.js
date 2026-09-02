const { test, expect } = require('@playwright/test');

const fixture = '/tests/browser/remaining-views-fixture.html';

async function openView(page, mode, width=1440, height=900) {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${fixture}?mode=${mode}`);
}

async function noHorizontalOverflow(page) {
  const size = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth
  }));
  expect(size.scroll).toBeLessThanOrEqual(size.viewport + 1);
}

test.describe('remaining management views', () => {
  test('calls get useful filters and remain card-readable on mobile', async ({ page }) => {
    await openView(page, 'calls', 390, 844);
    await expect(page.locator('body')).toHaveAttribute('data-view', 'calls');
    await expect(page.locator('[data-view-filter="calls"]')).toBeVisible();
    await expect(page.locator('.mobile-bottom-dock')).toBeVisible();

    const metricColumns = await page.locator('.metrics').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(metricColumns).toBe(3);
    await expect(page.locator('[data-filter-priority="calls"] option').first()).toHaveText('Prioridade: todas');
    await expect(page.locator('[data-filter-status="calls"] option').first()).toHaveText('Status: todos');

    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(4);
    await expect(page.locator('[data-filter-count="calls"]')).toContainText('4 chamados');

    await page.locator('[data-filter-search="calls"]').fill('elevador');
    await expect(page.locator('[data-filter-count="calls"]')).toContainText('1 chamado');
    await expect(rows.filter({ hasText: 'Ruído no elevador' })).toBeVisible();
    await expect(rows.filter({ hasText: 'Portão travando' })).toBeHidden();

    await page.locator('[data-filter-search="calls"]').fill('');
    await page.locator('[data-filter-priority="calls"]').selectOption('urgente');
    await expect(page.locator('[data-filter-count="calls"]')).toContainText('1 chamado');
    await expect(rows.filter({ hasText: 'Portão travando' })).toBeVisible();

    await page.locator('[data-filter-priority="calls"]').selectOption('');
    await page.locator('[data-filter-status="calls"]').selectOption({ label: 'Em andamento' });
    await expect(page.locator('[data-filter-count="calls"]')).toContainText('2 chamados');

    await expect(page.locator('table thead')).toHaveCSS('display', 'none');
    await expect(rows.first().locator('td').first()).toHaveAttribute('data-label', 'Chamado');
    await noHorizontalOverflow(page);
    await page.screenshot({ path: 'test-results/mobile-calls.png', fullPage: true });
  });

  test('file library search filters only current rendered cards and keeps two-column phone grid', async ({ page }) => {
    await openView(page, 'files', 390, 844);
    await expect(page.locator('body')).toHaveAttribute('data-view', 'files');
    await expect(page.locator('[data-view-filter="files"]')).toBeVisible();
    await expect(page.locator('[data-filter-count="files"]')).toContainText('5 itens');

    const columns = await page.locator('.file-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(2);

    await page.locator('[data-filter-search="files"]').fill('ppci');
    await expect(page.locator('[data-filter-count="files"]')).toContainText('1 item');
    await expect(page.locator('.file-card', { hasText: 'Laudo PPCI.pdf' })).toBeVisible();
    await expect(page.locator('.file-card', { hasText: 'Seguro Predial 2026.pdf' })).toBeHidden();
    await noHorizontalOverflow(page);
    await page.screenshot({ path: 'test-results/mobile-files.png', fullPage: true });
  });

  test('very narrow file library drops to one card per row', async ({ page }) => {
    await openView(page, 'files', 320, 700);
    const columns = await page.locator('.file-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(1);
    await noHorizontalOverflow(page);
  });

  test('assemblies read as a clean governance feed on phone', async ({ page }) => {
    await openView(page, 'assemblies', 390, 844);
    await expect(page.locator('body')).toHaveAttribute('data-view', 'assemblies');
    const cards = page.locator('.panel-body > .card');
    await expect(cards).toHaveCount(3);
    const width = await cards.first().evaluate(el => el.getBoundingClientRect().width);
    expect(width).toBeLessThanOrEqual(390);
    await expect(cards.first()).toHaveCSS('text-align', 'left');
    await noHorizontalOverflow(page);
    await page.screenshot({ path: 'test-results/mobile-assemblies.png', fullPage: true });
  });

  test('integrations use balanced two-column desktop cards and one column on mobile', async ({ page }) => {
    await openView(page, 'integrations', 1440, 900);
    await expect(page.locator('body')).toHaveAttribute('data-view', 'integrations');
    let columns = await page.locator('.integration-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(2);
    await expect(page.locator('.integration-card')).toHaveCount(4);
    await noHorizontalOverflow(page);
    await page.screenshot({ path: 'test-results/desktop-integrations.png', fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    columns = await page.locator('.integration-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(1);
    await noHorizontalOverflow(page);
  });
});