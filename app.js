// ===== STATE =====
let state = { role: null, clientData: null, view: 'dashboard', searchQuery: '', data: db.load(), prevView: null };

// ===== HELPERS =====
function fmtDT(iso) { const d = new Date(iso); return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); }
function chatBubble(note, time, isClient) { return `<div class="chat-bubble ${isClient ? 'chat-client' : 'chat-coach'}"><div class="chat-sender">${isClient ? 'You' : 'Coach'}</div><div class="chat-text">${escapeHtml(note)}</div><div class="chat-time">${time}</div></div>`; }
function fileThumbs(files) { if (!files?.length) return ''; return `<div class="chat-files">${files.map(f => f.type.startsWith('image/') ? `<div class="chat-file-img"><img src="${f.data}" alt="${f.name}"><div class="chat-file-name">${f.name}</div></div>` : `<a href="${f.data}" download="${f.name}" class="chat-file-doc"><i class="bi bi-paperclip"></i> ${f.name}</a>`).join('')}</div>`; }
function chatBubbleWithFiles(note, time, isClient, files) { return `<div class="chat-bubble ${isClient ? 'chat-client' : 'chat-coach'}"><div class="chat-sender">${isClient ? 'You' : 'Coach'}</div><div class="chat-text">${escapeHtml(note)}</div>${fileThumbs(files)}<div class="chat-time">${time}</div></div>`; }
function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

function senderLabel(sender) { return sender === 'client' ? 'You' : 'Coach'; }
function bubbleFromEntry(h, isClientView) {
    const side = h.sender === 'client';
    const label = isClientView ? (h.sender === 'client' ? 'You' : 'Coach') : (h.sender === 'client' ? 'Client' : 'Coach');
    return `<div class="chat-bubble ${side ? 'chat-client' : 'chat-coach'}"><div class="chat-sender">${label}</div><div class="chat-text">${escapeHtml(h.note)}</div>${fileThumbs(h.files)}<div class="chat-time">${fmtDT(h.date)}</div></div>`;
}

// ===== DOM REFS =====
const $ = id => document.getElementById(id);
const loginPage = $('login-page');
const coachApp = $('coach-app');
const clientView = $('client-view');
const viewContainer = $('view-container');
const clientViewContainer = $('client-view-container');

// ===== SPLASH ON LOAD =====
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        $('splash-screen').classList.add('d-none');
        loginPage.classList.remove('d-none');
    }, 2500);
});

// ===== LOGIN =====
window.loginAs = function(role) {
    if (role === 'coach') {
        const pw = $('coach-password').value;
        if (pw !== 'spark2020') {
            $('coach-login-error').classList.remove('d-none');
            return;
        }
        $('coach-login-error').classList.add('d-none');
        loginPage.classList.add('d-none');
        $('splash-detail').textContent = 'Loading Coach Portal...';
        $('splash-screen').classList.remove('d-none');
        setTimeout(() => {
            $('splash-screen').classList.add('d-none');
            state.role = 'coach';
            coachApp.classList.remove('d-none');
            initCoach();
        }, 2500);
        return;
    }
    const phone = $('client-phone-input').value.trim();
    const pin = $('client-pin-input').value.trim();
    const client = state.data.find(c => c.phone === phone);
    if (!client || pin !== (client.pin || '2020')) {
        $('login-error').classList.remove('d-none');
        return;
    }
    $('login-error').classList.add('d-none');
    loginPage.classList.add('d-none');
    $('splash-detail').textContent = 'Loading Client Portal...';
    $('splash-screen').classList.remove('d-none');
    setTimeout(() => {
        $('splash-screen').classList.add('d-none');
        state.role = 'client';
        state.clientData = client;
        clientView.classList.remove('d-none');
        $('client-name-display').textContent = client.name;
        initClient();
    }, 2500);
};

window.logout = function() {
    state.role = null;
    coachApp.classList.add('d-none');
    clientView.classList.add('d-none');
    loginPage.classList.remove('d-none');
    $('coach-password').value = '';
    $('client-phone-input').value = '';
    $('client-pin-input').value = '';
    $('coach-login-error').classList.add('d-none');
    $('login-error').classList.add('d-none');
};

