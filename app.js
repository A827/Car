// app.js — global header/auth glue usable on every page
(function () {
  'use strict';

  // ===== Simple Auth (primary) =====
  const LS_USERS = 'motoria_users';
  const LS_SESSION = 'motoria_session';

  function getUsers()    { try { return JSON.parse(localStorage.getItem(LS_USERS)   || '[]');   } catch { return []; } }
  function setUsers(u)   { localStorage.setItem(LS_USERS, JSON.stringify(u)); }
  function getSession()  { try { return JSON.parse(localStorage.getItem(LS_SESSION) || 'null'); } catch { return null; } }
  function setSession(s) { localStorage.setItem(LS_SESSION, JSON.stringify(s)); }
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

  // ===== Utilities =====
  function resolveSession() {
    const s = getSession();
    if (!s) return null;
    if (s.role) return s;
    const u = getUsers().find(x => (x.email||'').toLowerCase() === (s.email||'').toLowerCase());
    if (u) return { ...s, role: u.role || 'user', name: s.name || u.name };
    if ((s.email||'').toLowerCase() === 'admin@motoria.test') return { ...s, role:'admin' };
    return { ...s, role:'user' };
  }

  function ensureAuthSlot() {
    const navMenu = document.getElementById('navMenu');
    if (!navMenu) return null;
    // Add divider if not present (keeps layout consistent across pages)
    if (!navMenu.querySelector('.divider')) {
      const liDiv = document.createElement('li');
      liDiv.className = 'divider';
      liDiv.setAttribute('aria-hidden','true');
      navMenu.appendChild(liDiv);
    }
    // Ensure slot
    let slot = document.getElementById('authSlot');
    if (!slot) {
      slot = document.createElement('li');
      slot.id = 'authSlot';
      navMenu.appendChild(slot);
    }
    return slot;
  }

  function hydrateHeader() {
    // Header basics
    const header = document.getElementById('siteHeader');
    const yearEl = document.getElementById('year');
    const navToggle = document.getElementById('navToggle');
    const navMenu  = document.getElementById('navMenu');

    if (header) header.classList.toggle('elevated', scrollY > 6);
    if (yearEl)  yearEl.textContent = new Date().getFullYear();
    navToggle?.addEventListener?.('click', () => {
      const exp = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!exp));
      navMenu?.classList.toggle('open');
    }, { once: true });

    const slot = ensureAuthSlot();
    if (!slot || !navMenu) return;

    // Clear any previously injected items
    [...navMenu.querySelectorAll('[data-auth]')].forEach(n => n.remove());
    slot.innerHTML = '';

    const session = resolveSession();

    if (session) {
      // Persist recovered role if needed
      const s0 = getSession();
      if (s0 && !s0.role && session.role) setSession(session);

      // Admin CMS (admins only)
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

      document.getElementById('signOutBtn')?.addEventListener('click', () => {
        clearSession();
        location.href = 'index.html';
      });
    } else {
      // Logged out
      slot.insertAdjacentHTML('afterend', `
        <li data-auth="1"><a class="btn btn-ghost" href="auth.html" id="signInBtn">Sign in</a></li>
        <li data-auth="1"><a class="btn btn-primary" href="auth.html">List your car</a></li>
      `);
    }
  }

  // ===== Make it robust across all pages =====
  // 1) Hydrate when DOM is ready (or immediately if already loaded)
  function ready(fn){
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once:true });
    } else { fn(); }
  }

  // 2) Retry if header/nav renders late (static hosts sometimes stream HTML)
  function waitAndHydrate(retries = 20) {
    const navMenu = document.getElementById('navMenu');
    if (navMenu) { hydrateHeader(); return; }
    if (retries <= 0) return;
    setTimeout(() => waitAndHydrate(retries - 1), 100); // try for ~2s
  }

  // 3) Re-hydrate on scroll (for elevation), storage (login/logout), and navigation events
  addEventListener('scroll', () => {
    const header = document.getElementById('siteHeader');
    if (header) header.classList.toggle('elevated', scrollY > 6);
  });
  addEventListener('storage', (e) => {
    if (e.key === LS_SESSION || e.key === LS_USERS) waitAndHydrate(1);
    if (e.key === 'motoria_saved_cars') updateSavedCount();
  });
  addEventListener('pageshow', () => waitAndHydrate(1));
  addEventListener('popstate', () => waitAndHydrate(1));

  // Kick off
  ready(() => waitAndHydrate());

  // Optional saved cars badge
  function updateSavedCount(){
    const el = document.querySelector('.saved-count');
    if (!el) return;
    let count = 0;
    try { count = JSON.parse(localStorage.getItem('motoria_saved_cars')||'[]').length; } catch {}
    el.textContent = String(count);
  }
  updateSavedCount();
})();