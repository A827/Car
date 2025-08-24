// Header / footer
const header = document.getElementById('siteHeader');
addEventListener('scroll',()=>header.classList.toggle('elevated', scrollY>6));
document.getElementById('year').textContent = new Date().getFullYear();

// dataset
const ALL = [
  { id:1, title:'Volkswagen Golf 1.5 TSI', price:15500, year:2019, km:55000, fuel:'Petrol', gearbox:'Manual', img:'assets/cars/golf.jpg', loc:'London', dealer:'City Cars', rating:4.7 },
  { id:2, title:'BMW 320d M Sport',        price:24900, year:2018, km:42000, fuel:'Diesel', gearbox:'Automatic', img:'assets/cars/bmw.jpg', loc:'Manchester', dealer:'North Autohaus', rating:4.8 },
  { id:3, title:'Ford Fiesta Titanium',     price:13200, year:2017, km:60000, fuel:'Petrol', gearbox:'Manual', img:'assets/cars/fiesta.jpg', loc:'Leeds', dealer:'Prime Motors', rating:4.5 },
  { id:4, title:'Audi Q3 35 TFSI',          price:28700, year:2020, km:25000, fuel:'Petrol', gearbox:'Automatic', img:'assets/cars/q3.jpg', loc:'Birmingham', dealer:'DriveLine', rating:4.6 },
  { id:5, title:'Toyota Corolla Hybrid',    price:16900, year:2020, km:31000, fuel:'Hybrid', gearbox:'Automatic', img:'assets/cars/corolla.jpg', loc:'London', dealer:'Eco Cars', rating:4.4 },
  { id:6, title:'Nissan Leaf 40kWh',        price:12900, year:2019, km:47000, fuel:'Electric', gearbox:'Automatic', img:'assets/cars/leaf.jpg', loc:'Liverpool', dealer:'EV World', rating:4.9 },
  { id:7, title:'Mercedes A180d AMG',       price:21400, year:2019, km:38000, fuel:'Diesel', gearbox:'Automatic', img:'assets/cars/a180.jpg', loc:'Bristol', dealer:'Prestige Line', rating:4.6 },
  { id:8, title:'Skoda Octavia 1.6 TDI',    price: 9900, year:2016, km:99000, fuel:'Diesel', gearbox:'Manual', img:'assets/cars/octavia.jpg', loc:'Leicester', dealer:'Budget Autos', rating:4.2 },
  { id:9, title:'Kia Sportage 1.6 T-GDi',   price:19900, year:2021, km:29000, fuel:'Petrol', gearbox:'Manual', img:'assets/cars/sportage.jpg', loc:'London', dealer:'City Cars', rating:4.6 },
  { id:10,title:'Hyundai Ioniq Hybrid',     price:15800, year:2018, km:62000, fuel:'Hybrid', gearbox:'Automatic', img:'assets/cars/ioniq.jpg', loc:'Cardiff', dealer:'Eco Cars', rating:4.3 }
];

const qs = (s, el=document)=>el.querySelector(s);
const qsa = (s, el=document)=>[...el.querySelectorAll(s)];
const cardsEl = qs('#cards');
const resultCount = qs('#resultCount');
const pageInfo = qs('#pageInfo');
const prevPage = qs('#prevPage');
const nextPage = qs('#nextPage');
const chipSummary = qs('#chipSummary');

const viewListBtn = qs('#viewList');
const viewGridBtn = qs('#viewGrid');

const PAGE_SIZE = 6;
let state = { page:1, sort:'relevance', view:'list' };

function GBP(n){return new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(n)}
function KM(n){return `${n.toLocaleString('en-GB')} km`}
function stars(r){ const full=Math.round(r); return '★'.repeat(full)+'☆'.repeat(5-full) }

function readParams(){
  const p = new URLSearchParams(location.search);
  state.sort = p.get('sort') || 'relevance';
  state.view = p.get('view') || 'list';

  // quick search
  qs('#quickSearch [name="q"]').value   = p.get('q') || '';
  qs('#quickSearch [name="loc"]').value = p.get('loc') || '';
  qs('#quickSearch [name="sort"]').value = state.sort;

  // sidebar
  qs('#filtersForm [name="max"]').value = p.get('max') || '';
  qs('#filtersForm [name="year_min"]').value = p.get('year_min') || '';
  qs('#filtersForm [name="year_max"]').value = p.get('year_max') || '';
  qs('#filtersForm [name="km_max"]').value = p.get('km_max') || '';
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
  chipSummary.innerHTML = chips.map(([k,v])=>`
    <span class="chip">${v} <button aria-label="Remove ${v}" data-remove="${k}" data-val="${v}">✕</button></span>
  `).join('');

  // view toggle UI
  const isGrid = state.view === 'grid';
  viewGridBtn.classList.toggle('active', isGrid);
  viewListBtn.classList.toggle('active', !isGrid);
  viewGridBtn.setAttribute('aria-pressed', String(isGrid));
  viewListBtn.setAttribute('aria-pressed', String(!isGrid));
  cardsEl.classList.toggle('cards', isGrid);
  cardsEl.classList.toggle('listlike', !isGrid);
}
readParams();

