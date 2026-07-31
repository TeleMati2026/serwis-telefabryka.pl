'use strict';

const cfg = window.TELEFABRYKA_CONFIG || {};
const configured = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);
const demoRows = [
  { id: 1, brand: 'Apple', model: 'iPhone 13', service: 'Wymiana wyświetlacza OLED', price: 449, note: 'Część + montaż', active: true },
  { id: 2, brand: 'Apple', model: 'iPhone 12', service: 'Wymiana baterii', price: 199, note: 'Gwarancja serwisowa', active: true },
  { id: 3, brand: 'Samsung', model: 'Galaxy S22', service: 'Wymiana złącza ładowania', price: 249, note: 'Diagnostyka w cenie', active: true },
  { id: 4, brand: 'Samsung', model: 'Galaxy A54', service: 'Wymiana wyświetlacza', price: 399, note: 'Cena orientacyjna', active: true },
  { id: 5, brand: 'Xiaomi', model: 'Redmi Note 12', service: 'Wymiana baterii', price: 169, note: 'Część + montaż', active: true },
  { id: 6, brand: 'Xiaomi', model: 'POCO X5', service: 'Wymiana wyświetlacza', price: 329, note: 'Gwarancja serwisowa', active: true }
];

let rows = [];
let token = localStorage.getItem('telefabryka_token') || '';
let editId = null;
let isAdmin = false;
const $ = s => document.querySelector(s);
const money = v => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(Number(v));
const escapeHtml = (v='') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));

async function api(path, options = {}) {
  const headers = { apikey: cfg.supabaseAnonKey, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${cfg.supabaseUrl}${path}`, { ...options, headers });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(data?.message || data?.error_description || data?.hint || `Błąd ${res.status}`);
  return data;
}

function render() {
  const q = $('#search').value.toLowerCase().trim();
  const brand = $('#brandFilter').value;
  const filtered = rows.filter(r => r.active !== false && (!brand || r.brand === brand) && `${r.brand} ${r.model} ${r.service} ${r.note || ''}`.toLowerCase().includes(q));
  $('#priceList').innerHTML = filtered.length ? filtered.map(r => `
    <article class="card">
      <div class="card-top"><span class="pill">${escapeHtml(r.brand)}</span><span class="price">od ${money(r.price)}</span></div>
      <h3>${escapeHtml(r.model)}</h3><p>${escapeHtml(r.service)}</p>
      ${r.note ? `<small>${escapeHtml(r.note)}</small>` : ''}
      <span class="availability">Cena orientacyjna</span>
    </article>`).join('') : '<div class="empty">Brak pasujących pozycji.</div>';

  const brands = [...new Set(rows.filter(r => r.active !== false).map(r => r.brand))].sort();
  const current = $('#brandFilter').value;
  $('#brandFilter').innerHTML = '<option value="">Wszystkie marki</option>' + brands.map(b => `<option ${b === current ? 'selected' : ''}>${escapeHtml(b)}</option>`).join('');
  renderAdmin();
}

function renderAdmin() {
  $('#adminList').innerHTML = rows.length ? rows.map(r => `<div class="admin-row ${r.active === false ? 'inactive' : ''}"><div><b>${escapeHtml(r.brand)} ${escapeHtml(r.model)}</b><span>${escapeHtml(r.service)} · ${money(r.price)}${r.active === false ? ' · UKRYTA' : ''}</span></div><div><button data-edit="${r.id}">Edytuj</button><button class="danger" data-delete="${r.id}">Usuń</button></div></div>`).join('') : '<p class="empty">Brak pozycji.</p>';
}

async function loadRows() {
  if (!configured) {
    rows = demoRows;
    $('#status').textContent = 'Wersja demonstracyjna. Po podłączeniu bazy administrator będzie zapisywał ceny online.';
    render();
    return;
  }
  try {
    const data = await api('/rest/v1/prices?select=*&order=brand.asc,model.asc');
    rows = Array.isArray(data) ? data : [];
    $('#status').textContent = '';
  } catch (e) {
    $('#status').textContent = `Nie udało się pobrać cennika: ${e.message}`;
    rows = [];
  }
  render();
}

async function verifyAdmin() {
  if (!configured || !token) return false;
  try {
    const me = await api('/auth/v1/user', { method: 'GET' });
    const admins = await api(`/rest/v1/admins?user_id=eq.${encodeURIComponent(me.id)}&select=user_id`);
    isAdmin = Array.isArray(admins) && admins.length > 0;
    return isAdmin;
  } catch {
    token = ''; isAdmin = false; localStorage.removeItem('telefabryka_token'); return false;
  }
}

$('#search').addEventListener('input', render);
$('#brandFilter').addEventListener('change', render);
document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => btn.closest('dialog').close()));

$('#adminBtn').addEventListener('click', async () => {
  if (!configured) { $('#loginError').textContent = 'Najpierw podłącz Supabase według instrukcji README.'; $('#loginDialog').showModal(); return; }
  if (await verifyAdmin()) $('#adminDialog').showModal(); else $('#loginDialog').showModal();
});

$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault(); $('#loginError').textContent = '';
  if (!configured) { $('#loginError').textContent = 'Brak konfiguracji Supabase.'; return; }
  try {
    const data = await api('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email: $('#email').value.trim(), password: $('#password').value }) });
    token = data.access_token; localStorage.setItem('telefabryka_token', token);
    if (!(await verifyAdmin())) throw new Error('To konto nie ma uprawnień administratora.');
    $('#loginDialog').close(); $('#adminDialog').showModal();
  } catch (e) {
    token = ''; localStorage.removeItem('telefabryka_token'); $('#loginError').textContent = e.message;
  }
});

$('#logoutBtn').addEventListener('click', () => { token=''; isAdmin=false; localStorage.removeItem('telefabryka_token'); $('#adminDialog').close(); });

$('#priceForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!(await verifyAdmin())) return alert('Sesja wygasła. Zaloguj się ponownie.');
  const item = { brand: $('#brand').value.trim(), model: $('#model').value.trim(), service: $('#service').value.trim(), price: Number($('#price').value), note: $('#note').value.trim(), active: $('#active').checked };
  try {
    if (editId) await api(`/rest/v1/prices?id=eq.${editId}`, { method: 'PATCH', body: JSON.stringify(item) });
    else await api('/rest/v1/prices', { method: 'POST', body: JSON.stringify(item) });
    resetForm(); await loadRows();
  } catch (e) { alert(e.message); }
});

$('#adminList').addEventListener('click', async e => {
  const id = Number(e.target.dataset.edit || e.target.dataset.delete);
  if (!id) return;
  if (e.target.dataset.edit) {
    const r = rows.find(x => Number(x.id) === id); if (!r) return;
    editId = id; ['brand','model','service','price','note'].forEach(k => $(`#${k}`).value = r[k] ?? '');
    $('#active').checked = r.active !== false; $('#saveBtn').textContent = 'Zapisz zmiany'; $('#cancelEdit').classList.remove('hidden');
  } else if (confirm('Usunąć tę pozycję?')) {
    try { await api(`/rest/v1/prices?id=eq.${id}`, { method: 'DELETE' }); await loadRows(); } catch (err) { alert(err.message); }
  }
});

function resetForm() { editId = null; $('#priceForm').reset(); $('#active').checked = true; $('#saveBtn').textContent = 'Dodaj pozycję'; $('#cancelEdit').classList.add('hidden'); }
$('#cancelEdit').addEventListener('click', resetForm);
loadRows();
