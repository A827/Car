// app.js — global header/auth glue usable on every page
(function(){
  'use strict';

  // ===== Simple Auth (primary) =====
  const LS_USERS   = 'motoria_users';
  const LS_SESSION = 'motoria_session';

  function getUsers(){ try{ return JSON.parse(localStorage.getItem(LS_USERS)   || '[]'); }catch(_){ return []; } }
  function setUsers(u){ localStorage.setItem(LS_USERS, JSON.stringify(u)); }
  function getSession(){ try{ return JSON.parse(localStorage.getItem(LS_SESSION) || 'null'); }catch(_){ return null; } }
  function setSession(s){ localStorage.setItem(LS_SESSION, JSON.stringify(s)); }
  function clearSession(){ localStorage.removeItem(LS_SESSION); }

  // Seed demo accounts on first run
  if (!localStorage.getItem(LS_USERS)) {
    setUsers([
      { name:'Admin',     email:'admin@motoria.test', pass:'motoria123', role:'admin' },
      { name:'Demo User', email:'user@motoria.test',  pass:'demo123',    role:'user'  },
    ]);
  }

  // Expose to pages
  window.MotoriaAuth = { getUsers, setUsers, getSession, setSession, clearSession };

  // ===== Header UI state =====
  const header    = document.getElementById('siteHeader');
  const yearEl    = document.getElementById('year');
  const navToggle = document.getElementById('navToggle');
  const navMenu   = document.getElementById('navMenu');

  // Elevation on scroll
  if (header) addEventListener('scroll', ()=>header.classList.toggle('elevated', scrollY>6));
  if (yearEl)  yearEl.textContent = new Date().getFullYear();

  // Mobile menu
  navToggle?.addEventListener('click', ()=>{
    const exp = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!exp));
    navMenu?.classList.toggle('open');
  });

  // Helper: route to correct place for "List your car"
  function goListYourCar(){
    const s = getSession();
    if (s) {
      // any logged-in user can access dealer dashboard in this demo
      location.href = 'dashboard-dealer.html';
    } else {
      // send through auth with post-login redirect
      location.href = 'auth.html?next=dashboard-dealer.html';
    }
  }

  // Event delegation: any link/button that *looks like* "List your car" or has data-action attr
  document.addEventListener('click', (e)=>{
    const el = e.target.closest('a,button');
    if (!el) return;

    const wantsList =
      el.matches('[data-action="list-car"]') ||
      /list\s*your\s*car/i.test((el.textContent || '').trim());

    if (wantsList){
      e.preventDefault();
      goListYourCar();
    }
  });

  // Rewrite header auth area depending on session
  function hydrateHeader(){
    const session = getSession();
    const menu = document.getElementById('navMenu');
    if (!menu) return;

    // Remove any previously-rendered auth nodes
    [...menu.querySelectorAll('[data-auth]')].forEach(n=>n.remove());

    // Always keep a divider before auth controls
    const liDivider = document.createElement('li');
    liDivider.className = 'divider';
    liDivider.setAttribute('aria-hidden','true');
    liDivider.setAttribute('data-auth','1');
    menu.appendChild(liDivider);

    if (session) {
      // Admin CMS (visible on all pages when logged in)
      const liCms = document.createElement('li'); liCms.setAttribute('data-auth','1');
      liCms.innerHTML = `<a class="btn btn-ghost" href="admin.html">Admin CMS</a>`;
      menu.appendChild(liCms);

      // Account + Dealer
      const liAccount = document.createElement('li'); liAccount.setAttribute('data-auth','1');
      liAccount.innerHTML = `<a class="btn btn-ghost" href="dashboard-user.html">My account</a>`;
      menu.appendChild(liAccount);

      const liDealer = document.createElement('li'); liDealer.setAttribute('data-auth','1');
      liDealer.innerHTML = `<a class="btn btn-ghost" href="dashboard-dealer.html">Dealer</a>`;
      menu.appendChild(liDealer);

      // Sign out
      const liOut = document.createElement('li'); liOut.setAttribute('data-auth','1');
      liOut.innerHTML = `<button class="btn btn-primary" id="signOutBtn" type="button">Sign out</button>`;
      menu.appendChild(liOut);

      document.getElementById('signOutBtn')?.addEventListener('click', ()=>{
        clearSession();
        location.href = 'index.html';
      });
    } else {
      // Sign in + List your car (click handler will route properly)
      const liIn = document.createElement('li'); liIn.setAttribute('data-auth','1');
      liIn.innerHTML = `<a class="btn btn-ghost" href="auth.html" id="signInBtn">Sign in</a>`;
      menu.appendChild(liIn);

      const liList = document.createElement('li'); liList.setAttribute('data-auth','1');
      liList.innerHTML = `<a class="btn btn-primary" href="auth.html" data-action="list-car">List your car</a>`;
      menu.appendChild(liList);
    }
  }
  hydrateHeader();

  // Optional: saved count badge
  function updateSavedCount(){
    const el = document.querySelector('.saved-count');
    if (!el) return;
    let count = 0;
    try {
      const saved = JSON.parse(localStorage.getItem('motoria_saved_cars')||'[]');
      count = saved.length;
    } catch(_){}
    el.textContent = String(count);
  }
  updateSavedCount();
  window.addEventListener('storage', (e)=>{ if (e.key==='motoria_saved_cars') updateSavedCount(); });

})();