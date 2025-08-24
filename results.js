// --- tiny shared helpers (copied to avoid dependency on app.js) ---
const header = document.getElementById('siteHeader');
window.addEventListener('scroll', () => {
  header.classList.toggle('elevated', window.scrollY > 6);
});
document.getElementById('year').textContent = new Date().getFullYear();

// --- demo dataset (replace with API later) ---
const ALL = [
  { id:1, title:'Volkswagen Golf 1.5 TSI', price:15500, year:2019, km:55000, fuel:'Petrol', gearbox:'Manual', img:'assets/cars/golf.jpg', loc:'London' },
  { id:2, title:'BMW 320d M Sport',        price:24900, year:2018, km:42000, fuel:'Diesel', gearbox:'Automatic', img:'assets/cars/bmw.jpg', loc:'Manchester' },
  { id:3, title:'Ford Fiesta Titanium',     price:13200, year:2017, km:60000, fuel:'Petrol', gearbox:'Manual', img:'assets/cars/fiesta.jpg', loc:'Leeds' },
  { id:4, title:'Audi Q3 35 TFSI',          price:28700, year:2020, km:25000, fuel:'Petrol', gearbox:'Automatic', img:'assets/cars/q3.jpg', loc:'Birmingham' },
  { id:5, title:'Toyota Corolla Hybrid',    price:16900, year:2020, km:31000, fuel:'Hybrid', gearbox:'Automatic', img:'assets/cars/corolla.jpg', loc:'London' },
  { id:6, title:'Nissan Leaf 40kWh',        price:12900, year:2019, km:47000, fuel:'Electric', gearbox:'Automatic', img:'assets/cars/leaf.jpg', loc:'Liverpool' },
  { id:7, title:'Mercedes A180d AMG',       price:21400, year:2019, km:38000, fuel:'Diesel', gearbox:'Automatic', img:'assets/cars/a180.jpg', loc:'Bristol' },
  { id:8, title:'Skoda Octavia 1.6 TDI',    price:9900,  year:2016, km:99000, fuel:'Diesel', gearbox:'Manual', img:'assets/cars/octavia.jpg', loc:'Leicester' },
  { id:9, title:'Kia Sportage 1.6 T-GDi',   price:19900, year:2021, km:29000, fuel:'Petrol', gearbox:'Manual', img:'assets/cars/sportage.jpg', loc:'London' },
  { id:10,title:'Hyundai Ioniq Hybrid',     price:15800, year:2018, km:62000, fuel:'Hybrid', gearbox:'Automatic', img:'assets/cars/ioniq.jpg', loc:'Cardiff' }
];

const qs = (sel, el=document) => el.querySelector(sel);
const qsa = (sel, el=document) => [...el.querySelectorAll(sel)];
const cardsEl = qs('#cards');
const resultCount = qs('#resultCount');
const pageInfo = qs('#pageInfo');
const prevPage = qs('#prevPage');
const nextPage = qs('#nextPage');

const PAGE_SIZE = 6;
let state = {
  page: 1,
  sort: 'relevance',
  filters: {}
};

function formatPrice(n){ return new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(n); }
function km(n){ return `${n.toLocaleString('en-GB')} km`; }

// --- URL params → state
function readParams(){
  const p = new URLSearchParams(location.search);
  state.sort = p.get('sort') || 'relevance';
  // quick search mirrors filters
  const f = {};
  if (p.get('q')) f.q = p.get('q').toLowerCase();
  if (p.get('loc')) f.loc = p.get('loc').toLowerCase();
  if (p.get('max')) f.max = +p.get('max');
  state.filters = f;
  qs('#quickSearch [name="q"]').value   = p.get('q') || '';
  qs('#quickSearch [name="loc"]').value = p.get('loc') || '';
  qs('#quickSearch [name="sort"]').value = state.sort;
  // sidebar form
  qs('#filtersForm [name="max"]').value = p.get('max') || '';
  qs('#filtersForm [name="year_min"]').value = p.get('year_min') || '';
  qs('#filtersForm [name="year_max"]').value = p.get('year_max') || '';
  qs('#filtersForm [name="km_max"]').value = p.get('km_max') || '';
  // multi selects
  qsa('#filtersForm input[name="fuel"]').forEach(cb => cb.checked = p.getAll('fuel').includes(cb.value));
  qsa('#filtersForm input[name="gearbox"]').forEach(cb => cb.checked = p.getAll('gearbox').includes(cb.value));
}
readParams();

