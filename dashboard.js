// dashboard.js — user dashboard controller
(function(){
  'use strict';

  // ---- Auth guard
  const Auth = window.MotoriaAuth;
  const session = Auth?.getSession?.();
  if (!session) { location.href = 'auth.html'; return; }

  // Header basic behavior
  const header = document.getElementById('siteHeader');
  window.addEventListener('scroll',()=>header.classList.toggle('elevated', scrollY>6));
  const year = document.getElementById('year'); if (year) year.textContent = new Date().getFullYear();

  // User header box
  document.getElementById('userName').textContent = session.name || 'User';
  document.getElementById('userEmail').textContent = session.email || '';

  // ---- Data keys
  const KEYS = {
    SAVED:    'motoria_saved_cars',      // array of car objects {id,title,price,year,km,fuel,img,loc}
    SEARCHES: 'saved_searches',          // already used on results.js [{query, ts}]
    MSGS:     'motoria_messages',         // [{id, with, subject, msgs:[{from, text, ts}], unread:true}]
    ALERTS:   'motoria_alerts',          // {priceDrops:true,newMatches:false,dealerMsgs:true,digestTime:"08:00"}
    USERS:    'motoria_users',           // seed from app.js
    SESSION:  'motoria_session'
  };

  // helpers
  const qs =(s,el=document)=>el.querySelector(s);
  const qsa=(s,el=document)=>[].slice.call(el.querySelectorAll(s));
  const GBP = n => new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(n);
  const KM  = n => `${(n||0).toLocaleString('en-GB')} km`;
  const load = (k, d)=>{ try{return JSON.parse(localStorage.getItem(k) || JSON.stringify(d))}catch(e){return d} };
  const save = (k, v)=>localStorage.setItem(k, JSON.stringify(v));

  // Seed demo data for saved cars if none (for first experience)
  (function seed(){
    const current = load(KEYS.SAVED, []);
    if (current.length) return;
    const demo = [
      { id:6, title:'Nissan Leaf 40kWh', price:12900, year:2019, km:47000, fuel:'Electric', img:'assets/cars/leaf.jpg', loc:'Liverpool' },
      { id:10,title:'Hyundai Ioniq Hybrid', price:15800, year:2018, km:62000, fuel:'Hybrid', img:'assets/cars/ioniq.jpg', loc:'Cardiff' },
    ];
    save(KEYS.SAVED, demo);
  })();

  // ---- Tabs
  const panels = {
    'saved-cars': qs('#panel-saved-cars'),
    'saved-searches': qs('#panel-saved-searches'),
    'messages': qs('#panel-messages'),
    'alerts': qs('#panel-alerts'),
    'profile': qs('#panel-profile'),
  };
  qsa('.tablink').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      qsa('.tablink').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const view = btn.dataset.view;
      Object.values(panels).forEach(p=>p.classList.remove('active'));
      panels[view].classList.add('active');
      if (view==='messages') renderThreads();
    });
  });

  // ---- Saved Cars
  function renderSavedCars(){
    const list = load(KEYS.SAVED, []);
    const wrap = qs('#savedCars');
    const empty = qs('#savedCarsEmpty');
    if (!list.length){
      wrap.innerHTML = '';
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    wrap.innerHTML = list.map(c=>`
      <article class="saved-card">
        <img src="${c.img}" alt="${c.title}" onerror="this.style.background='#eff3ff'; this.removeAttribute('src')">
        <div class="body">
          <div class="row">
            <div class="price">${GBP(c.price)}</div>
            <div class="muted">${c.title}</div>
          </div>
          <div class="row">
            <span class="badge">${c.year}</span>
            <span class="badge">${KM(c.km)}</span>
            <span class="badge">${c.fuel}</span>
            <span class="badge">${c.loc||'—'}</span>
          </div>
          <div class="card-actions">
            <a class="btn btn-ghost" href="detail.html?id=${c.id}">View</a>
            <button class="btn btn-primary" data-remove="${c.id}">Remove</button>
          </div>
        </div>
      </article>
    `).join('');
  }
  renderSavedCars();

  qs('#savedCars')?.addEventListener('click', e=>{
    const btn = e.target.closest('button[data-remove]');
    if (!btn) return;
    const id = +btn.dataset.remove;
    const list = load(KEYS.SAVED, []);
    save(KEYS.SAVED, list.filter(c=>c.id!==id));
    renderSavedCars();
  });

  // ---- Saved Searches
  function renderSavedSearches(){
    const searches = load(KEYS.SEARCHES, []);
    const el = qs('#savedSearches');
    const empty = qs('#savedSearchesEmpty');
    if (!searches.length){ el.innerHTML=''; empty.style.display='block'; return; }
    empty.style.display='none';
    el.innerHTML = searches.map((s,i)=>`
      <div class="search-item">
        <div>
          <div><strong>Search ${i+1}</strong> <span class="muted">• ${new Date(s.ts||Date.now()).toLocaleString()}</span></div>
          <div class="qs">${s.query||''}</div>
        </div>
        <div>
          <a class="btn btn-ghost" href="results.html?${s.query}">Run</a>
          <button class="btn btn-primary" data-del="${i}">Delete</button>
        </div>
      </div>
    `).join('');
  }
  renderSavedSearches();

  qs('#savedSearches')?.addEventListener('click', e=>{
    const b = e.target.closest('button[data-del]');
    if (!b) return;
    const idx = +b.dataset.del;
    const searches = load(KEYS.SEARCHES, []);
    searches.splice(idx,1);
    save(KEYS.SEARCHES, searches);
    renderSavedSearches();
  });
  qs('#clearSearches')?.addEventListener('click', ()=>{
    save(KEYS.SEARCHES, []);
    renderSavedSearches();
  });

  // ---- Messages (simple demo)
  function seedMsgs(){
    const msgs = load(KEYS.MSGS, null);
    if (msgs) return;
    const demo = [
      { id:1, with:'City Cars', subject:'Kia Sportage 1.6 T‑GDi', unread:true,
        msgs:[
          { from:'City Cars', text:'Hi! The Sportage is available. Would you like a test drive?', ts: Date.now()-86400000 },
          { from:session.name, text:'Yes, this weekend works for me.', ts: Date.now()-86000000 }
        ]
      },
      { id:2, with:'Eco Cars', subject:'Hyundai Ioniq Hybrid', unread:false,
        msgs:[
          { from:'Eco Cars', text:'We just reduced the price by £500.', ts: Date.now()-3600000 }
        ]
      }
    ];
    save(KEYS.MSGS, demo);
  }
  seedMsgs();

  let currentThreadId = null;

  function renderThreads(){
    const list = load(KEYS.MSGS, []);
    const el = qs('#threads');
    el.innerHTML = list.map(t=>`
      <div class="thread-item ${t.id===currentThreadId?'active':''}" data-id="${t.id}">
        <div class="from">${t.with} ${t.unread?'<span class="badge">New</span>':''}</div>
        <div class="muted small">${t.subject}</div>
      </div>
    `).join('');
  }
  renderThreads();

  function openThread(id){
    const list = load(KEYS.MSGS, []);
    const t = list.find(x=>x.id===id);
    const view = qs('#thread');
    qs('.thread-empty')?.remove();
    if (!t){ view.innerHTML=''; return; }
    currentThreadId = id;
    list.forEach(x=>{ if(x.id===id) x.unread=false; });
    save(KEYS.MSGS, list);
    renderThreads();

    view.innerHTML = t.msgs.map(m=>`
      <div class="msg ${m.from===session.name?'me':''}">
        <div class="text">${m.text}</div>
        <div class="meta">${m.from} • ${new Date(m.ts).toLocaleString()}</div>
      </div>
    `).join('');
  }

  qs('#threads')?.addEventListener('click', e=>{
    const item = e.target.closest('.thread-item'); if(!item) return;
    openThread(+item.dataset.id);
    qsa('.thread-item').forEach(n=>n.classList.toggle('active', +n.dataset.id===+item.dataset.id));
  });

  qs('#msgForm')?.addEventListener('submit', e=>{
    e.preventDefault();
    const input = e.currentTarget.querySelector('input[name="text"]');
    const text = String(input.value||'').trim();
    if (!text || currentThreadId==null) return;
    const list = load(KEYS.MSGS, []);
    const t = list.find(x=>x.id===currentThreadId);
    t.msgs.push({ from: session.name, text, ts: Date.now() });
    save(KEYS.MSGS, list);
    input.value='';
    openThread(currentThreadId);
  });

  qs('#newMsgBtn')?.addEventListener('click', ()=>{
    const list = load(KEYS.MSGS, []);
    const id = (list[list.length-1]?.id||0)+1;
    list.push({ id, with:'New Dealer', subject:'General enquiry', unread:true, msgs:[] });
    save(KEYS.MSGS, list);
    renderThreads();
  });

  // ---- Alerts
  const alertsForm = qs('#alertsForm');
  function loadAlerts(){
    const a = load(KEYS.ALERTS, {priceDrops:true,newMatches:true,dealerMsgs:true,digestTime:'08:00'});
    alertsForm.priceDrops.checked = !!a.priceDrops;
    alertsForm.newMatches.checked = !!a.newMatches;
    alertsForm.dealerMsgs.checked = !!a.dealerMsgs;
    alertsForm.digestTime.value = a.digestTime || '08:00';
  }
  loadAlerts();
  alertsForm.addEventListener('submit', e=>{
    e.preventDefault();
    const a = {
      priceDrops: alertsForm.priceDrops.checked,
      newMatches: alertsForm.newMatches.checked,
      dealerMsgs: alertsForm.dealerMsgs.checked,
      digestTime: alertsForm.digestTime.value
    };
    save(KEYS.ALERTS, a);
    qs('#alertsSaved').textContent = 'Saved.';
    setTimeout(()=>qs('#alertsSaved').textContent='',1500);
  });

  // ---- Profile
  const users = load(KEYS.USERS, []);
  const meIdx = users.findIndex(u=> (u.email||'').toLowerCase() === (session.email||'').toLowerCase());
  const me = users[meIdx] || { name: session.name, email: session.email, pass: '' };
  const profileForm = qs('#profileForm');
  profileForm.name.value = me.name || '';
  profileForm.email.value = me.email || '';
  profileForm.addEventListener('submit', e=>{
    e.preventDefault();
    const fd = new FormData(profileForm);
    const name = String(fd.get('name')||'').trim();
    const email = String(fd.get('email')||'').trim().toLowerCase();
    const pass = String(fd.get('pass')||'');
    const pass2= String(fd.get('pass2')||'');

    if (!name || !email) { alert('Please fill name and email'); return; }
    if (pass || pass2) {
      if (pass !== pass2) { alert('Passwords do not match'); return; }
      me.pass = pass;
    }
    me.name = name; me.email = email;
    if (meIdx>=0) users[meIdx]=me; else users.push(me);
    save(KEYS.USERS, users);
    Auth.setSession({ name, email, role: session.role||'user' });
    document.getElementById('userName').textContent = name;
    document.getElementById('userEmail').textContent = email;
    qs('#profileSaved').textContent = 'Profile updated.';
    setTimeout(()=>qs('#profileSaved').textContent='',1500);
  });

  // Mobile nav open/close
  const navToggle=document.getElementById('navToggle');
  const navMenu=document.getElementById('navMenu');
  navToggle?.addEventListener('click', ()=>{
    const exp = navToggle.getAttribute('aria-expanded')==='true';
    navToggle.setAttribute('aria-expanded', String(!exp));
    navMenu.classList.toggle('open');
  });
})();