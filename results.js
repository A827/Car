// results.js — uses MotoriaData for a single source of truth
(function(){
  'use strict';

  const { GBP, KM, getCars, saveSearchFromParams } = window.MotoriaData;

  // Elements (use IDs already present in your results.html)
  const qs  = (s,el=document)=>el.querySelector(s);
  const qsa = (s,el=document)=>[...el.querySelectorAll(s)];

  const cardsEl      = qs('#cards');
  const resultCount  = qs('#resultCount');
  const pageInfo     = qs('#pageInfo');
  const prevPage     = qs('#prevPage');
  const nextPage     = qs('#nextPage');
  const chipSummary  = qs('#chipSummary');

  const viewListBtn  = qs('#viewList');
  const viewGridBtn  = qs('#viewGrid');

  const PAGE_SIZE = 6;
  let state = { page:1, sort:'relevance', view:'list' };

  // If your HTML defines a demo array, expose it so data.js can merge it
  if (!window.DEMO_CARS) {
    window.DEMO_CARS = []; // keep empty if your page already defines the dataset elsewhere
  }

  function readParams(){
    const p = new URLSearchParams(location.search);
    state.sort = p.get('sort') || 'relevance';
    state.view = p.get('view') || 'list';

    // quick search (if present)
    qs('#quickSearch [name="q"]')   && (qs('#quickSearch [name="q"]').value   = p.get('q') || '');
    qs('#quickSearch [name="loc"]') && (qs('#quickSearch [name="loc"]').value = p.get('loc') || '');
    qs('#quickSearch [name="sort"]')&& (qs('#quickSearch [name="sort"]').value = state.sort);

    // sidebar filters (if present)
    qs('#filtersForm [name="max"]')       && (qs('#filtersForm [name="max"]').value = p.get('max') || '');
    qs('#filtersForm [name="year_min"]')  && (qs('#filtersForm [name="year_min"]').value = p.get('year_min') || '');
    qs('#filtersForm [name="year_max"]')  && (qs('#filtersForm [name="year_max"]').value = p.get('year_max') || '');
    qs('#filtersForm [name="km_max"]')    && (qs('#filtersForm [name="km_max"]').value = p.get('km_max') || '');
    qsa('#filtersForm input[name="fuel"]').forEach(cb => cb.checked = p.getAll('fuel').includes(cb.value));
    qsa('#filtersForm input[name="gearbox"]').forEach(cb => cb.checked = p.getAll('gearbox').includes(cb.value));

    // chips
    const chips = [];
    if (p.get('q')) chips.push(['q', p.get('q')]);
    if (p.get('loc')) chips.push(['loc', p.get('loc')]);
    if (p.get('max')) chips.push(['max', `≤ £${(+p.get('max')).toLocaleString('en-GB')}`]);
    if (p.get('year_min')) chips.push(['year_min', `from ${p.get('year_min')}`]);
    if (p.get('year_max')) chips.push(['year_max', `to ${p.get('year_max')}`]);
    if (p.get('km_max')) chips.push(['km_max', `≤ ${(+p.get('km_max')).toLocaleString('en-GB')} km`]);
    p.getAll('fuel').forEach(v=>chips.push(['fuel', v]));
    p.getAll('gearbox').forEach(v=>chips.push(['gearbox', v]));
    chipSummary && (chipSummary.innerHTML = chips.map(([k,v])=>`
      <span class="chip">${v} <button aria-label="Remove ${v}" data-remove="${k}" data-val="${v}">✕</button></span>
    `).join(''));

    // view toggle UI
    const isGrid = state.view === 'grid';
    viewGridBtn?.classList.toggle('active', isGrid);
    viewListBtn?.classList.toggle('active', !isGrid);
    viewGridBtn?.setAttribute('aria-pressed', String(isGrid));
    viewListBtn?.setAttribute('aria-pressed', String(!isGrid));
    cardsEl?.classList.toggle('cards', isGrid);
    cardsEl?.classList.toggle('listlike', !isGrid);
  }
  readParams();

  function applyFilters(){
    const p = new URLSearchParams(location.search);
    let data = getCars().slice();

    const q = (p.get('q')||'').toLowerCase();
    const loc = (p.get('loc')||'').toLowerCase();
    const max = +(p.get('max')||0);
    const yearMin = +(p.get('year_min')||0);
    const yearMax = +(p.get('year_max')||0);
    const kmMax = +(p.get('km_max')||0);
    const fuels = p.getAll('fuel');
    const boxes = p.getAll('gearbox');

    data = data.filter(c=>{
      const title = (c.title||'').toLowerCase();
      const place = (c.loc||'').toLowerCase();
      if (q && !title.includes(q)) return false;
      if (loc && !place.includes(loc)) return false;
      if (max && +c.price > max) return false;
      if (yearMin && +c.year < yearMin) return false;
      if (yearMax && +c.year > yearMax) return false;
      if (kmMax && +c.km > kmMax) return false;
      if (fuels.length && !fuels.includes(c.fuel)) return false;
      if (boxes.length && !boxes.includes(c.gearbox)) return false;
      return true;
    });

    switch (p.get('sort')) {
      case 'price_asc':  data.sort((a,b)=>a.price-b.price); break;
      case 'price_desc': data.sort((a,b)=>b.price-a.price); break;
      case 'year_desc':  data.sort((a,b)=>b.year-a.year);   break;
      case 'km_asc':     data.sort((a,b)=>a.km-b.km);       break;
      default: break; // relevance (current order)
    }
    return data;
  }

  function render(){
    const data = applyFilters();
    const pages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
    state.page = Math.min(state.page, pages);
    const start = (state.page-1)*PAGE_SIZE;
    const slice = data.slice(start, start+PAGE_SIZE);

    cardsEl.innerHTML = slice.map(c=>`
      <article class="card">
        <a href="detail.html?id=${c.id}" class="thumb-link" aria-label="${c.title}">
          <img class="thumb" src="${c.img||''}" alt="${c.title}" onerror="this.style.background='#eff3ff'; this.removeAttribute('src')" />
        </a>
        <div class="info">
          <div>
            <h3 class="title"><a href="detail.html?id=${c.id}" style="color:inherit;text-decoration:none">${c.title}</a></h3>
            <div class="meta-row"><span>${c.year||''}</span> • <span>${KM(c.km)}</span> • <span>${c.fuel||''}</span> • <span>${c.gearbox||''}</span></div>
            <div class="badges">
              <span class="dealer">${c.dealer||'Dealer'} • <span class="stars">★★★★☆</span></span>
              <span class="badge">${c.loc||'—'}</span>
              <span class="badge">Verified</span>
            </div>
          </div>
          <div class="right">
            <div class="price-big">${GBP(c.price)}</div>
            <div class="actions">
              <a class="btn btn-primary" href="detail.html?id=${c.id}">View</a>
              <a class="btn btn-ghost" href="detail.html?id=${c.id}#contact">Contact</a>
            </div>
          </div>
        </div>
      </article>
    `).join('');

    resultCount && (resultCount.textContent = `${data.length} cars found`);
    pageInfo && (pageInfo.textContent = `Page ${state.page} of ${pages}`);
    if (prevPage) prevPage.disabled = state.page <= 1;
    if (nextPage) nextPage.disabled = state.page >= pages;
  }
  if (cardsEl) render();

  // quick search submit
  const quick = qs('#quickSearch');
  quick?.addEventListener('submit', e=>{
    e.preventDefault();
    const params = new URLSearchParams(location.search);
    for (const [k,v] of new FormData(quick).entries()){
      v ? params.set(k,v) : params.delete(k);
    }
    params.delete('page');
    history.replaceState({},'',`?${params.toString()}`);
    state.page=1; readParams(); render();
  });

  // sidebar filters
  const filters = qs('#filtersForm');
  filters?.addEventListener('submit', e=>{
    e.preventDefault();
    const params = new URLSearchParams(location.search);
    const values = new FormData(filters);
    ['max','year_min','year_max','km_max'].forEach(k=>{
      const v = values.get(k); v ? params.set(k,v) : params.delete(k);
    });
    ['fuel','gearbox'].forEach(k=>{
      params.delete(k);
      (values.getAll(k)||[]).forEach(v=>params.append(k,v));
    });
    history.replaceState({},'',`?${params.toString()}`);
    state.page=1; readParams(); render();
  });

  // clear
  qs('#clearBtn')?.addEventListener('click', ()=>{
    const keep = new URLSearchParams(location.search);
    ['max','year_min','year_max','km_max','fuel','gearbox'].forEach(k=>keep.delete(k));
    history.replaceState({},'',`?${keep.toString()}`);
    filters?.reset();
    qsa('#filtersForm input[type="checkbox"]').forEach(cb=>cb.checked=false);
    state.page=1; readParams(); render();
  });

  // remove chip
  chipSummary?.addEventListener('click', e=>{
    const btn = e.target.closest('button[data-remove]');
    if(!btn) return;
    const k = btn.dataset.remove;
    const v = btn.dataset.val;
    const p = new URLSearchParams(location.search);
    if (['fuel','gearbox'].includes(k)){
      const values = p.getAll(k).filter(x=>x!==v);
      p.delete(k); values.forEach(x=>p.append(k,x));
    } else {
      p.delete(k);
    }
    history.replaceState({},'',`?${p.toString()}`);
    state.page=1; readParams(); render();
  });

  // pager
  prevPage?.addEventListener('click',()=>{ state.page--; render(); });
  nextPage?.addEventListener('click',()=>{ state.page++; render(); });

  // view toggle
  function setView(view){
    const p = new URLSearchParams(location.search);
    p.set('view', view);
    history.replaceState({},'',`?${p.toString()}`);
    readParams(); render();
  }
  viewListBtn?.addEventListener('click', ()=> setView('list'));
  viewGridBtn?.addEventListener('click', ()=> setView('grid'));

  // save search
  qs('#saveSearchBtn')?.addEventListener('click', ()=>{
    saveSearchFromParams(new URLSearchParams(location.search));
    alert('Search saved! (local demo)');
  });
})();
