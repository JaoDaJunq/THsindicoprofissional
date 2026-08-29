(() => {
  'use strict';
  if (!window.supabase) return;

  const client=window.supabase.createClient('https://tckvzlizcqdxzgavjwie.supabase.co','sb_publishable_MRtiWP-ErwVKXqNbGFrW_g_FwEHsob3');
  const safe=s=>typeof esc==='function'?esc(s):String(s??'');
  const canManage=cid=>Boolean(window.CondoAccess?.can('assemblies.manage',cid));

  const originalWorkspace=window.assemblyVotingWorkspace;
  if(typeof originalWorkspace==='function'){
    window.assemblyVotingWorkspace=async function(id,cid){
      await originalWorkspace(id,cid);
      const {count}=await client.from('units').select('id',{count:'exact',head:true}).eq('condominium_id',cid);
      const target=[...document.querySelectorAll('.kpi-pill')].find(el=>el.querySelector('span')?.textContent?.trim()==='Unidades cadastradas');
      if(target&&Number.isFinite(count)) target.querySelector('strong').textContent=count;
    };
  }

  window.openAssemblyStatusModal=async function(id){
    const {data:a,error}=await client.from('assemblies').select('*').eq('id',id).single();
    if(error)return flash(error.message);
    if(!canManage(a.condominium_id))return flash('Sem permissão para alterar esta assembleia.');
    modal(`<div class="eyebrow">Assembleia</div><h2 style="margin-bottom:16px">${safe(a.title)}</h2><form id="assembly-voting-status-form" class="form-grid"><div class="field"><label>Status</label><select name="status">${[['planned','Planejada'],['called','Convocada'],['in_progress','Em andamento'],['held','Realizada'],['cancelled','Cancelada']].map(([v,l])=>`<option value="${v}" ${a.status===v?'selected':''}>${l}</option>`).join('')}</select></div><div class="field full"><label>Observações / ata</label><textarea name="notes">${safe(a.minutes_notes||'')}</textarea></div><div class="field full"><button class="btn btn-primary">Salvar</button></div></form>`);
    $('#assembly-voting-status-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),status=f.get('status'),notes=String(f.get('notes')||'').trim()||null;const {error:up}=await client.from('assemblies').update({status,minutes_notes:notes}).eq('id',id);if(up)return flash(up.message);closeModal();flash('Assembleia atualizada.');const p=(location.hash||'#/').replace(/^#\//,'').split('/').filter(Boolean);if(p[3]&&typeof window.assemblyVotingWorkspace==='function')window.assemblyVotingWorkspace(id,a.condominium_id);else if(typeof window.assemblyVotingPage==='function')window.assemblyVotingPage(a.condominium_id)};
  };

  function addResidentNavLink(){
    const nav=document.querySelector('.resident-nav');
    if(!nav||nav.querySelector('a[href="#/morador/assemblies"]'))return;
    const calendar=nav.querySelector('a[href="#/morador/calendar"]');
    const link=document.createElement('a');link.href='#/morador/assemblies';link.textContent='🏛️ Assembleias';
    if(calendar)nav.insertBefore(link,calendar);else nav.appendChild(link);
  }
  new MutationObserver(()=>addResidentNavLink()).observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(addResidentNavLink,300);
})();