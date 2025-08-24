// dashboard.js — user dashboard controller (with auth fallback)
(function(){
  'use strict';

  // ---- Ensure Auth (fallback if app.js missing)
  function ensureAuth(){
    if (window.MotoriaAuth) return window.MotoriaAuth;
    var LS_USERS='motoria_users', LS_SESSION='motoria_session';
    function getUsers(){ try{return JSON.parse(localStorage.getItem(LS_USERS)||'[]')}catch(e){return []} }
    function setUsers(u){ localStorage.setItem(LS_USERS, JSON.stringify(u)); }
    function getSession(){ try{return JSON.parse(localStorage.getItem(LS_SESSION)||'null')}catch(e){return null} }
    function setSession(s){ localStorage.setItem(LS_SESSION, JSON.stringify(s)); }
    function clearSession(){ localStorage.removeItem(LS_SESSION); }
    if(!localStorage.getItem(LS_USERS)){
      setUsers([
        {name:'Admin',email:'admin@motoria.test',pass:'motoria123',role:'admin'},
        {name:'Demo User',email:'user@motoria.test',pass:'demo123',role:'user'}
      ]);
    }
    console.warn('[dashboard.js] app.js not found; using fallback auth');
    return { getUsers, setUsers, getSession, setSession, clearSession };
  }
  var Auth = ensureAuth();

  // ---- Auth guard
  var session = Auth.getSession();
  if (!session) { location.href = './auth.html'; return; }

  // ---- Basics
  var header = document.getElementById('siteHeader');
  window.addEventListener('scroll',()=>header.classList.toggle('elevated', scrollY>6));
  var year = document.getElementById('year'); if (year) year.textContent = new Date().getFullYear();
  var navToggle=document.getElementById('navToggle');
  var navMenu=document.getElementById('navMenu');
  navToggle?.addEventListener('click', ()=>{
    var exp = navToggle.getAttribute('aria-expanded')==='true';
    navToggle.setAttribute('aria-expanded', String(!exp));
    navMenu?.classList.toggle('open');
  });

  // ---- User header box
  document.getElementById('userName').textContent = session.name || 'User';
  document.getElementById('userEmail').textContent = session.email || '';

  // ---- Keys & helpers
  var KEYS = {
    SAVED:'motoria_saved_cars',
    SEARCHES:'saved_searches',
    MSGS:'motoria_messages',
    ALERTS:'motoria_alerts',
    USERS:'motoria_users',
    SESSION:'motoria_session'
  };
  var qs=(s,el=document)=>el.querySelector(s);
  var qsa=(s,el=document)=>[].slice.call(el.querySelectorAll(s));
  var GBP=n=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(n||0);
  var KM =n=>`${(n||0).toLocaleString('en-GB')} km`;
  var load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}catch(_){return d}};
  var save=(k,v)=>localStorage.setItem(k, JSON.stringify(v));

  // Seed some saved cars for first-time UX
  (function seed(){
    var cur=load(KEYS.SAVED,[]);
    if(cur.length) return;
    save(KEYS.SAVED,[
      { id:6, title:'Nissan Leaf 40kWh', price:12900, year:2019, km:47000, fuel:'Electric', img:'assets/cars/leaf.jpg', loc:'Liverpool' },
      { id:10,title:'Hyundai Ioniq Hybrid', price:15800, year:2018, km:62000, fuel:'Hybrid', img:'assets/cars/ioniq.jpg', loc:'Cardiff' },
    ]);
  })();

  // ---- Tabs
  var panels = {
    'saved-cars': qs('#panel-saved-cars'),
    'saved-searches': qs('#panel-saved-searches'),
    'messages': qs('#panel-messages'),
    'alerts': qs('#panel-alerts'),
    'profile': qs('#panel-profile'),
  };
  qsa('.tablink').forEach(function(btn){
    btn.addEventListener('click', function(){
      qsa('.tablink').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      var view=btn.dataset.view;
      Object.values(panels).forEach(p=>p.classList.remove('active'));
      panels[view].classList.add('active');
      if(view==='messages') renderThreads();
    });
  });

  // ---- Saved Cars
  function renderSavedCars(){
    var list=load(KEYS.SAVED,[]);
    var wrap=qs('#savedCars');
    var empty=qs('#savedCarsEmpty');
    if(!list.length){ wrap.innerHTML=''; empty.style.display='block'; return; }
    empty.style.display='none';
    wrap.innerHTML=list.map(function(c){
      return `
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
        </article>`;
    }).join('');
  }
  renderSavedCars();
  qs('#savedCars')?.addEventListener('click', function(e){
    var btn=e.target.closest('button[data-remove]'); if(!btn) return;
    var id=+btn.dataset.remove;
    var list=load(KEYS.SAVED,[]).filter(c=>c.id!==id);
    save(KEYS.SAVED,list); renderSavedCars();
  });

  // ---- Saved Searches
  function renderSavedSearches(){
    var searches=load(KEYS.SEARCHES,[]);
    var el=qs('#savedSearches'), empty=qs('#savedSearchesEmpty');
    if(!searches.length){ el.innerHTML=''; empty.style.display='block'; return; }
    empty.style.display='none';
    el.innerHTML=searches.map(function(s,i){
      return `
        <div class="search-item">
          <div>
            <div><strong>Search ${i+1}</strong> <span class="muted">• ${new Date(s.ts||Date.now()).toLocaleString()}</span></div>
            <div class="qs">${s.query||''}</div>
          </div>
          <div>
            <a class="btn btn-ghost" href="results.html?${s.query}">Run</a>
            <button class="btn btn-primary" data-del="${i}">Delete</button>
          </div>
        </div>`;
    }).join('');
  }
  renderSavedSearches();
  qs('#savedSearches')?.addEventListener('click', function(e){
    var b=e.target.closest('button[data-del]'); if(!b) return;
    var idx=+b.dataset.del;
    var searches=load(KEYS.SEARCHES,[]);
    searches.splice(idx,1); save(KEYS.SEARCHES,searches); renderSavedSearches();
  });
  qs('#clearSearches')?.addEventListener('click', function(){
    save(KEYS.SEARCHES,[]); renderSavedSearches();
  });

  // ---- Messages (simple)
  (function seedMsgs(){
    var msgs=load(KEYS.MSGS,null);
    if(msgs) return;
    save(KEYS.MSGS,[
      { id:1, with:'City Cars', subject:'Kia Sportage 1.6 T‑GDi', unread:true,
        msgs:[
          { from:'City Cars', text:'Hi! The Sportage is available. Would you like a test drive?', ts: Date.now()-86400000 },
          { from:session.name, text:'Yes, this weekend works for me.', ts: Date.now()-86000000 }
        ]
      }
    ]);
  })();

  var currentThreadId=null;
  function renderThreads(){
    var list=load(KEYS.MSGS,[]);
    var el=qs('#threads');
    el.innerHTML=list.map(function(t){
      return `<div class="thread-item ${t.id===currentThreadId?'active':''}" data-id="${t.id}">
        <div class="from">${t.with} ${t.unread?'<span class="badge">New</span>':''}</div>
        <div class="muted small">${t.subject}</div>
      </div>`;
    }).join('');
  }
  renderThreads();
  function openThread(id){
    var list=load(KEYS.MSGS,[]);
    var t=list.find(x=>x.id===id);
    var view=qs('#thread');
    qs('.thread-empty')?.remove();
    if(!t){ view.innerHTML=''; return; }
    currentThreadId=id;
    t.unread=false; save(KEYS.MSGS,list); renderThreads();
    view.innerHTML=t.msgs.map(function(m){
      return `<div class="msg ${m.from===session.name?'me':''}">
        <div class="text">${m.text}</div>
        <div class="meta">${m.from} • ${new Date(m.ts).toLocaleString()}</div>
      </div>`;
    }).join('');
  }
  qs('#threads')?.addEventListener('click', function(e){
    var item=e.target.closest('.thread-item'); if(!item) return;
    openThread(+item.dataset.id);
    qsa('.thread-item').forEach(n=>n.classList.toggle('active', +n.dataset.id===+item.dataset.id));
  });
  qs('#msgForm')?.addEventListener('submit', function(e){
    e.preventDefault();
    var input=e.currentTarget.querySelector('input[name="text"]');
    var text=String(input.value||'').trim();
    if(!text || currentThreadId==null) return;
    var list=load(KEYS.MSGS,[]);
    var t=list.find(x=>x.id===currentThreadId);
    t.msgs.push({ from:session.name, text, ts:Date.now() });
    save(KEYS.MSGS,list); input.value=''; openThread(currentThreadId);
  });
  qs('#newMsgBtn')?.addEventListener('click', function(){
    var list=load(KEYS.MSGS,[]);
    var id=(list[list.length-1]?.id||0)+1;
    list.push({ id, with:'New Dealer', subject:'General enquiry', unread:true, msgs:[] });
    save(KEYS.MSGS,list); renderThreads();
  });

  // ---- Alerts
  var alertsForm=qs('#alertsForm');
  function loadAlerts(){
    var a=load(KEYS.ALERTS,{priceDrops:true,newMatches:true,dealerMsgs:true,digestTime:'08:00'});
    alertsForm.priceDrops.checked=!!a.priceDrops;
    alertsForm.newMatches.checked=!!a.newMatches;
    alertsForm.dealerMsgs.checked=!!a.dealerMsgs;
    alertsForm.digestTime.value=a.digestTime||'08:00';
  }
  loadAlerts();
  alertsForm.addEventListener('submit', function(e){
    e.preventDefault();
    var a={
      priceDrops: alertsForm.priceDrops.checked,
      newMatches: alertsForm.newMatches.checked,
      dealerMsgs: alertsForm.dealerMsgs.checked,
      digestTime: alertsForm.digestTime.value
    };
    save(KEYS.ALERTS,a);
    qs('#alertsSaved').textContent='Saved.'; setTimeout(()=>qs('#alertsSaved').textContent='',1500);
  });

  // ---- Profile
  var users=load(KEYS.USERS,[]);
  var meIdx=users.findIndex(u=>(u.email||'').toLowerCase()===(session.email||'').toLowerCase());
  var me = users[meIdx] || { name:session.name, email:session.email, pass:'' };
  var profileForm=qs('#profileForm');
  profileForm.name.value=me.name||'';
  profileForm.email.value=me.email||'';
  profileForm.addEventListener('submit', function(e){
    e.preventDefault();
    var fd=new FormData(profileForm);
    var name=String(fd.get('name')||'').trim();
    var email=String(fd.get('email')||'').trim().toLowerCase();
    var pass=String(fd.get('pass')||'');
    var pass2=String(fd.get('pass2')||'');
    if(!name || !email){ alert('Please fill name and email'); return; }
    if(pass || pass2){ if(pass!==pass2){ alert('Passwords do not match'); return; } me.pass=pass; }
    me.name=name; me.email=email;
    if(meIdx>=0) users[meIdx]=me; else users.push(me);
    save(KEYS.USERS,users);
    Auth.setSession({ name, email, role: session.role||'user' });
    document.getElementById('userName').textContent=name;
    document.getElementById('userEmail').textContent=email;
    qs('#profileSaved').textContent='Profile updated.'; setTimeout(()=>qs('#profileSaved').textContent='',1500);
  });
})();