(() => {
  'use strict';
  const cfg = window.TELEFABRYKA_CONFIG || {};
  const configured = Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
  const db = configured ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
  const $ = (id) => document.getElementById(id);
  const els = {
    list:$('priceList'), empty:$('emptyState'), search:$('searchInput'), brand:$('brandFilter'), status:$('statusBanner'),
    adminButton:$('adminButton'), loginDialog:$('loginDialog'), loginForm:$('loginForm'), loginEmail:$('loginEmail'), loginPassword:$('loginPassword'), loginError:$('loginError'),
    adminDialog:$('adminDialog'), adminRows:$('adminRows'), adminEmail:$('adminEmail'), logout:$('logoutButton'), newItem:$('newItemButton'),
    editDialog:$('editDialog'), itemForm:$('itemForm'), itemFormTitle:$('itemFormTitle'), itemId:$('itemId'), itemBrand:$('itemBrand'), itemModel:$('itemModel'), itemService:$('itemService'), itemPrice:$('itemPrice'), itemPricePrefix:$('itemPricePrefix'), itemDescription:$('itemDescription'), itemVisible:$('itemVisible'), itemError:$('itemError'), template:$('cardTemplate')
  };
  let items=[]; let session=null;
  const demoItems=[
    {id:'d1',brand:'Apple',model:'iPhone 13',service:'Wymiana wyświetlacza OLED',price:449,price_prefix:'od',description:'Część i montaż w cenie',is_visible:true},
    {id:'d2',brand:'Apple',model:'iPhone 12',service:'Wymiana baterii',price:199,price_prefix:'od',description:'Gwarancja serwisowa',is_visible:true},
    {id:'d3',brand:'Samsung',model:'Galaxy S22',service:'Wymiana złącza ładowania',price:249,price_prefix:'od',description:'Diagnostyka w cenie',is_visible:true},
    {id:'d4',brand:'Samsung',model:'Galaxy A54',service:'Wymiana wyświetlacza',price:399,price_prefix:'od',description:'Cena orientacyjna',is_visible:true},
    {id:'d5',brand:'Xiaomi',model:'Redmi Note 12',service:'Wymiana baterii',price:169,price_prefix:'od',description:'Część i montaż w cenie',is_visible:true},
    {id:'d6',brand:'Xiaomi',model:'POCO X5',service:'Wymiana wyświetlacza',price:329,price_prefix:'od',description:'Gwarancja serwisowa',is_visible:true}
  ];
  const esc=(v)=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const money=(i)=>`${i.price_prefix ? i.price_prefix+' ' : ''}${Number(i.price).toLocaleString('pl-PL')} zł`;
  function showStatus(text,type='warn'){els.status.textContent=text;els.status.className=`status ${type==='error'?'error':''}`}
  function hideStatus(){els.status.className='status hidden'}
  async function loadItems(){
    if(!configured){items=demoItems;showStatus('Tryb demonstracyjny: aby panel administratora zapisywał dane online, uzupełnij config.js i uruchom supabase.sql.');render();return}
    const {data,error}=await db.from('price_items').select('*').order('brand').order('model').order('service');
    if(error){items=[];showStatus(`Nie udało się pobrać cennika: ${error.message}`,'error')}else{items=data||[];hideStatus()} render();
  }
  function render(){
    const q=els.search.value.trim().toLocaleLowerCase('pl'); const b=els.brand.value;
    const publicItems=items.filter(i=>i.is_visible!==false);
    const brands=[...new Set(publicItems.map(i=>i.brand).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pl'));
    const current=els.brand.value; els.brand.innerHTML='<option value="">Wszystkie marki</option>'+brands.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join(''); if(brands.includes(current))els.brand.value=current;
    const filtered=publicItems.filter(i=>(!b||i.brand===b)&&(!q||`${i.brand} ${i.model} ${i.service} ${i.description||''}`.toLocaleLowerCase('pl').includes(q)));
    els.list.innerHTML=''; filtered.forEach(i=>{const n=els.template.content.cloneNode(true);n.querySelector('.tag').textContent=i.brand;n.querySelector('h2').textContent=i.model;n.querySelector('.service').textContent=i.service;n.querySelector('.description').textContent=i.description||'Cena orientacyjna';n.querySelector('.price').textContent=money(i);els.list.appendChild(n)});
    els.empty.classList.toggle('hidden',filtered.length>0);
  }
  async function refreshSession(){if(!configured)return;const {data}=await db.auth.getSession();session=data.session;els.adminButton.textContent=session?'Otwórz panel':'Panel administratora'}
  async function openAdmin(){
    if(!configured){showStatus('Najpierw skonfiguruj Supabase według pliku START-TUTAJ.txt.','error');return}
    await refreshSession(); if(!session){els.loginError.textContent='';els.loginDialog.showModal();return} await renderAdmin();els.adminDialog.showModal();
  }
  async function renderAdmin(){await loadItems();els.adminEmail.textContent=session?.user?.email||'';els.adminRows.innerHTML=items.map(i=>`<tr><td><strong>${esc(i.brand)}</strong><small>${esc(i.model)}</small></td><td>${esc(i.service)}<small>${esc(i.description||'')}</small></td><td>${esc(money(i))}</td><td><span class="pill ${i.is_visible?'on':'off'}">${i.is_visible?'Widoczna':'Ukryta'}</span></td><td><div class="row-actions"><button class="button button-ghost" data-edit="${esc(i.id)}">Edytuj</button><button class="button button-danger" data-delete="${esc(i.id)}">Usuń</button></div></td></tr>`).join('')}
  function openItem(item=null){els.itemForm.reset();els.itemError.textContent='';els.itemId.value=item?.id||'';els.itemFormTitle.textContent=item?'Edytuj pozycję':'Dodaj pozycję';els.itemBrand.value=item?.brand||'';els.itemModel.value=item?.model||'';els.itemService.value=item?.service||'';els.itemPrice.value=item?.price??'';els.itemPricePrefix.value=item?.price_prefix??'od';els.itemDescription.value=item?.description||'';els.itemVisible.checked=item?.is_visible!==false;els.editDialog.showModal()}
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.close).close()));
  els.search.addEventListener('input',render);els.brand.addEventListener('change',render);els.adminButton.addEventListener('click',openAdmin);
  els.loginForm.addEventListener('submit',async(e)=>{e.preventDefault();els.loginError.textContent='';const {data,error}=await db.auth.signInWithPassword({email:els.loginEmail.value.trim(),password:els.loginPassword.value});if(error){els.loginError.textContent=error.message;return}session=data.session;els.loginDialog.close();await renderAdmin();els.adminDialog.showModal();els.adminButton.textContent='Otwórz panel'});
  els.logout.addEventListener('click',async()=>{await db.auth.signOut();session=null;els.adminDialog.close();els.adminButton.textContent='Panel administratora'});
  els.newItem.addEventListener('click',()=>openItem());
  els.adminRows.addEventListener('click',async(e)=>{const edit=e.target.closest('[data-edit]');const del=e.target.closest('[data-delete]');if(edit)openItem(items.find(i=>String(i.id)===edit.dataset.edit));if(del&&confirm('Na pewno usunąć tę pozycję?')){const {error}=await db.from('price_items').delete().eq('id',del.dataset.delete);if(error)alert(error.message);else await renderAdmin()}});
  els.itemForm.addEventListener('submit',async(e)=>{e.preventDefault();els.itemError.textContent='';const payload={brand:els.itemBrand.value.trim(),model:els.itemModel.value.trim(),service:els.itemService.value.trim(),price:Number(els.itemPrice.value),price_prefix:els.itemPricePrefix.value,description:els.itemDescription.value.trim(),is_visible:els.itemVisible.checked,updated_at:new Date().toISOString()};let result;if(els.itemId.value)result=await db.from('price_items').update(payload).eq('id',els.itemId.value);else result=await db.from('price_items').insert(payload);if(result.error){els.itemError.textContent=result.error.message;return}els.editDialog.close();await renderAdmin()});
  if(configured)db.auth.onAuthStateChange((_event,s)=>{session=s;els.adminButton.textContent=s?'Otwórz panel':'Panel administratora'});
  refreshSession().then(loadItems);
})();
