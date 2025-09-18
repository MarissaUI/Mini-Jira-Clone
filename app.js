// --- Data Layer ---
const STORAGE_KEY = 'jiraCloneTickets.v2';
const uid = () => Math.random().toString(36).slice(2, 10);
let tickets = loadTickets();

function loadTickets(){
try{ const raw = localStorage.getItem(STORAGE_KEY); const parsed = raw? JSON.parse(raw): []; return Array.isArray(parsed)? parsed: []; } catch{ return []; }
}
function saveTickets(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets)); }

// Ensure new fields exist for old tickets
function normalize(t){
return { attachments:[], comments:[], subtasks:[], ...t };
}

// --- Elements ---
const zones = {
todo: document.querySelector('.dropzone[data-status="todo"]'),
inprogress: document.querySelector('.dropzone[data-status="inprogress"]'),
done: document.querySelector('.dropzone[data-status="done"]'),
};
const counts = {
todo: document.getElementById('count-todo'),
inprogress: document.getElementById('count-inprogress'),
done: document.getElementById('count-done'),
};
const searchInput = document.getElementById('search');
const filterPriority = document.getElementById('filter-priority');
const filterAssignee = document.getElementById('filter-assignee');

// Details modal elements
const detailsModal = document.getElementById('details-modal');
const dTitle = document.getElementById('d-title');
const dDescription = document.getElementById('d-description');
const dMeta = document.getElementById('d-meta');
const dSubtasks = document.getElementById('d-subtasks');
const dNewSubtask = document.getElementById('d-new-subtask');
const dAddSubtask = document.getElementById('d-add-subtask');
const dComments = document.getElementById('d-comments');
const dNewComment = document.getElementById('d-new-comment');
const dAddComment = document.getElementById('d-add-comment');
const dFile = document.getElementById('d-file');
const dAttachments = document.getElementById('d-attachments');
const dDelete = document.getElementById('d-delete');
const dClose = document.getElementById('d-close');
const dCloseX = document.getElementById('close-details');

let currentId = null;

// --- Filters ---
function applyFilters(list) {
const q = searchInput.value.trim().toLowerCase();
const p = filterPriority.value;
const a = filterAssignee.value.trim().toLowerCase();
return list.filter(t => {
const matchesQ = !q || [t.title, t.description, t.assignee, t.priority].some(v => (v||'').toLowerCase().includes(q));
const matchesP = !p || t.priority === p;
const matchesA = !a || (t.assignee || '').toLowerCase() === a;
return matchesQ && matchesP && matchesA;
});
}

// --- Rendering ---
function render(){
Object.values(zones).forEach(z => z.innerHTML = '');

const assignees = Array.from(new Set(tickets.map(t => (t.assignee || '').trim()).filter(Boolean)));
filterAssignee.innerHTML = '<option value="">All Assignees</option>' + assignees.map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');

const filtered = applyFilters(tickets);
const byStatus = { todo: [], inprogress: [], done: [] };
filtered.forEach(t => byStatus[t.status]?.push(t));

Object.entries(byStatus).forEach(([status, list]) => {
counts[status].textContent = list.length;
list.sort((a,b) => a.createdAt - b.createdAt).forEach(t => zones[status].appendChild(cardEl(t)));
});
}

