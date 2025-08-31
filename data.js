// data.js — shared data layer for Motoria (inventory + optional demo + taxonomy + dealers)
(function(){
  'use strict';

  // ===== DEMO INVENTORY (for testing UI) =====
  window.DEMO_CARS = [
    {
      id: 1,
      title: "BMW 330D",
      make: "BMW",
      model: "330D",
      year: 2019,
      km: 42000,
      price: 20000,
      fuel: "Diesel",
      gearbox: "Automatic",
      colour: "Black",
      owners: 1,
      loc: "London",
      img: "https://cdn.pixabay.com/photo/2017/01/06/19/15/bmw-1957037_1280.jpg",
      dealer: "City Motors",
      dealerEmail: "sales@citymotors.co.uk",
      desc: "Excellent condition, full service history.",
      ts: Date.now()
    },
    {
      id: 2,
      title: "Kia Sportage 1.6 GDi",
      make: "Kia",
      model: "Sportage",
      year: 2021,
      km: 18000,
      price: 17500,
      fuel: "Petrol",
      gearbox: "Manual",
      colour: "White",
      owners: 1,
      loc: "Manchester",
      img: "https://cdn.pixabay.com/photo/2018/05/22/08/59/kia-3422822_1280.jpg",
      dealer: "Northern Cars",
      dealerEmail: "contact@northerncars.co.uk",
      desc: "Low mileage, great family SUV.",
      ts: Date.now()-10000
    },
    {
      id: 3,
      title: "Hyundai Ioniq Hybrid",
      make: "Hyundai",
      model: "Ioniq",
      year: 2020,
      km: 31000,
      price: 15800,
      fuel: "Hybrid",
      gearbox: "Automatic",
      colour: "Silver",
      owners: 2,
      loc: "Cardiff",
      img: "https://cdn.pixabay.com/photo/2019/06/17/18/31/hyundai-4279142_1280.jpg",
      dealer: "Eco Cars",
      dealerEmail: "eco@cars.uk",
      desc: "Efficient and stylish hybrid hatchback.",
      ts: Date.now()-20000
    }
  ];

  const KEYS = {
    INV: 'motoria_listings',
    SAVED: 'motoria_saved_cars',
    SEARCHES: 'saved_searches'
  };

  // ----- formatters -----
  const GBP = n => new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(+n||0);
  const KM  = n => `${(+n||0).toLocaleString('en-GB')} km`;

  // ----- storage helpers -----
  function load(k, d){ try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(d)); } catch(_) { return d; } }
  function save(k, v){ localStorage.setItem(k, JSON.stringify(v)); }

  // ----- sources -----
  function readInventory(){ return load(KEYS.INV, []); }
  function readDemo(){ return Array.isArray(window.DEMO_CARS) ? window.DEMO_CARS : []; }

  // merge inventory (from CMS/dealer.js) + optional demo (window.DEMO_CARS)
  function getCars(){
    const inv  = readInventory();
    const demo = readDemo();
    return [...inv, ...demo];
  }

  function getCarById(id){
    const needle = String(id);
    return getCars().find(c => String(c.id) === needle) || null;
  }

  function saveCar(car){
    if (!car) return;
    const list = load(KEYS.SAVED, []);
    if (!list.some(x => String(x.id) === String(car.id))){
      list.unshift({
        id:car.id, title:car.title, price:car.price, year:car.year, km:car.km,
        fuel:car.fuel, gearbox:car.gearbox, img:car.img, loc:car.loc
      });
      save(KEYS.SAVED, list.slice(0,100));
    }
  }

  function saveSearchFromParams(searchParams){
    const q = String(searchParams).replace(/^\?/,'');
    const saved = load(KEYS.SEARCHES, []);
    saved.unshift({ query:q, ts: Date.now() });
    save(KEYS.SEARCHES, saved.slice(0,50));
  }

  // expose base API
  window.MotoriaData = Object.assign({}, window.MotoriaData || {}, {
    KEYS, GBP, KM, getCars, getCarById, saveCar, saveSearchFromParams
  });
})();