// ===== COACH =====
function initCoach() {
    const navItems = document.querySelectorAll('#coach-app .nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            state.view = item.dataset.view;
            coachRender();
        });
    });
    $('global-search').addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        coachRender();
    });
    coachRender();
}

function coachRender() {
    let data = state.data;
    if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        data = data.filter(c => c.name.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q) || c.phone.includes(q));
    }
    if (state.view === 'dashboard') renderCoachDashboard(data);
    else if (state.view === 'leads') renderCoachList(data.filter(c => c.status === 'Lead'), 'Active Leads');
    else if (state.view === 'onboarded') renderCoachList(data.filter(c => c.status === 'Onboarded'), 'Onboarded Clients');
    else if (state.view === 'converted') renderCoachList(data.filter(c => c.status === 'Converted'), 'Converted Clients');
    else if (state.view === 'industries') renderCoachIndustries(state.data);
    else if (state.view === 'reports') renderCoachReports(state.data);
    else if (state.view === 'feedback') renderCoachFeedback(state.data);
    else if (state.view === 'chat') { const c = state.data.find(x => x.id === state.chatClientId); if (c) renderCoachChat(c); }
    else if (state.view === 'client-detail') { const c = state.data.find(x => x.id === state.clientDetailId); if (c) renderCoachClientDetail(c); }
}

function renderCoachDashboard(data) {
    const leads = data.filter(c => c.status === 'Lead').length;
    const onboarded = data.filter(c => c.status === 'Onboarded').length;
    const converted = data.filter(c => c.status === 'Converted').length;
    const total = data.length;
    viewContainer.innerHTML = `
        <h4 class="page-title"><i class="bi bi-speedometer2"></i> Dashboard</h4>
        <div class="stats-row">
            <div class="stat-card"><div class="number">${total}</div><div class="label">Total Clients</div></div>
            <div class="stat-card blue"><div class="number">${leads}</div><div class="label">Active Leads</div></div>
            <div class="stat-card gold"><div class="number">${onboarded}</div><div class="label">Onboarded</div></div>
            <div class="stat-card" style="background:linear-gradient(135deg,#5BB8E8,#87CEEB);color:#1f2937"><div class="number">${converted}</div><div class="label">Converted</div></div>
        </div>
        <div class="section-header"><h2>Recent Clients</h2></div>
        <div class="grid">${data.slice().reverse().slice(0, 6).map(c => clientCard(c)).join('')}</div>
    `;
}

function renderCoachList(data, title) {
    viewContainer.innerHTML = `
        <h4 class="page-title">${title} (${data.length})</h4>
        <div class="grid">${data.map(c => clientCard(c)).join('')}</div>
    `;
}

function renderCoachIndustries(data) {
    const groups = {};
    data.forEach(c => {
        const ind = c.industry || 'Uncategorized';
        if (!groups[ind]) groups[ind] = [];
        groups[ind].push(c);
    });
    viewContainer.innerHTML = `
        <h4 class="page-title"><i class="bi bi-building"></i> Industries</h4>
        ${Object.entries(groups).sort((a,b) => b[1].length - a[1].length).map(([ind, clients]) => `
            <div class="industry-group">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem">
                    <h5 style="margin:0;color:#1a3c34;font-weight:600">${ind}</h5>
                    <span class="badge" style="background:#1a3c34;color:#fff">${clients.length}</span>
                </div>
                <div class="grid" style="margin-top:0">${clients.map(c => clientCard(c)).join('')}</div>
            </div>
        `).join('')}
    `;
}