function cardEl(t){
const el = document.createElement('article');
el.className = 'card';
el.setAttribute('draggable','true');
el.dataset.id = t.id;
el.innerHTML = `
<h3 title="${escapeHtml(t.title)}">${escapeHtml(t.title)}</h3>
<div class="meta" style="margin-bottom:8px">
<span class="tag prio-${(t.priority||'').toLowerCase()}">Priority: ${escapeHtml(t.priority || '—')}</span>
<span class="tag">Assignee: ${escapeHtml(t.assignee || 'Unassigned')}</span>
${t.subtasks?.length ? `<span class="tag">Subtasks: ${t.subtasks.filter(s=>s.done).length}/${t.subtasks.length}</span>`: ''}
${t.comments?.length ? `<span class="tag">Comments: ${t.comments.length}</span>`: ''}
</div>
<p style="margin:0 0 10px 0; color: var(--muted); font-size: 13px; line-height:1.4">${escapeHtml(t.description || '')}</p>
<div class="toolbar">
<button class="btn-ghost" data-action="details">Details</button>
<button class="btn-ghost" data-action="edit">Edit</button>
<button class="btn-ghost" data-action="move" data-next="${nextStatus(t.status)}">Move → ${prettyStatus(nextStatus(t.status))}</button>
<button class="btn-danger" data-action="delete">Delete</button>
</div>
`;

el.addEventListener('dblclick', ()=> openDetails(t.id));

el.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', t.id); setTimeout(()=> el.style.opacity='0.4',0); });
el.addEventListener('dragend', () => { el.style.opacity='1'; });

el.addEventListener('click', (e) => {
const btn = e.target.closest('button'); if(!btn) return; const action = btn.dataset.action;
if(action==='delete'){ tickets = tickets.filter(x=>x.id!==t.id); saveTickets(); render(); toast('Deleted ticket'); }
else if(action==='move'){ updateTicket(t.id, { status: btn.dataset.next }); }
else if(action==='edit'){ openModal(t); }
else if(action==='details'){ openDetails(t.id); }
});
return el;
}

function prettyStatus(s){ return s==='todo'?'To Do': s==='inprogress'?'In Progress':'Done'; }
function nextStatus(s){ return s==='todo'?'inprogress': s==='inprogress'?'done':'todo'; }

// --- Drag and Drop ---
document.querySelectorAll('.dropzone').forEach(zone => {
zone.addEventListener('dragover', (e)=>{ e.preventDefault(); zone.classList.add('dragover'); });
zone.addEventListener('dragleave', ()=> zone.classList.remove('dragover'));
zone.addEventListener('drop', (e)=>{ e.preventDefault(); zone.classList.remove('dragover'); const id = e.dataTransfer.getData('text/plain'); updateTicket(id, { status: zone.dataset.status }); });
});

function updateTicket(id, patch){
const idx = tickets.findIndex(t=>t.id===id); if(idx===-1) return;
tickets[idx] = normalize({ ...tickets[idx], ...patch });
saveTickets(); render(); toast('Updated ticket');
}

// --- Drag and Drop ---
document.querySelectorAll('.dropzone').forEach(zone => {
zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
zone.addEventListener('drop', (e) => {
e.preventDefault();
zone.classList.remove('dragover');
const id = e.dataTransfer.getData('text/plain');
const status = zone.dataset.status;
updateTicket(id, { status });
});
});

function updateTicket(id, patch) {
const idx = tickets.findIndex(t => t.id === id);
if (idx === -1) return;
tickets[idx] = { ...tickets[idx], ...patch };
saveTickets();
render();
toast('Updated ticket');
}

// --- Modal ---
const modal = document.getElementById('ticket-modal');
const form = document.getElementById('ticket-form');
const newBtn = document.getElementById('new-ticket');
const closeBtn = document.getElementById('close-modal');
const cancelBtn = document.getElementById('cancel');
const modalTitle = document.getElementById('modal-title');
let editingId = null;

function openModal(existing){
editingId = existing?.id || null;
form.reset();
form.querySelector('#title').value = existing?.title || '';
form.querySelector('#description').value = existing?.description || '';
form.querySelector('#assignee').value = existing?.assignee || '';
form.querySelector('#priority').value = existing?.priority || 'Medium';
form.querySelector('#status').value = existing?.status || 'todo';
modalTitle.textContent = editingId? 'Edit Ticket' : 'Create Ticket';
modal.showModal();
}
function closeModal(){ modal.close(); editingId = null; }
newBtn.addEventListener('click', ()=> openModal());
closeBtn.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);

