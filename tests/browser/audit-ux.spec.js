const {test,expect} = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const app = fs.readFileSync(path.join(__dirname,'../../app.js'),'utf8');
const modalSource = app.slice(app.indexOf('let modalOpener = null;'),app.indexOf('window.openCondoModal'));

test('calls filters settle without a self-triggered mutation loop and can be reset', async({page})=>{
  await page.goto('/tests/browser/remaining-views-fixture.html?mode=calls');
  await expect(page.locator('[data-filter-count="calls"]')).toHaveText('4 chamados');
  const mutations = await page.evaluate(async()=>{
    await new Promise(r=>setTimeout(r,150));
    let count=0;
    const observer=new MutationObserver(records=>count+=records.length);
    observer.observe(document.querySelector('[data-view-filter="calls"]'),{childList:true,subtree:true});
    await new Promise(r=>setTimeout(r,250)); observer.disconnect();return count;
  });
  expect(mutations).toBe(0);
  await page.getByRole('searchbox').fill('xxxxxxxx');
  await expect(page.locator('.ux-search-empty')).toBeVisible();
  await page.getByRole('button',{name:'Limpar filtros'}).click();
  await expect(page.locator('[data-filter-count="calls"]')).toHaveText('4 chamados');
  await expect(page.locator('.ux-search-empty')).toBeHidden();
});

test('generic search provides recovery and an announced count',async({page})=>{
  await page.goto('/tests/browser/ux-v2-fixture.html#/condominio/c1/tarefas');
  const search=page.locator('[data-ux-search] input');
  await search.fill('inexistente');
  await expect(page.locator('.ux-search-empty')).toBeVisible();
  await expect(page.locator('.ux-filter-count')).toHaveAttribute('role','status');
  await page.getByRole('button',{name:'Limpar busca'}).click();
  await expect(search).toHaveValue('');
  await expect(page.locator('.ux-search-empty')).toBeHidden();
});

test('core modal has a name, contains keyboard focus and restores the opener',async({page})=>{
  await page.goto('/tests/browser/visual-fixture.html');
  await page.evaluate(()=>{
    document.body.insertAdjacentHTML('beforeend','<button id="open-test">Abrir cadastro</button><div id="modal" class="modal hidden" aria-hidden="true"><div class="modal-backdrop" data-close-modal></div><section class="modal-card" role="dialog" aria-modal="true"><button data-close-modal aria-label="Fechar">×</button><div id="modal-content"></div></section></div>');
  });
  await page.addScriptTag({content:'const $=s=>document.querySelector(s);\n'+modalSource});
  await page.locator('#open-test').focus();
  await page.evaluate(()=>modal('<h2>Cadastrar tarefa</h2><div class="field"><label>Título</label><input name="title"></div><button id="save-test">Salvar</button>'));
  await expect(page.getByRole('dialog',{name:'Cadastrar tarefa'})).toBeFocused();
  await expect(page.getByLabel('Título')).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#save-test')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button',{name:'Fechar',exact:true})).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#modal')).toBeHidden();
  await expect(page.locator('#open-test')).toBeFocused();
});

test('confirmation treats supplied markup as text and starts on cancel',async({page})=>{
  await page.goto('/tests/browser/ux-v2-fixture.html#/condominio/c1/tarefas');
  await page.evaluate(()=>{void GCUI.confirm({title:'<img src=x onerror=alert(1)>',message:'<b>texto</b>',danger:true});});
  await expect(page.locator('.ux-confirm-card img')).toHaveCount(0);
  await expect(page.locator('[data-confirm-cancel]')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('[data-confirm-ok]')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.ux-confirm-overlay')).toHaveCount(0);
});
