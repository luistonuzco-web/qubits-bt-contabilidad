function supplier(id){return db.suppliers.find(s=>s.id===id)}
function supplierLabel(id){const s=supplier(id);return s?.name||'Proveedor eliminado'}

function suppliersPage(){
  const q=searchTerm.toLowerCase();
  const rows=db.suppliers.slice().sort((a,b)=>a.name.localeCompare(b.name)).filter(s=>[s.name,s.taxId,s.contact,s.email,s.phone,s.city,s.country,s.serviceDescription].some(v=>String(v||'').toLowerCase().includes(q)));
  return `${pageHead('CONTACTOS','Proveedores','Mantén una ficha única por proveedor y selecciónala en cada gasto.',`<button class="btn btn-primary" data-supplier-modal>＋ Nuevo proveedor</button>`)}<section class="panel table-panel"><div class="panel-head"><div><h2>Directorio de proveedores</h2><p>${db.suppliers.length} proveedores registrados</p></div><div class="list-tools"><label class="search-wrap"><span class="search-glyph">⌕</span><input class="input-control" id="search-input" placeholder="Buscar proveedor..." value="${esc(searchTerm)}"></label></div></div>${table(['PROVEEDOR','NIT','CONTACTO','TELÉFONO / CORREO','UBICACIÓN','SERVICIO','ACCIONES'],rows.map(s=>`<tr><td><b>${esc(s.name)}</b><small class="supplier-subline">${esc(s.address||'')}</small></td><td>${esc(s.taxId||'—')}</td><td>${esc(s.contact||'—')}</td><td>${esc([s.phone,s.email].filter(Boolean).join(' · ')||'—')}</td><td>${esc([s.city,s.country].filter(Boolean).join(', ')||'—')}</td><td>${esc(s.serviceDescription||'—')}</td><td><div class="row-actions"><button class="text-action" data-supplier-edit="${esc(s.id)}">Editar</button><button class="text-action delete" data-supplier-delete="${esc(s.id)}">Eliminar</button></div></td></tr>`).join(''),'Todavía no has registrado proveedores.')}</section><nav class="mobile-nav">${navMobile()}</nav>`;
}

function openSupplierModal(data=null){
  const body=`<div class="form-grid">${field('Nombre o razón social','name','text',data?.name||'',{required:true,full:true})}${field('NIT / identificación','taxId','text',data?.taxId||'')}${field('Persona de contacto','contact','text',data?.contact||'')}${field('Teléfono','phone','tel',data?.phone||'')}${field('Correo electrónico','email','email',data?.email||'')}${field('Dirección','address','text',data?.address||'',{full:true})}${field('Ciudad','city','text',data?.city||'')}${field('País','country','text',data?.country||'Colombia')}${field('Descripción del servicio que presta','serviceDescription','textarea',data?.serviceDescription||'',{full:true})}</div>`;
  document.getElementById('modal-root').innerHTML=modalMarkup(data?'Editar proveedor':'Nuevo proveedor',body);
  document.getElementById('close-modal').onclick=closeModal;document.getElementById('cancel-modal').onclick=closeModal;
  document.getElementById('modal-backdrop').onclick=e=>{if(e.target.id==='modal-backdrop')closeModal()};
  const form=document.getElementById('entry-form');
  form.onsubmit=e=>{e.preventDefault();const values=Object.fromEntries(new FormData(form).entries());const duplicate=db.suppliers.find(s=>s.id!==data?.id&&s.name.trim().toLowerCase()===values.name.trim().toLowerCase());if(duplicate){toast('Ya existe un proveedor con ese nombre. Selecciónalo para mantener los gastos agrupados.');return}if(data)Object.assign(data,values);else db.suppliers.push({id:uid(),...values});save();closeModal();render();toast(data?'Proveedor actualizado':'Proveedor guardado')};
}

