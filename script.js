/* ══════════════════════════════════════
   Gestor de Contactos — script.js
══════════════════════════════════════ */

// ── ESTADO ──────────────────────────────
let contacts = [];
let editingId = null;
let deleteId = null;
let pendingPhoto = null;
let ctxTargetId = null;
let currentView = 'table'; // 'table' | 'cards'

// ── DOM ────────────────────────────────
const $ = id => document.getElementById(id);

const tbody = $('tbody');
const cardView = $('cardView');
const tableView = $('tableView');
const emptyTable = $('emptyTable');
const searchInput = $('searchInput');
const catFilter = $('catFilter');
const sortSel = $('sortSel');
const favOnly = $('favOnly');
const filterBar = $('filterBar');

// Estadísticas
const sTotal = $('sTotal');
const sFav = $('sFav');
const sWork = $('sWork');
const sPersonal = $('sPersonal');
const sFamily = $('sFamily');
const sOther = $('sOther');
const chCount = $('chCount');

// Botones
const btnNew = $('btnNew');
const btnTable = $('btnTable');
const btnCards = $('btnCards');
const filterToggle = $('filterToggle');
const btnExport = $('btnExport');
const btnImport = $('btnImport');
const btnEmptyAdd = $('btnEmptyAdd');
const selAll = $('selAll');

// Tema
const themeToggle = $('themeToggle');
const themeIcon = $('themeIcon');
const themeLabel = $('themeLabel');

// Modal formulario
const formOverlay = $('formOverlay');
const modalTitle = $('modalTitle');
const modalClose = $('modalClose');
const btnCancel = $('btnCancel');
const btnSave = $('btnSave');
const avPreview = $('avPreview');
const photoInput = $('photoInput');
const rmPhoto = $('rmPhoto');
const fName = $('fName');
const fPhone = $('fPhone');
const fEmail = $('fEmail');
const fCompany = $('fCompany');
const fCat = $('fCat');
const fFav = $('fFav');
const errName = $('errName');
const errPhone = $('errPhone');
const errEmail = $('errEmail');

// Modal eliminar
const delOverlay = $('delOverlay');
const delClose = $('delClose');
const delNo = $('delNo');
const delYes = $('delYes');
const delName = $('delName');

// Menú contextual
const rowMenu = $('rowMenu');
const rmEdit = $('rmEdit');
const rmFav = $('rmFav');
const rmDel = $('rmDel');

// Toast
const toastEl = $('toast');

// ── UTILIDADES ──────────────────────────────
function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
function esc(s = '') {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function initials(name) {
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}
function fmtDate(ts) {
    return new Date(ts).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── TOAST ──────────────────────────────
let toastTimer;
function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2800);
}

// ── ALMACENAMIENTO LOCAL ─────────────────────
function save() { localStorage.setItem('mcm_v3', JSON.stringify(contacts)); }
function load() {
    try { contacts = JSON.parse(localStorage.getItem('mcm_v3')) || []; }
    catch { contacts = []; }
}

// ── TEMA ──────────────────────────────
function applyTheme(dark) {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    themeIcon.className = dark ? 'ri-sun-line' : 'ri-moon-line';
    themeLabel.textContent = dark ? 'Modo claro' : 'Modo oscuro';
    localStorage.setItem('mcm_theme', dark ? 'dark' : 'light');
}
themeToggle.addEventListener('click', () => {
    applyTheme(document.documentElement.getAttribute('data-theme') !== 'dark');
});

