const { test, expect } = require('@playwright/test');

async function open(page, viewport={width:1440,height:900}) {
  await page.setViewportSize(viewport);
  await page.goto('/tests/browser/command-center-fixture.html#/condominio/c1/tarefas');
  const trigger = viewport.width <= 700 ? '.ux-command-mobile' : '.ux-command-trigger';
  await page.waitForSelector(trigger, { state:'visible' });
}

test('Ctrl K opens global search and filters visible data only', async ({page}) => {
  await open(page);
  await page.keyboard.press('Control+K');
  await expect(page.locator('.ux-command-overlay')).toBeVisible();
  const input = page.locator('.ux-command-search input');
  await input.fill('portão');
  await expect(page.locator('.ux-command-result')).toHaveCount(1);
  await expect(page.locator('.ux-command-result')).toContainText('Revisar portão');
  await expect(page.locator('.ux-command-results')).not.toContainText('Tarefa secreta');
});

test('quick create respects current workspace context', async ({page}) => {
  await open(page);
  await page.locator('.ux-create-trigger').click();
  await expect(page.locator('.ux-command-create')).toBeVisible();
  await expect(page.locator('.ux-command-action')).toContainText(['Nova tarefa','Nova manutenção','Novo chamado','Novo documento','Novo comunicado']);
  await page.getByRole('button',{name:/Nova tarefa/}).click();
  await expect.poll(() => page.evaluate(() => window.__created)).toEqual(['task','c1']);
});

test('mobile exposes search and centered quick-create control', async ({page}) => {
  await open(page,{width:390,height:844});
  await expect(page.locator('.ux-command-mobile')).toBeVisible();
  await expect(page.locator('.ux-quick-create-dock')).toBeVisible();
  await page.locator('.ux-quick-create-dock').click();
  await expect(page.locator('.ux-command-panel')).toBeVisible();
  await expect(page.locator('.ux-command-actions')).toBeVisible();
});

test('320px command center does not overflow viewport', async ({page}) => {
  await open(page,{width:320,height:700});
  await page.locator('.ux-command-mobile').click();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
  const panel = page.locator('.ux-command-panel');
  await expect(panel).toBeVisible();
  const box = await panel.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(321);
});

test('escape closes the command center', async ({page}) => {
  await open(page);
  await page.keyboard.press('Control+K');
  await expect(page.locator('.ux-command-overlay')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.ux-command-overlay')).toHaveCount(0);
});