form.addEventListener('submit', (e)=>{
e.preventDefault();
const data = new FormData(form);
const payload = {
title: (data.get('title')||'').toString().trim(),
description: (data.get('description')||'').toString().trim(),
assignee: (data.get('assignee')||'').toString().trim(),
priority: (data.get('priority')||'Medium').toString(),
status: (data.get('status')||'todo').toString(),
};
if(!payload.title) return;
if(editingId){ updateTicket(editingId, payload); toast('Ticket updated'); }
else { tickets.push(normalize({ id: uid(), createdAt: Date.now(), ...payload })); saveTickets(); render(); toast('Ticket created'); }
closeModal();
});

// --- Details Modal (subtasks, comments, attachments) ---
function openDetails(id){ currentId = id; const t = tickets.find(x=>x.id===id); if(!t) return; const tt = normalize(t);
dTitle.textContent = tt.title;
dDescription.textContent = tt.description || '—';
dMeta.innerHTML = `Assignee: <strong>${escapeHtml(tt.assignee||'Unassigned')}</strong> • Priority: <strong>${escapeHtml(tt.priority)}</strong> • Status: <strong>${prettyStatus(tt.status)}</strong> • Created: ${new Date(tt.createdAt).toLocaleString()}`;
renderSubtasks(tt); renderComments(tt); renderAttachments(tt);
detailsModal.showModal();
}
function closeDetails(){ detailsModal.close(); currentId = null; }

document.getElementById('d-close').addEventListener('click', closeDetails);
document.getElementById('close-details').addEventListener('click', closeDetails);
document.getElementById('details-modal').addEventListener('close', ()=> currentId=null);

dAddSubtask.addEventListener('click', ()=>{
if(!currentId) return; const t = tickets.find(x=>x.id===currentId); if(!t) return; const txt = dNewSubtask.value.trim(); if(!txt) return;
t.subtasks = (t.subtasks||[]).concat({ id: uid(), title: txt, done: false }); dNewSubtask.value=''; saveTickets(); render(); openDetails(currentId);
});

function renderSubtasks(t){
dSubtasks.innerHTML = '';
(t.subtasks||[]).forEach(s=>{
const row = document.createElement('div'); row.className='detail-chip';
row.innerHTML = `<input type="checkbox" ${s.done?'checked':''} aria-label="toggle" /> <span>${escapeHtml(s.title)}</span> <button class="btn-ghost">Remove</button>`;
const [chk,, removeBtn] = [row.querySelector('input'), null, row.querySelector('button')];
chk.addEventListener('change', ()=>{ s.done = !s.done; saveTickets(); render(); openDetails(currentId); });
removeBtn.addEventListener('click', ()=>{ t.subtasks = t.subtasks.filter(x=>x.id!==s.id); saveTickets(); render(); openDetails(currentId); });
dSubtasks.appendChild(row);
});
}

dAddComment.addEventListener('click', ()=>{
if(!currentId) return; const t = tickets.find(x=>x.id===currentId); if(!t) return; const txt = dNewComment.value.trim(); if(!txt) return;
t.comments = (t.comments||[]).concat({ id: uid(), author: t.assignee||'Me', text: txt, createdAt: Date.now() }); dNewComment.value=''; saveTickets(); render(); openDetails(currentId);
});

function renderComments(t){
dComments.innerHTML = '';
(t.comments||[]).forEach(c=>{
const row = document.createElement('div'); row.className='detail-text';
row.innerHTML = `<div style="font-size:12px; color:var(--muted); margin-bottom:4px;">${escapeHtml(c.author)} • ${new Date(c.createdAt).toLocaleString()}</div><div>${escapeHtml(c.text)}</div>`;
dComments.appendChild(row);
});
}

// Attachments
function toDataUrl(file){ return new Promise((res,rej)=>{ const r = new FileReader(); r.onload = ()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); }); }

dFile.addEventListener('change', async (e)=>{
if(!currentId) return; const t = tickets.find(x=>x.id===currentId); if(!t) return; const file = e.target.files?.[0]; if(!file) return;
const dataUrl = await toDataUrl(file);
t.attachments = (t.attachments||[]).concat({ id: uid(), name: file.name, mime: file.type, size: file.size, dataUrl });
e.target.value=''; saveTickets(); render(); openDetails(currentId);
});

