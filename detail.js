// detail.js — robust car detail controller (URL-driven, with safe fallbacks)

/* ================= Header / Footer / Nav ================= */
const header = document.getElementById('siteHeader');
if (header) addEventListener('scroll', () => header.classList.toggle('elevated', scrollY > 6));

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

const navToggle = document.getElementById('navToggle');
const navMenu   = document.getElementById('navMenu');
navToggle?.addEventListener('click', () => {
  const exp = navToggle.getAttribute('aria-expanded') === 'true';
  navToggle.setAttribute('aria-expanded', String(!exp));
  navMenu?.classList.toggle('open');
});

/* ================= Helpers ================= */
const GBP = n => new Intl.NumberFormat('en-GB', { style:'currency', currency:'GBP', maximumFractionDigits:0 }).format(+n||0);
const KM  = n => `${(+n||0).toLocaleString('en-GB')} km`;
const stars = r => { const full = Math.round(+r||0); return '★'.repeat(full) + '☆'.repeat(5-full); };
const qs  = (s, el=document) => el.querySelector(s);

/* ================= Data source =================
   Uses MotoriaData if present (shared inventory),
   otherwise falls back to the mock provided below. */
(function initDetail(){
  const params = new URLSearchParams(location.search);
  const urlId = +params.get('id') || null;

  // Fallback demo car (used only if MotoriaData unavailable or id not found)
  const DEMO_CAR = {
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

  // Resolve car
  let car = null;
  if (window.MotoriaData && typeof window.MotoriaData.getCarById === 'function' && urlId) {
    car = window.MotoriaData.getCarById(urlId);
  }
  if (!car) car = DEMO_CAR;

  // Normalize images
  const images = Array.isArray(car.images) && car.images.length
    ? car.images
    : (car.img ? [car.img] : []);

  /* ================= Populate UI ================= */
  qs('#crumbTitle') && (qs('#crumbTitle').textContent = car.title || '—');
  qs('#title')      && (qs('#title').textContent = car.title || '—');
  qs('#price')      && (qs('#price').textContent = GBP(car.price));
  qs('#specs')      && (qs('#specs').textContent = [
    car.year, KM(car.km), car.fuel, car.gearbox, car.loc
  ].filter(Boolean).join(' • '));

  qs('#dealerName')  && (qs('#dealerName').textContent = car.dealer || 'Dealer');
  qs('#dealerStars') && (qs('#dealerStars').textContent = stars(car.rating || 4.5));
  qs('#locBadge')    && (qs('#locBadge').textContent   = car.loc || '—');
  qs('#yearBadge')   && (qs('#yearBadge').textContent  = car.year || '—');

  // KV values (make/model best-effort parse)
  const parts = (car.title||'').split(' ');
  const make = parts[0] || '—';
  const model = parts.slice(1,3).join(' ') || '—';
  qs('#makeVal')   && (qs('#makeVal').textContent = make);
  qs('#modelVal')  && (qs('#modelVal').textContent = model);
  qs('#yearVal')   && (qs('#yearVal').textContent = car.year || '—');
  qs('#kmVal')     && (qs('#kmVal').textContent   = KM(car.km));
  qs('#fuelVal')   && (qs('#fuelVal').textContent = car.fuel || '—');
  qs('#boxVal')    && (qs('#boxVal').textContent  = car.gearbox || '—');
  qs('#colourVal') && (qs('#colourVal').textContent = car.colour || '—');
  qs('#ownersVal') && (qs('#ownersVal').textContent = (car.owners ?? '—'));

  // Features
  const features = Array.isArray(car.features) ? car.features : [];
  const featuresEl = qs('#featureList');
  if (featuresEl) featuresEl.innerHTML = features.map(f => `<li>${f}</li>`).join('');
  const featureChips = qs('#featureChips');
  if (featureChips) featureChips.innerHTML = features.slice(0,4).map(f => `<li>${f}</li>`).join('');

  // Gallery
  const heroImg = qs('#heroImg');
  const thumbs = qs('#thumbs');
  if (heroImg) {
    heroImg.src = images[0] || '';
    heroImg.alt = car.title || 'Car image';
    heroImg.onerror = function(){ this.style.background='#eff3ff'; this.removeAttribute('src'); };
  }
  if (thumbs) {
    thumbs.innerHTML = images.map(src => `<img src="${src}" alt="Photo thumbnail" />`).join('');
    thumbs.addEventListener('click', e => {
      const t = e.target.closest('img'); if(!t || !heroImg) return;
      heroImg.src = t.src;
    });
  }

  /* ================= Similar cars ================= */
  const simWrap = qs('#similar');
  function renderSimilar() {
    if (!simWrap) return;
    let pool = [];
    if (window.MotoriaData && typeof window.MotoriaData.getCars === 'function') {
      pool = window.MotoriaData.getCars();
    } else {
      // tiny fallback pool
      pool = [
        { id:8,  title:'Skoda Octavia 1.6 TDI', price: 9900,  img:'assets/cars/octavia.jpg' },
        { id:6,  title:'Nissan Leaf 40kWh',     price: 12900, img:'assets/cars/leaf.jpg' },
        { id:7,  title:'Mercedes A180d AMG',    price: 21400, img:'assets/cars/a180.jpg' },
        { id:10, title:'Hyundai Ioniq Hybrid',  price: 15800, img:'assets/cars/ioniq.jpg' }
      ];
    }
    const sims = pool.filter(s => +s.id !== +car.id).slice(0, 8);
    simWrap.innerHTML = sims.map(s => `
      <article class="card">
        <a href="detail.html?id=${s.id}">
          <img class="card-img" src="${s.img||''}" alt="${s.title||''}" onerror="this.style.background='#eff3ff'; this.removeAttribute('src')">
        </a>
        <div class="card-body">
          <div class="price">${GBP(s.price)}</div>
          <div class="meta">${s.title||''}</div>
          <a class="btn btn-ghost" href="detail.html?id=${s.id}">View</a>
        </div>
      </article>
    `).join('');
    qs('#simPrev')?.addEventListener('click', () => simWrap.scrollBy({ left: -360, behavior:'smooth' }));
    qs('#simNext')?.addEventListener('click', () => simWrap.scrollBy({ left:  360, behavior:'smooth' }));
  }
  renderSimilar();

  /* ================= Finance estimator ================= */
  const finForm = qs('#finForm');
  finForm?.addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(finForm);
    const deposit = +fd.get('deposit') || 0;
    const aprPct  = +fd.get('apr') || 0;
    const months  = +fd.get('months') || 48;

    const principal = Math.max(0, (+car.price || 0) - deposit);
    const apr = aprPct/100/12;
    const m = apr > 0
      ? (principal * (apr * Math.pow(1+apr, months))) / (Math.pow(1+apr, months) - 1)
      : (months ? principal / months : 0);

    const out = qs('#finOut');
    if (out) out.textContent = `Approx. monthly £${Math.round(m).toLocaleString('en-GB')} for ${months} months (est.).`;
  });

  /* ================= Actions ================= */
  // Contact
  qs('#contactForm')?.addEventListener('submit', e=>{
    e.preventDefault();
    alert('Message sent to seller. (Demo)');
  });

  // Save
  const saveBtn = qs('#saveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      if (window.MotoriaData && typeof window.MotoriaData.saveCar === 'function') {
        window.MotoriaData.saveCar(car);
      }
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saved';
    });
  }

  // Share
  qs('#shareBtn')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(location.href);
    alert('Link copied!');
  });

  // Print
  qs('#printBtn')?.addEventListener('click', () => print());

})();