function applyFilters(){
  const p = new URLSearchParams(location.search);
  let data = [...ALL];

  const q = (p.get('q')||'').toLowerCase();
  const loc = (p.get('loc')||'').toLowerCase();
  const max = +(p.get('max')||0);
  const yearMin = +(p.get('year_min')||0);
  const yearMax = +(p.get('year_max')||0);
  const kmMax = +(p.get('km_max')||0);
  const fuels = p.getAll('fuel');
  const boxes = p.getAll('gearbox');

  data = data.filter(c=>{
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
    default: break;
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
      <img class="thumb" src="${c.img}" alt="${c.title}" onerror="this.style.background='#eff3ff'; this.removeAttribute('src')" />
      <div class="info">
        <div>
          <h3 class="title"><a href="detail.html?id=${c.id}" style="color:inherit;text-decoration:none">${c.title}</a></h3>
          <div class="meta-row"><span>${c.year}</span> • <span>${KM(c.km)}</span> • <span>${c.fuel}</span> • <span>${c.gearbox}</span></div>
          <div class="badges">
            <span class="dealer">${c.dealer} • <span class="stars">${'★'.repeat(Math.round(c.rating))}</span></span>
            <span class="badge">${c.loc}</span>
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

  resultCount.textContent = `${data.length} cars found`;
  pageInfo.textContent = `Page ${state.page} of ${pages}`;
  prevPage.disabled = state.page <= 1;
  nextPage.disabled = state.page >= pages;
}
render();

// quick search submit
qs('#quickSearch').addEventListener('submit', e=>{
  e.preventDefault();
  const params = new URLSearchParams(location.search);
  for (const [k,v] of new FormData(e.currentTarget).entries()){
    v ? params.set(k,v) : params.delete(k);
  }
  params.delete('page');
  history.replaceState({},'',`?${params.toString()}`);
  state.page=1; readParams(); render();
});

// sidebar filters
qs('#filtersForm').addEventListener('submit', e=>{
  e.preventDefault();
  const params = new URLSearchParams(location.search);
  const values = new FormData(e.currentTarget);

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
qs('#clearBtn').addEventListener('click', ()=>{
  const keep = new URLSearchParams(location.search);
  ['max','year_min','year_max','km_max','fuel','gearbox'].forEach(k=>keep.delete(k));
  history.replaceState({},'',`?${keep.toString()}`);
  qs('#filtersForm').reset();
  qsa('#filtersForm input[type="checkbox"]').forEach(cb=>cb.checked=false);
  state.page=1; readParams(); render();
});

// remove chip
chipSummary.addEventListener('click', e=>{
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
qs('#prevPage').addEventListener('click',()=>{ state.page--; render(); });
qs('#nextPage').addEventListener('click',()=>{ state.page++; render(); });

// view toggle
function setView(view){
  const p = new URLSearchParams(location.search);
  p.set('view', view);
  history.replaceState({},'',`?${p.toString()}`);
  readParams(); render();
}
viewListBtn.addEventListener('click', ()=> setView('list'));
viewGridBtn.addEventListener('click', ()=> setView('grid'));

// save search (local demo)
qs('#saveSearchBtn').addEventListener('click', ()=>{
  const query = location.search.replace(/^\?/,'');
  const saved = JSON.parse(localStorage.getItem('saved_searches')||'[]');
  saved.unshift({ query, ts: Date.now() });
  localStorage.setItem('saved_searches', JSON.stringify(saved.slice(0,20)));
  alert('Search saved! (local demo)');
});

// mobile nav
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
navToggle?.addEventListener('click', ()=>{
  const exp = navToggle.getAttribute('aria-expanded')==='true';
  navToggle.setAttribute('aria-expanded', String(!exp));
  navMenu.classList.toggle('open');
});