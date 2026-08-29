(() => {
  'use strict';
  if (!window.supabase || typeof shell !== 'function') return;

  const client = window.supabase.createClient(
    'https://tckvzlizcqdxzgavjwie.supabase.co',
    'sb_publishable_MRtiWP-ErwVKXqNbGFrW_g_FwEHsob3'
  );
  const BUCKET = 'condo-files';
  const safe = s => typeof esc === 'function' ? esc(s) : String(s ?? '');
  const visLabel = { management:'Somente gestão', residents:'Moradores', all:'Todos' };
  const canManage = cid => Boolean(window.CondoAccess?.can('documents.manage', cid));
  const today = () => { const d=new Date(); d.setHours(0,0,0,0); return d; };
  const fmt = v => v ? new Intl.DateTimeFormat('pt-BR',{dateStyle:'short'}).format(new Date(`${String(v).slice(0,10)}T12:00:00`)) : 'Sem data';
  const fmtDt = v => v ? new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(v)) : 'Sem data';
  const safeName = name => String(name || 'arquivo').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'_').replace(/^_+|_+$/g,'') || 'arquivo';

  async function user(){ return (await client.auth.getSession()).data.session?.user || null; }
  async function loadDocuments(cid){
    const [{data:docs,error:de},{data:versions,error:ve},{data:files,error:fe}] = await Promise.all([
      client.from('documents').select('*').eq('condominium_id',cid).order('expiry_date',{ascending:true,nullsFirst:false}),
      client.from('document_versions').select('*').eq('condominium_id',cid).order('version_number',{ascending:false}),
      client.from('file_entries').select('id,name,storage_path,mime_type,size_bytes,visibility').eq('condominium_id',cid)
    ]);
    if(de) throw de; if(ve) throw ve; if(fe) throw fe;
    const fileMap = new Map((files||[]).map(f=>[f.id,f]));
    const versionsByDoc = new Map();
    for(const v of versions||[]){ const arr=versionsByDoc.get(v.document_id)||[]; arr.push({...v,file:fileMap.get(v.file_entry_id)||null}); versionsByDoc.set(v.document_id,arr); }
    return (docs||[]).map(d=>({...d,versions:versionsByDoc.get(d.id)||[]}));
  }

  function expiryState(doc){
    if(!doc.expiry_date) return {label:'Sem vencimento',cls:'good'};
    const left=Math.ceil((new Date(`${doc.expiry_date}T00:00:00`)-today())/86400000);
    if(left<0) return {label:`Vencido há ${Math.abs(left)}d`,cls:'bad'};
    if(left===0) return {label:'Vence hoje',cls:'bad'};
    if(left<=7) return {label:`Vence em ${left}d`,cls:'bad'};
    if(left<=30) return {label:`Vence em ${left}d`,cls:'warn'};
    return {label:'Em dia',cls:'good'};
  }

  async function page(cid){
    const c=condo(cid); if(!c)return;
    const manage=canManage(cid);
    const action=manage?`<button class="btn btn-primary" onclick="openDocumentWorkflowModal('${cid}')">+ Novo documento</button>`:'';
    $('#app').innerHTML=shell(`${topbar('Documentos',`${safe(c.name)} • controle, arquivos e vencimentos.`,'Workspace',action)}<article class="panel"><div class="panel-body"><div class="empty">Carregando documentos...</div></div></article>`,'condo-docs',cid);
    try{
      const docs=await loadDocuments(cid);
      const expiring=docs.filter(d=>{ if(!d.expiry_date)return false; const left=Math.ceil((new Date(`${d.expiry_date}T00:00:00`)-today())/86400000); return left>=0&&left<=30; }).length;
      const expired=docs.filter(d=>d.expiry_date&&new Date(`${d.expiry_date}T00:00:00`)<today()).length;
      const withFiles=docs.filter(d=>d.versions.length).length;
      const rows=docs.length?docs.map(d=>{ const st=expiryState(d); const latest=d.versions[0]; const tags=(d.tags||[]).map(t=>`<span class="badge attention">${safe(t)}</span>`).join(' '); return `<tr data-search="${safe([d.title,d.category,d.issuer,d.reference_number,...(d.tags||[])].filter(Boolean).join(' ').toLowerCase())}"><td><strong>${safe(d.title)}</strong><div class="list-sub">${safe(d.issuer||d.notes||'')}</div>${tags?`<div style="margin-top:5px;display:flex;gap:4px;flex-wrap:wrap">${tags}</div>`:''}</td><td>${safe(d.category||'Geral')}</td><td>${safe(d.reference_number||'—')}</td><td>${d.expiry_date?fmt(d.expiry_date):'—'} <span class="badge ${st.cls}">${st.label}</span></td><td>${safe(visLabel[d.visibility]||d.visibility)}</td><td>${latest?`v${latest.version_number} • ${safe(latest.file?.name||'arquivo')}`:'Sem arquivo'}</td><td><div class="row-actions"><button class="btn btn-soft" onclick="openDocumentDetails('${d.id}','${cid}')">Detalhes</button>${latest?`<button class="btn" onclick="openDocumentFile('${latest.file_entry_id}')">Abrir</button>`:''}${manage?`<button class="btn btn-soft" onclick="addDocumentVersion('${d.id}','${cid}')">+ Versão</button>`:''}</div></td></tr>`; }).join(''):'<tr><td colspan="7"><div class="empty">Nenhum documento controlado ainda.</div></td></tr>';
      $('#app').innerHTML=shell(`${topbar('Documentos',`${safe(c.name)} • controle, arquivos e vencimentos.`,'Workspace',action)}<section class="metrics" style="margin-bottom:18px"><article class="metric"><div class="metric-top"><div><span>Total</span><strong>${docs.length}</strong></div><div class="icon blue">📄</div></div></article><article class="metric"><div class="metric-top"><div><span>Com arquivo</span><strong>${withFiles}</strong></div><div class="icon green">☁</div></div></article><article class="metric"><div class="metric-top"><div><span>Vencem em 30d</span><strong>${expiring}</strong></div><div class="icon orange">◫</div></div></article><article class="metric"><div class="metric-top"><div><span>Vencidos</span><strong>${expired}</strong></div><div class="icon orange">!</div></div></article></section><article class="panel"><div class="panel-head"><div><h2>Biblioteca de documentos</h2><div class="muted small">Metadados, validade e versões do arquivo no mesmo lugar.</div></div><input id="document-search" placeholder="Buscar documento..." style="max-width:280px"></div><div class="panel-body"><div class="table-wrap"><table class="table"><thead><tr><th>Documento</th><th>Categoria</th><th>Referência</th><th>Vencimento</th><th>Visibilidade</th><th>Arquivo</th><th>Ações</th></tr></thead><tbody id="document-table-body">${rows}</tbody></table></div></div></article>`,'condo-docs',cid);
      const search=$('#document-search'); if(search) search.oninput=()=>{ const q=search.value.trim().toLowerCase(); $$('#document-table-body tr').forEach(tr=>tr.style.display=!q||String(tr.dataset.search||'').includes(q)?'':'none'); };
    }catch(err){ flash(err.message||'Não foi possível carregar os documentos.'); }
  }

  async function uploadFile(cid,file,visibility){
    const u=await user(); if(!u)throw new Error('Sessão expirada.');
    if(file.size>50*1024*1024)throw new Error('O arquivo excede 50 MB.');
    const id=crypto.randomUUID(); const path=`${cid}/documents/${id}/${safeName(file.name)}`;
    const {error:up}=await client.storage.from(BUCKET).upload(path,file,{contentType:file.type||'application/octet-stream',upsert:false});
    if(up)throw up;
    const {data:meta,error:me}=await client.from('file_entries').insert({id,condominium_id:cid,folder_id:null,storage_path:path,name:file.name,mime_type:file.type||null,size_bytes:file.size,visibility,created_by:u.id}).select().single();
    if(me){await client.storage.from(BUCKET).remove([path]);throw me;} return meta;
  }

  window.openDocumentWorkflowModal=function(cid){
    if(!canManage(cid))return flash('Sem permissão para cadastrar documentos.');
    modal(`<div class="eyebrow">Novo documento</div><h2 style="margin-bottom:16px">Cadastrar documento</h2><form id="document-workflow-form" class="form-grid"><div class="field full"><label>Título</label><input name="title" required></div><div class="field"><label>Categoria</label><select name="category"><option>Licenças</option><option>Seguros</option><option>Contratos</option><option>Laudos</option><option>Certificados</option><option>Atas</option><option>Outros</option></select></div><div class="field"><label>Visibilidade</label><select name="visibility"><option value="management">Somente gestão</option><option value="residents">Moradores</option><option value="all">Todos</option></select></div><div class="field"><label>Emissor / fornecedor</label><input name="issuer"></div><div class="field"><label>Número / referência</label><input name="reference"></div><div class="field"><label>Emissão</label><input type="date" name="issue"></div><div class="field"><label>Vencimento</label><input type="date" name="expiry"></div><div class="field full"><label>Tags</label><input name="tags" placeholder="ex.: bombeiros, anual, obrigatório"></div><div class="field full"><label>Observações</label><textarea name="notes"></textarea></div><div class="field full"><label>Arquivo inicial <span class="muted">(opcional)</span></label><input type="file" name="file"></div><div class="field full"><button class="btn btn-primary">Salvar documento</button></div></form>`);
    $('#document-workflow-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),b=e.target.querySelector('button'),u=await user();if(!u)return flash('Sessão expirada.');b.disabled=true;b.textContent='Salvando...';const payload={condominium_id:cid,title:String(f.get('title')).trim(),category:f.get('category'),issuer:String(f.get('issuer')).trim()||null,reference_number:String(f.get('reference')).trim()||null,issue_date:f.get('issue')||null,expiry_date:f.get('expiry')||null,visibility:f.get('visibility'),tags:String(f.get('tags')).split(',').map(x=>x.trim()).filter(Boolean),notes:String(f.get('notes')).trim()||null,created_by:u.id};let uploaded=null;try{const file=e.target.elements.file.files?.[0];if(file)uploaded=await uploadFile(cid,file,payload.visibility);const {data:doc,error}=await client.from('documents').insert(payload).select().single();if(error)throw error;if(uploaded){const {error:ve}=await client.rpc('add_document_version',{p_document_id:doc.id,p_file_entry_id:uploaded.id,p_notes:'Versão inicial'});if(ve)throw ve;}closeModal();flash('Documento cadastrado.');page(cid)}catch(err){if(uploaded){await client.storage.from(BUCKET).remove([uploaded.storage_path]);await client.from('file_entries').delete().eq('id',uploaded.id)}b.disabled=false;b.textContent='Salvar documento';flash(err.message||'Não foi possível salvar o documento.')}};
  };

  window.addDocumentVersion=async function(documentId,cid){
    if(!canManage(cid))return;
    modal(`<div class="eyebrow">Nova versão</div><h2 style="margin-bottom:16px">Adicionar arquivo ao documento</h2><form id="document-version-form" class="form-grid"><div class="field full"><label>Arquivo</label><input type="file" name="file" required></div><div class="field full"><label>Observações</label><textarea name="notes" placeholder="Ex.: renovação 2027"></textarea></div><div class="field full"><button class="btn btn-primary">Adicionar versão</button></div></form>`);
    $('#document-version-form').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button'),file=e.target.elements.file.files?.[0];if(!file)return;b.disabled=true;let uploaded=null;try{const {data:doc,error:de}=await client.from('documents').select('visibility').eq('id',documentId).eq('condominium_id',cid).single();if(de)throw de;uploaded=await uploadFile(cid,file,doc.visibility);const notes=String(new FormData(e.target).get('notes')||'').trim();const {error}=await client.rpc('add_document_version',{p_document_id:documentId,p_file_entry_id:uploaded.id,p_notes:notes||null});if(error)throw error;closeModal();flash('Nova versão adicionada.');page(cid)}catch(err){if(uploaded){await client.storage.from(BUCKET).remove([uploaded.storage_path]);await client.from('file_entries').delete().eq('id',uploaded.id)}b.disabled=false;flash(err.message||'Não foi possível adicionar a versão.')}};
  };

  window.openDocumentDetails=async function(id,cid){
    try{const docs=await loadDocuments(cid);const d=docs.find(x=>x.id===id);if(!d)return;const versions=d.versions.length?d.versions.map(v=>`<div class="timeline-item"><strong>Versão ${v.version_number}</strong><p>${fmtDt(v.created_at)} • ${safe(v.file?.name||'arquivo')}</p>${v.notes?`<p>${safe(v.notes)}</p>`:''}<button class="btn btn-soft" onclick="openDocumentFile('${v.file_entry_id}')">Abrir arquivo</button></div>`).join(''):'<div class="empty">Nenhuma versão de arquivo vinculada.</div>';modal(`<div class="eyebrow">Documento</div><h2>${safe(d.title)}</h2><p class="muted">${safe(d.category||'Geral')} • ${safe(visLabel[d.visibility]||d.visibility)}</p><div class="kpi-strip" style="margin:16px 0"><div class="kpi-pill"><strong>${safe(d.reference_number||'—')}</strong><span>Referência</span></div><div class="kpi-pill"><strong>${safe(d.issuer||'—')}</strong><span>Emissor</span></div><div class="kpi-pill"><strong>${fmt(d.expiry_date)}</strong><span>Vencimento</span></div></div>${d.notes?`<p>${safe(d.notes)}</p>`:''}<div class="section-title" style="margin-top:18px"><h3>Versões</h3></div><div class="timeline">${versions}</div>`)}catch(err){flash(err.message||'Não foi possível abrir o documento.')}};

  window.openDocumentFile=async function(fileId){
    const {data:file,error}=await client.from('file_entries').select('storage_path').eq('id',fileId).single();if(error)return flash(error.message);const {data:signed,error:se}=await client.storage.from(BUCKET).createSignedUrl(file.storage_path,300);if(se||!signed?.signedUrl)return flash(se?.message||'Não foi possível abrir o arquivo.');window.open(signed.signedUrl,'_blank','noopener');
  };

  window.docsPage=page;
  docsPage=page;
  window.openDocumentModal=window.openDocumentWorkflowModal;
})();
