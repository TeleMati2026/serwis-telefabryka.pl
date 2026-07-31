import { createClient } from '@supabase/supabase-js'
import './style.css'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
const configured = Boolean(url && key)
const supabase = configured ? createClient(url, key) : null

const demo = [
  { id: 1, brand: 'Apple', model: 'iPhone 13', service: 'Wymiana wyświetlacza', price: 649, note: 'część premium', active: true },
  { id: 2, brand: 'Apple', model: 'iPhone 13', service: 'Wymiana baterii', price: 249, note: 'z montażem', active: true },
  { id: 3, brand: 'Samsung', model: 'Galaxy S22', service: 'Wymiana złącza ładowania', price: 299, note: '', active: true },
  { id: 4, brand: 'Xiaomi', model: 'Redmi Note 12', service: 'Wymiana szybki aparatu', price: 129, note: '', active: true },
]

let rows = []
let session = null
let isAdmin = false
let editId = null

const app = document.querySelector('#app')
app.innerHTML = `
  <header class="topbar">
    <a class="brand" href="#"><span class="logo">T</span><span><b>SERWIS TELEFABRYKA</b><small>Cennik napraw telefonów</small></span></a>
    <button id="adminBtn" class="ghost">Panel administratora</button>
  </header>
  <main>
    <section class="hero">
      <div><span class="eyebrow">SZYBKA WYCENA NAPRAWY</span><h1>Sprawdź cenę naprawy<br><em>swojego telefonu</em></h1><p>Wyszukaj markę, model lub usługę. Ceny są aktualizowane na bieżąco.</p></div>
      <div class="hero-card"><span>✓</span><div><b>Przejrzysty cennik</b><small>Bez ukrytych kosztów</small></div></div>
    </section>
    <section class="search-panel">
      <input id="search" placeholder="Szukaj: iPhone 13, bateria, Samsung…" />
      <select id="brandFilter"><option value="">Wszystkie marki</option></select>
    </section>
    <section id="status" class="status"></section>
    <section id="priceList" class="grid"></section>
  </main>
  <footer>© 2026 Serwis Telefabryka · Ceny mogą zależeć od wariantu części i stanu urządzenia.<br><strong class="developer-signature">Designed &amp; Developed by Mateusz Orczy</strong></footer>

  <dialog id="loginDialog">
    <form id="loginForm" class="modal">
      <button type="button" class="close" data-close>×</button>
      <span class="eyebrow">STREFA ADMINISTRATORA</span><h2>Logowanie</h2>
      <input id="email" type="email" placeholder="E-mail" required />
      <input id="password" type="password" placeholder="Hasło" required />
      <p id="loginError" class="error"></p>
      <button class="primary">Zaloguj się</button>
    </form>
  </dialog>

  <dialog id="adminDialog">
    <div class="modal admin-modal">
      <button type="button" class="close" data-close>×</button>
      <div class="admin-head"><div><span class="eyebrow">PANEL ADMINA</span><h2>Zarządzaj cennikiem</h2></div><button id="logoutBtn" class="ghost">Wyloguj</button></div>
      <form id="priceForm" class="edit-form">
        <input id="brand" placeholder="Marka" required />
        <input id="model" placeholder="Model" required />
        <input id="service" placeholder="Usługa" required />
        <input id="price" type="number" min="0" step="1" placeholder="Cena w zł" required />
        <input id="note" placeholder="Dopisek (opcjonalnie)" />
        <button class="primary" id="saveBtn">Dodaj pozycję</button>
        <button type="button" class="ghost hidden" id="cancelEdit">Anuluj edycję</button>
      </form>
      <div id="adminList" class="admin-list"></div>
    </div>
  </dialog>
`

const $ = (s) => document.querySelector(s)
const money = (v) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(v)

function render() {
  const q = $('#search').value.toLowerCase().trim()
  const brand = $('#brandFilter').value
  const filtered = rows.filter(r => r.active !== false && (!brand || r.brand === brand) && `${r.brand} ${r.model} ${r.service} ${r.note || ''}`.toLowerCase().includes(q))
  $('#priceList').innerHTML = filtered.length ? filtered.map(r => `
    <article class="card">
      <div class="card-top"><span class="pill">${escapeHtml(r.brand)}</span><span class="price">${money(r.price)}</span></div>
      <h3>${escapeHtml(r.model)}</h3><p>${escapeHtml(r.service)}</p>
      ${r.note ? `<small>${escapeHtml(r.note)}</small>` : ''}
      <a href="tel:+48000000000">Zapytaj o termin →</a>
    </article>`).join('') : '<div class="empty">Brak pasujących pozycji.</div>'

  const brands = [...new Set(rows.filter(r => r.active !== false).map(r => r.brand))].sort()
  const current = $('#brandFilter').value
  $('#brandFilter').innerHTML = '<option value="">Wszystkie marki</option>' + brands.map(b => `<option ${b === current ? 'selected' : ''}>${escapeHtml(b)}</option>`).join('')
  renderAdmin()
}

