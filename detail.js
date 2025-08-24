// Header/footer basics
const header = document.getElementById('siteHeader');
addEventListener('scroll',()=>header.classList.toggle('elevated', scrollY>6));
document.getElementById('year') && (document.getElementById('year').textContent = new Date().getFullYear());
const navToggle=document.getElementById('navToggle');
const navMenu=document.getElementById('navMenu');
navToggle?.addEventListener('click',()=>{
  const exp = navToggle.getAttribute('aria-expanded')==='true';
  navToggle.setAttribute('aria-expanded', String(!exp));
  navMenu.classList.toggle('open');
});

// Mock listing (would normally fetch by id from URL)
const CAR = {
  id: 9,
  title: 'Kia Sportage 1.6 T‑GDi',
  price: 19900,
  year: 2021,
  km: 29000,
  fuel: 'Petrol',
  gearbox: 'Manual',
  colour: 'White',
  owners: 1,
  loc: 'London',
  dealer: 'City Cars',
  rating: 4.6,
  features: ['Apple CarPlay','Android Auto','Rear Camera','Heated Seats','Lane Assist','Bluetooth','Cruise Control'],
  images: [
    'assets/cars/sportage.jpg',
    'assets/cars/octavia.jpg',
    'assets/cars/leaf.jpg',
    'assets/cars/a180.jpg',
    'assets/cars/ioniq.jpg'
  ]
};

// Helpers
function GBP(n){return new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(n)}
function KM(n){return `${n.toLocaleString('en-GB')} km`}
function stars(r){ const full=Math.round(r); return '★'.repeat(full)+'☆'.repeat(5-full) }

// Populate UI
document.getElementById('crumbTitle').textContent = CAR.title;
document.getElementById('title').textContent = CAR.title;
document.getElementById('price').textContent = GBP(CAR.price);
document.getElementById('specs').textContent = `${CAR.year} • ${KM(CAR.km)} • ${CAR.fuel} • ${CAR.gearbox} • ${CAR.loc}`;
document.getElementById('dealerName').textContent = CAR.dealer;
document.getElementById('dealerStars').textContent = stars(CAR.rating);
document.getElementById('locBadge').textContent = CAR.loc;
document.getElementById('yearBadge').textContent = CAR.year;

// KV values
document.getElementById('makeVal').textContent = 'Kia';
document.getElementById('modelVal').textContent = 'Sportage';
document.getElementById('yearVal').textContent = CAR.year;
document.getElementById('kmVal').textContent = KM(CAR.km);
document.getElementById('fuelVal').textContent = CAR.fuel;
document.getElementById('boxVal').textContent = CAR.gearbox;
document.getElementById('colourVal').textContent = CAR.colour;
document.getElementById('ownersVal').textContent = CAR.owners;

// Features
const featuresEl = document.getElementById('featureList');
featuresEl.innerHTML = CAR.features.map(f=>`<li>${f}</li>`).join('');
const featureChips = document.getElementById('featureChips');
featureChips.innerHTML = CAR.features.slice(0,4).map(f=>`<li>${f}</li>`).join('');

// Gallery
const heroImg = document.getElementById('heroImg');
const thumbs = document.getElementById('thumbs');
thumbs.innerHTML = CAR.images.map(src=>`<img src="${src}" alt="Photo thumbnail" />`).join('');
thumbs.addEventListener('click', e=>{
  const t = e.target.closest('img'); if(!t) return;
  heroImg.src = t.src;
});

// Similar cars (re-using a tiny mock)
const SIM = [
  { id:8, title:'Skoda Octavia 1.6 TDI', price: 9900, img:'assets/cars/octavia.jpg' },
  { id:6, title:'Nissan Leaf 40kWh',     price:12900, img:'assets/cars/leaf.jpg' },
  { id:7, title:'Mercedes A180d AMG',    price:21400, img:'assets/cars/a180.jpg' },
  { id:10,title:'Hyundai Ioniq Hybrid',  price:15800, img:'assets/cars/ioniq.jpg' }
];
const simEl = document.getElementById('similar');
simEl.innerHTML = SIM.map(s=>`
  <article class="card">
    <img class="card-img" src="${s.img}" alt="${s.title}">
    <div class="card-body">
      <div class="price">${GBP(s.price)}</div>
      <div class="meta">${s.title}</div>
      <a class="btn btn-ghost" href="detail.html?id=${s.id}">View</a>
    </div>
  </article>
`).join('');
document.getElementById('simPrev').onclick=()=>simEl.scrollBy({left:-360,behavior:'smooth'});
document.getElementById('simNext').onclick=()=>simEl.scrollBy({left: 360,behavior:'smooth'});

// Finance estimator
document.getElementById('finForm').addEventListener('submit', e=>{
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  const deposit = +fd.get('deposit')||0;
  const apr = (+fd.get('apr')||0)/100/12;
  const months = +fd.get('months')||48;
  const principal = Math.max(0, CAR.price - deposit);
  const m = apr>0 ? (principal * (apr * Math.pow(1+apr, months))) / (Math.pow(1+apr, months) - 1) : principal / months;
  document.getElementById('finOut').textContent = `Approx. monthly £${Math.round(m).toLocaleString('en-GB')} for ${months} months (est.).`;
});

// Actions
document.getElementById('contactForm').addEventListener('submit', e=>{
  e.preventDefault();
  alert('Message sent to seller. (Demo)');
});
document.getElementById('saveBtn').addEventListener('click', ()=>alert('Saved! (Demo)'));
document.getElementById('shareBtn').addEventListener('click', ()=>{
  navigator.clipboard?.writeText(location.href);
  alert('Link copied!');
});
document.getElementById('printBtn').addEventListener('click', ()=>print());