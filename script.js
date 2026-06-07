/* ============================================================
   VestStock — script.js — Supabase Edition
   ============================================================ */

// ── SUPABASE CONFIG ───────────────────────────────────────────
const SUPABASE_URL = 'https://ytykbpohmxrnzjvavznv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_w7sX8XIWGoP8ZpFvmpKljA_UY11zMQ-';
const TABLE = 'produtos';
const API = `${SUPABASE_URL}/rest/v1/${TABLE}`;
const HEADERS = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Prefer': 'return=representation'
};

// ── CACHE LOCAL ───────────────────────────────────────────────
let _cache = [];

// ── API HELPERS ───────────────────────────────────────────────
async function dbGetAll() {
  const res = await fetch(`${API}?order=created_at.desc`, { headers: HEADERS });
  if (!res.ok) throw new Error('Erro ao buscar produtos');
  return res.json();
}

async function dbInsert(product) {
  const res = await fetch(API, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(product)
  });
  if (!res.ok) throw new Error('Erro ao salvar produto');
  return res.json();
}

async function dbUpdate(id, data) {
  const res = await fetch(`${API}?id=eq.${id}`, {
    method: 'PATCH',
    headers: HEADERS,
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Erro ao atualizar produto');
  return res.json();
}

async function dbDelete(id) {
  const res = await fetch(`${API}?id=eq.${id}`, {
    method: 'DELETE',
    headers: HEADERS
  });
  if (!res.ok) throw new Error('Erro ao excluir produto');
  return true;
}

async function getProducts() {
  try {
    _cache = await dbGetAll();
    return _cache;
  } catch(e) {
    showToast('Erro de conexão com banco de dados', 'error');
    return _cache;
  }
}

// ── NAVIGATION ───────────────────────────────────────────────
const pageNames = {
  dashboard: 'Dashboard',
  produtos:  'Produtos',
  cadastro:  'Cadastrar',
  scanner:   'Scanner'
};

function navigate(page, linkEl) {
  if (page !== 'scanner') stopScanner();

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const target = document.getElementById('page-' + page);
  if (target) target.classList.add('active');

  if (linkEl) linkEl.classList.add('active');
  else {
    const nav = document.querySelector(`[data-page="${page}"]`);
    if (nav) nav.classList.add('active');
  }

  document.getElementById('topbar-title').textContent = pageNames[page] || page;

  if (page === 'dashboard') renderDashboard();
  if (page === 'produtos') renderProducts();
  if (page === 'cadastro') openBlankForm();

  closeSidebar();
}

// ── SIDEBAR ───────────────────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('visible');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('visible');
}

// ── DASHBOARD ────────────────────────────────────────────────
async function renderDashboard() {
  const products = await getProducts();

  const totalPecas = products.reduce((s, p) => s + (parseInt(p.quantidade) || 0), 0);
  const totalModels = products.length;
  const lowStock = products.filter(p => parseInt(p.quantidade) <= 3 && parseInt(p.quantidade) > 0);
  const totalValue = products.reduce((s, p) => s + ((parseFloat(p.preco) || 0) * (parseInt(p.quantidade) || 0)), 0);

  document.getElementById('stat-total').textContent = totalPecas;
  document.getElementById('stat-models').textContent = totalModels;
  document.getElementById('stat-low').textContent = lowStock.length;
  document.getElementById('stat-value').textContent = formatCurrency(totalValue);

  // LOW STOCK
  const lowEl = document.getElementById('low-stock-list');
  const noStock = products.filter(p => parseInt(p.quantidade) === 0);
  const alertList = [...noStock, ...lowStock.filter(p => parseInt(p.quantidade) > 0)];

  if (alertList.length === 0) {
    lowEl.innerHTML = '<div class="empty-mini">✓ Nenhum produto com estoque crítico</div>';
    document.getElementById('low-stock-section').style.display = 'none';
  } else {
    document.getElementById('low-stock-section').style.display = '';
    lowEl.innerHTML = alertList.slice(0, 5).map(p => {
      const qty = parseInt(p.quantidade);
      const cls = qty === 0 ? 'rose' : 'amber';
      return `<div class="mini-item" onclick="editProduct('${p.id}')">
        ${thumbHtml(p, 'mini-thumb')}
        <div class="mini-info">
          <div class="mini-name">${esc(p.nome)}</div>
          <div class="mini-sub">${esc(p.cor)} · ${esc(p.tamanho)}</div>
        </div>
        <div class="mini-badge ${cls}">${qty === 0 ? 'SEM ESTOQUE' : qty + ' un'}</div>
      </div>`;
    }).join('');
  }

  // RECENTES
  const recentEl = document.getElementById('recent-list');
  const recent = products.slice(0, 4);
  if (recent.length === 0) {
    recentEl.innerHTML = '<div class="empty-mini">Nenhum produto cadastrado ainda.</div>';
  } else {
    recentEl.innerHTML = recent.map(p => `
      <div class="mini-item" onclick="editProduct('${p.id}')">
        ${thumbHtml(p, 'mini-thumb')}
        <div class="mini-info">
          <div class="mini-name">${esc(p.nome)}</div>
          <div class="mini-sub">${esc(p.cor)} · ${esc(p.tamanho)} · R$${parseFloat(p.preco||0).toFixed(2)}</div>
        </div>
        <div class="mini-badge teal">${p.quantidade} un</div>
      </div>
    `).join('');
  }
}

// ── SEARCH ───────────────────────────────────────────────────
function dashboardSearch(val) {
  const resultEl = document.getElementById('search-results');
  const clearBtn = document.getElementById('search-clear-btn');

  if (!val.trim()) {
    resultEl.style.display = 'none';
    clearBtn.style.display = 'none';
    return;
  }

  clearBtn.style.display = 'flex';
  const t = val.toLowerCase();
  const results = _cache.filter(p =>
    p.nome.toLowerCase().includes(t) ||
    (p.codigo && p.codigo.toLowerCase().includes(t)) ||
    (p.cor && p.cor.toLowerCase().includes(t))
  );

  resultEl.style.display = 'block';

  if (results.length === 0) {
    resultEl.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text3);font-size:13px">Nenhum produto encontrado</div>';
    return;
  }

  resultEl.innerHTML = results.map(p => {
    const qty = parseInt(p.quantidade);
    const stockCls = qty === 0 ? 'empty' : qty <= 3 ? 'low' : 'ok';
    return `<div class="search-result-item" onclick="editProduct('${p.id}')">
      ${thumbHtml(p, 'sri-img')}
      <div class="sri-info">
        <div class="sri-name">${esc(p.nome)}</div>
        <div class="sri-meta">${esc(p.cor)} · ${esc(p.tamanho)} · ${p.codigo ? '#'+esc(p.codigo) : 'sem código'}</div>
      </div>
      <div class="sri-stock ${stockCls}">${qty}</div>
    </div>`;
  }).join('');
}

