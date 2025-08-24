// app.js — global header/auth glue usable on every page
(function(){
  'use strict';

  // ===== Simple Auth (primary) =====
  const LS_USERS   = 'motoria_users';
  const LS_SESSION = 'motoria_session';

  function getUsers(){ try{return JSON.parse(localStorage.getItem(LS_USERS)||'[]')}catch(_){return []} }
  function setUsers(u){ localStorage.setItem(LS_USERS, JSON.stringify(u)); }
  function getSession(){ try{return JSON.parse(localStorage.getItem(LS_SESSION)||'null')}catch(_){return null} }
  function setSession(s){ localStorage.setItem(LS_SESSION, JSON.stringify(s)); }
  function clearSession(){ localStorage.removeItem(LS_SESSION); }

  // Seed demo accounts if first run
  if (!localStorage.getItem(LS_USERS)) {
    setUsers([
      { name:'Admin',     email:'admin@motoria.test', pass:'motoria123', role:'admin' },
      { name:'Demo User', email:'user@motoria.test',  pass:'demo123',    role:'user'  },
    ]);
  }

  // Expose globally
  window.MotoriaAuth = { getUsers, setUsers, getSession, setSession, clearSession };

  // ===== Header UI state =====
  const header   = document.getElementById('siteHeader');
  const yearEl   = document.getElementById('year');
  const navToggle= document.getElementById('navToggle');
  const navMenu  = document.getElementById('navMenu');

  // Elevation on scroll
  if (header) addEventListener('scroll',()=>header.classList.toggle('elevated', scrollY>6));
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile menu
  navToggle?.addEventListener('click', ()=>{
    const exp = navToggle.getAttribute('aria-expanded')==='true';
    navToggle.setAttribute('aria-expanded', String(!exp));
    navMenu?.classList.toggle('open');
  });

  // Render auth buttons into #authSlot (no duplicates)
  function hydrateHeader(){
    const session = getSession();
    const slot = document.getElementById('authSlot');
    if (!slot) return;

    // Clear prior render and any siblings we created earlier
    // (Anything with data-auth is ours; core nav stays intact)
    const menu = document.getElementById('navMenu');
    [...menu.querySelectorAll('[data-auth]')].forEach(n=>n.remove());
    slot.innerHTML = ''; // keep slot element for layout

    if (session) {
      // Admin CMS (only for admins) — add BEFORE slot
      if (session.role === 'admin') {
        slot.insertAdjacentHTML('beforebegin',
          `<li data-auth="1"><a class="btn btn-ghost" href="cms.html">Admin CMS</a></li>`
        );
      }

      // Account + Dealer + Sign out — add AFTER slot
      slot.insertAdjacentHTML('afterend', `
        <li data-auth="1"><a class="btn btn-ghost" href="dashboard-user.html" id="accountBtn">My account</a></li>
        <li data-auth="1"><a class="btn btn-ghost" href="dashboard-dealer.html">Dealer</a></li>
        <li data-auth="1"><button class="btn btn-primary" id="signOutBtn" type="button">Sign out</button></li>
      `);

      document.getElementById('signOutBtn')?.addEventListener('click', ()=>{
        clearSession();
        location.href = 'index.html';
      });
    } else {
      // Logged out: Sign in + List your car
      slot.insertAdjacentHTML('afterend', `
        <li data-auth="1"><a class="btn btn-ghost" href="auth.html" id="signInBtn">Sign in</a></li>
        <li data-auth="1"><a class="btn btn-primary" href="auth.html">List your car</a></li>
      `);
    }
  }
  hydrateHeader();

  // Optional saved cars badge (if .saved-count exists)
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