function renderCoachReports(data) {
    viewContainer.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0">
            <h4 class="page-title" style="margin-bottom:0"><i class="bi bi-file-text"></i> Reports</h4>
            <div style="display:flex;gap:0.5rem">
                <button class="btn btn-sm btn-outline-primary" onclick="exportExcel()"><i class="bi bi-file-earmark-excel"></i> Excel</button>
                <button class="btn btn-sm btn-primary" onclick="exportPDF()"><i class="bi bi-file-earmark-pdf"></i> PDF</button>
            </div>
        </div>
        <div class="card-crm"><div class="card-header">Weekly Coaching Review</div>
        <div id="reports-content" style="overflow-x:auto">
        <table class="table-crm">
            <thead><tr><th>Client</th><th>Industry</th><th>Status</th><th>Latest Message</th><th></th></tr></thead>
            <tbody>${data.map(c => {
                const last = c.progressHistory?.length > 0 ? c.progressHistory[c.progressHistory.length - 1] : null;
                return `<tr><td><strong>${c.name}</strong></td><td>${c.industry}</td>
                    <td><span class="badge ${c.status === 'Lead' ? 'badge-lead' : c.status === 'Converted' ? 'badge-converted' : 'badge-onboarded'}">${c.status}</span></td>
                    <td style="font-size:0.85rem;color:#64748b">${last ? fmtDT(last.date) + ' — ' + last.note.substring(0,35)+'...' : 'No messages'}</td>
                    <td><button class="btn btn-sm btn-primary" onclick="openClientChat(${c.id})"><i class="bi bi-chat-dots"></i> Chat</button></td></tr>`;
            }).join('')}</tbody>
        </table></div></div>
    `;
}

window.exportExcel = function() {
    const data = state.data;
    let csv = 'Client,Industry,Phone,Status,Latest Message,Message Date\n';
    data.forEach(c => {
        const last = c.progressHistory?.length > 0 ? c.progressHistory[c.progressHistory.length - 1] : null;
        const msg = last ? '"' + last.note.replace(/"/g,'""') + '"' : '';
        const dt = last ? fmtDT(last.date) : '';
        csv += '"' + c.name + '","' + c.industry + '","' + c.phone + '","' + c.status + '",' + msg + ',' + dt + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'QuestSpark_Report.csv'; a.click();
    URL.revokeObjectURL(a.href);
};

window.exportPDF = function() {
    const el = document.getElementById('reports-content');
    if (!el) return;
    const opt = { margin: 0.5, filename: 'QuestSpark_Report.pdf', html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' } };
    html2pdf().set(opt).from(el).save();
};

function renderCoachFeedback(data) {
    viewContainer.innerHTML = `
        <h4 class="page-title"><i class="bi bi-chat-square-text"></i> Feedback Hub</h4>
        <div class="card-crm"><div class="card-header">Client Feedback</div>
        <div style="overflow-x:auto">
        <table class="table-crm">
            <thead><tr><th>Client</th><th>Industry</th><th>Status</th><th>Latest Feedback</th><th></th></tr></thead>
            <tbody>${data.map(c => {
                const fb = c.feedbackHistory?.length > 0 ? c.feedbackHistory[c.feedbackHistory.length - 1] : null;
                return `<tr><td><strong>${c.name}</strong></td><td>${c.industry}</td>
                    <td><span class="badge ${c.status === 'Lead' ? 'badge-lead' : 'badge-onboarded'}">${c.status}</span></td>
                    <td style="font-size:0.85rem;color:#64748b">${fb ? fmtDT(fb.date) + ' — ' + fb.text.substring(0,40)+'...' : 'No feedback'}</td>
                    <td><button class="btn btn-sm btn-primary" onclick="openFeedbackModal(${c.id})"><i class="bi bi-chat-square-text"></i> Feedback</button></td></tr>`;
            }).join('')}</tbody>
        </table></div></div>
    `;
}

function clientCard(c) {
    const phone = c.phone.replace(/\D/g, '');
    const wa = `https://wa.me/${phone}?text=${encodeURIComponent('Hi ' + c.name + ', this is your coach. Hope you\'re doing well!')}`;
    const recent = c.progressHistory?.length > 0 ? c.progressHistory.slice(-2) : [];
    const chatHtml = recent.length > 0
        ? `<div class="chat-preview">${recent.map(h => bubbleFromEntry(h, false)).join('')}</div>`
        : '<p style="font-size:0.8rem;color:#94a3b8;margin-top:0.5rem">No messages yet.</p>';
    const badgeClass = c.status === 'Lead' ? 'badge-lead' : c.status === 'Converted' ? 'badge-converted' : 'badge-onboarded';
    return `<div class="client-card" onclick="openClientDetail(${c.id})" style="cursor:pointer">
        <div style="display:flex;justify-content:space-between;align-items:flex-start" onclick="event.stopPropagation()">
            <span class="badge ${badgeClass}" style="cursor:pointer" onclick="quickStatus(${c.id})">${c.status} <i class="bi bi-chevron-down" style="font-size:0.6rem;margin-left:2px"></i></span>
            <div>
                <button class="btn btn-sm btn-outline-primary" onclick="openClientChat(${c.id})" title="Chat"><i class="bi bi-chat-dots"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation();deleteClient(${c.id})" title="Delete"><i class="bi bi-trash"></i></button>
            </div>
        </div>
        <div class="name">${c.name}</div>
        <div class="industry"><i class="bi bi-building"></i> ${c.industry}</div>
        ${c.notes ? `<div class="notes"><i class="bi bi-chat"></i> ${c.notes}</div>` : ''}
        ${chatHtml}
        <a href="${wa}" target="_blank" class="whatsapp-link" onclick="event.stopPropagation()"><i class="bi bi-whatsapp"></i> WhatsApp</a>
    </div>`;
}