function clearSearch() {
  document.getElementById('dashboard-search').value = '';
  document.getElementById('search-results').style.display = 'none';
  document.getElementById('search-clear-btn').style.display = 'none';
}

// ── PRODUCTS LIST ────────────────────────────────────────────
async function renderProducts(filter, sizeFilter) {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3)">Carregando...</div>';

  const products = await getProducts();
  const term = (filter !== undefined ? filter : document.getElementById('produtos-search')?.value || '').toLowerCase();
  const size = sizeFilter !== undefined ? sizeFilter : (document.getElementById('filter-size')?.value || '');

  let list = products.filter(p => {
    const matchTerm = !term ||
      p.nome.toLowerCase().includes(term) ||
      (p.codigo && p.codigo.toLowerCase().includes(term));
    const matchSize = !size || p.tamanho === size;
    return matchTerm && matchSize;
  });

  const emptyEl = document.getElementById('products-empty');

  if (list.length === 0) {
    grid.innerHTML = '';
    emptyEl.style.display = 'block';
    return;
  }

  emptyEl.style.display = 'none';
  grid.innerHTML = list.map(p => productCard(p)).join('');
}

function filterProducts(term) {
  const size = document.getElementById('filter-size')?.value || '';
  renderProducts(term, size);
}

function productCard(p) {
  const qty = parseInt(p.quantidade) || 0;
  const stockCls = qty === 0 ? 'empty' : qty <= 3 ? 'low' : 'ok';
  const stockLabel = qty === 0 ? 'SEM ESTOQUE' : qty <= 3 ? 'BAIXO' : qty + ' un';
  const cardCls = qty === 0 ? 'no-stock' : qty <= 3 ? 'low-stock' : '';

  const imgHtml = p.foto
    ? `<img src="${p.foto}" alt="${esc(p.nome)}" loading="lazy" />`
    : `<div class="card-no-img"><span>◫</span><span>Sem foto</span></div>`;

  return `
    <div class="product-card ${cardCls}" id="card-${p.id}">
      <div class="card-img-wrap">
        ${imgHtml}
        <div class="stock-badge ${stockCls}">${stockLabel}</div>
      </div>
      <div class="card-body">
        <div class="card-name" title="${esc(p.nome)}">${esc(p.nome)}</div>
        <div class="card-meta">
          ${p.cor ? `<span class="card-tag">${esc(p.cor)}</span>` : ''}
          ${p.tamanho ? `<span class="card-tag">${esc(p.tamanho)}</span>` : ''}
        </div>
        ${p.codigo ? `<div class="card-code">&#35;${esc(p.codigo)}</div>` : ''}
        <div class="card-price-row">
          <div class="card-price">R$${parseFloat(p.preco || 0).toFixed(2)}</div>
          <div class="card-qty"><strong>${qty}</strong> unid.</div>
        </div>
        <div class="card-actions">
          <button class="card-btn sell" onclick="sellOne('${p.id}')" ${qty === 0 ? 'disabled' : ''}>
            <span>↘</span> Vender
          </button>
          <button class="card-btn edit" onclick="editProduct('${p.id}')">
            <span>✎</span> Editar
          </button>
          <button class="card-btn delete" onclick="confirmDelete('${p.id}')">
            <span>✕</span> Excluir
          </button>
        </div>
      </div>
    </div>`;
}

// ── SELL ─────────────────────────────────────────────────────
async function sellOne(id) {
  const p = _cache.find(p => p.id === id);
  if (!p) return;

  const qty = parseInt(p.quantidade) || 0;
  if (qty <= 0) { showToast('Produto sem estoque!', 'error'); return; }

  try {
    await dbUpdate(id, { quantidade: qty - 1 });
    showToast(`✓ Venda registrada — ${esc(p.nome)} (${qty - 1} restantes)`, 'success');
    await renderProducts();
    await renderDashboard();
  } catch(e) {
    showToast('Erro ao registrar venda', 'error');
  }
}

// ── DELETE ───────────────────────────────────────────────────
function confirmDelete(id) {
  const p = _cache.find(p => p.id === id);
  if (!p) return;

  showModal('⚠', 'Excluir Produto',
    `Deseja excluir <strong>${esc(p.nome)}</strong>? Esta ação não pode ser desfeita.`,
    async () => {
      try {
        await dbDelete(id);
        showToast('Produto excluído.', 'warning');
        await renderProducts();
        await renderDashboard();
      } catch(e) {
        showToast('Erro ao excluir produto', 'error');
      }
    }
  );
}

// ── FORM ─────────────────────────────────────────────────────
function openBlankForm() {
  document.getElementById('form-title').textContent = 'Cadastrar Peça';
  document.getElementById('edit-id').value = '';
  clearForm();
}

function clearForm() {
  ['f-nome','f-codigo','f-cor','f-quantidade','f-preco'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('f-tamanho').value = '';
  document.getElementById('photo-preview').style.display = 'none';
  document.getElementById('photo-placeholder').style.display = 'flex';
  document.getElementById('foto-input').value = '';
  const btnRemove = document.getElementById('btn-remove-photo');
  if (btnRemove) btnRemove.disabled = true;
  _currentPhoto = null;
}

function cancelForm() { navigate('produtos', null); }

function editProduct(id) {
  const p = _cache.find(p => p.id === id);
  if (!p) return;

  navigate('cadastro', null);
  setTimeout(() => {
    document.getElementById('form-title').textContent = 'Editar Peça';
    document.getElementById('edit-id').value = p.id;
    document.getElementById('f-nome').value = p.nome || '';
    document.getElementById('f-codigo').value = p.codigo || '';
    document.getElementById('f-cor').value = p.cor || '';
    document.getElementById('f-tamanho').value = p.tamanho || '';
    document.getElementById('f-quantidade').value = p.quantidade || 0;
    document.getElementById('f-preco').value = p.preco || '';

    if (p.foto) {
      document.getElementById('photo-preview').src = p.foto;
      document.getElementById('photo-preview').style.display = 'block';
      document.getElementById('photo-placeholder').style.display = 'none';
      const btnRemove = document.getElementById('btn-remove-photo');
      if (btnRemove) btnRemove.disabled = false;
      _currentPhoto = p.foto;
    } else {
      document.getElementById('photo-preview').style.display = 'none';
      document.getElementById('photo-placeholder').style.display = 'flex';
      const btnRemove = document.getElementById('btn-remove-photo');
      if (btnRemove) btnRemove.disabled = true;
      _currentPhoto = null;
    }
  }, 50);
}

let _currentPhoto = null;

function removePhoto() {
  _currentPhoto = null;
  document.getElementById('photo-preview').style.display = 'none';
  document.getElementById('photo-preview').src = '';
  document.getElementById('photo-placeholder').style.display = 'flex';
  document.getElementById('foto-input').value = '';
  const btnRemove = document.getElementById('btn-remove-photo');
  if (btnRemove) btnRemove.disabled = true;
}

function previewPhoto(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    _currentPhoto = e.target.result;
    document.getElementById('photo-preview').src = _currentPhoto;
    document.getElementById('photo-preview').style.display = 'block';
    document.getElementById('photo-placeholder').style.display = 'none';
    const btnRemove = document.getElementById('btn-remove-photo');
    if (btnRemove) btnRemove.disabled = false;
  };
  reader.readAsDataURL(file);
}

async function saveProduct() {
  const nome      = document.getElementById('f-nome').value.trim();
  const codigo    = document.getElementById('f-codigo').value.trim();
  const cor       = document.getElementById('f-cor').value.trim();
  const tamanho   = document.getElementById('f-tamanho').value;
  const quantidade= document.getElementById('f-quantidade').value;
  const preco     = document.getElementById('f-preco').value;
  const editId    = document.getElementById('edit-id').value;

  if (!nome)     { showToast('Preencha o nome da peça', 'error'); return; }
  if (!cor)      { showToast('Preencha a cor', 'error'); return; }
  if (!tamanho)  { showToast('Selecione o tamanho', 'error'); return; }
  if (quantidade === '' || isNaN(parseInt(quantidade))) { showToast('Informe a quantidade', 'error'); return; }
  if (!preco || isNaN(parseFloat(preco))) { showToast('Informe o preço', 'error'); return; }

  const btn = document.querySelector('.form-actions .btn-primary');
  btn.textContent = 'Salvando...';
  btn.disabled = true;

  try {
    if (editId) {
      const existing = _cache.find(p => p.id === editId);
      await dbUpdate(editId, {
        nome, codigo, cor, tamanho,
        quantidade: parseInt(quantidade),
        preco: parseFloat(preco),
        foto: _currentPhoto !== null ? _currentPhoto : (existing ? existing.foto : null),
        updated_at: new Date().toISOString()
      });
      showToast('✓ Produto atualizado!', 'success');
    } else {
      await dbInsert({
        nome, codigo, cor, tamanho,
        quantidade: parseInt(quantidade),
        preco: parseFloat(preco),
        foto: _currentPhoto || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      showToast('✓ Produto cadastrado!', 'success');
    }
    navigate('produtos', null);
  } catch(e) {
    showToast('Erro ao salvar. Verifique a conexão.', 'error');
    btn.textContent = 'Salvar Produto';
    btn.disabled = false;
  }
}

// ── SCANNER ──────────────────────────────────────────────────
let html5QrcodeScanner = null;
let scannerRunning = false;
let lastScannedCode = null;

function startScanner() {
  const readerEl = document.getElementById('reader');
  readerEl.innerHTML = '';

  const scanFrame = document.getElementById('scanner-frame');
  let scanLine = scanFrame.querySelector('.scan-line');
  if (!scanLine) {
    scanLine = document.createElement('div');
    scanLine.className = 'scan-line';
    scanFrame.appendChild(scanLine);
  }

  document.getElementById('btn-start-scanner').style.display = 'none';
  document.getElementById('btn-stop-scanner').style.display = 'flex';
  document.getElementById('scanner-result-area').style.display = 'none';

  const config = {
    fps: 10,
    qrbox: { width: 260, height: 120 },
    aspectRatio: 1.5,
    rememberLastUsedCamera: true,
    formatsToSupport: [
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.CODE_39,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
      Html5QrcodeSupportedFormats.QR_CODE,
    ]
  };

  html5QrcodeScanner = new Html5Qrcode('reader');

  Html5Qrcode.getCameras().then(cameras => {
    if (!cameras || cameras.length === 0) {
      showToast('Nenhuma câmera encontrada', 'error');
      stopScanner();
      return;
    }

    const backCamera = cameras.find(c =>
      c.label.toLowerCase().includes('back') ||
      c.label.toLowerCase().includes('traseira') ||
      c.label.toLowerCase().includes('rear')
    ) || cameras[cameras.length - 1];

    html5QrcodeScanner.start(
      backCamera.id, config,
      (decodedText) => onScanSuccess(decodedText),
      () => {}
    ).then(() => {
      scannerRunning = true;
    }).catch(() => {
      showToast('Erro ao acessar câmera', 'error');
      stopScanner();
    });
  }).catch(() => {
    showToast('Sem permissão para a câmera', 'error');
    stopScanner();
  });
}

function stopScanner() {
  if (html5QrcodeScanner && scannerRunning) {
    html5QrcodeScanner.stop().then(() => {
      html5QrcodeScanner.clear();
      html5QrcodeScanner = null;
      scannerRunning = false;
    }).catch(() => {
      html5QrcodeScanner = null;
      scannerRunning = false;
    });
  }

  const scanFrame = document.getElementById('scanner-frame');
  const scanLine = scanFrame?.querySelector('.scan-line');
  if (scanLine) scanLine.remove();

  document.getElementById('btn-start-scanner').style.display = 'flex';
  document.getElementById('btn-stop-scanner').style.display = 'none';
}

function onScanSuccess(code) {
  if (code === lastScannedCode) return;
  lastScannedCode = code;

  playBeep();
  stopScanner();

  document.getElementById('scanner-result-area').style.display = 'block';
  document.getElementById('scanner-code-display').textContent = code;

  const product = _cache.find(p => p.codigo && p.codigo.toLowerCase() === code.toLowerCase());
  const foundEl = document.getElementById('scanner-product-found');
  const notFoundEl = document.getElementById('scanner-product-notfound');

  if (product) {
    foundEl.style.display = 'flex';
    notFoundEl.style.display = 'none';
    foundEl.innerHTML = renderScannerProductCard(product);
  } else {
    foundEl.style.display = 'none';
    notFoundEl.style.display = 'block';
    notFoundEl.innerHTML = `
      <p>Código <strong>${esc(code)}</strong> não encontrado</p>
      <button class="btn-primary" onclick="cadastrarComCodigo()">Cadastrar com este código</button>
    `;
  }

  setTimeout(() => { lastScannedCode = null; }, 3000);
}

function renderScannerProductCard(p) {
  const qty = parseInt(p.quantidade) || 0;
  const imgHtml = p.foto
    ? `<div class="spc-img"><img src="${p.foto}" alt="${esc(p.nome)}" /></div>`
    : `<div class="spc-img">◫</div>`;

  return `
    ${imgHtml}
    <div style="flex:1">
      <div class="spc-name">${esc(p.nome)}</div>
      <div class="spc-meta">${esc(p.cor)} · ${esc(p.tamanho)} · R$${parseFloat(p.preco||0).toFixed(2)}</div>
      <div class="spc-actions">
        <button class="card-btn sell" onclick="sellOne('${p.id}'); setTimeout(()=>refreshScannerCard('${p.id}'),800)" ${qty===0?'disabled':''}>↘ Vender</button>
        <button class="card-btn edit" onclick="editProduct('${p.id}')">✎ Editar</button>
      </div>
    </div>
    <div class="spc-qty">${qty}</div>
  `;
}

async function refreshScannerCard(id) {
  await getProducts();
  const p = _cache.find(p => p.id === id);
  if (!p) return;
  const foundEl = document.getElementById('scanner-product-found');
  foundEl.innerHTML = renderScannerProductCard(p);
}

function manualCodeSearch() {
  const ms = document.getElementById('manual-search');
  ms.style.display = ms.style.display === 'none' ? 'block' : 'none';
  if (ms.style.display === 'block') document.getElementById('manual-code-input').focus();
}

function searchByManualCode() {
  const code = document.getElementById('manual-code-input').value.trim();
  if (!code) { showToast('Digite um código', 'warning'); return; }
  onScanSuccess(code);
}

function openScannerInline() {
  navigate('scanner', null);
}

function cadastrarComCodigo() {
  const code = document.getElementById('scanner-code-display').textContent;
  navigate('cadastro', null);
  setTimeout(() => { document.getElementById('f-codigo').value = code; }, 100);
}

// ── UTILS ─────────────────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatCurrency(val) {
  if (val >= 1000) return 'R$' + (val / 1000).toFixed(1) + 'k';
  return 'R$' + val.toFixed(0);
}

function thumbHtml(p, cls) {
  if (p.foto) return `<div class="${cls}"><img src="${p.foto}" alt="" /></div>`;
  return `<div class="${cls}">◫</div>`;
}

// ── MODAL ─────────────────────────────────────────────────────
let _modalCallback = null;

function showModal(icon, title, msg, onConfirm) {
  document.getElementById('modal-icon').textContent = icon;
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-msg').innerHTML = msg;
  document.getElementById('modal-overlay').style.display = 'flex';
  _modalCallback = onConfirm;
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  _modalCallback = null;
}

document.getElementById('modal-confirm-btn').addEventListener('click', () => {
  if (_modalCallback) _modalCallback();
  closeModal();
});

// ── TOAST ─────────────────────────────────────────────────────
let _toastTimer = null;

function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast ' + type;
  if (_toastTimer) clearTimeout(_toastTimer);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

// ── BIP ───────────────────────────────────────────────────────
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 1800;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch(e) {}
}

// ── INIT ──────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  await renderDashboard();

  document.getElementById('manual-code-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') searchByManualCode();
  });

  // Atualiza a cada 30 segundos automaticamente
  setInterval(async () => {
    const paginaAtiva = document.querySelector('.page.active')?.id;
    if (paginaAtiva === 'page-dashboard') await renderDashboard();
    if (paginaAtiva === 'page-produtos') await renderProducts();
  }, 30000);

  // Atualiza quando voltar para a aba
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      const paginaAtiva = document.querySelector('.page.active')?.id;
      if (paginaAtiva === 'page-dashboard') await renderDashboard();
      if (paginaAtiva === 'page-produtos') await renderProducts();
    }
  });
});