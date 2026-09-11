const { test, expect } = require('@playwright/test');

// Exercise real enhancement scripts on isolated sample data, with exactly the
// production stylesheet cascade. No authenticated requests or production writes.
async function openProductionFixture(page, fixture, width = 390) {
  await page.setViewportSize({ width, height: 900 });
  const index = await (await page.request.get('/index.html')).text();
  const styles = [...index.matchAll(/<link[^>]+href=["']\.\/([^"']+\.css)["']/g)]
    .map(match => `<link rel="stylesheet" href="/${match[1]}">`).join('\n');
  await page.route('**/tests/browser/*-fixture.html*', async route => {
    const response = await route.fetch();
    const html = (await response.text()).replace(/<link[^>]+rel=["']stylesheet["'][^>]*>/g, '')
      .replace('</head>', `${styles}</head>`);
    await route.fulfill({ response, body: html });
  });
  await page.goto(fixture);
}

async function noOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

for (const width of [320, 390, 768, 1440]) {
  test(`overview keeps labels and long condominium names readable at ${width}px`, async ({ page }) => {
    await openProductionFixture(page, '/tests/browser/visual-redesign-v3-fixture.html', width);
    await page.locator('.condo-id strong').evaluate(el => { el.textContent = 'Residencial Parque das Araucárias, Bloco Administrativo'; });
    await noOverflow(page);
    for (const selector of ['.metric-top span', '.condo-id strong', '.alert-card p']) {
      expect(await page.locator(selector).first().evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
    }
    if (width <= 700) {
      const items = page.locator('.mobile-dock-item');
      for (let i = 0; i < await items.count(); i++) {
        const item = items.nth(i);
        const box = await item.boundingBox();
        const label = await item.locator('.mobile-dock-label').boundingBox();
        expect(label.x).toBeGreaterThanOrEqual(box.x - 1);
        expect(label.x + label.width).toBeLessThanOrEqual(box.x + box.width + 1);
        expect(label.y + label.height).toBeLessThanOrEqual(box.y + box.height + 1);
        expect(await item.locator('.mobile-dock-label').evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(12);
      }
    }
    await page.screenshot({ path: `test-results/harmony-overview-${width}.png`, fullPage: true });
  });
}

test('warning bars preserve their operational meaning after the redesign', async ({ page }) => {
  await openProductionFixture(page, '/tests/browser/visual-redesign-v3-fixture.html', 1440);
  const warning = page.locator('.pulse-row[data-tone="warning"] .pulse-fill');
  await expect(warning).toHaveCSS('background-color', 'rgb(166, 99, 16)');
  await expect(warning).toHaveCSS('background-image', 'none');
  const normal = page.locator('.pulse-row:not([data-tone]) .pulse-fill');
  await expect(normal).not.toHaveCSS('background-image', 'none');
});

test('resident manager can combine filters, recover an empty search and read results on phone', async ({ page }) => {
  await openProductionFixture(page, '/tests/browser/remaining-views-fixture.html?mode=calls');
  const search = page.locator('[data-filter-search="calls"]');
  await page.locator('[data-filter-priority="calls"]').selectOption('urgente');
  await expect(page.locator('[data-filter-count="calls"]')).toContainText('1 chamado');
  await search.fill('nenhum resultado');
  await expect(page.locator('.ux-search-empty')).toBeVisible();
  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await expect(search).toHaveValue('');
  await expect(page.locator('[data-filter-priority="calls"]')).toHaveValue('');
  await expect(page.locator('[data-filter-count="calls"]')).toHaveText('4 chamados');
  await expect(page.locator('tbody tr:visible')).toHaveCount(4);
  await noOverflow(page);
  await page.screenshot({ path: 'test-results/harmony-calls-mobile.png', fullPage: true });
});

test('mobile quick create remains clickable and targets the current condominium', async ({ page }) => {
  await openProductionFixture(page, '/tests/browser/command-center-fixture.html#/condominio/c1/tarefas', 320);
  await page.locator('.ux-quick-create-dock').click();
  await expect(page.locator('.ux-command-panel')).toBeVisible();
  await noOverflow(page);
  await page.getByRole('button', { name: /Nova tarefa/ }).click();
  await expect.poll(() => page.evaluate(() => window.__created)).toEqual(['task', 'c1']);
});

test('keyboard search can be opened, used and dismissed with production styling', async ({ page }) => {
  await openProductionFixture(page, '/tests/browser/command-center-fixture.html#/condominio/c1/tarefas', 1440);
  await page.keyboard.press('Control+K');
  await page.locator('.ux-command-search input').fill('portão');
  await expect(page.locator('.ux-command-result')).toHaveCount(1);
  await expect(page.locator('.ux-command-result')).toContainText('Revisar portão');
  await expect(page.locator('.ux-command-results')).not.toContainText('Tarefa secreta');
  await page.keyboard.press('Escape');
  await expect(page.locator('.ux-command-overlay')).toHaveCount(0);
});

test('destructive confirmation stays distinct and Escape cancels without executing it', async ({ page }) => {
  await openProductionFixture(page, '/tests/browser/ux-v2-fixture.html#/condominio/c1/tarefas');
  await page.evaluate(() => {
    window.confirmResult = 'pending';
    GCUI.confirm({ title: 'Excluir tarefa?', message: 'Esta ação remove a tarefa.', danger: true })
      .then(value => { window.confirmResult = value; });
  });
  await expect(page.locator('[data-confirm-cancel]')).toBeFocused();
  await expect(page.locator('.ux-confirm-icon.danger')).toHaveCSS('color', 'rgb(180, 35, 45)');
  await expect(page.locator('[data-confirm-ok]')).toHaveCSS('background-color', 'rgb(180, 35, 45)');
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => window.confirmResult)).toBe(false);
  await expect(page.locator('.ux-confirm-overlay')).toHaveCount(0);
});