// ── FILTRO + ORDEN ─────────────────────
function filteredList() {
    const q = searchInput.value.trim().toLowerCase();
    const cat = catFilter.value;
    const fav = favOnly.checked;
    const srt = sortSel.value;

    let list = contacts.filter(c => {
        const mq = !q
            || c.name.toLowerCase().includes(q)
            || (c.phone && c.phone.toLowerCase().includes(q))
            || (c.email && c.email.toLowerCase().includes(q))
            || (c.company && c.company.toLowerCase().includes(q));
        const mc = !cat || c.category === cat;
        const mf = !fav || c.favorite;
        return mq && mc && mf;
    });

    if (srt === 'az') list.sort((a, b) => a.name.localeCompare(b.name));
    if (srt === 'za') list.sort((a, b) => b.name.localeCompare(a.name));
    if (srt === 'fav') list.sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0));
    if (srt === 'recent') list.sort((a, b) => b.createdAt - a.createdAt);
    return list;
}

// ── ESTADÍSTICAS ─────────────────────────
function updateStats() {
    sTotal.textContent = contacts.length;
    sFav.textContent = contacts.filter(c => c.favorite).length;
    sWork.textContent = contacts.filter(c => c.category === 'Trabajo').length;
    sFamily && (sFamily.textContent = contacts.filter(c => c.category === 'Familia').length);
    sPersonal && (sPersonal.textContent = contacts.filter(c => c.category === 'Personal').length);
    sOther && (sOther.textContent = contacts.filter(c => c.category === 'Otro').length);
}

// ── RENDER ────────────────────────────
function render() {
    const list = filteredList();
    chCount.textContent = `${list.length} contacto${list.length !== 1 ? 's' : ''}`;
    updateStats();

    if (currentView === 'table') renderTable(list);
    else renderCards(list);
}

// ── RENDER TABLA ──────────────────────
function renderTable(list) {
    tbody.innerHTML = '';

    if (list.length === 0) {
        emptyTable.style.display = 'flex';
        return;
    }
    emptyTable.style.display = 'none';

    list.forEach((c, i) => {
        const tr = document.createElement('tr');
        tr.style.animationDelay = `${i * 0.03}s`;

        const avHtml = c.photo
            ? `<div class="td-av"><img src="${c.photo}" alt=""/></div>`
            : `<div class="td-av">${initials(c.name)}</div>`;

        tr.innerHTML = `
      <td><input type="checkbox" class="row-chk" data-id="${c.id}"/></td>
      <td>
        <div class="td-contact">
          ${avHtml}
          <span class="td-name">${esc(c.name)}</span>
        </div>
      </td>
      <td>${esc(c.phone || '—')}</td>
      <td>${c.email ? `<a href="mailto:${c.email}" style="color:var(--tx2);text-decoration:none;" onmouseover="this.style.color='var(--acc)'" onmouseout="this.style.color='var(--tx2)'">${esc(c.email)}</a>` : '—'}</td>
      <td>${esc(c.company || '—')}</td>
      <td>${fmtDate(c.createdAt)}</td>
      <td><span class="tag tag-${c.category}">${c.category}</span></td>
      <td>
        <button class="fav-star${c.favorite ? ' on' : ''}" data-id="${c.id}" title="Favorito">
          <i class="${c.favorite ? 'ri-star-fill' : 'ri-star-line'}"></i>
        </button>
      </td>
      <td>
        <button class="dots-btn" data-id="${c.id}" title="Opciones">
          <i class="ri-more-2-fill"></i>
        </button>
      </td>
    `;

        tr.querySelector('.fav-star').addEventListener('click', e => {
            e.stopPropagation();
            toggleFav(c.id);
        });
        tr.querySelector('.dots-btn').addEventListener('click', e => {
            e.stopPropagation();
            openRowMenu(e, c.id);
        });

        tbody.appendChild(tr);
    });
}

