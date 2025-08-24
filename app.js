/* ===== Basic behaviors ===== */
const header = document.getElementById('siteHeader');
window.addEventListener('scroll', () => {
  header.classList.toggle('elevated', window.scrollY > 6);
});

/* Mobile nav toggle */
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
navToggle?.addEventListener('click', () => {
  const expanded = navToggle.getAttribute('aria-expanded') === 'true';
  navToggle.setAttribute('aria-expanded', String(!expanded));
  navMenu.classList.toggle('open');
});

/* Year in footer */
document.getElementById('year').textContent = new Date().getFullYear();

/* ===== Featured data (replace with API later) ===== */
const featured = [
  {
    id: 1,
    title: 'Volkswagen Golf 1.5 TSI',
    price: 15500,
    year: 2019,
    km: 55000,
    fuel: 'Petrol',
    img: 'assets/cars/golf.jpg'
  },
  {
    id: 2,
    title: 'BMW 320d M Sport',
    price: 24900,
    year: 2018,
    km: 42000,
    fuel: 'Diesel',
    img: 'assets/cars/bmw.jpg'
  },
  {
    id: 3,
    title: 'Ford Fiesta Titanium',
    price: 13200,
    year: 2017,
    km: 60000,
    fuel: 'Petrol',
    img: 'assets/cars/fiesta.jpg'
  },
  {
    id: 4,
    title: 'Audi Q3 35 TFSI',
    price: 28700,
    year: 2020,
    km: 25000,
    fuel: 'Petrol',
    img: 'assets/cars/q3.jpg'
  },
  {
    id: 5,
    title: 'Toyota Corolla Icon',
    price: 16900,
    year: 2020,
    km: 31000,
    fuel: 'Hybrid',
    img: 'assets/cars/corolla.jpg'
  }
];

/* ===== Render featured carousel ===== */
const carouselEl = document.getElementById('carousel');

function formatPrice(num){
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(num);
}
function km(n){ return `${n.toLocaleString('en-GB')} km`; }

function renderCards() {
  carouselEl.innerHTML = featured.map(c => `
    <article class="card" tabindex="0" role="group" aria-label="${c.title}">
      <img class="card-img" src="${c.img}" alt="${c.title}" onerror="this.style.background='#eff3ff'; this.removeAttribute('src')" />
      <div class="card-body">
        <div class="price">${formatPrice(c.price)}</div>
        <div class="meta">${c.title}</div>
        <div class="meta">${c.year} • ${km(c.km)} • ${c.fuel}</div>
        <div class="badges">
          <span class="badge">Verified</span>
          <span class="badge">Instant message</span>
        </div>
      </div>
    </article>
  `).join('');
}
renderCards();

/* ===== Carousel controls (smooth scroll) ===== */
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const CARD_WIDTH = () => carouselEl.firstElementChild?.getBoundingClientRect().width + 16 || 320;

prevBtn.addEventListener('click', () => {
  carouselEl.scrollBy({ left: -CARD_WIDTH(), behavior: 'smooth' });
});
nextBtn.addEventListener('click', () => {
  carouselEl.scrollBy({ left: CARD_WIDTH(), behavior: 'smooth' });
});

/* Keyboard support */
carouselEl.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') nextBtn.click();
  if (e.key === 'ArrowLeft')  prevBtn.click();
});

/* ===== Search handling ===== */
const form = document.getElementById('searchForm');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const params = new URLSearchParams();
  for (const [k,v] of data.entries()) if (v) params.append(k, v);

  // TODO: point to your real results page when ready
  const url = `results.html?${params.toString()}`;
  console.log('Navigate to:', url);
  // Simulate navigation for now
  alert(`Searching cars...\n\n${params.toString() || 'All cars'}`);
});