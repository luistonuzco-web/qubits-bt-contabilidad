let incomeEntries = [];
let incomeLoadError = '';
let incomeLoaded = false;

async function loadIncomeEntries() {
  incomeLoadError = '';
  incomeEntries = [];
  if (!currentUser || !sbClient) return;
  const { data, error } = await sbClient.from('qb_income_entries')
    .select('id,client_id,client_name,invoice_id,invoice_number,account_id,posting_date,period,amount,description,created_at')
    .eq('user_id', currentUser.id).order('posting_date', { ascending: false });
  if (error) { incomeLoadError = error.message; return; }
  incomeEntries = (data || []).map(r => ({
    id:r.id, clientId:r.client_id, clientName:r.client_name, invoiceId:r.invoice_id,
    invoiceNumber:r.invoice_number, accountId:r.account_id, postingDate:r.posting_date,
    period:r.period, amount:Number(r.amount), description:r.description || '', createdAt:r.created_at
  }));
}

function incomeTotal(entries=incomeEntries) { return entries.reduce((sum,r)=>sum+Number(r.amount||0),0); }
function invoiceReceipts(invoiceId) { return incomeEntries.filter(r=>r.invoiceId===invoiceId).reduce((sum,r)=>sum+Number(r.amount||0),0); }
function invoiceBalance(inv) { return Math.max(0,Number(inv.total||0)-invoiceReceipts(inv.id)); }
function paymentLabel(inv) {
  if(inv.status==='Borrador') return 'Borrador';
  const received=invoiceReceipts(inv.id);
  if(received<=0) return 'Pendiente';
  return invoiceBalance(inv)<=0 ? 'Pagada' : 'Abono parcial';
}
function openInvoices() { return db.invoices.filter(i=>!i.parentId&&i.kind!=='credit'&&i.kind!=='debit'&&i.status!=='Borrador'&&invoiceBalance(i)>0); }
function accountLabel(id) { const a=db.accounts.find(x=>x.id===id); return a ? `${a.code} · ${a.name}` : 'Cuenta eliminada'; }

function incomeReportPanel() {
  const rows=incomeEntries.filter(r=>byMonth(r.period)).slice().sort((a,b)=>(b.postingDate||'').localeCompare(a.postingDate||''));
  const content=rows.slice(0,5).map(r=>`<tr><td>${dateFmt(r.postingDate)}</td><td><b>${esc(client(r.clientId)?.name||r.clientName||'Cliente')}</b></td><td>${esc(r.invoiceNumber||'—')}</td><td>${esc(accountLabel(r.accountId))}</td><td><b>${money(r.amount)}</b></td></tr>`).join('');
  return `<section class="panel table-panel income-report"><div class="panel-head"><div><h2>Ingresos recibidos</h2><p>${rows.length} cobros contabilizados · ${money(incomeTotal(rows))} en ${monthFmt(selectedMonth)}</p></div><button class="link-button" data-view="ingresos">Ver ingresos →</button></div>${table(['FECHA CONTABLE','CLIENTE','FACTURA','CUENTA','VALOR'],content,'No hay ingresos recibidos en este periodo.')}</section>`;
}

function incomePage() {
  const q=searchTerm.toLowerCase();
  const rows=incomeEntries.slice().sort((a,b)=>(b.postingDate||'').localeCompare(a.postingDate||''))
    .filter(r=>[r.clientName,client(r.clientId)?.name,r.invoiceNumber,accountLabel(r.accountId),r.description].some(x=>String(x||'').toLowerCase().includes(q)));
  const error=incomeLoadError?`<div class="auth-message">No pude leer la tabla de ingresos: ${esc(incomeLoadError)}. Ejecuta el archivo <b>supabase-income-schema.sql</b> en SQL Editor.</div>`:'';
  const open=openInvoices().length;
  return `${pageHead('TESORERÍA','Ingresos recibidos','Registra el dinero que ingresó al banco y vincúlalo con su factura y cliente.',`<button class="btn btn-primary" data-income-modal>＋ Registrar ingreso</button>`)}${error}<div class="metrics"><div class="metric-card"><div class="metric-top">Recibido en ${monthFmt(selectedMonth)} <span class="metric-icon">↙</span></div><div class="metric-value">${money(incomeTotal(incomeEntries.filter(r=>byMonth(r.period))))}</div><div class="metric-foot">Según periodo contable</div></div><div class="metric-card"><div class="metric-top">Cobros registrados <span class="metric-icon blue">▤</span></div><div class="metric-value">${incomeEntries.filter(r=>byMonth(r.period)).length}</div><div class="metric-foot">En ${monthFmt(selectedMonth)}</div></div><div class="metric-card"><div class="metric-top">Facturas por cobrar <span class="metric-icon orange">◷</span></div><div class="metric-value">${open}</div><div class="metric-foot">Facturas emitidas con saldo</div></div></div><section class="panel table-panel"><div class="panel-head"><div><h2>Movimientos de ingreso</h2><p>Los cobros se guardan por separado y no modifican tus clientes ni facturas.</p></div><div class="list-tools"><label class="search-wrap"><span class="search-glyph">⌕</span><input class="input-control" id="search-input" placeholder="Buscar ingreso..." value="${esc(searchTerm)}"></label></div></div>${table(['FECHA CONTABLE','CLIENTE','FACTURA','CUENTA DE INGRESOS','PERIODO','VALOR','DESCRIPCIÓN','ACCIONES'],rows.map(r=>`<tr><td>${dateFmt(r.postingDate)}</td><td><b>${esc(client(r.clientId)?.name||r.clientName||'Cliente')}</b></td><td>${esc(r.invoiceNumber||invoice(r.invoiceId)?.number||'—')}</td><td>${esc(accountLabel(r.accountId))}</td><td><span class="tag">${esc(r.period)}</span></td><td><b>${money(r.amount)}</b></td><td>${esc(r.description||'—')}</td><td><button class="text-action delete" data-income-delete="${esc(r.id)}">Eliminar</button></td></tr>`).join(''),'Todavía no has registrado ingresos bancarios.')}</section><nav class="mobile-nav">${navMobile()}</nav>`;
}