// ── RENDER TARJETAS ───────────────────────
function renderCards(list) {
    cardView.innerHTML = '';

    if (list.length === 0) {
        cardView.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <i class="ri-user-search-line"></i><p>No se encontraron contactos</p>
      </div>`;
        return;
    }

    list.forEach((c, i) => {
        const div = document.createElement('div');
        div.className = 'ccard';
        div.style.animationDelay = `${i * 0.04}s`;

        const avHtml = c.photo
            ? `<div class="ccard-av"><img src="${c.photo}" alt=""/></div>`
            : `<div class="ccard-av">${initials(c.name)}</div>`;

        const phoneRow = c.phone ? `<div class="ccard-det"><i class="ri-phone-line"></i><a href="tel:${c.phone}">${esc(c.phone)}</a></div>` : '';
        const emailRow = c.email ? `<div class="ccard-det"><i class="ri-mail-line"></i><a href="mailto:${c.email}">${esc(c.email)}</a></div>` : '';
        const coTxt = c.company ? esc(c.company) : '';

        div.innerHTML = `
      <div class="ccard-top">
        ${avHtml}
        <div class="ccard-info">
          <div class="ccard-name">${esc(c.name)}</div>
          ${coTxt ? `<div class="ccard-co">${coTxt}</div>` : ''}
        </div>
        <button class="fav-star${c.favorite ? ' on' : ''}" data-id="${c.id}">
          <i class="${c.favorite ? 'ri-star-fill' : 'ri-star-line'}"></i>
        </button>
      </div>
      <div class="ccard-details">
        ${phoneRow}${emailRow}
      </div>
      <div class="ccard-foot">
        <span class="tag tag-${c.category}">${c.category}</span>
        <div class="ccard-actions">
          <button class="cc-btn edit" data-id="${c.id}"><i class="ri-pencil-line"></i> Editar</button>
          <button class="cc-btn del"  data-id="${c.id}"><i class="ri-delete-bin-line"></i></button>
        </div>
      </div>
    `;

        div.querySelector('.fav-star').addEventListener('click', () => toggleFav(c.id));
        div.querySelector('.cc-btn.edit').addEventListener('click', () => openEdit(c.id));
        div.querySelector('.cc-btn.del').addEventListener('click', () => openDel(c.id));
        cardView.appendChild(div);
    });
}

// ── CAMBIO DE VISTA ───────────────────────
function switchView(v) {
    currentView = v;
    if (v === 'table') {
        tableView.style.display = '';
        cardView.classList.add('hidden');
        btnTable.classList.add('active');
        btnCards.classList.remove('active');
    } else {
        tableView.style.display = 'none';
        cardView.classList.remove('hidden');
        btnCards.classList.add('active');
        btnTable.classList.remove('active');
    }
    render();
}
btnTable.addEventListener('click', () => switchView('table'));
btnCards.addEventListener('click', () => switchView('cards'));

// ── FAVORITO ──────────────────────────────
function toggleFav(id) {
    const c = contacts.find(c => c.id === id);
    if (!c) return;
    c.favorite = !c.favorite;
    save(); render();
    toast(c.favorite ? `⭐ ${c.name} marcado como favorito` : `${c.name} quitado de favoritos`);
}

// ── MENÚ CONTEXTUAL ──────────────────────────────
function openRowMenu(e, id) {
    ctxTargetId = id;
    const c = contacts.find(c => c.id === id);
    rmFav.innerHTML = `<i class="${c?.favorite ? 'ri-star-fill' : 'ri-star-line'}"></i> ${c?.favorite ? 'Quitar favorito' : 'Marcar favorito'}`;
    rowMenu.style.top = `${e.clientY}px`;
    rowMenu.style.left = `${Math.min(e.clientX, window.innerWidth - 180)}px`;
    rowMenu.classList.add('open');
}
function closeRowMenu() { rowMenu.classList.remove('open'); }
rmEdit.addEventListener('click', () => { closeRowMenu(); openEdit(ctxTargetId); });
rmFav.addEventListener('click', () => { closeRowMenu(); toggleFav(ctxTargetId); });
rmDel.addEventListener('click', () => { closeRowMenu(); openDel(ctxTargetId); });
document.addEventListener('click', e => {
    if (!rowMenu.contains(e.target)) closeRowMenu();
});

// ── BARRA DE FILTROS ─────────────────────
filterToggle.addEventListener('click', () => {
    filterBar.classList.toggle('hidden');
    filterToggle.classList.toggle('active');
});

// ── MODAL FORMULARIO ────────────────────────────
function resetForm() {
    fName.value = ''; fPhone.value = ''; fEmail.value = '';
    fCompany.value = ''; fCat.value = 'Personal'; fFav.checked = false;
    errName.textContent = ''; errPhone.textContent = ''; errEmail.textContent = '';
    fName.classList.remove('err'); fPhone.classList.remove('err'); fEmail.classList.remove('err');
    avPreview.innerHTML = '<i class="ri-user-3-line"></i>';
    rmPhoto.style.display = 'none';
    photoInput.value = '';
    pendingPhoto = null;
}

function openNew() {
    editingId = null;
    resetForm();
    modalTitle.textContent = 'Agregar Contacto';
    formOverlay.classList.add('open');
    fName.focus();
}

function openEdit(id) {
    const c = contacts.find(c => c.id === id);
    if (!c) return;
    editingId = id;
    fName.value = c.name; fPhone.value = c.phone || '';
    fEmail.value = c.email || ''; fCompany.value = c.company || '';
    fCat.value = c.category || 'Personal'; fFav.checked = !!c.favorite;
    pendingPhoto = c.photo || null;
    if (pendingPhoto) {
        avPreview.innerHTML = `<img src="${pendingPhoto}"/>`;
        rmPhoto.style.display = '';
    } else {
        avPreview.innerHTML = '<i class="ri-user-3-line"></i>';
        rmPhoto.style.display = 'none';
    }
    errName.textContent = ''; errPhone.textContent = ''; errEmail.textContent = '';
    modalTitle.textContent = 'Editar Contacto';
    formOverlay.classList.add('open');
    fName.focus();
}

function closeForm() { formOverlay.classList.remove('open'); }

function validate() {
    let ok = true;
    [errName, errPhone, errEmail].forEach(e => e.textContent = '');
    [fName, fPhone, fEmail].forEach(f => f.classList.remove('err'));

    if (!fName.value.trim()) {
        errName.textContent = 'El nombre es requerido.';
        fName.classList.add('err'); ok = false;
    }
    if (!fPhone.value.trim()) {
        errPhone.textContent = 'El teléfono es requerido.';
        fPhone.classList.add('err'); ok = false;
    } else if (!/^[\d\s\+\-\(\)]{5,20}$/.test(fPhone.value.trim())) {
        errPhone.textContent = 'Teléfono inválido.';
        fPhone.classList.add('err'); ok = false;
    }
    if (fEmail.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fEmail.value.trim())) {
        errEmail.textContent = 'Correo inválido.';
        fEmail.classList.add('err'); ok = false;
    }
    return ok;
}

function saveContact() {
    if (!validate()) return;
    if (editingId) {
        const idx = contacts.findIndex(c => c.id === editingId);
        if (idx !== -1) {
            contacts[idx] = {
                ...contacts[idx],
                name: fName.value.trim(), phone: fPhone.value.trim(),
                email: fEmail.value.trim(), company: fCompany.value.trim(),
                category: fCat.value, favorite: fFav.checked,
                photo: pendingPhoto,
            };
        }
        toast('✅ Contacto actualizado');
    } else {
        contacts.push({
            id: uid(), createdAt: Date.now(),
            name: fName.value.trim(), phone: fPhone.value.trim(),
            email: fEmail.value.trim(), company: fCompany.value.trim(),
            category: fCat.value, favorite: fFav.checked,
            photo: pendingPhoto,
        });
        toast('✅ Contacto guardado');
    }
    save(); closeForm(); render();
}

// Foto
photoInput.addEventListener('change', () => {
    const f = photoInput.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = e => {
        pendingPhoto = e.target.result;
        avPreview.innerHTML = `<img src="${pendingPhoto}"/>`;
        rmPhoto.style.display = '';
    };
    r.readAsDataURL(f);
});
rmPhoto.addEventListener('click', () => {
    pendingPhoto = null;
    avPreview.innerHTML = '<i class="ri-user-3-line"></i>';
    rmPhoto.style.display = 'none';
    photoInput.value = '';
});

// ── MODAL ELIMINAR ──────────────────────────────
function openDel(id) {
    deleteId = id;
    const c = contacts.find(c => c.id === id);
    delName.textContent = c ? c.name : '';
    delOverlay.classList.add('open');
}
function closeDel() { delOverlay.classList.remove('open'); deleteId = null; }
function doDelete() {
    const c = contacts.find(c => c.id === deleteId);
    contacts = contacts.filter(c => c.id !== deleteId);
    save(); closeDel(); render();
    toast(`🗑️ ${c ? c.name : 'Contacto'} eliminado`);
}

// ── EXPORTAR / IMPORTAR ───────────────────────
btnExport.addEventListener('click', () => {
    if (!contacts.length) { toast('No hay contactos para exportar'); return; }
    const blob = new Blob([JSON.stringify(contacts, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'contactos.json' });
    a.click(); URL.revokeObjectURL(a.href);
    toast('📤 Exportado correctamente');
});
btnImport.addEventListener('change', () => {
    const f = btnImport.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = e => {
        try {
            const imp = JSON.parse(e.target.result);
            if (!Array.isArray(imp)) throw new Error();
            const ids = new Set(contacts.map(c => c.id));
            const news = imp.filter(c => c.name && c.phone && !ids.has(c.id))
                .map(c => ({ ...c, id: c.id || uid(), createdAt: c.createdAt || Date.now() }));
            contacts = [...contacts, ...news];
            save(); render();
            toast(`📥 ${news.length} contacto(s) importado(s)`);
        } catch { toast('❌ Archivo JSON inválido'); }
        btnImport.value = '';
    };
    r.readAsText(f);
});

// ── SELECCIONAR TODOS ────────────────────────────
selAll && selAll.addEventListener('change', () => {
    document.querySelectorAll('.row-chk').forEach(chk => chk.checked = selAll.checked);
});

// ── EVENTOS ──────────────────────────────
btnNew.addEventListener('click', openNew);
btnEmptyAdd && btnEmptyAdd.addEventListener('click', openNew);
btnCancel.addEventListener('click', closeForm);
modalClose.addEventListener('click', closeForm);
btnSave.addEventListener('click', saveContact);
formOverlay.addEventListener('click', e => { if (e.target === formOverlay) closeForm(); });

delClose.addEventListener('click', closeDel);
delNo.addEventListener('click', closeDel);
delYes.addEventListener('click', doDelete);
delOverlay.addEventListener('click', e => { if (e.target === delOverlay) closeDel(); });

searchInput.addEventListener('input', render);
catFilter.addEventListener('change', render);
sortSel.addEventListener('change', render);
favOnly.addEventListener('change', render);

// Columnas ordenables
document.querySelectorAll('.th-sort').forEach(th => {
    th.addEventListener('click', () => {
        const col = th.dataset.sort;
        if (col === 'name') sortSel.value = sortSel.value === 'az' ? 'za' : 'az';
        if (col === 'date') sortSel.value = 'recent';
        render();
    });
});

// Atajos de teclado
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeForm(); closeDel(); closeRowMenu(); }
    if (e.key === 'Enter' && formOverlay.classList.contains('open')) saveContact();
});

// ── DETECCIÓN DE USUARIO ──────────────────────────────
function detectUser() {
    const userAv = $('userAv');
    const userName = $('userName');
    const userEmail = $('userEmail');
    if (!userAv || !userName || !userEmail) return;

    userName.textContent = 'YamiletBC';
    userEmail.textContent = 'byamilet338@gmail.com';
    userAv.textContent = 'YB';
}


// ── INICIALIZACIÓN ──────────────────────────────
(function init() {
    const savedTheme = localStorage.getItem('mcm_theme');
    applyTheme(savedTheme === 'dark');
    detectUser();
    load();
    render();
})();