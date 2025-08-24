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
  const header    = document.getElementById('siteHeader');
  const yearEl    = document.getElementById('year');
  const navToggle = document.getElementById('navToggle');
  const navMenu   = document.getElementById('navMenu');

  // Elevation on scroll
  if (header) addEventListener('scroll',()=>header.classList.toggle('elevated', scrollY>6));
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile menu
  navToggle?.addEventListener('click', ()=>{
    const exp = navToggle.getAttribute('aria-expanded')==='true';
    navToggle.setAttribute('aria-expanded', String(!exp));
    navMenu?.classList.toggle('open');
  });

  // Derive a trusted role for the current session
  function resolveSession(){
    const s = getSession();
    if (!s) return null;
    if (s.role) return s; // already has role
    // try to recover role from Users DB by email
    const u = getUsers().find(x => (x.email||'').toLowerCase() === (s.email||'').toLowerCase());
    if (u) return { ...s, role: u.role || 'user', name: s.name || u.name };
    // fallback: treat admin email as admin (in case old data exists)
    if ((s.email||'').toLowerCase() === 'admin@motoria.test') return { ...s, role:'admin' };
    return { ...s, role:'user' };
  }

  // Render auth buttons into #authSlot (no duplicates)
  function hydrateHeader(){
    const slot = document.getElementById('authSlot');
    const menu = document.getElementById('navMenu');
    if (!slot || !menu) return;

    // Clear prior render
    [...menu.querySelectorAll('[data-auth]')].forEach(n=>n.remove());
    slot.innerHTML = '';

    const session = resolveSession();

    if (session) {
      // Update session if we recovered a role
      const existing = getSession();
      if (existing && !existing.role && session.role) setSession(session);

      // Admin CMS (only for admins)
      if (session.role === 'admin') {
        slot.insertAdjacentHTML('beforebegin',
          `<li data-auth="1"><a class="btn btn-ghost" href="cms.html">Admin CMS</a></li>`
        );
      }

      // Account + Dealer + Sign out
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

  // Re-hydrate when session/users change (other tab or after login)
  window.addEventListener('storage', (e)=>{
    if (e.key === LS_SESSION || e.key === LS_USERS) hydrateHeader();
    if (e.key === 'motoria_saved_cars') updateSavedCount();
  });

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
})();