function renderAttachments(t){
dAttachments.innerHTML = '';
(t.attachments||[]).forEach(a=>{
const row = document.createElement('div'); row.className='detail-chip';
row.innerHTML = `<a class="link" href="${a.dataUrl}" download="${escapeHtml(a.name)}">${escapeHtml(a.name)} <span style="color:var(--muted)">(${(a.size/1024).toFixed(1)} KB)</span></a> <button class="btn-ghost">Remove</button>`;
row.querySelector('button').addEventListener('click', ()=>{ t.attachments = t.attachments.filter(x=>x.id!==a.id); saveTickets(); render(); openDetails(currentId); });
dAttachments.appendChild(row);
});
}

dDelete.addEventListener('click', ()=>{
if(!currentId) return; tickets = tickets.filter(t=>t.id!==currentId); saveTickets(); render(); closeDetails(); toast('Deleted ticket');
});


// --- Search & Filters ---
[searchInput, filterPriority, filterAssignee].forEach(el => el.addEventListener('input', render));

// --- Seed / Clear / Export / Import ---
document.getElementById('seed').addEventListener('click', seedTickets);
document.getElementById('clear').addEventListener('click', clearTickets);
document.getElementById('export').addEventListener('click', exportTickets);
document.getElementById('import').addEventListener('change', importTickets);

function seedTickets(){
const now = Date.now();
tickets = [
normalize({ id: uid(), title: 'Set up VPN for remote user', description: 'Create user, MFA, test split-tunnel', priority: 'High', assignee: 'Marissa', status: 'todo', createdAt: now }),
normalize({ id: uid(), title: 'Printer offline in 2nd floor lab', description: 'Check IP, drivers, queue', priority: 'Medium', assignee: 'Alyssa', status: 'inprogress', createdAt: now, comments:[{id:uid(), author:'Alyssa', text:'Rebooted printer. Still offline.', createdAt: now}], subtasks:[{id:uid(), title:'Check cable', done:true},{id:uid(), title:'Reinstall driver', done:false}] }),
normalize({ id: uid(), title: 'Build ticketing UI polish', description: 'Add dark mode + filters', priority: 'Low', assignee: 'Marissa', status: 'done', createdAt: now }),
];
saveTickets(); render(); toast('Seeded sample tickets');
}

function clearTickets(){ tickets = []; saveTickets(); render(); toast('Cleared all tickets'); }

function exportTickets(){ const blob = new Blob([JSON.stringify(tickets, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='tickets-export.json'; a.click(); URL.revokeObjectURL(url); }

function importTickets(e){ const file = e.target.files?.[0]; if(!file) return; const reader = new FileReader(); reader.onload = ()=>{ try{ const data = JSON.parse(reader.result); if(Array.isArray(data)){ tickets = data.map(normalize); saveTickets(); render(); toast('Imported tickets'); } else toast('Invalid file'); } catch{ toast('Invalid JSON'); } }; reader.readAsText(file); e.target.value=''; }


// --- Keyboard Shortcuts ---
window.addEventListener('keydown', (e)=>{
const activeTag = document.activeElement?.tagName?.toLowerCase();
const typing = activeTag==='input' || activeTag==='textarea';
if(e.key==='/' && !typing){ e.preventDefault(); searchInput.focus(); }
if((e.key==='n' || e.key==='N') && !typing){ e.preventDefault(); openModal(); }
if(e.key==='Escape'){ try{ modal.close(); }catch{} try{ detailsModal.close(); }catch{} }
});

// --- Utils ---
function escapeHtml(str){ return (str+'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m])); }
function toast(msg){ const el = document.createElement('div'); el.textContent = msg; el.style.position='fixed'; el.style.bottom='16px'; el.style.right='16px'; el.style.padding='10px 12px'; el.style.background='rgba(17,24,39,0.9)'; el.style.border='1px solid var(--border)'; el.style.borderRadius='12px'; el.style.zIndex=50; document.body.appendChild(el); setTimeout(()=> el.remove(), 1400); }

// --- Init ---
render();
if (!tickets.length) seedTickets();