function invoiceOptions(clientId,selectedId='') {
  const list=openInvoices().filter(i=>!clientId||i.clientId===clientId);
  return `<option value="">Selecciona una factura</option>`+list.map(i=>`<option value="${esc(i.id)}" ${i.id===selectedId?'selected':''}>${esc(i.number)} · Saldo ${money(invoiceBalance(i))}</option>`).join('');
}

function openIncomeModal(invoiceId='') {
  if(incomeLoadError){toast('Primero debe habilitarse la tabla de ingresos en Supabase.');return;}
  const target=invoiceId?invoice(invoiceId):null;
  const initialClient=target?.clientId||'';
  const clientOptions=selectOptions(db.clients.map(c=>({value:c.id,label:c.name})),initialClient,'Selecciona un cliente');
  const accountOptions=selectOptions(db.accounts.filter(a=>a.type==='Ingreso').map(a=>({value:a.id,label:`${a.code} · ${a.name}`})),'','Selecciona una cuenta');
  const todayDate=today();
  const body=`<div class="form-grid"><div class="form-field full"><div class="amount-preview"><span>Facturas emitidas con saldo disponible</span><strong>${openInvoices().length}</strong></div></div>${field('Cliente','clientId','select','',{required:true,options:clientOptions,attrs:'id="income-client"',full:true})}${field('Factura','invoiceId','select','',{required:true,options:invoiceOptions(initialClient,invoiceId),attrs:'id="income-invoice"'})}${field('Cuenta de ingresos','accountId','select','',{required:true,options:accountOptions})}${field('Fecha de contabilización','postingDate','date',todayDate,{required:true})}${field('Periodo contable','period','month',todayDate.slice(0,7),{required:true})}${field('Valor recibido','amount','number',target?String(invoiceBalance(target)):'',{required:true,attrs:'min="1" step="1" id="income-amount"'})}${field('Referencia / descripción','description','text','',{placeholder:'Ej. Transferencia bancaria'})}<div class="form-field full"><span class="form-hint">Puedes registrar abonos parciales. El saldo de la factura se calcula con los cobros guardados.</span></div></div>`;
  document.getElementById('modal-root').innerHTML=modalMarkup('Registrar ingreso recibido',body);
  document.getElementById('close-modal').onclick=closeModal;
  document.getElementById('cancel-modal').onclick=closeModal;
  document.getElementById('modal-backdrop').onclick=e=>{if(e.target.id==='modal-backdrop')closeModal()};
  const form=document.getElementById('entry-form'),clientSelect=form.elements.clientId,invoiceSelect=form.elements.invoiceId,amountInput=form.elements.amount;
  const updateBalance=()=>{const selected=invoice(invoiceSelect.value);if(selected){amountInput.max=String(invoiceBalance(selected));if(!amountInput.value||Number(amountInput.value)>invoiceBalance(selected))amountInput.value=String(invoiceBalance(selected));}else{amountInput.removeAttribute('max');amountInput.value=''}};
  clientSelect.onchange=()=>{invoiceSelect.innerHTML=invoiceOptions(clientSelect.value);updateBalance()};
  invoiceSelect.onchange=updateBalance;
  updateBalance();
  form.onsubmit=async e=>{
    e.preventDefault();const f=Object.fromEntries(new FormData(form).entries());const inv=invoice(f.invoiceId);
    if(!inv||inv.clientId!==f.clientId){toast('Selecciona una factura del cliente elegido.');return}
    const amount=Number(f.amount),balance=invoiceBalance(inv);
    if(amount<=0||amount>balance){toast(`El valor debe ser mayor que cero y no superar el saldo ${money(balance)}.`);return}
    if(!currentUser||!sbClient){toast('La sesión expiró. Inicia sesión y vuelve a intentarlo.');return}
    const row={id:uid(),user_id:currentUser.id,client_id:f.clientId,client_name:client(f.clientId)?.name||'',invoice_id:inv.id,invoice_number:inv.number,account_id:f.accountId,posting_date:f.postingDate,period:f.period,amount,description:f.description||''};
    const submit=form.querySelector('button[type="submit"]');submit.disabled=true;submit.textContent='Guardando…';
    const {error}=await sbClient.from('qb_income_entries').insert(row);
    if(error){submit.disabled=false;submit.textContent='Guardar';toast(`No se guardó el ingreso: ${error.message}`);return}
    incomeEntries.unshift({id:row.id,clientId:row.client_id,clientName:row.client_name,invoiceId:row.invoice_id,invoiceNumber:row.invoice_number,accountId:row.account_id,postingDate:row.posting_date,period:row.period,amount:row.amount,description:row.description});
    closeModal();render();toast('Ingreso recibido registrado');
  };
}

