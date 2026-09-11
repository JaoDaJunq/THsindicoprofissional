const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('cloud-operations.js','utf8').replace('  async function init(){','  window.testRefresh=refreshOperations;\n  async function init(){');
function setup(failure){
  let user={id:'u1'}, rendered=0, saved=0;
  const data={condos:[{id:'c1'}],tasks:[{id:'old',condoId:'c1'}],maintenances:[],calls:[],documents:[],assemblies:[],timeline:[],events:[],notifications:[]};
  const client={auth:{getSession:async()=>({data:{session:user?{user}:null}}),onAuthStateChange:()=>{}},from:table=>{
    const result={data:table==='tasks'?[{id:'new',condominium_id:'c1'}]:[],error:failure&&table==='tasks'?{message:'unavailable'}:null};
    const chain={select:()=>chain,order:()=>chain,eq:()=>chain,then:resolve=>Promise.resolve(result).then(resolve)};return chain;
  }};
  const ctx={window:{supabase:{createClient:()=>client}},data,save:()=>saved++,route:()=>rendered++,document:{querySelector:()=>null,activeElement:null},setTimeout:()=>{},clearTimeout:()=>{},console:{warn:()=>{}},flash:()=>{}};
  vm.runInNewContext(source,ctx);
  return {ctx,data,saved:()=>saved,rendered:()=>rendered,setUser:u=>user=u};
}
test('failed operational query preserves existing snapshot',async()=>{const t=setup(true);await t.ctx.window.testRefresh();assert.equal(t.data.tasks[0].id,'old');assert.equal(t.saved(),0);assert.equal(t.rendered(),0);});
test('successful operational refresh maps the returned records',async()=>{const t=setup(false);await t.ctx.window.testRefresh();assert.equal(t.data.tasks[0].id,'new');assert.equal(t.saved(),1);assert.equal(t.rendered(),1);});
test('operational refresh does not rerender while a form is open',async()=>{const t=setup(false);t.ctx.document.querySelector=()=>({});await t.ctx.window.testRefresh();assert.equal(t.data.tasks[0].id,'new');assert.equal(t.rendered(),0);});
test('operational refresh does not rerender while confirmation is open',async()=>{const t=setup(false);t.ctx.document.querySelector=selector=>selector.includes('.ux-confirm-overlay')?{}:null;await t.ctx.window.testRefresh();assert.equal(t.data.tasks[0].id,'new');assert.equal(t.rendered(),0);});
const dashboard=fs.readFileSync('dashboard-reporting-v2.js','utf8');
const tickets=dashboard.slice(dashboard.indexOf('  let renderVersion = 0;'),dashboard.indexOf('  function loadError'));
test('dashboard render tickets reject stale requests, changed routes and changed users',()=>{
  const ctx={location:{hash:'#/'},window:{CondoAccess:{getSnapshot:()=>({user:{id:'u1'}})}}};
  vm.runInNewContext(tickets+'\nthis.ticket=renderTicket;',ctx);
  const old=ctx.ticket(),current=ctx.ticket();assert.equal(old(),false);assert.equal(current(),true);
  ctx.location.hash='#/chamados';assert.equal(current(),false);
  const newer=ctx.ticket();ctx.window.CondoAccess.getSnapshot=()=>({user:{id:'u2'}});assert.equal(newer(),false);
});
