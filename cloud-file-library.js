(() => {
  if (!window.supabase) return;

  const STORAGE_BUCKET = 'condo-files';
  const sbFiles = window.supabase.createClient(
    'https://tckvzlizcqdxzgavjwie.supabase.co',
    'sb_publishable_MRtiWP-ErwVKXqNbGFrW_g_FwEHsob3'
  );

  const safeName = (name) => String(name || 'arquivo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'arquivo';

  const visibilityLabel = v => ({management:'Somente gestão',residents:'Moradores',all:'Todos'})[v] || v;
  const userId = async () => (await sbFiles.auth.getSession()).data.session?.user?.id || null;

  function mapFolder(x){return {id:x.id,condoId:x.condominium_id,parentId:x.parent_id,name:x.name,visibility:x.visibility,createdAt:String(x.created_at||'').slice(0,10),sourceType:x.source_type,sourceId:x.source_id}}
  function mapFile(x){return {id:x.id,condoId:x.condominium_id,folderId:x.folder_id,name:x.name,type:x.mime_type||'',size:Number(x.size_bytes)||0,uploadedAt:String(x.created_at||'').slice(0,10),storagePath:x.storage_path,visibility:x.visibility}}

  async function refreshCloudFiles(render=false,cid=null,folderId=null){
    const [{data:folders,error:fe},{data:files,error:xe}] = await Promise.all([
      sbFiles.from('file_folders').select('*').order('created_at',{ascending:true}),
      sbFiles.from('file_entries').select('*').order('created_at',{ascending:true})
    ]);
    if(fe) throw fe;
    if(xe) throw xe;
    data.folders=(folders||[]).map(mapFolder);
    data.files=(files||[]).map(mapFile);
    try{save(data)}catch(_){}
    if(render&&cid) filesPage(cid,folderId||null);
  }

  function cloudFolderPath(cid,folderId){
    const out=[];let cur=folderId?data.folders.find(f=>f.id===folderId&&f.condoId===cid):null;
    const guard=new Set();
    while(cur&&!guard.has(cur.id)){guard.add(cur.id);out.unshift(cur);cur=cur.parentId?data.folders.find(f=>f.id===cur.parentId):null}
    return out;
  }

  filesPage = async function(cid,folderId=null){
    const c=condo(cid);if(!c)return;
    $('#app').innerHTML=shell(`${topbar('Base de Dados',`Arquivos em nuvem de ${esc(c.name)}.`,'Workspace')}<article class="panel"><div class="panel-body"><div class="empty">Carregando arquivos do Supabase...</div></div></article>`,'condo-files',cid);
    try{await refreshCloudFiles(false)}catch(err){return $('#app').innerHTML=shell(`${topbar('Base de Dados',`Arquivos em nuvem de ${esc(c.name)}.`,'Workspace')}<article class="panel"><div class="panel-body"><div class="empty"><strong>Não foi possível carregar a Base de Dados.</strong><span>${esc(err.message||String(err))}</span></div></div></article>`,'condo-files',cid)}

    const folders=data.folders.filter(f=>f.condoId===cid&&(f.parentId||null)===(folderId||null));
    const files=data.files.filter(f=>f.condoId===cid&&(f.folderId||null)===(folderId||null));
    const crumbs=cloudFolderPath(cid,folderId);
    const folderCards=folders.map(f=>`<button class="file-card folder-card" onclick="openFolder('${cid}','${f.id}')"><div class="file-icon">📁</div><div><strong>${esc(f.name)}</strong><span>${data.files.filter(x=>x.folderId===f.id).length} arquivo(s) • ${esc(visibilityLabel(f.visibility))}</span></div></button>`).join('');
    const fileCards=files.map(f=>{const k=fileKind(f);return`<div class="file-card"><div class="file-icon">${k.icon}</div><div class="file-info"><strong title="${esc(f.name)}">${esc(f.name)}</strong><span>${k.label} • ${fmtSize(f.size||0)} • ${esc(visibilityLabel(f.visibility))}</span></div><div class="file-actions"><button class="icon-btn small-icon" onclick="previewFile('${f.id}')" title="Abrir">↗</button><button class="icon-btn small-icon danger-icon" onclick="deleteFile('${f.id}')" title="Excluir">×</button></div></div>`}).join('');

    $('#app').innerHTML=shell(`${topbar('Base de Dados',`Arquivos em nuvem de ${esc(c.name)}.`,'Workspace',`<button class="btn" onclick="openFolderModal('${cid}','${folderId||''}')">+ Nova pasta</button><button class="btn btn-primary" onclick="triggerUpload('${cid}','${folderId||''}')">↑ Enviar arquivos</button>`)}<div class="database-explainer"><div class="database-icon">☁</div><div><strong>Base de Dados na nuvem.</strong><p>Os arquivos agora ficam no Supabase Storage privado. O acesso é validado pelo condomínio e pela permissão do usuário, então eles não dependem deste navegador.</p></div></div><div class="breadcrumbs"><button onclick="openFolder('${cid}','')">Base</button>${crumbs.map(f=>`<span>›</span><button onclick="openFolder('${cid}','${f.id}')">${esc(f.name)}</button>`).join('')}</div><article class="panel"><div class="panel-head"><div><h2>${folderId?esc(data.folders.find(f=>f.id===folderId)?.name||'Pasta'):'Arquivos do condomínio'}</h2><div class="muted small">${folders.length} pasta(s) • ${files.length} arquivo(s)</div></div></div><div class="panel-body"><div class="file-grid">${folderCards}${fileCards}${!folderCards&&!fileCards?'<div class="empty file-empty"><div>📂</div><strong>Esta pasta está vazia</strong><span>Crie uma pasta ou envie fotos, vídeos e documentos.</span></div>':''}</div></div></article><input id="file-upload" type="file" multiple hidden>`,'condo-files',cid);
    const input=$('#file-upload');if(input)input.onchange=async e=>{await uploadFiles(cid,folderId,[...e.target.files]);input.value=''};
  };

  window.openFolder=(cid,fid)=>{location.hash=`#/condominio/${cid}/arquivos${fid?'/'+fid:''}`};
  window.triggerUpload=()=>$('#file-upload')?.click();

  window.openFolderModal=function(cid,parentId=''){
    const parent=parentId?data.folders.find(f=>f.id===parentId):null;
    modal(`<div class="eyebrow">Base de dados</div><h2 style="margin-bottom:16px">Criar pasta</h2><p class="muted small" style="margin-bottom:14px">${parent?`Dentro de ${esc(parent.name)}`:'Na raiz do condomínio'}</p><form id="cloud-folder-form"><div class="field"><label>Nome da pasta</label><input name="name" required autofocus placeholder="Ex.: Contratos 2026"></div><div class="field" style="margin-top:12px"><label>Visibilidade</label><select name="visibility"><option value="management">Somente gestão</option><option value="residents">Disponível para moradores</option></select></div><div style="margin-top:14px"><button class="btn btn-primary" type="submit">Criar pasta</button></div></form>`);
    $('#cloud-folder-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),b=e.target.querySelector('button');b.disabled=true;b.textContent='Criando...';const uid=await userId();if(!uid){b.disabled=false;return flash('Sessão expirada.')}const {error}=await sbFiles.from('file_folders').insert({condominium_id:cid,parent_id:parentId||null,name:String(f.get('name')).trim(),visibility:f.get('visibility'),created_by:uid});if(error){b.disabled=false;b.textContent='Criar pasta';return flash(error.message)}closeModal();flash('Pasta criada na nuvem.');await filesPage(cid,parentId||null)};
  };

  uploadFiles = async function(cid,folderId,fileList){
    if(!fileList.length)return;
    const uid=await userId();if(!uid)return flash('Sessão expirada.');
    const folder=folderId?data.folders.find(f=>f.id===folderId):null;
    const visibility=folder?.visibility||'management';
    let ok=0;
    flash(`Enviando ${fileList.length} arquivo(s) para a nuvem...`);
    for(const file of fileList){
      if(file.size>50*1024*1024){flash(`${file.name}: limite de 50 MB.`);continue}
      const id=crypto.randomUUID();
      const path=`${cid}/${id}/${safeName(file.name)}`;
      const {error:upErr}=await sbFiles.storage.from(STORAGE_BUCKET).upload(path,file,{contentType:file.type||'application/octet-stream',upsert:false});
      if(upErr){console.error(upErr);flash(`${file.name}: falha no upload.`);continue}
      const {error:metaErr}=await sbFiles.from('file_entries').insert({id,condominium_id:cid,folder_id:folderId||null,storage_path:path,name:file.name,mime_type:file.type||null,size_bytes:file.size,visibility,created_by:uid});
      if(metaErr){console.error(metaErr);await sbFiles.storage.from(STORAGE_BUCKET).remove([path]);flash(`${file.name}: falha ao registrar.`);continue}
      ok++;
    }
    if(ok)flash(`${ok} arquivo(s) salvo(s) na nuvem.`);
    await filesPage(cid,folderId||null);
  };

  window.previewFile=async function(id){
    const meta=data.files.find(f=>f.id===id);if(!meta)return;
    const {data:signed,error}=await sbFiles.storage.from(STORAGE_BUCKET).createSignedUrl(meta.storagePath,300);
    if(error||!signed?.signedUrl)return flash(error?.message||'Não foi possível abrir o arquivo.');
    window.open(signed.signedUrl,'_blank','noopener');
  };

  window.deleteFile=async function(id){
    if(!confirm('Excluir este arquivo da nuvem?'))return;
    const meta=data.files.find(f=>f.id===id);if(!meta)return;
    const {error:storageErr}=await sbFiles.storage.from(STORAGE_BUCKET).remove([meta.storagePath]);
    if(storageErr)return flash(storageErr.message);
    const {error:dbErr}=await sbFiles.from('file_entries').delete().eq('id',id);
    if(dbErr)return flash(dbErr.message);
    flash('Arquivo excluído.');await filesPage(meta.condoId,meta.folderId||null);
  };

  window.createMaintenanceRecord=async function(mid){
    const m=data.maintenances.find(x=>x.id===mid);if(!m)return;
    const uid=await userId();if(!uid)return flash('Sessão expirada.');
    const rootName=`${m.title} - ${br(m.nextDate)}`;
    let {data:roots,error}=await sbFiles.from('file_folders').select('*').eq('condominium_id',m.condoId).is('parent_id',null).eq('name',rootName).limit(1);
    if(error)return flash(error.message);
    let root=roots?.[0];
    if(!root){
      const {data:newRoot,error:rootErr}=await sbFiles.from('file_folders').insert({condominium_id:m.condoId,parent_id:null,name:rootName,visibility:'management',source_type:'maintenance',source_id:m.id,created_by:uid}).select().single();
      if(rootErr)return flash(rootErr.message);root=newRoot;
      const children=['Documentos','Fotos','Vídeos'].map(name=>({condominium_id:m.condoId,parent_id:root.id,name,visibility:'management',source_type:'maintenance',source_id:m.id,created_by:uid}));
      const {error:childErr}=await sbFiles.from('file_folders').insert(children);if(childErr)console.warn(childErr);
    }
    await refreshCloudFiles(false);
    location.hash=`#/condominio/${m.condoId}/arquivos/${root.id}`;
  };

  async function bootstrapFiles(){
    const {data:{session}}=await sbFiles.auth.getSession();if(!session)return;
    try{await refreshCloudFiles(false)}catch(err){console.warn('Cloud file sync',err)}
  }
  sbFiles.auth.onAuthStateChange((event,session)=>{if(session?.user&&event!=='SIGNED_OUT')setTimeout(bootstrapFiles,400)});
  bootstrapFiles();
})();