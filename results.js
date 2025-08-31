/* ===== Header ===== */
const header = document.getElementById('siteHeader');
addEventListener('scroll',()=>header.classList.toggle('elevated', scrollY>6));
document.getElementById('year').textContent = new Date().getFullYear();
const navToggle=document.getElementById('navToggle');
const navMenu=document.getElementById('navMenu');
navToggle?.addEventListener('click',()=>{
  const exp=navToggle.getAttribute('aria-expanded')==='true';
  navToggle.setAttribute('aria-expanded',String(!exp));
  navMenu.classList.toggle('open');
});

/* ===== Data API ===== */
const qs=(s,el=document)=>el.querySelector(s);
const qsa=(s,el=document)=>Array.from(el.querySelectorAll(s));
const GBP=window.MotoriaData.GBP;
const KM=window.MotoriaData.KM;
const getCarsAnnotated=window.MotoriaData.getCarsAnnotated||
  (()=>(window.MotoriaData.annotateCars?window.MotoriaData.annotateCars(window.MotoriaData.getCars()):window.MotoriaData.getCars()));

/* ===== DOM ===== */
const cardsEl=qs('#cards');
const resultCount=qs('#resultCount');
const pageInfo=qs('#pageInfo');
const prevPage=qs('#prevPage');
const nextPage=qs('#nextPage');
const chipSummary=qs('#chipSummary');
const viewListBtn=qs('#viewList');
const viewGridBtn=qs('#viewGrid');
const sortSelect=qs('#sortSelect');

const PAGE_SIZE=6;
let state={page:1,sort:'relevance',view:'list'};

/* ===== Params ===== */
function readParams(){
  const p=new URLSearchParams(location.search);
  state.sort=p.get('sort')||'relevance';
  state.view=p.get('view')||'list';

  qs('#quickSearch [name="q"]').value=p.get('q')||'';
  qs('#quickSearch [name="loc"]').value=p.get('loc')||'';
  sortSelect.value=state.sort;

  qs('#filtersForm [name="max"]').value=p.get('max')||'';
  qs('#filtersForm [name="year_min"]').value=p.get('year_min')||'';
  qs('#filtersForm [name="year_max"]').value=p.get('year_max')||'';
  qs('#filtersForm [name="km_max"]').value=p.get('km_max')||'';
  qsa('#filtersForm input[name="fuel"]').forEach(cb=>cb.checked=p.getAll('fuel').includes(cb.value));
  qsa('#filtersForm input[name="gearbox"]').forEach(cb=>cb.checked=p.getAll('gearbox').includes(cb.value));

  const chips=[];
  if(p.get('q'))chips.push(['q',p.get('q')]);
  if(p.get('loc'))chips.push(['loc',p.get('loc')]);
  if(p.get('max'))chips.push(['max',`≤ £${(+p.get('max')).toLocaleString('en-GB')}`]);
  if(p.get('year_min'))chips.push(['year_min',`from ${p.get('year_min')}`]);
  if(p.get('year_max'))chips.push(['year_max',`to ${p.get('year_max')}`]);
  if(p.get('km_max'))chips.push(['km_max',`≤ ${(+p.get('km_max')).toLocaleString('en-GB')} km`]);
  p.getAll('fuel').forEach(v=>chips.push(['fuel',v]));
  p.getAll('gearbox').forEach(v=>chips.push(['gearbox',v]));
  if(p.get('dealer_email'))chips.push(['dealer_email',p.get('dealer_email')]);
  if(p.get('dealer'))chips.push(['dealer',p.get('dealer')]);

  chipSummary.innerHTML=chips.map(([k,v])=>`<span class="chip">${v} <button aria-label="Remove ${v}" data-remove="${k}" data-val="${v}">✕</button></span>`).join('');

  const isGrid=state.view==='grid';
  viewGridBtn.classList.toggle('active',isGrid);
  viewListBtn.classList.toggle('active',!isGrid);
  viewGridBtn.setAttribute('aria-pressed',String(isGrid));
  viewListBtn.setAttribute('aria-pressed',String(!isGrid));
  cardsEl.classList.toggle('cards',isGrid);
  cardsEl.classList.toggle('listlike',!isGrid);
}
readParams();

/* ===== Filtering ===== */
function baseFiltered(){
  const p=new URLSearchParams(location.search);
  let data=getCarsAnnotated();

  const q=(p.get('q')||'').toLowerCase();
  const loc=(p.get('loc')||'').toLowerCase();
  const max=+(p.get('max')||0);
  const yearMin=+(p.get('year_min')||0);
  const yearMax=+(p.get('year_max')||0);
  const kmMax=+(p.get('km_max')||0);
  const fuels=p.getAll('fuel');
  const boxes=p.getAll('gearbox');

  const filterDealerEmail=(p.get('dealer_email')||'').toLowerCase();
  const filterDealerName=(p.get('dealer')||'').toLowerCase();

  data=data.filter(c=>{
    if(q&&!String(c.title).toLowerCase().includes(q))return false;
    if(loc&&!String(c.loc||'').toLowerCase().includes(loc))return false;
    if(max&&+c.price>max)return false;
    if(yearMin&&+c.year<yearMin)return false;
    if(yearMax&&+c.year>yearMax)return false;
    if(kmMax&&+c.km>kmMax)return false;
    if(fuels.length&&!fuels.includes(String(c.fuel)))return false;
    if(boxes.length&&!boxes.includes(String(c.gearbox)))return false;
    if(filterDealerEmail){const ce=String(c.dealerEmail||c.sellerEmail||'').toLowerCase();if(ce!==filterDealerEmail)return false;}
    if(filterDealerName){const dn=String(c.dealer||c.company||'').toLowerCase();if(!dn.includes(filterDealerName))return false;}
    return true;
  });

  switch(p.get('sort')){
    case'price_asc':data.sort((a,b)=>a.price-b.price);break;
    case'price_desc':data.sort((a,b)=>b.price-a.price);break;
    case'year_desc':data.sort((a,b)=>b.year-a.year);