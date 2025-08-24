// cms.js — Admin CMS for Makes & Models + Dealers (localStorage demo)
(function(){
  'use strict';

  /* ========== Auth Guard (admin only) ========== */
  function ensureAuth(){
    const A = window.MotoriaAuth;
    if (A) return A;
    const LS_USERS='motoria_users', LS_SESSION='motoria_session';
    const getUsers=()=>{try{return JSON.parse(localStorage.getItem(LS_USERS)||'[]')}catch(_){return[]}};
    const getSession=()=>{try{return JSON.parse(localStorage.getItem(LS_SESSION)||'null')}catch(_){return null}};
    return { getUsers, getSession };
  }
  const Auth = ensureAuth();
  const session = Auth.getSession?.();
  const users = Auth.getUsers?.() || [];
  const me = session ? (users.find(u=>u.email?.toLowerCase()===session.email?.toLowerCase())||session) : null;

  if (!session){ location.href='auth.html'; return; }
  if ((me?.role||session.role) !== 'admin'){ alert('Admins only'); location.href='dashboard-user.html'; return; }

  // Header basics
  const header=document.getElementById('siteHeader');
  addEventListener('scroll',()=>header?.classList.toggle('elevated', scrollY>6));
  const year=document.getElementById('year'); if (year) year.textContent = new Date().getFullYear();
  const navToggle=document.getElementById('navToggle');
  const navMenu=document.getElementById('navMenu');
  navToggle?.addEventListener('click', ()=>{
    const exp=navToggle.getAttribute('aria-expanded')==='true';
    navToggle.setAttribute('aria-expanded', String(!exp));
    navMenu?.classList.toggle('open');
  });

  // Show admin identity
  document.getElementById('adminName').textContent = me?.name || 'Admin';
  document.getElementById('adminEmail').textContent = me?.email || 'admin@motoria.test';

  /* ========== Storage Keys & Utils ========== */
  const KEY_DRAFT = 'motoria_taxonomy_draft_v1';
  const KEY_LIVE  = 'motoria_taxonomy_v1';

  // Dealers store (admin-managed list; merges known "dealer" users)
  const KEY_DEALERS = 'motoria_dealers_v2'; // v2 for new fields

  const DEFAULT_TAXO = {
    makes: [
      { name:'Kia', models:['Sportage','Ceed','Rio','Stonic'] },
      { name:'Skoda', models:['Octavia','Fabia','Superb','Karoq'] },
      { name:'Hyundai', models:['Ioniq','i10','i20','Tucson'] },
      { name:'Volkswagen', models:['Golf','Polo','Passat','T-Roc'] },
      { name:'BMW', models:['1 Series','3 Series','X1','X3'] },
      { name:'Audi', models:['A3','A4','Q2','Q3'] },
      { name:'Ford', models:['Fiesta','Focus','Puma','Kuga'] },
      { name:'Toyota', models:['Corolla','Yaris','C-HR','RAV4'] }
    ]
  };

  const load = (k,d)=>{ try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d)) }catch(_){ return d } };
  const save = (k,v)=>localStorage.setItem(k, JSON.stringify(v));
  const clone = (o)=>JSON.parse(JSON.stringify(o));

  // On first run, ensure LIVE & DRAFT
  if (!localStorage.getItem(KEY_LIVE)) save(KEY_LIVE, DEFAULT_TAXO);
  if (!localStorage.getItem(KEY_DRAFT)) save(KEY_DRAFT, load(KEY_LIVE, DEFAULT_TAXO));

  // Seed dealers demo if empty
  if (!localStorage.getItem(KEY_DEALERS)) {
    const demo = [
      { id:101, name:'City Cars',  company:'City Cars Ltd',  email:'dealer1@motoria.test', phone:'+44 20 1234 5678', verified:true,  promoted:true,  createdAt: Date.now()-86400000, listings:3, leads:12, notes:'KYC complete.', kycDocs:[{name:'insurance.pdf',ts:Date.now()-86000}] },
      { id:102, name:'North Auto', company:'North Autohaus', email:'dealer2@motoria.test', phone:'+44 161 000 000',  verified:false, promoted:false, createdAt: Date.now()-3600*1000*6, listings:1, leads:3,  notes:'Waiting proof of address.', kycDocs:[] },
    ];
    save(KEY_DEALERS, demo);
  }

  /* ========== Tabs ========== */
  const qs=(s,el=document)=>el.querySelector(s);
  const qsa=(s,el=document)=>[...el.querySelectorAll(s)];

  const panels = {
    taxonomy: qs('#panel-taxonomy'),
    dealers:  qs('#panel-dealers'),
    import:   qs('#panel-import'),
    help:     qs('#panel-help'),
  };
  qsa('.tablink').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      qsa('.tablink').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const view = btn.dataset.view;
      Object.values(panels).forEach(p=>p.classList.remove('active'));
      panels[view].classList.add('active');
      if (view==='dealers') renderDealers();
    });
  });

  /* ========== TAXONOMY (unchanged from previous) ========== */
  const searchMake = qs('#searchMake');
  const makeForm = qs('#makeForm');
  const cancelMakeEdit = qs('#cancelMakeEdit');
  const modelForm = qs('#modelForm');
  const currentMakeEl = qs('#currentMake');
  const addModelBtn = qs('#addModelBtn');
  const makeList = qs('#makeList');
  const modelList = qs('#modelList');
  const publishBtn = qs('#publishBtn');
  const importJson = qs('#importJson');
  const exportJson = qs('#exportJson');

  let data = load(KEY_DRAFT, DEFAULT_TAXO);
  let activeIndex = -1;

  function renderMakes(){
    const q = (searchMake?.value||'').toLowerCase().trim();
    const items = data.makes
      .map((m,i)=>({ ...m, index:i }))
      .filter(m => !q || m.name.toLowerCase().includes(q));

    makeList.innerHTML = items.map(m => `
      <div class="make-item ${m.index===activeIndex?'active':''}" data-index="${m.index}">
        <div>
          <strong>${m.name}</strong>
          <span class="badge-min">${m.models.length} models</span>
        </div>
        <div class="actions">
          <button class="btn-icon" data-act="up" title="Move up">↑</button>
          <button class="btn-icon" data-act="down" title="Move down">↓</button>
          <button class="btn-icon" data-act="edit" title="Edit make">✎</button>
          <button class="btn-icon" data-act="del" title="Delete make">✕</button>
        </div>
      </div>
    `).join('');

    const cur = data.makes[activeIndex];
    currentMakeEl.textContent = cur ? cur.name : '—';
    addModelBtn.disabled = !cur;
    renderModels();
  }
  function renderModels(){
    const cur = data.makes[activeIndex];
    if (!cur){ modelList.innerHTML = `<div class="muted" style="padding:8px">Select a make to manage its models.</div>`; return; }
    modelList.innerHTML = `
      <div class="muted small" style="padding:6px 8px">Models for <strong>${cur.name}</strong></div>
      ${cur.models.map((name,idx)=>`
        <div class="model-item" data-index="${idx}">
          <div>${name}</div>
          <div class="actions">
            <button class="btn-icon" data-act="mup" title="Move up">↑</button>
            <button class="btn-icon" data-act="mdown" title="Move down">↓</button>
            <button class="btn-icon" data-act="medit" title="Rename">✎</button>
            <button class="btn-icon" data-act="mdel" title="Delete">✕</button>
          </div>
        </div>
      `).join('')}
    `;
  }
  renderMakes();

  searchMake?.addEventListener('input', renderMakes);
  makeList?.addEventListener('click', (e)=>{
    const item = e.target.closest('.make-item'); if (!item) return;
    const btn = e.target.closest('button[data-act]'); if (btn) return;
    activeIndex = +item.dataset.index; renderMakes();
  });
  makeList?.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-act]'); if(!btn) return;
    const idx = +btn.closest('.make-item').dataset.index;
    const act = btn.dataset.act;
    if (act==='edit'){ makeForm.index.value=String(idx); makeForm.name.value=data.makes[idx].name; cancelMakeEdit.hidden=false; makeForm.name.focus(); return; }
    if (act==='del'){ if(!confirm('Delete this make and its models?')) return; data.makes.splice(idx,1); if(activeIndex===idx) activeIndex=-1; save(KEY_DRAFT,data); renderMakes(); return; }
    if (act==='up'||act==='down'){ const j=idx+(act==='up'?-1:1); if(j<0||j>=data.makes.length) return; [data.makes[idx],data.makes[j]]=[data.makes[j],data.makes[idx]]; if(activeIndex===idx)activeIndex=j; else if(activeIndex===j)activeIndex=idx; save(KEY_DRAFT,data); renderMakes(); }
  });
  makeForm?.addEventListener('submit', e=>{
    e.preventDefault();
    const fd = new FormData(makeForm);
    const name = String(fd.get('name')||'').trim();
    const hasIndex = fd.get('index');
    if (!name) return;
    const exists = data.makes.some((m,i)=> m.name.toLowerCase()===name.toLowerCase() && String(i)!==String(hasIndex||''));
    if (exists){ alert('That make already exists.'); return; }
    if (hasIndex){ data.makes[+hasIndex].name=name; activeIndex=+hasIndex; }
    else { data.makes.push({name,models:[]}); activeIndex=data.makes.length-1; }
    save(KEY_DRAFT,data); makeForm.reset(); makeForm.index.value=''; cancelMakeEdit.hidden=true; renderMakes();
  });
  cancelMakeEdit?.addEventListener('click', ()=>{ makeForm.reset(); makeForm.index.value=''; cancelMakeEdit.hidden=true; });
  modelForm?.addEventListener('submit', e=>{
    e.preventDefault();
    const cur = data.makes[activeIndex]; if(!cur) return;
    const fd = new FormData(modelForm);
    const model = String(fd.get('model')||'').trim(); if(!model) return;
    if (cur.models.some(m=>m.toLowerCase()===model.toLowerCase())){ alert('That model already exists.'); return; }
    cur.models.push(model); save(KEY_DRAFT,data); modelForm.reset(); renderModels(); renderMakes();
  });
  modelList?.addEventListener('click', e=>{
    const btn=e.target.closest('button[data-act]'); if(!btn) return;
    const act=btn.dataset.act; const idx=+btn.closest('.model-item').dataset.index;
    const cur=data.makes[activeIndex]; if(!cur) return;
    if (act==='mdel'){ if(!confirm('Delete this model?')) return; cur.models.splice(idx,1); save(KEY_DRAFT,data); renderModels(); renderMakes(); return; }
    if (act==='medit'){ const nn=prompt('Rename model:',cur.models[idx]); if(!nn) return; if(cur.models.some((m,i)=>m.toLowerCase()===nn.toLowerCase()&&i!==idx)){ alert('That model name already exists.'); return; } cur.models[idx]=nn.trim(); save(KEY_DRAFT,data); renderModels(); return; }
    if (act==='mup'||act==='mdown'){ const j=idx+(act==='mup'?-1:1); if(j<0||j>=cur.models.length) return; [cur.models[idx],cur.models[j]]=[cur.models[j],cur.models[idx]]; save(KEY_DRAFT,data); renderModels(); }
  });
  publishBtn?.addEventListener('click', ()=>{
    const seen=new Set();
    for(const m of data.makes){ if(!m.name||!Array.isArray(m.models)){ alert('Invalid data.'); return; } const key=m.name.trim().toLowerCase(); if(seen.has(key)){ alert(`Duplicate make: ${m.name}`); return; } seen.add(key); }
    save(KEY_LIVE,data); alert('Published. Front-end dropdowns will use the new taxonomy.');
  });
  exportJson?.addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(load(KEY_DRAFT,DEFAULT_TAXO),null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='motoria-taxonomy.json'; a.click(); URL.revokeObjectURL(url);
  });
  importJson?.addEventListener('change', async (e)=>{
    const file=e.target.files?.[0]; if(!file) return;
    try{
      const text=await file.text(); const json=JSON.parse(text);
      if(!json||!Array.isArray(json.makes)) throw new Error('Invalid file');
      save(KEY_DRAFT,json); data=load(KEY_DRAFT,DEFAULT_TAXO); activeIndex=-1; renderMakes(); alert('Imported to draft. Click Publish to go live.');
    }catch(err){ alert('Import failed: '+err.message); }
    finally{ e.target.value=''; }
  });

  /* ========== DEALERS PANEL (extended) ========== */
  const dealerSearch = qs('#dealerSearch');
  const dealerRows   = qs('#dealerRows');
  const exportDealersCsv = qs('#exportDealersCsv');

  // Modal refs
  const editModal = qs('#editModal');
  const modalClose= qs('#modalClose');
  const modalCancel= qs('#modalCancel');
  const dealerForm= qs('#dealerForm');
  const kycInput  = qs('#kycInput');
  const kycList   = qs('#kycList');

  function getDealerStore(){
    const store = load(KEY_DEALERS, []);
    // Merge users with role 'dealer'
    const fromUsers = (Auth.getUsers?.()||[])
      .filter(u => (u.role||'').toLowerCase()==='dealer')
      .map(u => ({
        id: u.id || (`U${(u.email||'').toLowerCase()}`),
        name: u.name || 'Dealer',
        company: u.company || (u.dealerCompany || ''),
        email: u.email || '',
        phone: u.phone || '',
        verified: !!u.verified,
        promoted: !!u.promoted,
        createdAt: u.createdAt || Date.now(),
        listings: +u.listings || 0,
        leads: +u.leads || 0,
        notes: u.notes || '',
        kycDocs: Array.isArray(u.kycDocs)? u.kycDocs : []
      }));

    // upsert users into store by email
    const byEmail = new Map(store.map(d=>[String(d.email||'').toLowerCase(), d]));
    fromUsers.forEach(d=>{
      const key = String(d.email||'').toLowerCase();
      if (!key) return;
      if (!byEmail.has(key)) {
        store.push(d);
        byEmail.set(key, d);
      } else {
        const tgt = byEmail.get(key);
        Object.assign(tgt, {
          name: d.name||tgt.name,
          company: d.company||tgt.company,
          phone: d.phone||tgt.phone
        });
        if (typeof tgt.verified==='undefined') tgt.verified = !!d.verified;
        if (typeof tgt.promoted==='undefined') tgt.promoted = !!d.promoted;
        tgt.listings = Math.max(+tgt.listings||0, +d.listings||0);
        tgt.leads    = Math.max(+tgt.leads||0, +d.leads||0);
        if (!Array.isArray(tgt.kycDocs)) tgt.kycDocs=[];
      }
    });

    save(KEY_DEALERS, store);
    return store;
  }
  function setDealerStore(list){ save(KEY_DEALERS, list); }

  function pill(bool, yes='Yes', no='No', clsYes='promoted', clsNo=''){ 
    return `<span class="status-pill ${bool?clsYes:clsNo}">${bool?yes:no}</span>`;
  }

  function renderDealers(){
    const q = (dealerSearch?.value||'').toLowerCase().trim();
    const list = getDealerStore()
      .filter(d=>{
        const hay = [d.name,d.company,d.email,d.phone].join(' ').toLowerCase();
        return !q || hay.includes(q);
      })
      .sort((a,b)=> (b.verified - a.verified) || (b.promoted - a.promoted) || String(a.name).localeCompare(String(b.name)));

    if (!list.length){
      dealerRows.innerHTML = `<div class="row"><div class="muted">No dealers found</div></div>`;
      return;
    }

    dealerRows.innerHTML = list.map(d=>`
      <div class="row" data-email="${(d.email||'').toLowerCase()}">
        <div><div class="dealer-name">${d.name||'—'}</div></div>
        <div>${d.company||'—'}</div>
        <div>${d.email||'—'}</div>
        <div>${d.phone||'—'}</div>
        <div><span class="status-pill ${d.verified?'verified':'unverified'}">${d.verified?'Verified':'Unverified'}</span></div>
        <div>${pill(!!d.promoted,'Promoted','—','promoted')}</div>
        <div>${+d.leads||0}</div>
        <div class="actions">
          <button class="btn btn-ghost" data-act="toggle">${d.verified?'Unverify':'Verify'}</button>
          <button class="btn btn-ghost" data-act="promote">${d.promoted?'Unpromote':'Promote'}</button>
          <button class="btn btn-ghost" data-act="recount">Recount leads</button>
          <button class="btn btn-ghost" data-act="edit">Edit</button>
          <a class="btn btn-ghost" href="results.html?dealer=${encodeURIComponent(d.company||d.name||'')}" target="_blank" rel="noopener">View listings</a>
          <a class="btn btn-ghost" href="mailto:${d.email||''}">Email</a>
          <button class="btn btn-primary" data-act="remove">Remove</button>
        </div>
      </div>
    `).join('');
  }
  renderDealers();

  dealerSearch?.addEventListener('input', renderDealers);

  // Recount leads by scanning a known listings store (best-effort)
  function recountLeadsFor(email){
    const keyCandidates = ['motoria_listings_all','motoria_listings','motoria_inventory','motoria_listings_demo'];
    let total = 0, found = false;
    for (const k of keyCandidates){
      try{
        const arr = JSON.parse(localStorage.getItem(k)||'[]');
        if (Array.isArray(arr) && arr.length){
          const sum = arr
            .filter(i => ((i.sellerEmail||i.dealerEmail||'').toLowerCase() === email))
            .reduce((s,i)=> s + (+i.leads||0), 0);
          total = Math.max(total, sum);
          found = true;
        }
      }catch{}
    }
    return { found, total };
  }

  // Modal helpers
  function openModal(){ editModal.classList.add('open'); editModal.setAttribute('aria-hidden','false'); }
  function closeModal(){ editModal.classList.remove('open'); editModal.setAttribute('aria-hidden','true'); dealerForm.reset(); kycList.innerHTML=''; }

  dealerRows?.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-act]'); if(!btn) return;
    const act = btn.dataset.act;
    const row = btn.closest('.row'); const email = row?.dataset.email;
    if (!email) return;
    const list = getDealerStore();
    const d = list.find(x => String(x.email||'').toLowerCase()===email);
    if (!d) return;

    if (act==='toggle'){
      d.verified = !d.verified;
      setDealerStore(list); renderDealers(); return;
    }
    if (act==='promote'){
      d.promoted = !d.promoted;
      setDealerStore(list); renderDealers(); return;
    }
    if (act==='recount'){
      const {found,total} = recountLeadsFor(email);
      if (found){ d.leads = total; setDealerStore(list); renderDealers(); alert(`Leads updated to ${total}.`); }
      else { alert('No compatible listings store found. Ensure listings have dealerEmail / sellerEmail.'); }
      return;
    }
    if (act==='edit'){
      // Fill modal
      dealerForm.email.value = d.email||'';
      dealerForm['email_view'].value = d.email||'';
      dealerForm.name.value = d.name||'';
      dealerForm.company.value = d.company||'';
      dealerForm.phone.value = d.phone||'';
      dealerForm.promoted.checked = !!d.promoted;
      dealerForm.notes.value = d.notes||'';
      // KYC list
      kycList.innerHTML = (d.kycDocs||[]).map((f,i)=>`
        <li data-i="${i}">
          <span>${f.name}</span>
          <button class="btn-icon" data-act="kyc-del" title="Remove">✕</button>
        </li>
      `).join('');
      openModal();
      return;
    }
    if (act==='remove'){
      if (!confirm('Remove this dealer from the CMS list? (This does not delete the user account)')) return;
      const next = list.filter(x => String(x.email||'').toLowerCase()!==email);
      setDealerStore(next); renderDealers(); return;
    }
  });

  // Modal events
  modalClose?.addEventListener('click', closeModal);
  modalCancel?.addEventListener('click', closeModal);
  editModal?.addEventListener('click', (e)=>{ if (e.target === editModal) closeModal(); });
  kycList?.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-act="kyc-del"]'); if(!btn) return;
    const idx = +btn.closest('li').dataset.i;
    const email = dealerForm.email.value.toLowerCase();
    const list = getDealerStore();
    const d = list.find(x => String(x.email||'').toLowerCase()===email); if(!d) return;
    (d.kycDocs||[]).splice(idx,1);
    setDealerStore(list);
    // re-render within modal
    kycList.innerHTML = (d.kycDocs||[]).map((f,i)=>`
      <li data-i="${i}">
        <span>${f.name}</span>
        <button class="btn-icon" data-act="kyc-del" title="Remove">✕</button>
      </li>
    `).join('');
  });

  kycInput?.addEventListener('change', ()=>{
    const email = dealerForm.email.value.toLowerCase();
    const list = getDealerStore();
    const d = list.find(x => String(x.email||'').toLowerCase()===email); if(!d) return;
    if (!Array.isArray(d.kycDocs)) d.kycDocs=[];
    const files = [...(kycInput.files||[])];
    files.forEach(f=> d.kycDocs.push({ name:f.name, ts: Date.now() }));
    setDealerStore(list);
    kycInput.value='';
    kycList.innerHTML = d.kycDocs.map((f,i)=>`
      <li data-i="${i}">
        <span>${f.name}</span>
        <button class="btn-icon" data-act="kyc-del" title="Remove">✕</button>
      </li>
    `).join('');
  });

  dealerForm?.addEventListener('submit', (e)=>{
    e.preventDefault();
    const fd = new FormData(dealerForm);
    const email = String(fd.get('email')||'').toLowerCase();
    const list = getDealerStore();
    const d = list.find(x => String(x.email||'').toLowerCase()===email); if(!d) return;

    d.name = String(fd.get('name')||'').trim();
    d.company = String(fd.get('company')||'').trim();
    d.phone = String(fd.get('phone')||'').trim();
    d.promoted = !!fd.get('promoted');
    d.notes = String(fd.get('notes')||'').trim();

    setDealerStore(list);
    renderDealers();
    closeModal();
  });

  // Export CSV
  function dealersToCSV(items){
    const cols = ['name','company','email','phone','verified','promoted','listings','leads','createdAt','notes','kyc'];
    const esc = v => `"${String(v??'').replace(/"/g,'""')}"`;
    return [cols.join(',')].concat(items.map(d=>{
      const kyc = (d.kycDocs||[]).map(x=>x.name).join('; ');
      return cols.map(k=>{
        if (k==='kyc') return esc(kyc);
        return esc(d[k]);
      }).join(',');
    })).join('\n');
  }
  exportDealersCsv?.addEventListener('click', ()=>{
    const csv = dealersToCSV(getDealerStore());
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'dealers.csv'; a.click();
    URL.revokeObjectURL(url);
  });

})();