function renderAdmin() {
  $('#adminList').innerHTML = rows.map(r => `<div class="admin-row"><div><b>${escapeHtml(r.brand)} ${escapeHtml(r.model)}</b><span>${escapeHtml(r.service)} · ${money(r.price)}</span></div><div><button data-edit="${r.id}">Edytuj</button><button class="danger" data-delete="${r.id}">Usuń</button></div></div>`).join('')
}

function escapeHtml(value='') { return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c])) }

async function loadRows() {
  $('#status').textContent = configured ? 'Ładowanie cennika…' : 'Tryb demonstracyjny — połącz Supabase, aby zapisywać ceny online.'
  if (!configured) { rows = demo; render(); return }
  const { data, error } = await supabase.from('prices').select('*').order('brand').order('model')
  if (error) { $('#status').textContent = `Błąd: ${error.message}`; rows = []; }
  else { rows = data; $('#status').textContent = '' }
  render()
}

async function checkSession() {
  if (!configured) return
  const { data } = await supabase.auth.getSession()
  session = data.session
  if (session) {
    const { data: admin } = await supabase.from('admins').select('user_id').eq('user_id', session.user.id).maybeSingle()
    isAdmin = Boolean(admin)
  }
}

$('#search').addEventListener('input', render)
$('#brandFilter').addEventListener('change', render)
$('[data-close]').addEventListener('click', e => e.target.closest('dialog').close())
document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => btn.closest('dialog').close()))

$('#adminBtn').addEventListener('click', async () => {
  await checkSession()
  if (isAdmin) $('#adminDialog').showModal(); else $('#loginDialog').showModal()
})

$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault(); $('#loginError').textContent = ''
  if (!configured) { $('#loginError').textContent = 'Najpierw skonfiguruj Supabase w pliku .env.'; return }
  const { error } = await supabase.auth.signInWithPassword({ email: $('#email').value, password: $('#password').value })
  if (error) { $('#loginError').textContent = 'Nieprawidłowy login lub hasło.'; return }
  await checkSession()
  if (!isAdmin) { await supabase.auth.signOut(); $('#loginError').textContent = 'To konto nie ma uprawnień administratora.'; return }
  $('#loginDialog').close(); $('#adminDialog').showModal()
})

$('#logoutBtn').addEventListener('click', async () => { await supabase.auth.signOut(); session = null; isAdmin = false; $('#adminDialog').close() })

$('#priceForm').addEventListener('submit', async e => {
  e.preventDefault()
  const item = { brand: $('#brand').value.trim(), model: $('#model').value.trim(), service: $('#service').value.trim(), price: Number($('#price').value), note: $('#note').value.trim(), active: true }
  const result = editId ? await supabase.from('prices').update(item).eq('id', editId) : await supabase.from('prices').insert(item)
  if (result.error) return alert(result.error.message)
  resetForm(); await loadRows()
})

$('#adminList').addEventListener('click', async e => {
  const id = Number(e.target.dataset.edit || e.target.dataset.delete)
  if (!id) return
  if (e.target.dataset.edit) {
    const r = rows.find(x => x.id === id); editId = id
    for (const key of ['brand','model','service','price','note']) $(`#${key}`).value = r[key] || ''
    $('#saveBtn').textContent = 'Zapisz zmiany'; $('#cancelEdit').classList.remove('hidden')
  } else if (confirm('Usunąć tę pozycję?')) {
    const { error } = await supabase.from('prices').delete().eq('id', id)
    if (error) alert(error.message); else await loadRows()
  }
})

function resetForm() { editId = null; $('#priceForm').reset(); $('#saveBtn').textContent = 'Dodaj pozycję'; $('#cancelEdit').classList.add('hidden') }
$('#cancelEdit').addEventListener('click', resetForm)

loadRows()
