// app.js — global header/auth glue usable on every page
(function(){
  'use strict';

  // ===== Simple Auth (primary) =====
  const LS_USERS = 'motoria_users';
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

  // Expose a single source so all pages can use it
  window.MotoriaAuth = { getUsers, setUsers, getSession, setSession, clearSession };

  // ===== Header UI state =====
  const header = document.getElementById('siteHeader');
  const yearEl = document.getElementById('year');
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

  // Rewrite header buttons depending on auth state
  function hydrateHeader(){
    const session = getSession();
    const menu = document.getElementById('navMenu');
    if (!menu) return;

    // Remove any previous “account” block so we can re-render
    // (keeps static menu items like Buy/Sell/Finance/Dealers)
    [...menu.querySelectorAll('[data-auth]')].forEach(n=>n.remove());

    if (session) {
      const liDivider = document.createElement('li');
      liDivider.className = 'divider';
      liDivider.setAttribute('aria-hidden','true');
      liDivider.setAttribute('data-auth','1');

      const liAccount = document.createElement('li'); liAccount.setAttribute('data-auth','1');
      liAccount.innerHTML = `<a class="btn btn-ghost" href="dashboard-user.html" id="accountBtn">My account</a>`;

      const liDealer = document.createElement('li'); liDealer.setAttribute('data-auth','1');
      liDealer.innerHTML = `<a class="btn btn-ghost" href="dashboard-dealer.html">Dealer</a>`;

      const liOut = document.createElement('li'); liOut.setAttribute('data-auth','1');
      liOut.innerHTML = `<button class="btn btn-primary" id="signOutBtn" type="button">Sign out</button>`;

      menu.appendChild(liDivider);
      menu.appendChild(liAccount);
      menu.appendChild(liDealer);
      menu.appendChild(liOut);

      document.getElementById('signOutBtn')?.addEventListener('click', ()=>{
        clearSession();
        // return to homepage after sign out
        location.href = 'index.html';
      });
    } else {
      const liDivider = document.createElement('li');
      liDivider.className = 'divider';
      liDivider.setAttribute('aria-hidden','true');
      liDivider.setAttribute('data-auth','1');

      const liIn = document.createElement('li'); liIn.setAttribute('data-auth','1');
      liIn.innerHTML = `<a class="btn btn-ghost" href="auth.html" id="signInBtn">Sign in</a>`;

      const liList = document.createElement('li'); liList.setAttribute('data-auth','1');
      liList.innerHTML = `<a class="btn btn-primary" href="auth.html">List your car</a>`;

      menu.appendChild(liDivider);
      menu.appendChild(liIn);
      menu.appendChild(liList);
    }
  }
  hydrateHeader();

  // Optional little badge to show saved cars count (if .saved-count exists)
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