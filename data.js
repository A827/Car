// data.js — shared data layer for Motoria (merge demo + dealer inventory)
(function(){
  'use strict';

  const KEYS = {
    INV: 'motoria_listings',
    SAVED: 'motoria_saved_cars',
    SEARCHES: 'saved_searches'
  };

  const GBP = n => new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(+n||0);
  const KM  = n => `${(+n||0).toLocaleString('en-GB')} km`;

  function load(k, d){ try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d)) }catch(_){ return d } }
  function save(k, v){ localStorage.setItem(k, JSON.stringify(v)); }

  // Read dealer inventory (already shaped correctly by dealer.js)
  function readInventory(){ return load(KEYS.INV, []); }

  // Optional demo set (if a page defined window.DEMO_CARS, we’ll use it)
  function readDemo(){
    return Array.isArray(window.DEMO_CARS) ? window.DEMO_CARS : [];
  }

  // Merge both sources; inventory IDs are large (6‑7 digits) so no collision
  function getCars(){
    const inv = readInventory();
    const demo = readDemo();
    return [...inv, ...demo];
  }

  function getCarById(id){
    id = +id;
    return getCars().find(c => +c.id === id) || null;
  }

  function saveCar(car){
    if (!car) return;
    const list = load(KEYS.SAVED, []);
    if (!list.some(x => +x.id === +car.id)){
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

  window.MotoriaData = { KEYS, GBP, KM, getCars, getCarById, saveCar, saveSearchFromParams };
})();