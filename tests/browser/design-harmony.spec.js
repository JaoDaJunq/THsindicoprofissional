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


test('palette contains Tab focus, restores the trigger and preserves existing inert elements', async ({ page }) => {
  await openProductionFixture(page, '/tests/browser/command-center-fixture.html#/condominio/c1/tarefas', 1440);
  await page.evaluate(() => { const node = document.createElement('aside'); node.id = 'already-inert'; node.inert = true; document.body.appendChild(node); });
  const trigger = page.locator('.ux-command-trigger');
  await trigger.click();
  const input = page.getByRole('searchbox', { name: 'Buscar no sistema' });
  await expect(input).toBeFocused();
  await expect(page.locator('#app')).toHaveAttribute('inert', '');
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('.ux-command-result').last()).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(input).toBeFocused();
  await page.getByRole('button', { name: 'Fechar busca e ações rápidas' }).click();
  await expect(trigger).toBeFocused();
  await expect(page.locator('#app')).not.toHaveAttribute('inert');
  await expect(page.locator('#already-inert')).toHaveAttribute('inert', '');
});

test('search shortcut preserves an in-progress modal form', async ({ page }) => {
  await openProductionFixture(page, '/tests/browser/command-center-fixture.html#/condominio/c1/tarefas');
  await page.evaluate(() => {
    const dialog = document.createElement('div'); dialog.className = 'modal';
    dialog.innerHTML = '<section class="modal-card" role="dialog" aria-label="Editar tarefa"><label for="draft">Título</label><input id="draft" value="Rascunho não salvo"></section>';
    document.body.appendChild(dialog);
  });
  await page.getByLabel('Título').focus();
  await page.keyboard.press('Control+K');
  await expect(page.locator('.ux-command-overlay')).toHaveCount(0);
  await expect(page.getByLabel('Título')).toBeFocused();
  await expect(page.getByLabel('Título')).toHaveValue('Rascunho não salvo');
});

test('palette results remain reachable on a short screen with enlarged text', async ({ page }) => {
  await openProductionFixture(page, '/tests/browser/command-center-fixture.html#/condominio/c1/tarefas', 320);
  await page.setViewportSize({width:320,height:480});
  await page.addStyleTag({content:'html{font-size:200%}'});
  await page.locator('.ux-command-mobile').click();
  await page.getByRole('searchbox').fill('portão');
  await expect(page.locator('.ux-command-meta')).toHaveText('1 resultado');
  const result = page.locator('.ux-command-result');
  await result.scrollIntoViewIfNeeded();
  const box = await result.boundingBox();
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(481);
  await noOverflow(page);
  await result.click();
  await expect(page.locator('.ux-command-overlay')).toHaveCount(0);
});

for (const mode of ['files','assemblies','integrations']) {
  test(`production cascade preserves ${mode} at desktop and phone widths`, async ({ page }) => {
    await openProductionFixture(page, `/tests/browser/remaining-views-fixture.html?mode=${mode}`, 1440);
    await noOverflow(page);
    await page.setViewportSize({width:320,height:700});
    await noOverflow(page);
    await page.screenshot({path:`test-results/plus-${mode}-320.png`,fullPage:true});
  });
}

for (const width of [320,390,1280]) {
  test(`resident portal stays readable with the complete production cascade at ${width}px`, async ({ page }) => {
    await openProductionFixture(page, '/tests/browser/resident-v2-fixture.html#/morador/home', width);
    await expect(page.locator('.resident-card').first()).toBeVisible();
    expect(await page.locator('.resident-card strong').first().evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
    await noOverflow(page);
    if (width < 700) {
      expect(await page.locator('.resident-dock-label').first().evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(12);
      await page.locator('.resident-dock-more').click();
      await page.getByRole('link', {name:/Minha unidade/}).click();
      await expect(page).toHaveURL(/#\/morador\/unit$/);
    } else {
      await expect(page.locator('.resident-nav a.active')).toHaveCSS('color','rgb(255, 255, 255)');
    }
    await page.screenshot({path:`test-results/plus-resident-${width}.png`,fullPage:true});
  });
}

test('management More sheet traps focus and leaves the draft page usable after closing', async ({page}) => {
  await openProductionFixture(page, '/tests/browser/ux-v2-fixture.html#/condominio/c1/tarefas');
  const opener = page.locator('.mobile-dock-more');
  await opener.click();
  await expect(page.locator('#app')).toHaveAttribute('inert','');
  await page.locator('.mobile-more-handle').focus();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('.mobile-more-sheet a').last()).toBeFocused();
  await page.keyboard.press('Control+K');
  await expect(page.locator('.ux-command-overlay')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
  await expect(page.locator('#app')).not.toHaveAttribute('inert');
});

test('resident More sheet traps focus and restores its opener', async ({page}) => {
  await openProductionFixture(page, '/tests/browser/resident-v2-fixture.html#/morador/home');
  const opener = page.locator('.resident-dock-more');
  await opener.click();
  await expect(page.locator('#app')).toHaveAttribute('inert','');
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('.resident-more-sheet a').last()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
  await expect(page.locator('#app')).not.toHaveAttribute('inert');
});

test('compact dock labels retain complete accessible navigation names', async ({page}) => {
  await openProductionFixture(page, '/tests/browser/ux-v2-fixture.html#/');
  const dock = page.locator('.mobile-bottom-dock');
  await expect(dock.getByRole('link',{name:'Condomínios',exact:true})).toContainText('Condom.');
  await expect(dock.getByRole('link',{name:'Manutenções',exact:true})).toContainText('Manut.');
});
