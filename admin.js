// admin.js — simple Admin CMS (taxonomy + dealers) with localStorage
(function(){
  'use strict';

  // Auth guard: admin only
  const Auth = window.MotoriaAuth;
  const session = Auth?.getSession?.();
  if (!session) { location.href = 'auth.html'; return; }
  if (session.role !== 'admin') { alert('Admin access only'); location.href='index.html'; return; }

  // Header basics
  const header = document.getElementById('siteHeader');
  addEventListener('scroll',()=>header.classList.toggle('elevated', scrollY>6));
  const yearEl = document.getElementById('year'); if (yearEl) yearEl.textContent = new Date().getFullYear();

  const qs = (s,el=document)=>el.querySelector(s);
  const qsa= (s,el=document)=>Array.from(el.querySelectorAll(s));

  // Panels nav
  const panels = {
    taxonomy: qs('#panel-taxonomy'),
    dealers: qs('#panel-dealers'),
    settings: qs('#panel-settings'),
  };
  qsa('.navbtn').forEach(b=>{
    b.addEventListener('click', ()=>{
      qsa('.navbtn').forEach(n=>n.classList.remove('active'));
      b.classList.add('active');
      Object.values(panels).forEach(p=>p.classList.remove('active'));
      panels[b.dataset.view].classList.add('active');
    });
  });

  // -------- Taxonomy --------
  const KEY_TAXO = 'motoria_taxonomy_v1';

  function loadTaxo(){
    try { return JSON.parse(localStorage.getItem(KEY_TAXO)) || { makes: [] }; }
    catch { return { makes: [] }; }
  }
  function saveTaxo(t){ localStorage.setItem(KEY_TAXO, JSON.stringify(t)); }

  let taxo = loadTaxo();
  let currentMake = null;

  const makeInput = qs('#makeInput');
  const modelInput= qs('#modelInput');
  const addMake   = qs('#addMake');
  const addModel  = qs('#addModel');
  const makeList  = qs('#makeList');
  const modelList = qs('#modelList');
  const saveBtn   = qs('#saveTaxo');
  const msg       = qs('#taxoMsg');

  function renderMakes(){
    makeList.innerHTML = taxo.makes.map(m=>`
      <li data-make="${m.name}">
        <span><strong>${m.name}</strong> <span class="small muted">(${m.models.length} models)</span></span>
        <span class="row">
          <button class="btn btn-ghost" data-act="select">Edit models</button>
          <button class="btn" data-act="del">Delete</button>
        </span>
      </li>
    `).join('');
  }
  function renderModels(){
    const m = taxo.makes.find(x=>x.name===currentMake);
    modelList.innerHTML = m ? m.models.map(md=>`
      <li data-model="${md}">
        <span>${md}</span>
        <span class="row">
          <button class="btn" data-act="del-model">Delete</button>
        </span>
      </li>
    `).join('') : '';
    addModel.disabled = !m;
    modelInput.placeholder = m ? `New model for ${m.name}` : 'Select a make first';
  }

  addMake.addEventListener('click', ()=>{
    const name = (makeInput.value||'').trim();
    if (!name) return;
    if (taxo.makes.some(x=>x.name.toLowerCase()===name.toLowerCase())) { alert('Make exists'); return; }
    taxo.makes.push({ name, models: [] });
    makeInput.value='';
    renderMakes();
  });

  makeList.addEventListener('click', (e)=>{
    const li = e.target.closest('li[data-make]'); if(!li) return;
    const name = li.dataset.make;
    const act = e.target.dataset.act;
    if (act==='select'){ currentMake = name; renderModels(); }
    if (act==='del'){
      if (!confirm(`Delete make "${name}" and its models?`)) return;
      taxo.makes = taxo.makes.filter(x=>x.name!==name);
      if (currentMake===name) currentMake=null;
      renderMakes(); renderModels();
    }
  });

  addModel.addEventListener('click', ()=>{
    const m = taxo.makes.find(x=>x.name===currentMake);
    if (!m) return;
    const md = (modelInput.value||'').trim();
    if (!md) return;
    if (m.models.some(x=>x.toLowerCase()===md.toLowerCase())){ alert('Model exists'); return; }
    m.models.push(md);
    modelInput.value='';
    renderModels();
  });

  modelList.addEventListener('click', (e)=>{
    const li = e.target.closest('li[data-model]'); if(!li) return;
    const md = li.dataset.model;
    if (e.target.dataset.act==='del-model'){
      const m = taxo.makes.find(x=>x.name===currentMake); if(!m) return;
      m.models = m.models.filter(x=>x!==md);
      renderModels();
    }
  });

  saveBtn.addEventListener('click', ()=>{
    saveTaxo(taxo);
    msg.textContent = 'Saved.';
    setTimeout(()=>msg.textContent='',1500);
  });

  renderMakes(); renderModels();

  // -------- Dealers --------
  const KEY_DEALERS = 'motoria_dealers';
  const dealerForm = qs('#dealerForm');
  const dealerTable= qs('#dealerTable');

  function loadDealers(){ try { return JSON.parse(localStorage.getItem(KEY_DEALERS)) || []; } catch { return []; } }
  function saveDealers(d){ localStorage.setItem(KEY_DEALERS, JSON.stringify(d)); }
  function renderDealers(){
    const list = loadDealers();
    dealerTable.innerHTML = `
      <div class="row head">
        <div>Name</div><div>Email</div><div>Phone</div><div>Location</div><div class="actions">Actions</div>
      </div>
      ${list.map(d=>`
        <div class="row" data-id="${d.id}">
          <div>${d.name} ${d.verified?'<span class="badge">Verified</span>':''}</div>
          <div>${d.email||'—'}</div>
          <div>${d.phone||'—'}</div>
          <div>${d.loc||'—'}</div>
          <div class="actions">
            <button class="btn btn-ghost" data-act="verify">${d.verified?'Unverify':'Verify'}</button>
            <button class="btn btn" data-act="del">Delete</button>
          </div>
        </div>
      `).join('')}
    `;
  }
  dealerForm.addEventListener('submit', e=>{
    e.preventDefault();
    const fd = new FormData(dealerForm);
    const d = {
      id: Date.now(),
      name: String(fd.get('name')||'').trim(),
      email:String(fd.get('email')||'').trim(),
      phone:String(fd.get('phone')||'').trim(),
      loc:  String(fd.get('loc')||'').trim(),
      verified: String(fd.get('verified'))==='true'
    };
    if (!d.name || !d.email){ alert('Name and email required'); return; }
    const list = loadDealers();
    list.unshift(d);
    saveDealers(list);
    dealerForm.reset();
    renderDealers();
  });
  dealerTable.addEventListener('click', e=>{
    const row = e.target.closest('.row[data-id]'); if(!row) return;
    const id = +row.dataset.id;
    const act = e.target.dataset.act;
    const list = loadDealers();
    const item = list.find(x=>x.id===id);
    if (!item) return;
    if (act==='verify'){ item.verified = !item.verified; saveDealers(list); renderDealers(); }
    if (act==='del'){ if(!confirm('Delete dealer?')) return; saveDealers(list.filter(x=>x.id!==id)); renderDealers(); }
  });
  renderDealers();

  // Mobile nav
  const navToggle=document.getElementById('navToggle');
  const navMenu=document.getElementById('navMenu');
  navToggle?.addEventListener('click', ()=>{
    const exp = navToggle.getAttribute('aria-expanded')==='true';
    navToggle.setAttribute('aria-expanded', String(!exp));
    navMenu.classList.toggle('open');
  });
})();