// ===== COACH CHAT =====
window.openClientChat = function(id) {
    state.prevView = state.view;
    state.chatClientId = id;
    state.view = 'chat';
    document.querySelectorAll('#coach-app .nav-item').forEach(i => i.classList.remove('active'));
    coachRender();
};

function renderCoachChat(c) {
    const all = [...(c.progressHistory || []).map(h => ({ ...h, type: 'note' })), ...(c.feedbackHistory || []).map(h => ({ ...h, type: 'feedback' }))];
    all.sort((a, b) => new Date(a.date) - new Date(b.date));
    viewContainer.innerHTML = `
        <div class="chat-view">
            <div class="chat-header">
                <button class="btn btn-sm btn-outline-secondary" onclick="backToPrevView()"><i class="bi bi-arrow-left"></i></button>
                <span><strong>${c.name}</strong> <span style="color:#64748b;font-size:0.85rem">— ${c.industry}</span></span>
            </div>
            <div class="chat-messages" id="coach-chat-msgs">
                ${all.map(h => h.type === 'note'
                    ? bubbleFromEntry(h, false)
                    : `<div class="chat-bubble chat-feedback"><div class="chat-sender">Coach</div><div class="chat-text"><i class="bi bi-chat-square-text"></i> ${escapeHtml(h.text)}</div>${h.files?.length > 0 ? fileThumbs(h.files) : ''}<div class="chat-time">${fmtDT(h.date)}</div></div>`
                ).join('')}
            </div>
            <form id="coach-chat-form" class="chat-input">
                <input type="hidden" id="coach-chat-id" value="${c.id}">
                <input type="text" id="coach-chat-msg" class="form-control" placeholder="Type a message..." autocomplete="off">
                <label class="btn btn-outline-secondary btn-file-label"><i class="bi bi-paperclip"></i><input type="file" id="coach-chat-files" multiple accept="image/*,.pdf,.doc,.docx,.txt" hidden></label>
                <button class="btn btn-primary" type="submit"><i class="bi bi-send"></i></button>
            </form>
        </div>
    `;
    const msgs = $('coach-chat-msgs');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
    $('coach-chat-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = parseInt($('coach-chat-id').value);
        const msg = $('coach-chat-msg').value.trim();
        const fileInput = $('coach-chat-files');
        const files = [];
        const readerPromises = Array.from(fileInput.files).map(f => new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = () => { files.push({ name: f.name, type: f.type, data: reader.result }); resolve(); };
            reader.readAsDataURL(f);
        }));
        Promise.all(readerPromises).then(() => {
            db.addProgress(id, msg, files, 'coach');
            state.data = db.load();
            const cl = state.data.find(x => x.id === id);
            if (cl) renderCoachChat(cl);
        });
    });
}

window.backToPrevView = function() {
    state.view = state.prevView || 'dashboard';
    state.clientDetailId = null;
    document.querySelectorAll('#coach-app .nav-item').forEach(i => i.classList.toggle('active', i.dataset.view === state.view));
    coachRender();
};

