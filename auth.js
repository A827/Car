// auth.js — demo auth (works with app.js, falls back to localStorage if absent)
(function () {
  'use strict';

  // Fallback if app.js isn't loaded yet
  var Auth = window.MotoriaAuth || (function () {
    var LS_USERS = 'motoria_users';
    var LS_SESSION = 'motoria_session';
    function getUsers() { try { return JSON.parse(localStorage.getItem(LS_USERS) || '[]'); } catch (e) { return []; } }
    function setUsers(u) { localStorage.setItem(LS_USERS, JSON.stringify(u)); }
    function getSession() { try { return JSON.parse(localStorage.getItem(LS_SESSION) || 'null'); } catch (e) { return null; } }
    function setSession(s) { localStorage.setItem(LS_SESSION, JSON.stringify(s)); }
    function clearSession() { localStorage.removeItem(LS_SESSION); }
    // Seed users if none exist
    if (!localStorage.getItem(LS_USERS)) {
      setUsers([
        { name: 'Admin', email: 'admin@motoria.test', pass: 'motoria123', role: 'admin' },
        { name: 'Demo User', email: 'user@motoria.test', pass: 'demo123', role: 'user' },
      ]);
    }
    return { getUsers: getUsers, setUsers: setUsers, getSession: getSession, setSession: setSession, clearSession: clearSession };
  })();

  // Tabs
  Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (btn) {
    btn.addEventListener('click', function () {
      Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var view = btn.getAttribute('data-view');
      Array.prototype.forEach.call(document.querySelectorAll('.form'), function (f) { f.classList.remove('active'); });
      document.getElementById(view === 'sign' ? 'signForm' : 'regForm').classList.add('active');
    });
  });

  // Sign in
  var signForm = document.getElementById('signForm');
  if (signForm) {
    signForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(signForm);
      var email = String(fd.get('email') || '').trim().toLowerCase();
      var pass = String(fd.get('pass') || '');
      var user = Auth.getUsers().find(function (u) {
        return (u.email || '').toLowerCase() === email && u.pass === pass;
      });
      if (!user) { alert('Invalid email or password'); return; }
      Auth.setSession({ name: user.name, email: user.email, role: user.role || 'user' });
      location.href = 'dashboard-user.html';
    });
  }

  // Register
  var regForm = document.getElementById('regForm');
  if (regForm) {
    regForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(regForm);
      var name = String(fd.get('name') || '').trim();
      var email = String(fd.get('email') || '').trim().toLowerCase();
      var pass = String(fd.get('pass') || '');
      if (!name || !email || !pass) { alert('Please fill all fields'); return; }
      var users = Auth.getUsers();
      if (users.some(function (u) { return (u.email || '').toLowerCase() === email; })) {
        alert('Email already registered');
        return;
      }
      users.push({ name: name, email: email, pass: pass, role: 'user' });
      Auth.setUsers(users);
      Auth.setSession({ name: name, email: email, role: 'user' });
      location.href = 'dashboard-user.html';
    });
  }
})();