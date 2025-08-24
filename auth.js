// auth.js — robust demo auth for Motoria (works with app.js; falls back if missing)
(function () {
  'use strict';

  // ==== Utilities & fallback Auth ====
  function ensureAuth() {
    if (window.MotoriaAuth) return window.MotoriaAuth;

    // Fallback: simple localStorage impl (in case app.js failed to load)
    var LS_USERS = 'motoria_users';
    var LS_SESSION = 'motoria_session';
    function getUsers() { try { return JSON.parse(localStorage.getItem(LS_USERS) || '[]'); } catch (e) { return []; } }
    function setUsers(u) { localStorage.setItem(LS_USERS, JSON.stringify(u)); }
    function getSession() { try { return JSON.parse(localStorage.getItem(LS_SESSION) || 'null'); } catch (e) { return null; } }
    function setSession(s) { localStorage.setItem(LS_SESSION, JSON.stringify(s)); }
    function clearSession() { localStorage.removeItem(LS_SESSION); }

    // Seed demo users if none exist
    if (!localStorage.getItem(LS_USERS)) {
      setUsers([
        { name: 'Admin',    email: 'admin@motoria.test', pass: 'motoria123', role: 'admin' },
        { name: 'Demo User',email: 'user@motoria.test',  pass: 'demo123',    role: 'user'  },
      ]);
    }
    console.warn('[auth.js] app.js not found; using fallback auth');
    return { getUsers: getUsers, setUsers: setUsers, getSession: getSession, setSession: setSession, clearSession: clearSession };
  }
  var Auth = ensureAuth();

  // Minor header niceties
  var header = document.getElementById('siteHeader');
  if (header) window.addEventListener('scroll', function(){ header.classList.toggle('elevated', window.scrollY>6); });
  var y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
  var navToggle=document.getElementById('navToggle');
  var navMenu=document.getElementById('navMenu');
  if (navToggle) navToggle.addEventListener('click', function(){
    var exp = navToggle.getAttribute('aria-expanded')==='true';
    navToggle.setAttribute('aria-expanded', String(!exp));
    if (navMenu) navMenu.classList.toggle('open');
  });

  // ==== Tabs (Sign in / Register) ====
  [].forEach.call(document.querySelectorAll('.tab'), function (btn) {
    btn.addEventListener('click', function () {
      [].forEach.call(document.querySelectorAll('.tab'), function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var view = btn.getAttribute('data-view');
      [].forEach.call(document.querySelectorAll('.form'), function (f) { f.classList.remove('active'); });
      document.getElementById(view === 'sign' ? 'signForm' : 'regForm').classList.add('active');
    });
  });

  // ==== Sign in ====
  var signForm = document.getElementById('signForm');
  if (signForm) {
    signForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(signForm);
      var email = String(fd.get('email') || '').trim().toLowerCase();
      var pass  = String(fd.get('pass')  || '');

      var user = Auth.getUsers().find(function (u) {
        return (u.email || '').toLowerCase() === email && u.pass === pass;
      });
      if (!user) { alert('Invalid email or password'); return; }

      // Persist session and THEN redirect
      Auth.setSession({ name: user.name, email: user.email, role: user.role || 'user' });

      // Small microtask delay ensures localStorage write is complete before navigation on some browsers
      setTimeout(function(){
        location.href = 'dashboard-user.html';
      }, 0);
    });
  }

  // ==== Register ====
  var regForm = document.getElementById('regForm');
  if (regForm) {
    regForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(regForm);
      var name  = String(fd.get('name')  || '').trim();
      var email = String(fd.get('email') || '').trim().toLowerCase();
      var pass  = String(fd.get('pass')  || '');

      if (!name || !email || !pass) { alert('Please fill all fields'); return; }

      var users = Auth.getUsers();
      if (users.some(function (u) { return (u.email || '').toLowerCase() === email; })) {
        alert('Email already registered');
        return;
      }

      users.push({ name: name, email: email, pass: pass, role: 'user' });
      Auth.setUsers(users);
      Auth.setSession({ name: name, email: email, role: 'user' });

      setTimeout(function(){
        location.href = 'dashboard-user.html';
      }, 0);
    });
  }
})();