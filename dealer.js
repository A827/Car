// dealer.js — Dealer dashboard controller (localStorage demo)
(function () {
  'use strict';

  // ---- Auth guard
  const Auth = window.MotoriaAuth;
  const session = Auth?.getSession?.();
  if (!session) { location.href = 'auth.html'; return; }

  // Header basics
  const header = document.getElementById('siteHeader');
  addEventListener('scroll', () => header.classList.toggle('elevated', scrollY > 6));
  const yearEl = document.getElementById('year'); if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Sidebar user
  document.getElementById('dealerName').textContent = session.name || 'Dealer';
  document.getElementById('dealerEmail').textContent = session.email || '';

  // Helpers
  const qs = (s, el = document) => el.querySelector(s);
  const qsa = (s, el = document) => Array.from(el.querySelectorAll(s));
  const GBP = n => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(+n || 0);
  const KM = n => `${(+n || 0).toLocaleString('en-GB')} km`;
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(d)) } catch (e) { return d } };
  const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const uid = () => Math.floor(1e6 + Math.random() * 9e6);
  const looksLikeImageURL = (u) => /^https?:\/\/.+\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(String(u || '').trim());

  // Keys
  const KEYS = {
    INV: 'motoria_listings',
    MSGS: 'motoria_messages_dealer',
    SETTINGS: 'motoria_dealer_settings',
  };

  // Seed demo data on first run
  (function seed() {
    if (!load(KEYS.INV, []).length) {
      save(KEYS.INV, [
        { id: uid(), title: 'Kia Sportage 1.6 T‑GDi', price: 19900, year: 2021, km: 29000, fuel: 'Petrol', gearbox: 'Manual', img: 'assets/cars/sportage.jpg', loc: 'London', status: 'live', views: 412, leads: 8, ts: Date.now() - 86400000 },
        { id: uid(), title: 'Skoda Octavia 1.6 TDI', price: 9900, year: 2016, km: 99000, fuel: 'Diesel', gearbox: 'Manual', img: 'assets/cars/octavia.jpg', loc: 'Leicester', status: 'live', views: 231, leads: 4, ts: Date.now() - 172800000 },
        { id: uid(), title: 'Hyundai Ioniq Hybrid', price: 15800, year: 2018, km: 62000, fuel: 'Hybrid', gearbox: 'Automatic', img: 'assets/cars/ioniq.jpg', loc: 'Cardiff', status: 'draft', views: 188, leads: 2, ts: Date.now() - 3600000 }
      ]);
    }
    if (!load(KEYS.MSGS, []).length) {
      save(KEYS.MSGS, [
        {
          id: 1, with: 'Ali A.', subject: 'Kia Sportage viewing', msgs: [
            { from: 'Ali A.', text: 'Is it available on Saturday?', ts: Date.now() - 7200000 }
          ], unread: true
        }
      ]);
    }
    if (!localStorage.getItem(KEYS.SETTINGS)) {
      save(KEYS.SETTINGS, { dealerName: session.name || 'City Cars', dealerEmail: session.email || 'dealer@motoria.test', dealerPhone: '' });
    }
  })();

  // Panels nav
  const panels = {
    overview: qs('#panel-overview'),
    inventory: qs('#panel-inventory'),
    add: qs('#panel-add'),
    messages: qs('#panel-messages'),
    settings: qs('#panel-settings'),
  };
  qsa('.tablink').forEach(btn => {
    btn.addEventListener('click', () => {
      qsa('.tablink').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const view = btn.dataset.view;
      Object.values(panels).forEach(p => p.classList.remove('active'));
      panels[view].classList.add('active');
      if (view === 'overview') renderOverview();
      if (view === 'inventory') renderInventory();
      if (view === 'messages') renderThreads();
      if (view === 'settings') loadSettings();
    });
  });
  qsa('[data-switch="add"]').forEach(a => a.addEventListener('click', (e) => { e.preventDefault(); qs('[data-view="add"]').click(); }));

  // ===== Overview
  function kpi(inv) {
    const active = inv.filter(i => i.status === 'live').length;
    const views = inv.reduce((s, i) => s + (+i.views || 0), 0);
    const leads = inv.reduce((s, i) => s + (+i.leads || 0), 0);
    qs('#kpiActive').textContent = active;
    qs('#kpiViews').textContent = views.toLocaleString('en-GB');
    qs('#kpiLeads').textContent = leads.toLocaleString('en-GB');
  }
  function tableHead() {
    return `
      <div class="row head">
        <div>Title</div><div>Price</div><div>Year</div><div>Mileage</div>
        <div>Status</div><div>Views</div><div class="actions">Actions</div>
      </div>
    `;
  }
  function rowHTML(i) {
    return `
      <div class="row" data-id="${i.id}">
        <div>
          <div style="display:flex;gap:8px;align-items:center">
            <img class="col-img" src="${i.img || ''}" alt="" onerror="this.style.background='#eff3ff';this.removeAttribute('src')">
            <div>
              <div style="font-weight:700">${i.title}</div>
              <div class="muted small">${i.fuel} • ${i.gearbox} • ${i.loc || '—'}</div>
            </div>
          </div>
        </div>
        <div>${GBP(i.price)}</div>
        <div>${i.year || ''}</div>
        <div>${KM(i.km)}</div>
        <div>
          <select data-act="status">
            <option value="live" ${i.status === 'live' ? 'selected' : ''}>Live</option>
            <option value="draft" ${i.status === 'draft' ? 'selected' : ''}>Draft</option>
            <option value="sold" ${i.status === 'sold' ? 'selected' : ''}>Sold</option>
          </select>
        </div>
        <div>${(+i.views || 0).toLocaleString('en-GB')}</div>
        <div class="actions">
          <button class="btn btn-ghost" data-act="view">View</button>
          <button class="btn btn-ghost" data-act="edit">Edit</button>
          <button class="btn btn-primary" data-act="del">Delete</button>
        </div>
      </div>
    `;
  }
  function renderRecent(inv) {
    const sorted = [...inv].sort((a, b) => b.ts - a.ts).slice(0, 5);
    qs('#tableRecent').innerHTML = tableHead() + sorted.map(rowHTML).join('');
  }
  function renderOverview() {
    const inv = load(KEYS.INV, []);
    kpi(inv); renderRecent(inv);
  }
  renderOverview();

  // ===== Inventory
  const invSearch = qs('#invSearch');
  const invStatus = qs('#invStatus');
  function filterInv(list) {
    const q = (invSearch?.value || '').toLowerCase().trim();
    const st = (invStatus?.value || '').toLowerCase();
    return list.filter(i => {
      const hay = [i.title, i.loc].join(' ').toLowerCase();
      if (q && !hay.includes(q)) return false;
      if (st && (i.status || '').toLowerCase() !== st) return false;
      return true;
    });
  }
  function renderInventory() {
    const inv = load(KEYS.INV, []);
    const filtered = filterInv(inv);
    qs('#tableInventory').innerHTML = tableHead() + filtered.map(rowHTML).join('');
  }
  invSearch?.addEventListener('input', renderInventory);
  invStatus?.addEventListener('change', renderInventory);

  qs('#tableInventory')?.addEventListener('change', (e) => {
    const sel = e.target.closest('select[data-act="status"]'); if (!sel) return;
    const row = sel.closest('.row'); const id = +row.dataset.id;
    const inv = load(KEYS.INV, []);
    const item = inv.find(x => x.id === id); if (!item) return;
    item.status = sel.value;
    save(KEYS.INV, inv); renderOverview();
  });
  qs('#tableInventory')?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]'); if (!btn) return;
    const row = btn.closest('.row'); const id = +row.dataset.id;
    const inv = load(KEYS.INV, []);
    const item = inv.find(x => x.id === id); if (!item) return;
    const act = btn.dataset.act;
    if (act === 'view') { location.href = `detail.html?id=${id}`; return; }
    if (act === 'edit') { fillForm(item); qs('[data-view="add"]').click(); return; }
    if (act === 'del') {
      if (!confirm('Delete this listing?')) return;
      save(KEYS.INV, inv.filter(x => x.id !== id)); renderInventory(); renderOverview();
    }
  });

  // ===== CSV import/export (matches buttons already in HTML)
  function toCSV(items) {
    const cols = ['id', 'make', 'model', 'title', 'price', 'year', 'km', 'fuel', 'gearbox', 'loc', 'status', 'img', 'desc', 'colour', 'owners', 'views', 'leads', 'ts'];
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [cols.join(',')].concat(items.map(i => cols.map(c => esc(i[c])).join(',')));
    return rows.join('\n');
  }
  qs('#exportCsv')?.addEventListener('click', () => {
    const inv = load(KEYS.INV, []);
    const blob = new Blob([toCSV(inv)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'inventory.csv'; a.click();
    URL.revokeObjectURL(url);
  });

  function parseCsvLine(line) {
    const out = []; let cur = ''; let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) {
        if (ch === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; }
          else { q = false; }
        } else cur += ch;
      } else {
        if (ch === ',') { out.push(cur); cur = ''; }
        else if (ch === '"') { q = true; }
        else cur += ch;
      }
    }
    out.push(cur);
    return out;
  }
  qs('#importCsv')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const head = lines.shift();
    const cols = head.split(',');
    const idx = (k) => cols.indexOf(k);
    const inv = load(KEYS.INV, []);
    lines.forEach(line => {
      const cells = parseCsvLine(line);
      const item = {
        id: +cells[idx('id')] || uid(),
        make: cells[idx('make')] || '',
        model: cells[idx('model')] || '',
        title: cells[idx('title')] || '',
        price: +cells[idx('price')] || 0,
        year: +cells[idx('year')] || 0,
        km: +cells[idx('km')] || 0,
        fuel: cells[idx('fuel')] || '',
        gearbox: cells[idx('gearbox')] || '',
        loc: cells[idx('loc')] || '',
        status: (cells[idx('status')] || 'live').toLowerCase(),
        img: cells[idx('img')] || '',
        desc: cells[idx('desc')] || '',
        colour: cells[idx('colour')] || '',
        owners: +cells[idx('owners')] || 0,
        views: +cells[idx('views')] || 0,
        leads: +cells[idx('leads')] || 0,
        ts: +cells[idx('ts')] || Date.now()
      };
      const pos = inv.findIndex(x => x.id === item.id);
      if (pos >= 0) inv[pos] = item; else inv.push(item);
    });
    save(KEYS.INV, inv);
    renderOverview(); renderInventory();
    e.target.value = '';
    alert('CSV imported.');
  });

  // ===== Add/Edit Listing
  const form = qs('#listingForm');
  const addTitle = qs('#addTitle');
  const cancelEdit = qs('#cancelEdit');

  // Taxonomy → Make/Model (with fallback)
  const MD = window.MotoriaData || {};
  const makeSel = qs('#makeSel');
  const modelSel = qs('#modelSel');
  function hydrateMakeModel() {
    const fallback = {
      Volkswagen: ['Golf', 'Polo', 'Passat', 'T-Roc'],
      BMW: ['1 Series', '3 Series', 'X1', 'X3'],
      Audi: ['A3', 'A4', 'Q2', 'Q3'],
      Ford: ['Fiesta', 'Focus', 'Puma', 'Kuga'],
      Toyota: ['Corolla', 'Yaris', 'C-HR', 'RAV4'],
      Kia: ['Sportage', 'Ceed', 'Rio', 'Stonic'],
      Skoda: ['Octavia', 'Fabia', 'Superb', 'Karoq'],
      Hyundai: ['Ioniq', 'i10', 'i20', 'Tucson']
    };
    const hasTaxo = !!(MD.getTaxonomy && MD.modelsForMake);
    const makes = hasTaxo ? MD.getTaxonomy().makes.map(m => m.name) : Object.keys(fallback);
    makeSel.innerHTML = `<option value="">Select make</option>` + makes.map(m => `<option value="${m}">${m}</option>`).join('');
    modelSel.innerHTML = `<option value="">Model</option>`;
    modelSel.disabled = true;

    makeSel.addEventListener('change', () => {
      const make = makeSel.value;
      const models = !make ? [] : (hasTaxo ? MD.modelsForMake(make) : (fallback[make] || []));
      modelSel.disabled = !make || !models.length;
      modelSel.innerHTML = `<option value="">${models.length ? 'Select model' : 'Model'}</option>` +
        models.map(x => `<option value="${x}">${x}</option>`).join('');
      updatePreview();
    });
    modelSel.addEventListener('change', updatePreview);
  }
  hydrateMakeModel();

  // Preview bindings
  const prevImg = qs('#prevImg');
  const prevTitle = qs('#prevTitle');
  const prevMeta = qs('#prevMeta');
  const prevPrice = qs('#prevPrice');

  // graceful image error fallback
  prevImg.addEventListener('error', () => {
    prevImg.removeAttribute('src');
    prevImg.style.background = '#f3f6ff';
    prevImg.alt = 'Preview image unavailable';
  });

  function updatePreview() {
    const make = makeSel.value || '';
    const model = modelSel.value || '';
    const title = (qs('#titleInp').value || `${make} ${model}`.trim()).trim() || 'Title appears here';
    const year = qs('#yearInp').value;
    const km = qs('#kmInp').value;
    const fuel = qs('#fuelSel').value;
    const box = qs('#boxSel').value;

    prevTitle.textContent = title;
    prevMeta.textContent = `${year || 'Year'} • ${km ? KM(km) : 'Mileage'} • ${fuel || 'Fuel'} • ${box || 'Manual'}`;

    const price = +qs('#priceInp').value || 0;
    prevPrice.textContent = GBP(price);

    const url = (qs('#imgUrl').value || '').trim();
    if (looksLikeImageURL(url)) {
      prevImg.style.background = '';
      prevImg.alt = title;
      prevImg.src = url; // if it fails, 'error' handler above cleans it up
    } else {
      prevImg.removeAttribute('src');
      prevImg.style.background = '#f3f6ff';
      prevImg.alt = 'Preview image';
    }
  }
  form?.addEventListener('input', updatePreview);
  updatePreview();

  function fillForm(i) {
    addTitle.textContent = 'Edit listing';
    cancelEdit.hidden = false;

    makeSel.value = i.make || '';
    // populate models for existing make
    if (i.make) {
      const models = (MD.modelsForMake ? MD.modelsForMake(i.make) : []);
      modelSel.innerHTML = `<option value="">Select model</option>` + models.map(x => `<option value="${x}">${x}</option>`).join('');
      modelSel.disabled = !models.length;
      modelSel.value = i.model || '';
    } else {
      modelSel.innerHTML = `<option value="">Model</option>`; modelSel.disabled = true;
    }

    qs('#yearInp').value = i.year || '';
    qs('#priceInp').value = i.price || '';
    qs('#kmInp').value = i.km || '';
    qs('#fuelSel').value = i.fuel || 'Petrol';
    qs('#boxSel').value = i.gearbox || 'Manual';
    qs('#locInp').value = i.loc || '';
    qs('#titleInp').value = i.title || '';
    qs('#imgUrl').value = i.img || '';
    qs('#descInp').value = i.desc || '';
    qs('#statusSel').value = i.status || 'live';
    qs('#colourInp').value = i.colour || '';
    qs('#ownersInp').value = i.owners || '';
    qs('#idHidden').value = i.id || '';
    updatePreview();
  }
  function clearForm() {
    addTitle.textContent = 'Add listing';
    cancelEdit.hidden = true;
    form.reset();
    qs('#idHidden').value = '';
    modelSel.innerHTML = `<option value="">Model</option>`;
    modelSel.disabled = true;
    updatePreview();
  }
  cancelEdit?.addEventListener('click', clearForm);

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const required = ['make', 'model', 'year', 'price', 'title', 'img'];
    for (const k of required) {
      if (!String(fd.get(k) || '').trim()) {
        alert(`Please fill ${k}.`); return;
      }
    }
    const inv = load(KEYS.INV, []);
    const data = Object.fromEntries(fd.entries());
    const isEdit = !!data.id;

    const payload = {
      id: isEdit ? +data.id : uid(),
      make: data.make, model: data.model,
      title: data.title.trim(),
      price: +data.price || 0,
      year: +data.year || 0,
      km: +data.km || 0,
      fuel: data.fuel,
      gearbox: data.gearbox,
      loc: data.loc || '',
      status: data.status || 'live',
      img: data.img || '',
      desc: (data.desc || '').trim(),
      colour: data.colour || '',
      owners: +data.owners || 0,
      views: isEdit ? (inv.find(x => x.id == data.id)?.views || 0) : 0,
      leads: isEdit ? (inv.find(x => x.id == data.id)?.leads || 0) : 0,
      ts: isEdit ? (inv.find(x => x.id == data.id)?.ts || Date.now()) : Date.now()
    };

    if (isEdit) {
      const idx = inv.findIndex(x => x.id == data.id);
      inv[idx] = payload;
    } else {
      inv.unshift(payload);
    }
    save(KEYS.INV, inv);
    qs('#formMsg').textContent = 'Saved.';
    setTimeout(() => qs('#formMsg').textContent = '', 1500);
    clearForm();
    renderOverview(); renderInventory();
  });

  // ===== Messages
  let currentThreadId = null;
  function renderThreads() {
    const list = load(KEYS.MSGS, []);
    const el = qs('#threads');
    el.innerHTML = list.map(t => `
      <div class="thread-item ${t.id === currentThreadId ? 'active' : ''}" data-id="${t.id}">
        <div class="from">${t.with} ${t.unread ? '<span class="badge">New</span>' : ''}</div>
        <div class="muted small">${t.subject}</div>
      </div>
    `).join('');
  }
  renderThreads();

  function openThread(id) {
    const list = load(KEYS.MSGS, []);
    const t = list.find(x => x.id === id);
    const view = qs('#thread');
    qs('.thread-empty')?.remove();
    if (!t) { view.innerHTML = ''; return; }
    currentThreadId = id;
    t.unread = false; save(KEYS.MSGS, list); renderThreads();
    view.innerHTML = t.msgs.map(m => `
      <div class="msg ${m.from === session.name ? 'me' : ''}">
        <div class="text">${m.text}</div>
        <div class="meta">${m.from} • ${new Date(m.ts).toLocaleString()}</div>
      </div>
    `).join('');
  }
  qs('#threads')?.addEventListener('click', e => {
    const item = e.target.closest('.thread-item'); if (!item) return;
    openThread(+item.dataset.id);
    qsa('.thread-item').forEach(n => n.classList.toggle('active', +n.dataset.id === +item.dataset.id));
  });
  qs('#msgForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const input = e.currentTarget.querySelector('input[name="text"]');
    const text = String(input.value || '').trim();
    if (!text || currentThreadId == null) return;
    const list = load(KEYS.MSGS, []);
    const t = list.find(x => x.id === currentThreadId);
    t.msgs.push({ from: session.name, text, ts: Date.now() });
    save(KEYS.MSGS, list);
    input.value = ''; openThread(currentThreadId);
  });

  // ===== Settings
  const settingsForm = qs('#settingsForm');
  function loadSettings() {
    if (!settingsForm) return;
    const s = load(KEYS.SETTINGS, { dealerName: session.name, dealerEmail: session.email, dealerPhone: '' });
    settingsForm.dealerName.value = s.dealerName || '';
    settingsForm.dealerEmail.value = s.dealerEmail || '';
    settingsForm.dealerPhone.value = s.dealerPhone || '';
  }
  loadSettings();
  settingsForm?.addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(settingsForm);
    const s = {
      dealerName: String(fd.get('dealerName') || '').trim(),
      dealerEmail: String(fd.get('dealerEmail') || '').trim(),
      dealerPhone: String(fd.get('dealerPhone') || '').trim(),
    };
    save(KEYS.SETTINGS, s);
    qs('#settingsSaved').textContent = 'Saved.';
    setTimeout(() => qs('#settingsSaved').textContent = '', 1500);
  });

  // Mobile nav
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');
  navToggle?.addEventListener('click', () => {
    const exp = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!exp));
    navMenu.classList.toggle('open');
  });
})();