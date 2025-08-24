/* Header behavior */
const header = document.getElementById('siteHeader');
window.addEventListener('scroll', () => {
  header.classList.toggle('elevated', window.scrollY > 6);
});
document.getElementById('year').textContent = new Date().getFullYear();

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

/* Demo catalog (could be shared with results.js later) */
const CATALOG = [
  { id:1, title:'Volkswagen Golf 1.5 TSI',   price:15500, year:2019, km:55000, fuel:'Petrol',   gearbox:'Manual',    power:'150 hp', loc:'London',     images:['assets/cars/golf.jpg'] },
  { id:2, title:'BMW 320d M Sport',          price:24900, year:2018, km:42000, fuel:'Diesel',   gearbox:'Automatic', power:'190 hp', loc:'Manchester', images:['assets/cars/bmw.jpg'] },
  { id:3, title:'Ford Fiesta Titanium',      price:13200, year:2017, km:60000, fuel:'Petrol',   gearbox:'Manual',    power:'100 hp', loc:'Leeds',      images:['assets/cars/fiesta.jpg'] },
  { id:4, title:'Audi Q3 35 TFSI',           price:28700, year:2020, km:25000, fuel:'Petrol',   gearbox:'Automatic', power:'150 hp', loc:'Birmingham', images:['assets/cars/q3.jpg'] },
  { id:5, title:'Toyota Corolla Hybrid',     price:16900, year:2020, km:31000, fuel:'Hybrid',   gearbox:'Automatic', power:'121 hp', loc:'London',     images:['assets/cars/corolla.jpg'] },
  { id:6, title:'Nissan Leaf 40kWh',         price:12900, year:2019, km:47000, fuel:'Electric', gearbox:'Automatic', power:'150 hp', loc:'Liverpool',  images:['assets/cars/leaf.jpg'] },
  { id:7, title:'Mercedes A180d AMG',        price:21400, year:2019, km:38000, fuel:'Diesel',   gearbox:'Automatic', power:'116 hp', loc:'Bristol',    images:['assets/cars/a180.jpg'] },
  { id:8, title:'Skoda Octavia 1.6 TDI',     price: 9900, year:2016, km:99000, fuel:'Diesel',   gearbox:'Manual',    power:'110 hp', loc:'Leicester',  images:['assets/cars/octavia.jpg'] },
  { id:9, title:'Kia Sportage 1.6 T-GDi',    price:19900, year:2021, km:29000, fuel:'Petrol',   gearbox:'Manual',    power:'150 hp', loc:'London',     images:['assets/cars/sportage.jpg'] },
  { id:10,title:'Hyundai Ioniq Hybrid',      price:15800, year:2018, km:62000, fuel:'Hybrid',   gearbox:'Automatic', power:'139 hp', loc:'Cardiff',    images:['assets/cars/ioniq.jpg'] }
];

/* Load car by ?id= (fallback to id=6 Leaf if missing) */
const params = new URLSearchParams(location.search);
const CAR_ID = +params.get('id') || 6;
const car = CATALOG.find(c => c.id === CAR_ID) || CATALOG[5];

const GBP = n => new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(n);
const KM  = n => `${n.toLocaleString('en-GB')} km`;

/* Populate summary */
$('#title').textContent = car.title;
$('#price').textContent = GBP(car.price);
$('#sidePrice').textContent = GBP(car.price);
$('#year').textContent = car.year;
$('#km').textContent = KM(car.km);
$('#gearbox').textContent = car.gearbox;
$('#fuel').textContent = car.fuel;
$('#power').textContent = car.power;
$('#location').textContent = car.loc;
$('#desc').textContent = `Well-kept ${car.title} in ${car.loc}. One owner, full service history, ${KM(car.km)}. Viewing and test drives welcome.`;

/* Features list (demo) */
const FEATS = [
  'Full service history', 'Bluetooth & Apple CarPlay', 'Rear parking sensors',
  'Cruise control', 'Alloy wheels', 'Two keys', 'LED headlights', 'Isofix'
];
$('#featuresList').innerHTML = FEATS.map(x => `<li>${x}</li>`).join('');
$('#dealerName').textContent = 'DriveLine Motors';
$('#dealerMeta').textContent = 'Verified dealer • 4.8 ★ • 152 reviews';

/* Gallery */
const images = (car.images.length > 1)
  ? car.images
  : [car.images[0], car.images[0], car.images[0]]; // reuse if single image for now

let index = 0;
const gMain = $('#gMain');
const thumbs = $('#thumbs');

function show(i){
  index = (i + images.length) % images.length;
  gMain.src = images[index];
  // aria thumb state
  $$('#thumbs button').forEach((b, bi) => b.setAttribute('aria-selected', bi===index ? 'true' : 'false'));
}
gMain.alt = `${car.title} photo`;
thumbs.innerHTML = images.map((src, i) => `
  <button role="tab" aria-selected="${i===0}" aria-controls="gMain" data-i="${i}">
    <img src="${src}" alt="Thumbnail ${i+1}" />
  </button>
`).join('');
thumbs.addEventListener('click', e => {
  const btn = e.target.closest('button[data-i]');
  if (!btn) return;
  show(+btn.dataset.i);
});
$('#gPrev').addEventListener('click', () => show(index-1));
$('#gNext').addEventListener('click', () => show(index+1));
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft')  show(index-1);
  if (e.key === 'ArrowRight') show(index+1);
});
show(0);

/* Tabs */
const tabBtns = $$('.tab');
const panels = {
  desc:  $('#tab-desc'),
  features: $('#tab-features'),
  seller: $('#tab-seller'),
  finance: $('#tab-finance'),
};
tabBtns.forEach(btn => btn.addEventListener('click', () => {
  tabBtns.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  Object.values(panels).forEach(p => p.classList.add('hidden'));
  panels[btn.dataset.tab].classList.remove('hidden');
}));

/* Finance calculator (standard amortization) */
function calcMonthly({ price, deposit, months, apr }){
  const P = Math.max(0, (price - deposit));
  const r = (apr/100)/12; // monthly rate
  if (r === 0) return P / months;
  const m = P * (r * Math.pow(1+r, months)) / (Math.pow(1+r, months) - 1);
  return m;
}
const finForm = $('#financeForm');
const finOut = $('#finMonthly');
finForm.price.value = car.price;
finForm.addEventListener('submit', e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(finForm));
  const monthly = calcMonthly({
    price: +data.price || 0,
    deposit: +data.deposit || 0,
    months: +data.months || 1,
    apr: +data.apr || 0
  });
  finOut.textContent = GBP(Math.round(monthly));
});

/* Contact / Reserve buttons (demo UX) */
function openSellerTab(){
  tabBtns.forEach(b => b.classList.remove('active'));
  $(`.tab[data-tab="seller"]`).classList.add('active');
  Object.values(panels).forEach(p => p.classList.add('hidden'));
  panels['seller'].classList.remove('hidden');
  $('#contact').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
$('#contactBtn').addEventListener('click', openSellerTab);
$('#reserveBtn').addEventListener('click', () => alert('Reservation flow coming soon.'));
$('#sideContact').addEventListener('click', openSellerTab);
$('#sideReserve').addEventListener('click', () => alert('Reservation flow coming soon.'));

/* Mobile nav */
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
navToggle?.addEventListener('click', () => {
  const expanded = navToggle.getAttribute('aria-expanded') === 'true';
  navToggle.setAttribute('aria-expanded', String(!expanded));
  navMenu.classList.toggle('open');
});