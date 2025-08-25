// dealer.js — Dealer dashboard controller (streamlined add listing + taxonomy)
(function(){
  'use strict';

  // Auth guard
  const Auth = window.MotoriaAuth;
  const session = Auth?.getSession?.();
  if (!session) { location.href = 'auth.html?next=dashboard-dealer.html'; return; }

  // Header basics
  const header = document.getElementById('siteHeader');
  addEventListener('scroll',()=>header.classList.toggle('elevated', scrollY>6));
  const year = document.getElementById('year'); if (year) year.textContent = new Date().getFullYear();
  document.getElementById('dealerName').textContent = session.name || 'Dealer';
  document.getElementById('dealerEmail').textContent = session.email || '';

  // Helpers
  const qs =(s,el=document)=>el.querySelector(s);
  const qsa=(s,el=document)=>[].slice.call(el.querySelectorAll(s));
  const GBP = n => new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(+n||0);
  const KM  = n => `${(+n||0).toLocaleString('en-GB')} km`;
  const load = (k, d)=>{ try{return JSON.parse(localStorage.getItem(k) || JSON.stringify(d))}catch(e){return d} };
  const save = (k, v)=>localStorage.setItem(k, JSON.stringify(v));
  const uid  = ()=>Math.floor(1e6 + Math.random()*9e6);

  const KEYS = {
    INV: 'motoria_listings',
    MSGS: 'motoria_messages_dealer',
    SETTINGS: 'motoria_dealer_settings',
  };

  // Seed demo if empty
  (function seed(){
    const inv = load(KEYS.INV, []);
    if (!inv.length){
      save(KEYS.INV, [
        { id: uid(), title:'Kia Sportage 1.6 T‑GDi', price:19900, year:2021, km:29000, fuel:'Petrol', gearbox:'Manual', img:'assets/cars/sportage.jpg', loc:'London', status:'live', views:412, leads:8, ts: Date.now() - 86400000, dealer: session.name, dealerEmail: session.email, dealerVerified:true, dealerPromoted:true },
        { id: uid(), title:'Skoda Octavia 1.6 TDI',  price: 9900, year:2016, km:99000, fuel:'Diesel', gearbox:'Manual', img:'assets/cars/octavia.jpg',  loc:'Leicester', status:'live', views:231, leads:4, ts: Date.now() - 172800000, dealer: session.name, dealerEmail: session.email, dealerVerified:true },
        { id: uid(), title:'Hyundai Ioniq Hybrid',   price:15800, year:2018, km:62000, fuel:'Hybrid', gearbox:'Automatic', img:'assets/cars/ioniq.jpg',   loc:'Cardiff', status:'draft', views:188, leads:2, ts: Date.now() - 3600000, dealer: session.name, dealerEmail: session.email }
      ]);
    }
    if (!localStorage.getItem(KEYS.MSGS)){
      save(KEYS.MSGS, [
        { id:1, with:'Ali A.', subject:'Kia Sportage viewing', msgs:[
          { from:'Ali A.', text:'Is it available on Saturday?', ts: Date.now()-7200000 }
        ], unread:true }
      ]);
    }
    if (!localStorage.getItem(KEYS.SETTINGS)){
      save(KEYS.SETTINGS, { dealerName: session.name || 'City Cars', dealerEmail: session.email || 'dealer@motoria.test', dealerPhone: '' });
    }
  })();

  // Panels
  const panels = {
    overview: qs('#panel-overview'),
    inventory: qs('#panel-inventory'),
    add: qs('#panel-add'),
    messages: qs('#panel-messages'),
    settings: qs('#panel-settings'),
  };
  qsa('.tablink').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      qsa('.tablink').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const view = btn.dataset.view;
      Object.values(panels).forEach(p=>p.classList.remove('active'));
      panels[view].classList.add('active');
      if (view==='overview') renderOverview();
      if (view==='inventory') renderInventory();
      if (view==='messages') renderThreads();
      if (view==='settings') loadSettings();
    });
  });
  qsa('[data-switch="add"]').forEach(a=>a.addEventListener('click', (e)=>{ e.preventDefault(); qs('[data-view="add"]').click(); }));

  // ===== Overview =====
  function kpi(inv){
    const active = inv.filter(i=>i.status==='live').length;
    const views = inv.reduce((s,i)=>s+(+i.views||0),0);
    const leads = inv.reduce((s,i)=>s+(+i.leads||0),0);
    qs('#kpiActive').textContent = active;
    qs('#kpiViews').textContent = views.toLocaleString('en-GB');
    qs('#kpiLeads').textContent = leads.toLocaleString('en-GB');
  }
  function tableHead(){
    return `
      <div class="row head">
        <div>Title</div><div>Price</div><div>Year</div><div>Mileage</div>
        <div>Status</div><div>Views</div><div class="actions">Actions</div>
      </div>
    `;
  }
  function rowHTML(i){
    return `
      <div class="row" data-id="${i.id}">
        <div>
          <div style="display:flex;gap:8px;align-items:center">
            <img class="col-img" src="${i.img||''}" alt="" onerror="this.style.background='#eff3ff';this.removeAttribute('src')">
            <div>
              <div style="font-weight:700">${i.title}</div>
              <div class="muted small">${i.fuel||'—'} • ${i.gearbox||'—'} • ${i.loc||'—'}</div>
            </div>
          </div>
        </div>
        <div>${GBP(i.price)}</div>
        <div>${i.year||''}</div>
        <div>${KM(i.km||0)}</div>
        <div>
          <select data-act="status">
            <option value="live" ${i.status==='live'?'selected':''}>Live</option>
            <option value="draft" ${i.status==='draft'?'selected':''}>Draft</option>
            <option value="sold" ${i.status==='sold'?'selected':''}>Sold</option>
          </select>
        </div>
        <div>${(+i.views||0).toLocaleString('en-GB')}</div>
        <div class="actions">
          <button class="btn btn-ghost" data-act="view">View</button>
          <button class="btn btn-ghost" data-act="edit">Edit</button>
          <button class="btn btn-primary" data-act="del">Delete</button>
        </div>
      </div>
    `;
  }
  function renderRecent(inv){ const sorted=[...inv].sort((a,b)=>b.ts-a.ts).slice(0,5); qs('#tableRecent').innerHTML = tableHead()+sorted.map(rowHTML).join(''); }
  function renderOverview(){ const inv = load(KEYS.INV, []); kpi(inv); renderRecent(inv); }
  renderOverview();

  // ===== Inventory =====
  const invSearch = qs('#invSearch');
  const invStatus = qs('#invStatus');
  function filterInv(list){
    const q = (invSearch?.value||'').toLowerCase().trim();
    const st = (invStatus?.value||'').toLowerCase();
    return list.filter(i=>{
      const hay = [i.title,i.loc].join(' ').toLowerCase();
      if (q && !hay.includes(q)) return false;
      if (st && (i.status||'').toLowerCase()!==st) return false;
      return true;
    });
  }
  function renderInventory(){
    const inv = load(KEYS.INV, []);
    const filtered = filterInv(inv);
    qs('#tableInventory').innerHTML = tableHead()+filtered.map(rowHTML).join('');
  }
  invSearch?.addEventListener('input', renderInventory);
  invStatus?.addEventListener('change', renderInventory);

  qs('#tableInventory')?.addEventListener('change', (e)=>{
    const sel = e.target.closest('select[data-act="status"]'); if(!sel) return;
    const row = sel.closest('.row'); const id = +row.dataset.id;
    const inv = load(KEYS.INV, []);
    const item = inv.find(x=>x.id===id); if(!item) return;
    item.status = sel.value;
    save(KEYS.INV, inv); renderOverview();
  });
  qs('#tableInventory')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-act]'); if(!btn) return;
    const row = btn.closest('.row'); const id = +row.dataset.id;
    const inv = load(KEYS.INV, []);
    const item = inv.find(x=>x.id===id); if (!item) return;
    const act = btn.dataset.act;
    if (act==='view'){ location.href = `detail.html?id=${id}`; return; }
    if (act==='edit'){ fillForm(item); qs('[data-view="add"]').click(); return; }
    if (act==='del'){
      if (!confirm('Delete this listing?')) return;
      save(KEYS.INV, inv.filter(x=>x.id!==id)); renderInventory(); renderOverview();
    }
  });

  // ===== Add/Edit Listing (with taxonomy + preview) =====
  const form = qs('#listingForm');
  const addTitle = qs('#addTitle');
  const cancelEdit = qs('#cancelEdit');
  const formMsg = qs('#formMsg');

  // Taxonomy dropdowns
  (function hydrateTaxonomy(){
    const MD = window.MotoriaData || {};
    const makeSel = qs('#makeSel');
    const modelSel = qs('#modelSel');
    if (MD.getTaxonomy && MD.modelsForMake){
      const taxo = MD.getTaxonomy();
      makeSel.innerHTML = '<option value="">Make</option>' + taxo.makes.map(m=>`<option value="${m.name}">${m.name}</option>`).join('');
      function refresh(){
        const models = makeSel.value ? MD.modelsForMake(makeSel.value) : [];
        modelSel.disabled = !makeSel.value;
        modelSel.innerHTML = '<option value="">Model</option>' + models.map(x=>`<option value="${x}">${x}</option>`).join('');
      }
      makeSel.addEventListener('change', refresh);
      refresh();
    } else {
      makeSel.innerHTML = '<option>Kia</option><option>Skoda</option><option>Hyundai</option><option>Volkswagen</option><option>BMW</option><option>Audi</option><option>Ford</option><option>Toyota</option>';
    }
  })();

  // Live preview
  const prevImg   = qs('#prevImg');
  const prevTitle = qs('#prevTitle');
  const prevMeta  = qs('#prevMeta');
  const prevPrice = qs('#prevPrice');
  function updatePreview(){
    const f = form;
    prevTitle.textContent = f.title.value || 'Title appears here';
    const bits = [];
    if (f.year.value) bits.push(f.year.value);
    if (f.km.value) bits.push(KM(+f.km.value||0));
    if (f.fuel.value) bits.push(f.fuel.value);
    if (f.gearbox.value) bits.push(f.gearbox.value);
    prevMeta.textContent = bits.join(' • ') || 'Year • Mileage • Fuel • Gearbox';
    prevPrice.textContent = GBP(+f.price.value||0);
    const src = f.img.value.trim();
    if (src){ prevImg.src = src; prevImg.onerror = ()=>{ prevImg.removeAttribute('src'); prevImg.style.background='#eff3ff'; }; }
  }
  form.addEventListener('input', updatePreview);

  function fillForm(i){
    addTitle.textContent = 'Edit listing';
    cancelEdit.hidden = false;
    form.make.value    = i.make || '';
    form.model.value   = i.model || '';
    // ensure taxonomy dropdown is synced
    if (form.make.value) qs('#makeSel').dispatchEvent(new Event('change'));
    setTimeout(()=>{ form.model.value = i.model || ''; }, 0);

    form.title.value   = i.title||'';
    form.price.value   = i.price||'';
    form.year.value    = i.year||'';
    form.km.value      = i.km||'';
    form.fuel.value    = i.fuel||'Petrol';
    form.gearbox.value = i.gearbox||'Manual';
    form.loc.value     = i.loc||'';
    form.status.value  = i.status||'live';
    form.img.value     = i.img||'';
    form.colour.value  = i.colour||'';
    form.owners.value  = i.owners||'';
    form.desc.value    = i.desc||'';
    form.id.value      = i.id||'';
    updatePreview();
  }
  function clearForm(){
    addTitle.textContent = 'Add listing';
    cancelEdit.hidden = true;
    form.reset();
    form.id.value='';
    prevImg.removeAttribute('src'); prevImg.style.background='#eef2ff';
    updatePreview();
  }
  cancelEdit?.addEventListener('click', clearForm);

  form?.addEventListener('submit', (e)=>{
    e.preventDefault();
    formMsg.style.display='none';
    const d = Object.fromEntries(new FormData(form).entries());

    // simple validation
    const required = ['make','model','year','price','title','img'];
    const missing = required.filter(k=>!String(d[k]||'').trim());
    if (missing.length){
      formMsg.textContent = `Please fill required fields: ${missing.join(', ')}`;
      formMsg.style.display='block';
      return;
    }

    const inv = load(KEYS.INV, []);
    const isEdit = !!d.id;
    const existing = isEdit ? inv.find(x=>x.id==d.id) : null;

    const payload = {
      id: isEdit ? +d.id : uid(),
      make: d.make,
      model: d.model,
      title: d.title.trim(),
      price: +d.price||0,
      year: +d.year||0,
      km: +d.km||0,
      fuel: d.fuel,
      gearbox: d.gearbox,
      loc: d.loc||'',
      status: d.status||'live',
      img: d.img||'',
      colour: d.colour||'',
      owners: +d.owners||undefined,
      desc: (d.desc||'').trim(),
      dealer: session.name,
      dealerEmail: session.email,
      dealerVerified: true,
      views: existing ? (+existing.views||0) : 0,
      leads: existing ? (+existing.leads||0) : 0,
      ts: existing ? (existing.ts||Date.now()) : Date.now()
    };

    if (isEdit){
      const idx = inv.findIndex(x=>x.id==d.id);
      inv[idx]=payload;
    } else {
      inv.unshift(payload);
    }
    save(KEYS.INV, inv);
    formMsg.textContent = 'Listing saved.';
    formMsg.style.display = 'block';
    renderOverview(); renderInventory();
  });

  // ===== CSV import/export =====
  function toCSV(items){
    const cols = ['id','make','model','title','price','year','km','fuel','gearbox','loc','status','img','colour','owners','desc','dealer','dealerEmail','views','leads','ts'];
    const esc = v => `"${String(v??'').replace(/"/g,'""')}"`;
    const rows = [cols.join(',')].concat(items.map(i=>cols.map(c=>esc(i[c])).join(',')));
    return rows.join('\n');
  }
  qs('#exportCsv')?.addEventListener('click', ()=>{
    const inv = load(KEYS.INV, []);
    const blob = new Blob([toCSV(inv)], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='inventory.csv'; a.click();
    URL.revokeObjectURL(url);
  });
  qs('#importCsv')?.addEventListener('change', async (e)=>{
    const file = e.target.files?.[0]; if(!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const head = lines.shift();
    const cols = head.split(',');
    const idx = (k)=>cols.indexOf(k);
    const inv = load(KEYS.INV, []);
    lines.forEach(line=>{
      const cells = parseCsvLine(line);
      const item = {
        id:+cells[idx('id')]||uid(),
        make:cells[idx('make')]||'',
        model:cells[idx('model')]||'',
        title:cells[idx('title')]||'',
        price:+cells[idx('price')]||0,
        year:+cells[idx('year')]||0,
        km:+cells[idx('km')]||0,
        fuel:cells[idx('fuel')]||'',
        gearbox:cells[idx('gearbox')]||'',
        loc:cells[idx('loc')]||'',
        status:(cells[idx('status')]||'live').toLowerCase(),
        img:cells[idx('img')]||'',
        colour:cells[idx('colour')]||'',
        owners:+cells[idx('owners')]||undefined,
        desc:cells[idx('desc')]||'',
        dealer:session.name,
        dealerEmail:session.email,
        views:+cells[idx('views')]||0,
        leads:+cells[idx('leads')]||0,
        ts:+cells[idx('ts')]||Date.now()
      };
      const pos = inv.findIndex(x=>x.id===item.id);
      if (pos>=0) inv[pos]=item; else inv.push(item);
    });
    save(KEYS.INV, inv);
    renderOverview(); renderInventory();
    e.target.value='';
    alert('CSV imported.');
  });
  function parseCsvLine(line){
    const out=[]; let cur=''; let q=false;
    for(let i=0;i<line.length;i++){
      const ch=line[i];
      if (q){
        if (ch === '"'){ if (line[i+1]==='"'){ cur+='"'; i++; } else { q=false; } }
        else cur+=ch;
      } else {
        if (ch === ','){ out.push(cur); cur=''; }
        else if (ch === '"'){ q=true; }
        else cur+=ch;
      }
    }
    out.push(cur);
    return out;
  }

  // ===== Messages =====
  let currentThreadId=null;
  function renderThreads(){
    const list = load(KEYS.MSGS, []);
    const el = qs('#threads');
    el.innerHTML = list.map(t=>`
      <div class="thread-item ${t.id===currentThreadId?'active':''}" data-id="${t.id}">
        <div class="from">${t.with} ${t.unread?'<span class="badge">New</span>':''}</div>
        <div class="muted small">${t.subject}</div>
      </div>
    `).join('');
  }
  renderThreads();
  function openThread(id){
    const list = load(KEYS.MSGS, []);
    const t = list.find(x=>x.id===id);
    const view = qs('#thread');
    qs('.thread-empty')?.remove();
    if (!t){ view.innerHTML=''; return; }
    currentThreadId=id;
    t.unread=false; save(KEYS.MSGS, list); renderThreads();
    view.innerHTML = t.msgs.map(m=>`
      <div class="msg ${m.from===session.name?'me':''}">
        <div class="text">${m.text}</div>
        <div class="meta">${m.from} • ${new Date(m.ts).toLocaleString()}</div>
      </div>
    `).join('');
  }
  qs('#threads')?.addEventListener('click', e=>{
    const item = e.target.closest('.thread-item'); if(!item) return;
    openThread(+item.dataset.id);
    qsa('.thread-item').forEach(n=>n.classList.toggle('active', +n.dataset.id===+item.dataset.id));
  });
  qs('#msgForm')?.addEventListener('submit', e=>{
    e.preventDefault();
    const input = e.currentTarget.querySelector('input[name="text"]');
    const text = String(input.value||'').trim();
    if (!text || currentThreadId==null) return;
    const list = load(KEYS.MSGS, []);
    const t = list.find(x=>x.id===currentThreadId);
    t.msgs.push({ from: session.name, text, ts: Date.now() });
    save(KEYS.MSGS, list);
    input.value=''; openThread(currentThreadId);
  });

  // ===== Settings =====
  const settingsForm = qs('#settingsForm');
  function loadSettings(){
    const s = load(KEYS.SETTINGS, { dealerName: session.name, dealerEmail: session.email, dealerPhone:'' });
    settingsForm.dealerName.value = s.dealerName||'';
    settingsForm.dealerEmail.value= s.dealerEmail||'';
    settingsForm.dealerPhone.value= s.dealerPhone||'';
  }
  loadSettings();
  settingsForm?.addEventListener('submit', e=>{
    e.preventDefault();
    const fd = new FormData(settingsForm);
    const s = {
      dealerName: String(fd.get('dealerName')||'').trim(),
      dealerEmail: String(fd.get('dealerEmail')||'').trim(),
      dealerPhone: String(fd.get('dealerPhone')||'').trim(),
    };
    save(KEYS.SETTINGS, s);
    qs('#settingsSaved').textContent = 'Saved.';
    setTimeout(()=>qs('#settingsSaved').textContent='',1500);
  });

  // Mobile nav
  const navToggle=document.getElementById('navToggle');
  const navMenu=document.getElementById('navMenu');
  navToggle?.addEventListener('click', ()=>{
    const exp = navToggle.getAttribute('aria-expanded')==='true';
    navToggle.setAttribute('aria-expanded', String(!exp));
    navMenu.classList.toggle('open');
  });
})();