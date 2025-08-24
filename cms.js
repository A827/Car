// cms.js — Admin CMS for Makes & Models (localStorage demo)
(function(){
  'use strict';

  /* ========== Auth Guard (admin only) ========== */
  function ensureAuth(){
    if (window.MotoriaAuth) return window.MotoriaAuth;
    const LS_USERS='motoria_users', LS_SESSION='motoria_session';
    const getUsers=()=>{try{return JSON.parse(localStorage.getItem(LS_USERS)||'[]')}catch(_){return[]}};
    const setUsers=u=>localStorage.setItem(LS_USERS, JSON.stringify(u));
    const getSession=()=>{try{return JSON.parse(localStorage.getItem(LS_SESSION)||'null')}catch(_){return null}};
    if(!localStorage.getItem(LS_USERS)){
      setUsers([
        {name:'Admin',email:'admin@motoria.test',pass:'motoria123',role:'admin'},
        {name:'Demo User',email:'user@motoria.test',pass:'demo123',role:'user'}
      ]);
    }
    console.warn('[cms] using fallback auth');
    return { getUsers, getSession };
  }
  const Auth = ensureAuth();
  const session = Auth.getSession();
  if (!session){ location.href='auth.html'; return; }
  if (session.role!=='admin'){ alert('Admins only'); location.href='dashboard-user.html'; return; }

  // Header basics
  const header=document.getElementById('siteHeader');
  addEventListener('scroll',()=>header.classList.toggle('elevated', scrollY>6));
  const year=document.getElementById('year'); if (year) year.textContent = new Date().getFullYear();
  const navToggle=document.getElementById('navToggle');
  const navMenu=document.getElementById('navMenu');
  navToggle?.addEventListener('click', ()=>{
    const exp=navToggle.getAttribute('aria-expanded')==='true';
    navToggle.setAttribute('aria-expanded', String(!exp));
    navMenu?.classList.toggle('open');
  });

  // Show admin user
  document.getElementById('adminName').textContent = session.name || 'Admin';
  document.getElementById('adminEmail').textContent = session.email || '';

  /* ========== Storage Keys & Utils ========== */
  const KEY_DRAFT = 'motoria_taxonomy_draft_v1';  // editable working copy
  const KEY_LIVE  = 'motoria_taxonomy_v1';        // published version (site uses this)
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

  // On first run, ensure LIVE exists
  if (!localStorage.getItem(KEY_LIVE)) save(KEY_LIVE, DEFAULT_TAXO);
  // Start with DRAFT = LIVE (unless a draft already exists)
  if (!localStorage.getItem(KEY_DRAFT)) save(KEY_DRAFT, load(KEY_LIVE, DEFAULT_TAXO));

  /* ========== State & Elements ========== */
  const qs=(s,el=document)=>el.querySelector(s);
  const qsa=(s,el=document)=>[...el.querySelectorAll(s)];

  const panels = {
    taxonomy: qs('#panel-taxonomy'),
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
    });
  });

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
  let activeIndex = -1; // which make is selected

  /* ========== Rendering ========== */
  function renderMakes(){
    const q = (searchMake.value||'').toLowerCase().trim();
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

    // Update selected label & model UI state
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

  /* ========== Interactions ========== */
  searchMake.addEventListener('input', renderMakes);

  // Select make
  makeList.addEventListener('click', (e)=>{
    const item = e.target.closest('.make-item'); 
    if (!item) return;
    const idx = +item.dataset.index;

    // If action button is clicked, don’t just select
    const btn = e.target.closest('button[data-act]');
    if (btn) return; // handled in separate listener

    activeIndex = idx;
    renderMakes();
  });

  // Make actions
  makeList.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-act]'); if(!btn) return;
    const row = btn.closest('.make-item'); const idx = +row.dataset.index;
    const act = btn.dataset.act;

    if (act==='edit'){
      // fill form
      makeForm.index.value = String(idx);
      makeForm.name.value = data.makes[idx].name;
      cancelMakeEdit.hidden = false;
      makeForm.name.focus();
      return;
    }
    if (act==='del'){
      if (!confirm('Delete this make and all its models?')) return;
      data.makes.splice(idx,1);
      if (activeIndex===idx) activeIndex=-1;
      save(KEY_DRAFT, data); renderMakes(); return;
    }
    if (act==='up' || act==='down'){
      const dir = act==='up' ? -1 : 1;
      const j = idx + dir;
      if (j<0 || j>=data.makes.length) return;
      const tmp = data.makes[idx];
      data.makes[idx] = data.makes[j];
      data.makes[j] = tmp;
      if (activeIndex===idx) activeIndex=j;
      else if (activeIndex===j) activeIndex=idx;
      save(KEY_DRAFT, data); renderMakes(); return;
    }
  });

  // Add / update make
  makeForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const fd = new FormData(makeForm);
    const name = String(fd.get('name')||'').trim();
    const hasIndex = fd.get('index');
    if (!name) return;

    // prevent duplicates (case-insensitive)
    const exists = data.makes.some((m,i)=> m.name.toLowerCase()===name.toLowerCase() && String(i)!==String(hasIndex||''));
    if (exists){ alert('That make already exists.'); return; }

    if (hasIndex){
      data.makes[+hasIndex].name = name;
      activeIndex = +hasIndex;
    } else {
      data.makes.push({ name, models: [] });
      activeIndex = data.makes.length - 1;
    }
    save(KEY_DRAFT, data);
    makeForm.reset(); makeForm.index.value=''; cancelMakeEdit.hidden = true;
    renderMakes();
  });

  cancelMakeEdit.addEventListener('click', ()=>{
    makeForm.reset(); makeForm.index.value=''; cancelMakeEdit.hidden=true;
  });

  // Add model
  modelForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const cur = data.makes[activeIndex]; if (!cur) return;
    const fd = new FormData(modelForm);
    const model = String(fd.get('model')||'').trim();
    if (!model) return;
    const exists = cur.models.some(m=>m.toLowerCase()===model.toLowerCase());
    if (exists){ alert('That model already exists for this make.'); return; }
    cur.models.push(model);
    save(KEY_DRAFT, data);
    modelForm.reset();
    renderModels(); renderMakes();
  });

  // Model actions
  modelList.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-act]'); if(!btn) return;
    const act = btn.dataset.act;
    const row = btn.closest('.model-item'); const idx = +row.dataset.index;
    const cur = data.makes[activeIndex]; if (!cur) return;

    if (act==='mdel'){
      if (!confirm('Delete this model?')) return;
      cur.models.splice(idx,1);
      save(KEY_DRAFT, data); renderModels(); renderMakes(); return;
    }
    if (act==='medit'){
      const newName = prompt('Rename model:', cur.models[idx]);
      if (!newName) return;
      if (cur.models.some((m,i)=>m.toLowerCase()===newName.toLowerCase() && i!==idx)){
        alert('That model name already exists.'); return;
      }
      cur.models[idx] = newName.trim();
      save(KEY_DRAFT, data); renderModels(); return;
    }
    if (act==='mup' || act==='mdown'){
      const dir = act==='mup' ? -1 : 1;
      const j = idx + dir;
      if (j<0 || j>=cur.models.length) return;
      const tmp = cur.models[idx];
      cur.models[idx] = cur.models[j];
      cur.models[j] = tmp;
      save(KEY_DRAFT, data); renderModels(); return;
    }
  });

  // Publish (copy DRAFT -> LIVE)
  publishBtn.addEventListener('click', ()=>{
    // simple validation: no empty names, unique makes, models arrays are arrays
    const seen = new Set();
    for (const m of data.makes){
      if (!m.name || !Array.isArray(m.models)){ alert('Invalid data shape.'); return; }
      const key = m.name.trim().toLowerCase();
      if (seen.has(key)){ alert(`Duplicate make: ${m.name}`); return; }
      seen.add(key);
    }
    save(KEY_LIVE, data);
    alert('Published. Front-end dropdowns will use the new taxonomy.');
  });

  // Export
  exportJson.addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(load(KEY_DRAFT, DEFAULT_TAXO), null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'motoria-taxonomy.json'; a.click();
    URL.revokeObjectURL(url);
  });

  // Import
  importJson.addEventListener('change', async (e)=>{
    const file = e.target.files?.[0]; if(!file) return;
    try{
      const text = await file.text();
      const json = JSON.parse(text);
      if (!json || !Array.isArray(json.makes)) throw new Error('Invalid file');
      save(KEY_DRAFT, json);
      data = load(KEY_DRAFT, DEFAULT_TAXO);
      activeIndex = -1;
      renderMakes();
      alert('Imported to draft. Review and click Publish to go live.');
    } catch(err){
      alert('Import failed: ' + err.message);
    } finally {
      e.target.value='';
    }
  });

})();