function attachIncomeEvents() {
  document.querySelectorAll('[data-income-modal]').forEach(b=>b.onclick=()=>openIncomeModal());
  document.querySelectorAll('[data-action="register-income"]').forEach(b=>b.onclick=()=>openIncomeModal(b.dataset.id));
  document.querySelectorAll('[data-income-delete]').forEach(b=>b.onclick=async()=>{
    const id=b.dataset.incomeDelete;if(!confirm('¿Eliminar este ingreso recibido?'))return;
    const {error}=await sbClient.from('qb_income_entries').delete().eq('id',id).eq('user_id',currentUser.id);
    if(error){toast(`No se eliminó el ingreso: ${error.message}`);return;}
    incomeEntries=incomeEntries.filter(r=>r.id!==id);render();toast('Ingreso eliminado');
  });
  const mf=document.getElementById('month-filter');if(mf)mf.onchange=()=>{selectedMonth=mf.value;render()};
  const si=document.getElementById('search-input');if(si)si.oninput=()=>{searchTerm=si.value;const p=si.selectionStart;render();const next=document.getElementById('search-input');next.focus();next.setSelectionRange(p,p)};
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{currentView=b.dataset.view;searchTerm='';render()});
}

// app.js declara sus funciones como bindings globales léxicos; se sustituyen
// aquí por nombre para que render y navegación usen estas implementaciones.
const baseDashboard = dashboard;
dashboard = function() {
  let html=baseDashboard();
  html=html.replace('Ingresos del periodo <span class="metric-icon">↗</span>','Ingresos facturados <span class="metric-icon">↗</span>')
    .replace('Facturación neta registrada','Servicios facturados antes de IVA');
  return html.replace('<div class="lower-grid">',`${incomeReportPanel()}<div class="lower-grid">`);
};

navMobile = function() {
  return [['inicio','▦','Inicio'],['facturas','▤','Facturas'],['ingresos','↙','Ingresos'],['gastos','↗','Gastos'],['clientes','♙','Clientes'],['cuentas','▧','Cuentas']]
    .map(([v,i,t])=>`<button data-view="${v}" class="${currentView===v?'active':''}"><span>${i}</span>${t}</button>`).join('');
};

const baseInvoiceRows = invoiceRows;
invoiceRows = function(source) {
  return source.map(i=>{
    const c=client(i.clientId), isNote=!!i.parentId||i.kind==='credit'||i.kind==='debit', remaining=isNote?0:invoiceBalance(i);
    const status=`<span class="status ${i.status==='Borrador'?'draft':''}">${esc(i.status||'Emitida')}</span>${!isNote?`<span class="tag">${paymentLabel(i)}</span>`:''}`;
    const actions=`<div class="row-actions">${!isNote&&remaining>0&&i.status!=='Borrador'?`<button class="text-action" data-action="register-income" data-id="${esc(i.id)}">＋ Cobro</button>`:''}${!isNote?`<button class="text-action" data-action="add-note" data-id="${esc(i.id)}">+ Nota</button>`:''}<button class="text-action delete" data-action="delete-invoice" data-id="${esc(i.id)}" title="Eliminar">Eliminar</button></div>`;
    return `<tr class="${isNote?'note-row':''}"><td><b>${esc(i.number)}</b>${isNote?`<span class="tag">${i.kind==='credit'?'Nota crédito':'Nota débito'}</span>`:''}</td><td>${dateFmt(i.issueDate)}</td><td>${esc(c?.name||'Cliente eliminado')}</td><td>${esc(i.description||'—')}</td><td>${Number(i.ivaPct||0)}%</td><td>${money(i.total)}</td><td>${status}</td><td>${actions}</td></tr>`;
  }).join('');
};

const baseRender = render;
render = function() {
  if(currentUser&&sbClient&&!incomeLoaded){loadIncomeEntries().finally(()=>{incomeLoaded=true;render()});return;}
  if(currentView!=='ingresos'){baseRender();attachIncomeEvents();return;}
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===currentView));
  document.getElementById('crumb-current').textContent='Ingresos recibidos';
  document.getElementById('view-root').innerHTML=incomePage();
  attachIncomeEvents();
};

const baseAction = action;
action = function(act,id){if(act==='register-income'){openIncomeModal(id);return;}baseAction(act,id);};

const baseShowApp = showApp;
showApp = function(){loadIncomeEntries().finally(()=>{incomeLoaded=true;baseShowApp()});};

