const { test, expect } = require('@playwright/test');

async function open(page, viewport={width:1440,height:900}) {
  await page.setViewportSize(viewport);
  await page.goto('/tests/browser/ux-v2-fixture.html#/condominio/c1/tarefas');
  await page.waitForSelector('.ux-contextbar');
}

test('desktop uses registry sidebar and workspace breadcrumb', async ({page}) => {
  await open(page);
  await expect(page.locator('.sidebar [data-nav-group="main"] .ux-icon').first()).toBeVisible();
  await expect(page.locator('.sidebar [data-nav-group="workspace"]')).toBeVisible();
  await expect(page.locator('.ux-breadcrumb')).toContainText('Ed. Ametista');
  await expect(page.locator('.ux-breadcrumb')).toContainText('Tarefas');
  await expect(page.locator('.ux-condo-switch select')).toHaveValue('c1');
  await expect(page.locator('.sidebar a.active')).toContainText('Tarefas');
});

test('condominium switch preserves the current workspace subroute', async ({page}) => {
  await open(page);
  await page.locator('.ux-condo-switch select').selectOption('c2');
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/condominio/c2/tarefas');
});

test('metric cards replace mixed emoji icons with registry svg', async ({page}) => {
  await open(page);
  await expect(page.locator('.metric .icon.ux-metric-icon svg.ux-icon')).toHaveCount(2);
  await expect(page.locator('.metric').first().locator('.icon')).not.toContainText('🎫');
  await expect(page.locator('.metric').nth(1).locator('.icon')).not.toContainText('⚒');
});

test('mobile hides redundant condominium field and search filters rows', async ({page}) => {
  await open(page,{width:390,height:844});
  await expect(page.locator('[data-ux-search="tasks"]')).toBeVisible();
  await expect(page.locator('.ux-redundant-condo').first()).toBeHidden();
  await page.locator('[data-ux-search="tasks"] input').fill('alarme');
  await expect(page.locator('tbody tr:not(.ux-filter-hidden)')).toHaveCount(1);
  await expect(page.locator('tbody tr:not(.ux-filter-hidden)')).toContainText('Testar alarme');
  await expect(page.locator('.ux-filter-count')).toHaveText('1 resultado');
});

test('mobile dock and more sheet inherit registry svg icons', async ({page}) => {
  await open(page,{width:390,height:844});
  await expect(page.locator('.mobile-bottom-dock')).toBeVisible();
  await expect.poll(async () => page.locator('.mobile-bottom-dock .mobile-dock-icon svg.ux-icon').count()).toBeGreaterThanOrEqual(4);
  await page.locator('.mobile-dock-more').click();
  await expect(page.locator('.mobile-more-sheet')).toBeVisible();
  await expect.poll(async () => page.locator('.mobile-more-sheet .mobile-more-icon svg.ux-icon').count()).toBeGreaterThan(0);
  await expect(page.locator('.mobile-more-sheet .mobile-more-icon').first()).not.toHaveText('•');
});

test('hamburger complete navigation also uses registry icons', async ({page}) => {
  await open(page,{width:390,height:844});
  await expect(page.locator('.mobile-nav-toggle')).toBeVisible();
  await page.locator('.mobile-nav-toggle').click();
  await expect(page.locator('.mobile-more-sheet[data-mode="all"]')).toBeVisible();
  await expect.poll(async () => page.locator('.mobile-more-sheet .mobile-more-icon svg.ux-icon').count()).toBeGreaterThanOrEqual(5);
});

test('sidebar rendering stays stable after unrelated DOM mutations', async ({page}) => {
  await open(page);
  const before = await page.locator('.sidebar .nav a').count();
  await page.evaluate(() => {
    const x=document.createElement('div');x.textContent='mutation';document.querySelector('.panel-body').appendChild(x);
  });
  await page.waitForTimeout(100);
  const after = await page.locator('.sidebar .nav a').count();
  expect(after).toBe(before);
  await expect(page.locator('.sidebar [data-nav-id="condo-tasks"]')).toHaveCount(1);
});

test('custom confirmation closes with escape', async ({page}) => {
  await open(page,{width:390,height:844});
  await page.evaluate(() => { window.__confirmResult = null; GCUI.confirm({title:'Excluir?',message:'Teste',danger:true}).then(v=>window.__confirmResult=v); });
  await expect(page.locator('.ux-confirm-overlay')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.ux-confirm-overlay')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.__confirmResult)).toBe(false);
});