// ===== CLIENT DETAIL =====
window.openClientDetail = function(id) {
    state.prevView = state.view;
    state.clientDetailId = id;
    state.view = 'client-detail';
    document.querySelectorAll('#coach-app .nav-item').forEach(i => i.classList.remove('active'));
    coachRender();
};

function renderCoachClientDetail(c) {
    const phone = c.phone.replace(/\D/g, '');
    const wa = `https://wa.me/${phone}?text=${encodeURIComponent('Hi ' + c.name + ', this is your coach. Hope you\'re doing well!')}`;
    const hist = c.progressHistory || [];
    const fb = c.feedbackHistory || [];
    viewContainer.innerHTML = `
        <div class="detail-view">
            <div class="detail-header">
                <button class="btn btn-sm btn-outline-secondary" onclick="backToPrevView()"><i class="bi bi-arrow-left"></i> Back</button>
                <span><strong>${c.name}</strong> <span style="color:#64748b;font-size:0.85rem">— ${c.industry}</span></span>
            </div>
            <div class="detail-body">
                <div class="detail-info">
                    <div class="card-crm"><div class="card-header"><i class="bi bi-person"></i> Client Info</div>
                    <div class="card-body p-3">
                        <p><strong>Name:</strong> ${c.name}</p>
                        <p><strong>Industry:</strong> ${c.industry}</p>
                        <p><strong>Phone:</strong> ${c.phone}</p>
                        <p><strong>Status:</strong> <span class="badge ${c.status === 'Lead' ? 'badge-lead' : c.status === 'Converted' ? 'badge-converted' : 'badge-onboarded'}" style="cursor:pointer" onclick="quickStatus(${c.id})">${c.status} <i class="bi bi-chevron-down" style="font-size:0.6rem"></i></span></p>
                        ${c.notes ? `<p><strong>Notes:</strong> ${c.notes}</p>` : ''}
                        <p><strong>PIN:</strong> ${c.pin || '2020'}</p>
                        <div style="display:flex;gap:0.5rem;margin-top:0.5rem">
                            <a href="${wa}" target="_blank" class="btn btn-sm btn-success"><i class="bi bi-whatsapp"></i> WhatsApp</a>
                            <button class="btn btn-sm btn-outline-primary" onclick="openClientChat(${c.id})"><i class="bi bi-chat-dots"></i> Open Chat</button>
                            <button class="btn btn-sm btn-outline-secondary" onclick="openFeedbackModal(${c.id})"><i class="bi bi-chat-square-text"></i> Send Feedback</button>
                        </div>
                    </div></div>
                    ${fb.length > 0 ? `<div class="card-crm"><div class="card-header"><i class="bi bi-chat-square-text"></i> Recent Feedback</div>
                    <div class="card-body p-3">${fb.slice(-3).reverse().map(h => `
                        <div class="feedback-entry"><div class="feedback-date">${fmtDT(h.date)}</div><div class="feedback-text">${h.text}</div></div>
                    `).join('')}</div></div>` : ''}
                </div>
                <div class="detail-chat">
                    <div class="chat-view" style="height:100%;border-radius:12px">
                        <div class="chat-header"><span><i class="bi bi-chat-dots"></i> Chat</span></div>
                        <div class="chat-messages" id="detail-chat-msgs">
                            ${hist.length === 0 ? '<p style="color:#94a3b8;text-align:center;padding:2rem">No messages yet.</p>' : ''}
                            ${hist.map(h => bubbleFromEntry(h, false)).join('')}
                        </div>
                        <form id="detail-chat-form" class="chat-input">
                            <input type="text" id="detail-chat-msg" class="form-control" placeholder="Type a message..." autocomplete="off">
                            <label class="btn btn-outline-secondary btn-file-label"><i class="bi bi-paperclip"></i><input type="file" id="detail-chat-files" multiple accept="image/*,.pdf,.doc,.docx,.txt" hidden></label>
                            <button class="btn btn-primary" type="submit"><i class="bi bi-send"></i></button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
    const msgs = $('detail-chat-msgs');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
    $('detail-chat-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const msg = $('detail-chat-msg').value.trim();
        const fileInput = $('detail-chat-files');
        const files = [];
        const readerPromises = Array.from(fileInput.files).map(f => new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = () => { files.push({ name: f.name, type: f.type, data: reader.result }); resolve(); };
            reader.readAsDataURL(f);
        }));
        Promise.all(readerPromises).then(() => {
            db.addProgress(c.id, msg, files, 'coach');
            state.data = db.load();
            const cl = state.data.find(x => x.id === c.id);
            if (cl) renderCoachClientDetail(cl);
        });
    });
}

// ===== CLIENT =====
function initClient() {
    document.querySelectorAll('#client-view .nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('#client-view .nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            clientRender(item.dataset.view);
        });
    });
    clientRender('my-profile');
}

function clientRender(view) {
    const c = state.clientData;
    if (view === 'my-profile') {
        clientViewContainer.innerHTML = `
            <div class="card-crm"><div class="card-header"><i class="bi bi-person"></i> My Profile</div>
            <div class="client-profile">
                <div class="avatar"><i class="bi bi-person-circle"></i></div>
                <h2>${c.name}</h2>
                <p class="text-muted"><i class="bi bi-building"></i> ${c.industry}</p>
                <p><i class="bi bi-telephone"></i> ${c.phone}</p>
                <span class="badge ${c.status === 'Lead' ? 'badge-lead' : 'badge-onboarded'}" style="padding:0.5rem 1rem;font-size:0.9rem">${c.status}</span>
                ${c.notes ? `<p style="margin-top:1rem"><i class="bi bi-chat"></i> ${c.notes}</p>` : ''}
            </div></div>
            <div class="card-crm"><div class="card-header"><i class="bi bi-whatsapp"></i> Contact Coach</div>
            <div class="card-body p-3">
                <a href="https://wa.me/${c.phone.replace(/\D/g, '')}" target="_blank" class="btn btn-gold w-100">
                    <i class="bi bi-whatsapp"></i> Message Coach on WhatsApp
                </a>
            </div></div>
        `;
    } else if (view === 'my-feedback') {
        const hist = c.feedbackHistory || [];
        clientViewContainer.innerHTML = `
            <div class="card-crm"><div class="card-header"><i class="bi bi-chat-square-text"></i> My Feedback</div>
            <div class="card-body p-3">
                ${hist.length === 0 ? '<p class="text-muted">No feedback yet.</p>' : hist.slice().reverse().map(h => `
                    <div class="feedback-entry">
                        <div class="feedback-date">${fmtDT(h.date)}</div>
                        <div style="font-size:0.75rem;font-weight:600;color:#5BB8E8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px">Coach</div>
                        <div class="feedback-text">${h.text}</div>
                        ${h.files?.length > 0 ? `<div class="feedback-files">${h.files.map(f =>
                            f.type.startsWith('image/')
                                ? `<div class="file-preview"><img src="${f.data}" alt="${f.name}"><div class="file-name">${f.name}</div></div>`
                                : `<div class="file-preview file-doc"><i class="bi bi-paperclip"></i> <a href="${f.data}" download="${f.name}">${f.name}</a></div>`
                        ).join('')}</div>` : ''}
                    </div>
                `).join('')}
            </div></div>
        `;
    } else if (view === 'my-progress') {
        const hist = c.progressHistory || [];
        clientViewContainer.innerHTML = `
            <div class="chat-view" style="height:calc(100vh - 140px)">
                <div class="chat-header"><span><i class="bi bi-chat-dots"></i> My Coaching Chat</span></div>
                <div class="chat-messages" id="client-chat-msgs">
                    ${hist.length === 0 ? '<p style="color:#94a3b8;text-align:center;padding:2rem">No messages yet. Your coach will reach out here.</p>' : ''}
                    ${hist.map(h => bubbleFromEntry(h, true)).join('')}
                </div>
                <form id="client-chat-form" class="chat-input">
                    <input type="text" id="client-chat-msg" class="form-control" placeholder="Type a message..." autocomplete="off">
                    <label class="btn btn-outline-secondary btn-file-label"><i class="bi bi-paperclip"></i><input type="file" id="client-chat-files" multiple accept="image/*,.pdf,.doc,.docx,.txt" hidden></label>
                    <button class="btn btn-primary" type="submit"><i class="bi bi-send"></i></button>
                </form>
            </div>
        `;
        const msgs = $('client-chat-msgs');
        if (msgs) msgs.scrollTop = msgs.scrollHeight;
        $('client-chat-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const msg = $('client-chat-msg').value.trim();
            const fileInput = $('client-chat-files');
            const files = [];
            const readerPromises = Array.from(fileInput.files).map(f => new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = () => { files.push({ name: f.name, type: f.type, data: reader.result }); resolve(); };
                reader.readAsDataURL(f);
            }));
            Promise.all(readerPromises).then(() => {
                db.addProgress(state.clientData.id, msg, files, 'client');
                state.data = db.load();
                state.clientData = state.data.find(x => x.id === state.clientData.id);
                clientRender('my-progress');
            });
        });
    }
}

// ===== ACTIONS =====
window.openAddModal = function() {
    $('modal-title').innerHTML = '<i class="bi bi-person-plus"></i> Add Client';
    $('edit-id').value = '';
    $('client-form').reset();
    $('client-modal').classList.remove('d-none');
};

window.openProgressModal = function(id) {
    $('progress-client-id').value = id;
    $('progress-note').value = '';
    $('progress-modal').classList.remove('d-none');
};

window.closeModal = function() { $('client-modal').classList.add('d-none'); };
window.closeProgressModal = function() { $('progress-modal').classList.add('d-none'); };

window.openFeedbackModal = function(id) {
    $('feedback-client-id').value = id;
    $('feedback-text').value = '';
    $('feedback-files').value = '';
    $('feedback-file-list').textContent = '';
    $('feedback-modal').classList.remove('d-none');
};

window.closeFeedbackModal = function() { $('feedback-modal').classList.add('d-none'); };

// Show selected file names in feedback modal
$('feedback-files').addEventListener('change', function() {
    const names = Array.from(this.files).map(f => f.name).join(', ');
    $('feedback-file-list').textContent = names ? `Selected: ${names}` : '';
});

window.deleteClient = function(id) {
    if (confirm('Delete this client?')) {
        state.data = db.deleteClient(id);
        coachRender();
    }
};

window.quickStatus = function(id) {
    const c = state.data.find(x => x.id === id);
    if (!c) return;
    const next = c.status === 'Lead' ? 'Onboarded' : c.status === 'Onboarded' ? 'Converted' : 'Lead';
    if (confirm(`Change ${c.name} status from "${c.status}" to "${next}"?`)) {
        state.data = db.updateClient(id, { status: next });
        coachRender();
    }
};

// Form submits
$('client-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData($('client-form'));
    const editId = $('edit-id').value;
    if (editId) {
        db.updateClient(parseInt(editId), Object.fromEntries(fd));
    } else {
        db.addClient(Object.fromEntries(fd));
    }
    state.data = db.load();
    $('client-modal').classList.add('d-none');
    coachRender();
});

$('progress-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = parseInt($('progress-client-id').value);
    const note = $('progress-note').value;
    db.addProgress(id, note, [], 'coach');
    state.data = db.load();
    $('progress-modal').classList.add('d-none');
    if (state.role === 'coach') coachRender();
    else { state.clientData = state.data.find(c => c.id === id); clientRender('my-progress'); }
});

$('feedback-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = parseInt($('feedback-client-id').value);
    const text = $('feedback-text').value;
    const fileInput = $('feedback-files');
    const files = [];
    const readerPromises = Array.from(fileInput.files).map(f => new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => {
            files.push({ name: f.name, type: f.type, data: reader.result });
            resolve();
        };
        reader.readAsDataURL(f);
    }));
    Promise.all(readerPromises).then(() => {
        db.addFeedback(id, text, files);
        state.data = db.load();
        $('feedback-modal').classList.add('d-none');
        if (state.role === 'coach') coachRender();
        else { state.clientData = state.data.find(c => c.id === id); clientRender('my-feedback'); }
    });
});