const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function worker({offline = false, cached = null} = {}) {
  const handlers = {}, removed = [], writes = [];
  const cache = {addAll:async()=>{}, put:async(req,res)=>writes.push(req.url), match:async key=>key==='./index.html'?new Response('<html>shell</html>'):cached};
  const self = {location:{origin:'https://example.com'},registration:{scope:'https://example.com/condo/'},addEventListener:(name,fn)=>handlers[name]=fn,clients:{claim:async()=>{}}};
  vm.runInNewContext(fs.readFileSync('sw.js','utf8'), {self,URL,Response,caches:{open:async()=>cache,keys:async()=>['other-app','gestao-condominial-shell-v2','gestao-condominial-shell-v3'],delete:async key=>removed.push(key)},fetch:async()=>{if(offline)throw Error('offline');return new Response('asset');}});
  async function request(path,mode='cors') {
    let response;
    handlers.fetch({request:{url:'https://example.com'+path,method:'GET',mode},respondWith:p=>response=p,waitUntil:()=>{}});
    return response;
  }
  return {handlers,request,removed,writes};
}
test('offline script cache miss never returns HTML',async()=>{const w=worker({offline:true});const r=await w.request('/condo/missing.js');assert.equal(r.type,'error');});
test('offline navigation can use the application shell',async()=>{const w=worker({offline:true});const r=await w.request('/condo/', 'navigate');assert.match(await r.text(),/shell/);});
test('service worker leaves unrelated sites and data endpoints alone',async()=>{const w=worker();assert.equal(await w.request('/other/app.js'),undefined);assert.equal(await w.request('/condo/api/data'),undefined);});
test('activation only removes caches owned by this application',async()=>{const w=worker();let done;w.handlers.activate({waitUntil:p=>done=p});await done;assert.deepEqual(w.removed,['gestao-condominial-shell-v2']);});