// data.js — taxonomy helpers
(function(){
  'use strict';
  const KEY_LIVE = 'motoria_taxonomy_v1';
  function load(k,d){ try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d)) }catch(_){ return d } }

  const DEFAULT_TAXO = {
    makes: [
      { name:'Kia',        models:['Sportage','Ceed','Rio','Stonic'] },
      { name:'Skoda',      models:['Octavia','Fabia','Superb','Karoq'] },
      { name:'Hyundai',    models:['Ioniq','i10','i20','Tucson'] },
      { name:'Volkswagen', models:['Golf','Polo','Passat','T-Roc'] },
      { name:'BMW',        models:['1 Series','3 Series','X1','X3'] },
      { name:'Audi',       models:['A3','A4','Q2','Q3'] },
      { name:'Ford',       models:['Fiesta','Focus','Puma','Kuga'] },
      { name:'Toyota',     models:['Corolla','Yaris','C-HR','RAV4'] }
    ]
  };

  function getTaxonomy(){ return load(KEY_LIVE, DEFAULT_TAXO); }
  function modelsForMake(makeName){
    const m = getTaxonomy().makes.find(x => x.name.toLowerCase() === String(makeName||'').toLowerCase());
    return m ? m.models.slice() : [];
  }

  window.MotoriaData = Object.assign({}, window.MotoriaData || {}, { getTaxonomy, modelsForMake });
})();

// data.js — dealers + annotations (+ convenience helpers)
(function(){
  'use strict';

  const KEY_DEALERS_V2 = 'motoria_dealers_v2';
  const KEY_DEALERS_V1 = 'motoria_dealers_v1';

  function load(k,d){ try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d)) }catch(_){ return d } }

  function getDealers(){
    const v2 = load(KEY_DEALERS_V2, null);
    if (Array.isArray(v2)) return v2;
    const v1 = load(KEY_DEALERS_V1, null);
    if (Array.isArray(v1)) return v1;
    return [];
  }

  function dealerByEmail(email){
    if (!email) return null;
    const e = String(email).toLowerCase();
    return getDealers().find(d => String(d.email||'').toLowerCase()===e) || null;
  }
  const isDealerVerified = (email)=> !!(dealerByEmail(email)?.verified);
  const isDealerPromoted = (email)=> !!(dealerByEmail(email)?.promoted);

  // annotateCars: tag each car with dealer flags
  function annotateCars(cars){
    const list = Array.isArray(cars) ? cars.slice() : [];
    const dealers = getDealers();
    const byEmail = new Map(dealers.map(d => [String(d.email||'').toLowerCase(), d]));
    const byName  = new Map(dealers.map(d => [String(d.company||d.name||'').trim().toLowerCase(), d]));

    return list.map(c => {
      const email = String(c.dealerEmail||c.sellerEmail||'').toLowerCase();
      let d = email ? byEmail.get(email) : null;
      if (!d) {
        const key = String(c.dealer||c.company||c.locDealer||c.loc||'').trim().toLowerCase();
        if (key) d = byName.get(key) || null;
      }
      return Object.assign({}, c, {
        dealerVerified: !!(d && d.verified),
        dealerPromoted: !!(d && d.promoted)
      });
    });
  }

  // convenience helpers used by pages
  function getCarsAnnotated(){ return annotateCars((window.MotoriaData?.getCars()||[])); }

  function getSimilarCars(carOrId, n=8){
    const car = typeof carOrId === 'object' ? carOrId : (window.MotoriaData?.getCarById?.(carOrId));
    if(!car) return [];
    const all = getCarsAnnotated().filter(x => String(x.id) !== String(car.id));
    // simple similarity: same make/model first, then same fuel, then promoted/verified
    all.sort((a,b)=>{
      const smA = +(a.make===car.make) + +(a.model===car.model);
      const smB = +(b.make===car.make) + +(b.model===car.model);
      if (smB - smA) return smB - smA;
      const fu = +(b.fuel===car.fuel) - +(a.fuel===car.fuel);
      if (fu) return fu;
      const pv = (+b.dealerPromoted - +a.dealerPromoted) || (+b.dealerVerified - +a.dealerVerified);
      if (pv) return pv;
      return (b.ts||0) - (a.ts||0);
    });
    return all.slice(0,n);
  }

  window.MotoriaData = Object.assign({}, window.MotoriaData || {}, {
    getDealers, dealerByEmail, isDealerVerified, isDealerPromoted,
    annotateCars, getCarsAnnotated, getSimilarCars
  });
})();