// --- filter/sort/paginate
function applyFilters(){
  let data = [...ALL];

  const p = new URLSearchParams(location.search);
  const q = (p.get('q')||'').toLowerCase();
  const loc = (p.get('loc')||'').toLowerCase();
  const max = +(p.get('max')||0);
  const yearMin = +(p.get('year_min')||0);
  const yearMax = +(p.get('year_max')||0);
  const kmMax   = +(p.get('km_max')||0);
  const fuels   = p.getAll('fuel');
  const boxes   = p.getAll('gearbox');

  data = data.filter(c => {
    if (q && !c.title.toLowerCase().includes(q)) return false;
    if (loc && !c.loc.toLowerCase().includes(loc)) return false;
    if (max && c.price > max) return false;
    if (yearMin && c.year < yearMin) return false;
    if (yearMax && c.year > yearMax) return false;
    if (kmMax && c.km > kmMax) return false;
    if (fuels.length && !fuels.includes(c.fuel)) return false;
    if (boxes.length && !boxes.includes(c.gearbox)) return false;
    return true;
  });

  switch (p.get('sort')) {
    case 'price_asc':  data.sort((a,b)=>a.price-b.price); break;
    case 'price_desc': data.sort((a,b)=>b.price-a.price); break;
    case 'year_desc':  data.sort((a,b)=>b.year-a.year);   break;
    case 'km_asc':     data.sort((a,b)=>a.km-b.km);       break;
    default: /* relevance: leave order */ break;
  }

  return data;
}

function render(){
  const data = applyFilters();
  const pages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  state.page = Math.min(state.page, pages);

  const start = (state.page-1)*PAGE_SIZE;
  const slice = data.slice(start, start+PAGE_SIZE);

  cardsEl.innerHTML = slice.map(c => `
    <article class="card">
      <img class="card-img" src="${c.img}" alt="${c.title}" onerror="this.style.background='#eff3ff'; this.removeAttribute('src')" />
      <div class="card-body">
        <div class="price">${formatPrice(c.price)}</div>
        <div class="meta">${c.title}</div>
        <div class="meta">${c.year} • ${km(c.km)} • ${c.fuel} • ${c.gearbox}</div>
        <div class="badges">
          <span class="badge">${c.loc}</span>
          <span class="badge">Verified</span>
        </div>
      </div>
    </article>
  `).join('');

  resultCount.textContent = `${data.length} cars found`;
  pageInfo.textContent = `Page ${state.page} of ${pages}`;
  prevPage.disabled = state.page <= 1;
  nextPage.disabled = state.page >= pages;
}
render();

// --- events ---
qs('#quickSearch').addEventListener('submit', e => {
  e.preventDefault();
  const params = new URLSearchParams(location.search);
  for (const [k,v] of new FormData(e.currentTarget).entries()) {
    if (v) params.set(k,v); else params.delete(k);
  }
  params.delete('page');
  history.replaceState({}, '', `?${params.toString()}`);
  state.page = 1; render();
});

qs('#filtersForm').addEventListener('submit', e => {
  e.preventDefault();
  const params = new URLSearchParams(location.search);
  const values = new FormData(e.currentTarget);

  // simple fields
  ['max','year_min','year_max','km_max'].forEach(k=>{
    const v = values.get(k); v ? params.set(k,v) : params.delete(k);
  });
  // multi fields
  ['fuel','gearbox'].forEach(k=>{
    params.delete(k);
    (values.getAll(k)||[]).forEach(v => params.append(k, v));
  });

  history.replaceState({}, '', `?${params.toString()}`);
  state.page = 1; render();
});

qs('#clearBtn').addEventListener('click', () => {
  const keep = new URLSearchParams(location.search);
  ['max','year_min','year_max','km_max','fuel','gearbox'].forEach(k => keep.delete(k));
  history.replaceState({}, '', `?${keep.toString()}`);
  // reset UI
  qs('#filtersForm').reset();
  qsa('#filtersForm input[type="checkbox"]').forEach(cb => cb.checked=false);
  state.page = 1; render();
});

prevPage.addEventListener('click', () => { state.page--; render(); });
nextPage.addEventListener('click', () => { state.page++; render(); });

// Save search (local demo)
qs('#saveSearchBtn').addEventListener('click', () => {
  const query = location.search.replace(/^\?/,'');
  const saved = JSON.parse(localStorage.getItem('saved_searches')||'[]');
  saved.unshift({ query, ts: Date.now() });
  localStorage.setItem('saved_searches', JSON.stringify(saved.slice(0,20)));
  alert('Search saved! (stored locally for this demo)');
});

// Mobile nav
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
navToggle?.addEventListener('click', () => {
  const expanded = navToggle.getAttribute('aria-expanded') === 'true';
  navToggle.setAttribute('aria-expanded', String(!expanded));
  navMenu.classList.toggle('open');
});