function openSupplierExpenseModal(){
  if(!db.suppliers.length){toast('Primero registra un proveedor.');currentView='proveedores';render();return}
  const todayDate=today(),supplierOptions=selectOptions(db.suppliers.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(s=>({value:s.id,label:s.name})));
  const accountOptions=selectOptions(db.accounts.filter(a=>a.type==='Gasto').map(a=>({value:a.id,label:`${a.code} · ${a.name}`})));
  const body=`<div class="form-grid">${field('Proveedor','supplierId','select','',{required:true,options:supplierOptions,full:true})}${field('Número de factura o soporte','number','text','')}${field('Fecha del gasto','date','date',todayDate,{required:true})}${field('Fecha de contabilización','postingDate','date',todayDate,{required:true})}${field('Periodo contable','period','month',todayDate.slice(0,7),{required:true})}${field('Cuenta contable','accountId','select','',{required:true,options:accountOptions,full:true})}${field('Descripción del gasto','description','textarea','',{required:true,full:true})}${field('Valor del gasto','amount','number','',{required:true,attrs:'min="0.01" step="0.01"'})}</div>`;
  document.getElementById('modal-root').innerHTML=modalMarkup('Registrar gasto',body);
  document.getElementById('close-modal').onclick=closeModal;document.getElementById('cancel-modal').onclick=closeModal;
  document.getElementById('modal-backdrop').onclick=e=>{if(e.target.id==='modal-backdrop')closeModal()};
  const form=document.getElementById('entry-form');
  form.onsubmit=e=>{e.preventDefault();const v=Object.fromEntries(new FormData(form).entries()),s=supplier(v.supplierId);if(!s){toast('Selecciona un proveedor registrado.');return}db.expenses.push({id:uid(),...v,vendor:s.name,amount:Number(v.amount)});save();closeModal();render();toast('Gasto registrado para '+s.name)};
}

function attachSupplierEvents(){
  document.querySelectorAll('[data-supplier-modal]').forEach(b=>b.onclick=()=>openSupplierModal());
  document.querySelectorAll('[data-supplier-edit]').forEach(b=>b.onclick=()=>openSupplierModal(supplier(b.dataset.supplierEdit)));
  document.querySelectorAll('[data-supplier-delete]').forEach(b=>b.onclick=()=>{const id=b.dataset.supplierDelete;if(db.expenses.some(e=>e.supplierId===id)){toast('Este proveedor tiene gastos asociados y no se puede eliminar.');return}if(confirm('¿Eliminar este proveedor?')){db.suppliers=db.suppliers.filter(s=>s.id!==id);save();render();toast('Proveedor eliminado')}});
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{currentView=b.dataset.view;searchTerm='';render()});
  const si=document.getElementById('search-input');if(si)si.oninput=()=>{searchTerm=si.value;const p=si.selectionStart;render();const next=document.getElementById('search-input');next?.focus();next?.setSelectionRange(p,p)};
}

const priorOpenModal=openModal;
openModal=function(type,data){if(type==='supplier'){openSupplierModal(data);return}if(type==='expense'){openSupplierExpenseModal();return}priorOpenModal(type,data)};

navMobile=function(){return [['inicio','▦','Inicio'],['facturas','▤','Facturas'],['ingresos','↙','Ingresos'],['gastos','↗','Gastos'],['proveedores','▣','Proveedores'],['clientes','♙','Clientes'],['cuentas','▧','Cuentas']].map(([v,i,t])=>`<button data-view="${v}" class="${currentView===v?'active':''}"><span>${i}</span>${t}</button>`).join('')};

const priorRender=render;
render=function(){
  if(currentView==='proveedores'){
    document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===currentView));
    document.getElementById('crumb-current').textContent='Proveedores';
    document.getElementById('view-root').innerHTML=suppliersPage();attachSupplierEvents();return;
  }
  priorRender();attachSupplierEvents();
};

const priorExpensesPage=expensesPage;
expensesPage=function(){return priorExpensesPage()};
