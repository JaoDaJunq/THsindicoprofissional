const { test, expect } = require('@playwright/test');

const fixture = '/tests/browser/rich-text-fixture.html';

async function selectEditorText(page) {
  await page.locator('.gc-rich-editor').focus();
  await page.evaluate(() => {
    const editor = document.querySelector('.gc-rich-editor');
    const range = document.createRange();
    range.selectNodeContents(editor);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  });
}

test.describe('rich text editor', () => {
  test('formats content and syncs sanitized HTML to the original field', async ({ page }) => {
    await page.goto(fixture);
    await expect(page.locator('.gc-rich-toolbar')).toBeVisible();
    await expect(page.locator('.gc-rich-editor')).toHaveText('Texto inicial');

    await selectEditorText(page);
    await page.getByRole('button', { name: 'Negrito (Ctrl+B)' }).click();

    const stored = await page.locator('textarea[name="body"]').inputValue();
    expect(stored).toContain('<strong>Texto inicial</strong>');

    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.locator('#render-target strong')).toHaveText('Texto inicial');
  });

  test('sanitizer drops scripts, event handlers and unsupported markup', async ({ page }) => {
    await page.goto(fixture);
    const rendered = await page.evaluate(() => window.GCRichText.render(
      '<strong>Seguro</strong><img src=x onerror="window.__xss=1"><script>window.__xss=1</script><a href="javascript:alert(1)">link</a>'
    ));
    expect(rendered).toContain('<strong>Seguro</strong>');
    expect(rendered).not.toContain('<img');
    expect(rendered).not.toContain('<script');
    expect(rendered).not.toContain('onerror');
    expect(rendered).not.toContain('javascript:');
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  });

  test('legacy plain text remains readable and line breaks are preserved', async ({ page }) => {
    await page.goto(fixture);
    const rendered = await page.evaluate(() => window.GCRichText.render('Linha 1\nLinha 2'));
    expect(rendered).toBe('Linha 1<br>Linha 2');
  });

  test('mobile toolbar wraps without horizontal page overflow', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(fixture);
    const metrics = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth
    }));
    expect(metrics.scroll).toBeLessThanOrEqual(metrics.viewport + 1);
    await expect(page.locator('.gc-rich-toolbar')).toBeVisible();
  });
});