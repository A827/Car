// app.js — global header/auth glue usable on every page
(function () {
  'use strict';

  // ===== Simple Auth =====
  const LS_USERS = 'motoria_users';
  const LS_SESSION = 'motoria_session';

  const getUsers    = () => { try { return JSON.parse(localStorage.getItem(LS_USERS)   || '[]');   } catch { return []; } };
  const setUsers    = (u) => localStorage.setItem(LS_USERS, JSON.stringify(u));
  const getSession  = () => { try { return JSON.parse(localStorage.getItem(LS_SESSION) || 'null'); } catch { return null; } };
  const setSession  = (s) => localStorage.setItem(LS_SESSION, JSON.stringify(s));
  const clearSession= () => localStorage.removeItem(LS_SESSION);

  // Seed demo accounts if first run
  if (!localStorage.getItem(LS_USERS)) {
    setUsers([
      { name:'Admin',     email:'admin@motoria.test', pass:'motoria123', role:'admin' },
      { name:'Demo User', email:'user@motoria.test',  pass:'demo123',    role:'user'  },
    ]);
  }

  // Expose
  window.MotoriaAuth = { getUsers, setUsers, getSession, setSession, clearSession };

  // ===== Helpers =====
  function resolveSession() {
    const s = getSession();
    if (!s) return null;
    if (s.role) return s;
    const u = getUsers().find(x => (x.email||'').toLowerCase() === (s.email||'').toLowerCase());
    if (u) return { ...s, role: u.role || 'user', name: s.name || u.name };
    if ((s.email||'').toLowerCase() === 'admin@motoria.test') return { ...s, role: 'admin' };
    return { ...s, role: 'user' };
  }

  function ensureAuthSlot() {
    const navMenu = document.getElementById('navMenu');
    if (!navMenu) return null;

    // Remove any static "Sign in" or "List your car" that might be hard-coded in HTML
    navMenu.querySelectorAll('a[href$="auth.html"]').forEach(a => a.closest('li')?.remove());

    // Ensure divider exists exactly once
    if (!navMenu.querySelector('.divider')) {
      const liDiv = document.createElement('li');
      liDiv.className = 'divider';
      liDiv.setAttribute('aria-hidden','true');
      navMenu.appendChild(liDiv);
    }

    // Ensure #authSlot exists
    let slot = document.getElementById('authSlot');
    if (!slot) {
      slot = document.createElement('li');
      slot.id = 'authSlot';
      navMenu.appendChild(slot);
    }
    return slot;
  }

  function hydrateHeader() {
    const header    = document.getElementById('siteHeader');
    const yearEl    = document.getElementById('year');
    const navToggle = document.getElementById('navToggle');
    const navMenu   = document.getElementById('navMenu');

    if (header) header.classList.toggle('elevated', scrollY > 6);
    if (yearEl)  yearEl.textContent = new Date().getFullYear();
    navToggle?.addEventListener?.('click', () => {
      const exp = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!exp));
      navMenu?.classList.toggle('open');
    }, { once: true });

    const slot = ensureAuthSlot();
    if (!slot || !navMenu) return;

    // Clear previously injected items
    [...navMenu.querySelectorAll('[data-auth]')].forEach(n => n.remove());
    slot.innerHTML = '';

    // Decide what to render
    const s = resolveSession();
    if (s) {
      // Persist recovered role if needed
      const s0 = getSession();
      if (s0 && !s0.role && s.role) setSession(s);

      // Admin CMS (admins only)
      if (s.role === 'admin') {
        slot.insertAdjacentHTML('beforebegin',
          `<li data-auth="1"><a class="btn btn-ghost" href="cms.html">Admin CMS</a></li>`
        );
      }

      // Account + Dealer + Sign out (no Sign in anywhere)
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
      // Logged out: show Sign in + List your car
      slot.insertAdjacentHTML('afterend', `
        <li data-auth="1"><a class="btn btn-ghost" href="auth.html" id="signInBtn">Sign in</a></li>
        <li data-auth="1"><a class="btn btn-primary" href="auth.html">List your car</a></li>
      `);
    }
  }

  // Robust hydration across all pages
  function ready(fn){
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once:true });
    } else { fn(); }
  }
  function waitAndHydrate(retries = 20) {
    const navMenu = document.getElementById('navMenu');
    if (navMenu) { hydrateHeader(); return; }
    if (retries <= 0) return;
    setTimeout(() => waitAndHydrate(retries - 1), 100);
  }

  // Elevation on scroll + re-hydrate on storage/nav changes
  addEventListener('scroll', () => {
    const header = document.getElementById('siteHeader');
    if (header) header.classList.toggle('elevated', scrollY > 6);
  });
  addEventListener('storage', (e) => {
    if (e.key === LS_SESSION || e.key === LS_USERS) waitAndHydrate(1);
  });
  addEventListener('pageshow', () => waitAndHydrate(1));
  addEventListener('popstate', () => waitAndHydrate(1));

  ready(() => waitAndHydrate());
})();