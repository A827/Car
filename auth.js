document.querySelectorAll('.tab').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const v = btn.dataset.view;
    document.querySelectorAll('.form').forEach(f=>f.classList.remove('active'));
    document.getElementById(v==='sign'?'signForm':'regForm').classList.add('active');
  });
});

document.getElementById('signForm').addEventListener('submit', e=>{
  e.preventDefault(); alert('Signed in (demo)');
});
document.getElementById('regForm').addEventListener('submit', e=>{
  e.preventDefault(); alert('Account created (demo)');
});