(() => {
  'use strict';
  if (!window.supabase) return;

  const client = window.supabase.createClient(
    'https://tckvzlizcqdxzgavjwie.supabase.co',
    'sb_publishable_MRtiWP-ErwVKXqNbGFrW_g_FwEHsob3'
  );
  const BUCKET = 'condo-files';
  const safe = s => typeof esc === 'function' ? esc(s) : String(s ?? '');
  const canFinance = cid => Boolean(window.CondoAccess?.can('finance.manage', cid));
  const canDocuments = cid => Boolean(window.CondoAccess?.can('documents.manage', cid));
  const localDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const monthValue = () => localDate().slice(0,7);
  const cents = value => Math.round(Number(String(value || '0').replace(/\./g,'').replace(',','.')) * 100);
  const safeName = name => String(name || 'arquivo')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-zA-Z0-9._-]+/g,'_').replace(/^_+|_+$/g,'') || 'arquivo';

  async function currentUser() {
    return (await client.auth.getSession()).data.session?.user || null;
  }

  async function removeUploaded(file) {
    if (!file) return;
    try { await client.storage.from(BUCKET).remove([file.storage_path]); } catch (_) {}
    try { await client.from('file_entries').delete().eq('id', file.id); } catch (_) {}
  }

  async function uploadFile({cid, pathPrefix, file, visibility}) {
    const user = await currentUser();
    if (!user) throw new Error('Sessão expirada.');
    if (!file) return null;
    if (file.size > 50 * 1024 * 1024) throw new Error('O arquivo excede 50 MB.');

    const id = crypto.randomUUID();
    const path = `${cid}/${pathPrefix}/${id}/${safeName(file.name)}`;
    const {error: storageError} = await client.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false
    });
    if (storageError) throw storageError;

    const {data: meta, error: metadataError} = await client.from('file_entries').insert({
      id,
      condominium_id: cid,
      folder_id: null,
      storage_path: path,
      name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      visibility,
      created_by: user.id
    }).select().single();

    if (metadataError) {
      await client.storage.from(BUCKET).remove([path]);
      throw metadataError;
    }
    return meta;
  }

  // Financeiro: cria lançamento + vínculo do arquivo na mesma transação do banco.
  window.openFinanceTransactionModal = async function(cid, kind='expense') {
    if (!canFinance(cid)) return flash('Somente o síndico pode alterar o financeiro.');
    const {data: categories, error} = await client.from('finance_categories')
      .select('id,name').eq('condominium_id',cid).eq('kind',kind).eq('is_active',true)
      .order('sort_order').order('name');
    if (error) return flash(error.message);

    const today = localDate();
    modal(`<div class="eyebrow">Novo lançamento</div><h2 style="margin-bottom:16px">${kind==='income'?'Nova receita':'Nova despesa'}</h2><form id="finance-form-hardened" class="form-grid"><div class="field full"><label>Descrição</label><input name="description" required placeholder="Ex.: Conta de energia"></div><div class="field"><label>Categoria</label><select name="category"><option value="">Sem categoria</option>${(categories||[]).map(x=>`<option value="${x.id}">${safe(x.name)}</option>`).join('')}</select></div><div class="field"><label>${kind==='income'?'Pagador / origem':'Fornecedor / favorecido'}</label><input name="counterparty"></div><div class="field"><label>Referência</label><input name="reference"></div><div class="field"><label>Competência</label><input type="month" name="competence" value="${monthValue()}" required></div><div class="field"><label>Emissão</label><input type="date" name="issue" value="${today}"></div><div class="field"><label>Vencimento</label><input type="date" name="due" value="${today}" required></div><div class="field"><label>Valor previsto</label><input name="amount" inputmode="decimal" required placeholder="0,00"></div><div class="field full"><label>Observações</label><textarea name="notes"></textarea></div><div class="field full"><label>Comprovante / boleto / nota <span class="muted">(opcional)</span></label><input type="file" name="file"></div><div class="field full"><button class="btn btn-primary">Salvar lançamento</button></div></form>`);

    const form = document.querySelector('#finance-form-hardened');
    if (!form) return;
    form.onsubmit = async e => {
      e.preventDefault();
      const f = new FormData(form), button = form.querySelector('button');
      const amount = cents(f.get('amount'));
      if (!Number.isFinite(amount) || amount <= 0) return flash('Informe um valor válido.');
      button.disabled = true;
      button.textContent = 'Salvando...';

      const txId = crypto.randomUUID();
      const file = form.elements.file.files?.[0] || null;
      let uploaded = null;
      try {
        if (file) uploaded = await uploadFile({cid, pathPrefix:`finance/${txId}`, file, visibility:'management'});
        const {error: rpcError} = await client.rpc('create_finance_transaction_with_optional_file', {
          p_id: txId,
          p_condominium_id: cid,
          p_kind: kind,
          p_category_id: f.get('category') || null,
          p_description: String(f.get('description') || '').trim(),
          p_counterparty: String(f.get('counterparty') || '').trim() || null,
          p_reference_number: String(f.get('reference') || '').trim() || null,
          p_competence_month: `${f.get('competence')}-01`,
          p_issue_date: f.get('issue') || null,
          p_due_date: f.get('due'),
          p_expected_amount_cents: amount,
          p_notes: String(f.get('notes') || '').trim() || null,
          p_file_entry_id: uploaded?.id || null
        });
        if (rpcError) throw rpcError;
        closeModal();
        flash(file ? 'Lançamento e arquivo salvos.' : 'Lançamento financeiro salvo.');
        window.financePage?.(cid, String(f.get('competence')));
      } catch (err) {
        await removeUploaded(uploaded);
        button.disabled = false;
        button.textContent = 'Salvar lançamento';
        flash(err.message || 'Não foi possível salvar o lançamento.');
      }
    };
  };

  // Financeiro: baixa serializada no banco, impedindo duas baixas simultâneas de ultrapassarem o saldo.
  window.openFinancePaymentModal = async function(id, cid, month) {
    if (!canFinance(cid)) return flash('Somente o síndico pode registrar baixas.');
    const {data: tx, error} = await client.from('finance_transactions').select('*').eq('id',id).eq('condominium_id',cid).single();
    if (error) return flash(error.message);
    const remaining = Math.max(0, Number(tx.expected_amount_cents||0) - Number(tx.paid_amount_cents||0));
    if (!remaining) return flash('Este lançamento não possui saldo pendente.');

    modal(`<div class="eyebrow">Baixa financeira</div><h2 style="margin-bottom:8px">${safe(tx.description)}</h2><p class="muted small" style="margin-bottom:16px">Restante: <strong>${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(remaining/100)}</strong></p><form id="finance-payment-form-hardened" class="form-grid"><div class="field"><label>Valor baixado</label><input name="amount" inputmode="decimal" value="${String((remaining/100).toFixed(2)).replace('.',',')}" required></div><div class="field"><label>Data</label><input type="date" name="date" value="${localDate()}" required></div><div class="field full"><button class="btn btn-primary">Confirmar baixa</button></div></form>`);

    const form = document.querySelector('#finance-payment-form-hardened');
    if (!form) return;
    form.onsubmit = async e => {
      e.preventDefault();
      const f = new FormData(form), button=form.querySelector('button'), amount=cents(f.get('amount'));
      if (!Number.isFinite(amount) || amount <= 0) return flash('Informe um valor válido.');
      if (amount > remaining) return flash('A baixa não pode ultrapassar o saldo restante.');
      button.disabled = true;
      const {error: rpcError} = await client.rpc('record_finance_payment', {
        p_transaction_id: id,
        p_amount_cents: amount,
        p_paid_date: f.get('date')
      });
      if (rpcError) {
        button.disabled = false;
        return flash(rpcError.message || 'Não foi possível registrar a baixa.');
      }
      closeModal();
      flash('Baixa registrada.');
      window.financePage?.(cid, month);
    };
  };

  // Documentos: metadados + versão inicial são criados atomicamente no banco.
  window.openDocumentWorkflowModal = function(cid) {
    if (!canDocuments(cid)) return flash('Sem permissão para cadastrar documentos.');
    modal(`<div class="eyebrow">Novo documento</div><h2 style="margin-bottom:16px">Cadastrar documento</h2><form id="document-workflow-form-hardened" class="form-grid"><div class="field full"><label>Título</label><input name="title" required></div><div class="field"><label>Categoria</label><select name="category"><option>Licenças</option><option>Seguros</option><option>Contratos</option><option>Laudos</option><option>Certificados</option><option>Atas</option><option>Outros</option></select></div><div class="field"><label>Visibilidade</label><select name="visibility"><option value="management">Somente gestão</option><option value="residents">Moradores</option><option value="all">Todos</option></select></div><div class="field"><label>Emissor / fornecedor</label><input name="issuer"></div><div class="field"><label>Número / referência</label><input name="reference"></div><div class="field"><label>Emissão</label><input type="date" name="issue"></div><div class="field"><label>Vencimento</label><input type="date" name="expiry"></div><div class="field full"><label>Tags</label><input name="tags" placeholder="ex.: bombeiros, anual, obrigatório"></div><div class="field full"><label>Observações</label><textarea name="notes"></textarea></div><div class="field full"><label>Arquivo inicial <span class="muted">(opcional)</span></label><input type="file" name="file"></div><div class="field full"><button class="btn btn-primary">Salvar documento</button></div></form>`);

    const form = document.querySelector('#document-workflow-form-hardened');
    if (!form) return;
    form.onsubmit = async e => {
      e.preventDefault();
      const f=new FormData(form), button=form.querySelector('button'), file=form.elements.file.files?.[0]||null;
      button.disabled=true; button.textContent='Salvando...';
      let uploaded=null;
      try {
        if (file) uploaded=await uploadFile({cid,pathPrefix:'documents',file,visibility:f.get('visibility')});
        const {error: rpcError}=await client.rpc('create_document_with_optional_version',{
          p_condominium_id:cid,
          p_title:String(f.get('title')||'').trim(),
          p_category:f.get('category'),
          p_visibility:f.get('visibility'),
          p_issuer:String(f.get('issuer')||'').trim()||null,
          p_reference_number:String(f.get('reference')||'').trim()||null,
          p_issue_date:f.get('issue')||null,
          p_expiry_date:f.get('expiry')||null,
          p_tags:String(f.get('tags')||'').split(',').map(x=>x.trim()).filter(Boolean),
          p_notes:String(f.get('notes')||'').trim()||null,
          p_file_entry_id:uploaded?.id||null
        });
        if (rpcError) throw rpcError;
        closeModal(); flash('Documento cadastrado.'); window.docsPage?.(cid);
      } catch(err) {
        await removeUploaded(uploaded);
        button.disabled=false; button.textContent='Salvar documento';
        flash(err.message||'Não foi possível salvar o documento.');
      }
    };
  };
  window.openDocumentModal = window.openDocumentWorkflowModal;

  // Defesa em profundidade para páginas exclusivas da gestão.
  function protectManagementPage(name) {
    const original=window[name];
    if(typeof original!=='function') return;
    window[name]=function(...args){
      if(!window.CondoAccess?.hasAnyManagementRole()) {
        if(typeof window.renderResidentPortal==='function') return window.renderResidentPortal('home');
        location.hash='#/';
        return;
      }
      return original.apply(this,args);
    };
  }
  protectManagementPage('auditPage');
  protectManagementPage('managementReportsPage');

  // Corrige nomenclatura do denominador da votação e mantém o total de unidades estritamente no condomínio atual.
  const previousAssemblyWorkspace=window.assemblyVotingWorkspace;
  if(typeof previousAssemblyWorkspace==='function') {
    window.assemblyVotingWorkspace=async function(id,cid){
      const result=await previousAssemblyWorkspace(id,cid);
      try {
        const {count}=await client.from('units').select('id',{count:'exact',head:true}).eq('condominium_id',cid);
        const kpi=[...document.querySelectorAll('.kpi-pill')].find(el=>el.querySelector('span')?.textContent?.trim()==='Unidades cadastradas');
        if(kpi&&Number.isFinite(count)) kpi.querySelector('strong').textContent=String(count);
        document.querySelectorAll('.muted.small').forEach(el=>{
          if(el.textContent.includes('votos válidos configurados')) el.textContent=el.textContent.replace('votos válidos configurados','votos registrados');
        });
      } catch(err) { console.warn('[hardening-fixes] assembly workspace',err); }
      return result;
    };
  }
})();