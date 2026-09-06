(() => {
  'use strict';
  if (!window.supabase) return;

  const client=window.supabase.createClient('https://tckvzlizcqdxzgavjwie.supabase.co','sb_publishable_MRtiWP-ErwVKXqNbGFrW_g_FwEHsob3');
  const safe=s=>typeof esc==='function'?esc(s):String(s??'');
  const canManage=cid=>Boolean(window.CondoAccess?.can('assemblies.manage',cid));
  const canOperate=cid=>Boolean(window.CondoAccess?.can('operations.manage',cid));

  function toLocalDateTime(value){
    if(!value)return'';
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return'';
    const local=new Date(date.getTime()-date.getTimezoneOffset()*60000);
    return local.toISOString().slice(0,16);
  }

  async function currentUser(){
    return (await client.auth.getSession()).data.session?.user||null;
  }

  async function addTimeline(condominiumId,text,sourceType,sourceId){
    const user=await currentUser();
    if(!user)return;
    const {error}=await client.from('timeline_entries').insert({
      condominium_id:condominiumId,
      text,
      source_type:sourceType,
      source_id:sourceId,
      created_by:user.id
    });
    if(error)console.warn('[assembly-voting-fixes] timeline',error);
  }

  function refreshAssemblyScreen(id,cid){
    const p=(location.hash||'#/').replace(/^#\//,'').split('?')[0].split('/').filter(Boolean);
    if(p[0]==='condominio'&&p[2]==='assembleias'&&p[3]&&typeof window.assemblyVotingWorkspace==='function'){
      return window.assemblyVotingWorkspace(id,cid);
    }
    if(typeof window.assemblyVotingPage==='function')return window.assemblyVotingPage(cid);
    if(typeof window.assembliesPage==='function')return window.assembliesPage(cid);
    if(typeof route==='function')return route();
  }

  const originalWorkspace=window.assemblyVotingWorkspace;
  if(typeof originalWorkspace==='function'){
    window.assemblyVotingWorkspace=async function(id,cid){
      await originalWorkspace(id,cid);
      const {count}=await client.from('units').select('id',{count:'exact',head:true}).eq('condominium_id',cid);
      const target=[...document.querySelectorAll('.kpi-pill')].find(el=>el.querySelector('span')?.textContent?.trim()==='Unidades cadastradas');
      if(target&&Number.isFinite(count))target.querySelector('strong').textContent=count;
    };
  }

  window.openAssemblyStatusModal=async function(id){
    const {data:a,error}=await client.from('assemblies').select('*').eq('id',id).single();
    if(error)return flash(error.message);
    if(!a)return flash('Assembleia não encontrada.');
    if(!canManage(a.condominium_id))return flash('Sem permissão para editar esta assembleia.');

    modal(`<div class="eyebrow">Editar assembleia</div><h2 style="margin-bottom:16px">${safe(a.title)}</h2><form id="assembly-edit-form" class="form-grid"><div class="field full"><label>Título</label><input name="title" required value="${safe(a.title||'')}"></div><div class="field"><label>Data e horário</label><input name="scheduled" type="datetime-local" required value="${safe(toLocalDateTime(a.scheduled_at))}"></div><div class="field"><label>Local</label><input name="location" value="${safe(a.location||'')}"></div><div class="field"><label>Status</label><select name="status">${[['planned','Planejada'],['called','Convocada'],['in_progress','Em andamento'],['held','Realizada'],['cancelled','Cancelada']].map(([v,l])=>`<option value="${v}" ${a.status===v?'selected':''}>${l}</option>`).join('')}</select></div><div class="field"><label>Visibilidade</label><select name="visibility">${[['residents','Moradores'],['management','Somente gestão'],['all','Todos']].map(([v,l])=>`<option value="${v}" ${a.visibility===v?'selected':''}>${l}</option>`).join('')}</select></div><div class="field full"><label>Pauta</label><textarea name="agenda">${safe(a.agenda||'')}</textarea></div><div class="field full"><label>Observações / ata</label><textarea name="notes">${safe(a.minutes_notes||'')}</textarea></div><div class="field full"><button class="btn btn-primary" type="submit">Salvar alterações</button></div></form>`);

    const form=$('#assembly-edit-form');
    form.onsubmit=async e=>{
      e.preventDefault();
      if(!canManage(a.condominium_id))return flash('Sem permissão para editar esta assembleia.');
      const f=new FormData(form),button=form.querySelector('button[type="submit"]');
      const title=String(f.get('title')||'').trim();
      const scheduledValue=String(f.get('scheduled')||'');
      const scheduled=new Date(scheduledValue);
      if(!title)return flash('Informe o título da assembleia.');
      if(!scheduledValue||Number.isNaN(scheduled.getTime()))return flash('Informe uma data e horário válidos.');

      const payload={
        title,
        scheduled_at:scheduled.toISOString(),
        location:String(f.get('location')||'').trim()||null,
        agenda:String(f.get('agenda')||'').trim()||null,
        status:f.get('status'),
        visibility:f.get('visibility'),
        minutes_notes:String(f.get('notes')||'').trim()||null
      };
      button.disabled=true;
      button.textContent='Salvando...';
      const {error:up}=await client.from('assemblies').update(payload).eq('id',id).eq('condominium_id',a.condominium_id);
      if(up){
        button.disabled=false;
        button.textContent='Salvar alterações';
        return flash(up.message);
      }
      await addTimeline(a.condominium_id,`Assembleia editada: ${title}.`,'assemblies',id);
      closeModal();
      flash('Assembleia atualizada.');
      refreshAssemblyScreen(id,a.condominium_id);
    };
  };

  function enhanceAssemblyList(cid){
    if(!canManage(cid))return;
    document.querySelectorAll('button[onclick*="openAssemblyStatusModal"]').forEach(button=>{
      button.textContent='Editar';
      button.title='Editar assembleia';
    });
    document.querySelectorAll('button[onclick*="openAssemblyWorkspace"]').forEach(openButton=>{
      const id=(openButton.getAttribute('onclick')||'').match(/openAssemblyWorkspace\('([^']+)'/)?.[1];
      const actions=openButton.parentElement;
      if(!id||!actions||actions.querySelector(`[data-assembly-edit="${id}"]`))return;
      const edit=document.createElement('button');
      edit.type='button';
      edit.className='btn btn-soft';
      edit.dataset.assemblyEdit=id;
      edit.textContent='Editar';
      edit.onclick=()=>window.openAssemblyStatusModal(id);
      actions.appendChild(edit);
    });
  }

  const originalVotingPage=window.assemblyVotingPage;
  if(typeof originalVotingPage==='function'){
    window.assemblyVotingPage=async function(cid){
      const result=await originalVotingPage(cid);
      enhanceAssemblyList(cid);
      return result;
    };
  }

  const originalLegacyPage=window.assembliesPage;
  if(typeof originalLegacyPage==='function'){
    window.assembliesPage=async function(cid){
      const result=await originalLegacyPage(cid);
      enhanceAssemblyList(cid);
      return result;
    };
  }

  async function refreshGasWarning(cid){
    const {count,error}=await client.from('gas_controls').select('id',{count:'exact',head:true}).eq('condominium_id',cid).eq('is_incomplete',true);
    if(error)return console.warn('[assembly-voting-fixes] gas warning count',error);
    const remaining=Number(count)||0;
    const payload=remaining
      ?{message:`${remaining} unidades ainda estão sem datas completas de medidor/válvula de gás.`,resolved_at:null}
      :{message:'Todas as datas de gás foram revisadas.',resolved_at:new Date().toISOString()};
    const {error:warningError}=await client.from('data_quality_warnings').update(payload).eq('condominium_id',cid).eq('warning_code','legacy_gas_missing_dates');
    if(warningError)console.warn('[assembly-voting-fixes] gas warning update',warningError);
  }

  window.deleteGasControl=async function(id,cid){
    if(!canOperate(cid))return flash('Você não tem permissão para excluir controles de gás.');
    const {data:g,error}=await client.from('gas_controls').select('id,condominium_id,unit_label').eq('id',id).eq('condominium_id',cid).single();
    if(error)return flash(error.message);
    const accepted=confirm(`Excluir a unidade ${g.unit_label} do controle de gás?\n\nIsso remove somente o registro de medidor/válvula desta tela. A unidade, moradores, chamados, assembleias e os demais dados do condomínio não serão excluídos.`);
    if(!accepted)return;
    const {error:del}=await client.from('gas_controls').delete().eq('id',id).eq('condominium_id',cid);
    if(del)return flash(del.message);
    await refreshGasWarning(cid);
    flash(`Unidade ${g.unit_label} removida do controle de gás.`);
    if(typeof window.gasPage==='function')await window.gasPage(cid);
  };

  function enhanceGasRows(cid){
    if(!canOperate(cid))return;
    document.querySelectorAll('button[onclick*="openGasEdit"]').forEach(editButton=>{
      const id=(editButton.getAttribute('onclick')||'').match(/openGasEdit\('([^']+)'/)?.[1];
      const cell=editButton.parentElement;
      if(!id||!cell)return;
      let actions=cell;
      if(!cell.classList.contains('row-actions')){
        actions=document.createElement('div');
        actions.className='row-actions';
        cell.insertBefore(actions,editButton);
        actions.appendChild(editButton);
      }
      if(actions.querySelector(`[data-gas-delete="${id}"]`))return;
      const remove=document.createElement('button');
      remove.type='button';
      remove.className='btn btn-soft gas-delete-control';
      remove.dataset.gasDelete=id;
      remove.textContent='Excluir';
      remove.onclick=()=>window.deleteGasControl(id,cid);
      actions.appendChild(remove);
    });
  }

  const gasStyle=document.createElement('style');
  gasStyle.textContent='.gas-delete-control{color:#a82424;border-color:#efcaca;background:#fff8f8}.gas-delete-control:hover{background:#fff0f0}';
  document.head.appendChild(gasStyle);

  const originalGasPage=window.gasPage;
  if(typeof originalGasPage==='function'){
    window.gasPage=async function(cid){
      const result=await originalGasPage(cid);
      enhanceGasRows(cid);
      return result;
    };
  }

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
