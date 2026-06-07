/* ============================================================
   VestStock — script.js — Supabase Edition
   
   O QUE ESTE ARQUIVO FAZ:
   - Conecta com o banco de dados Supabase (na nuvem)
   - Busca, salva, edita e exclui produtos
   - Atualiza a tela com os dados do banco
   - Controla toda a lógica do sistema
   ============================================================ */


// ==============================================================
// CONFIGURAÇÃO DO BANCO DE DADOS (SUPABASE)
// ==============================================================
// Essas 3 variáveis são as "chaves" para acessar o banco de dados
// SUPABASE_URL = endereço do servidor do banco de dados
// SUPABASE_KEY = senha de acesso ao banco
// TABLE = nome da tabela onde ficam os produtos
const SUPABASE_URL = 'https://ytykbpohmxrnzjvavznv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_w7sX8XIWGoP8ZpFvmpKljA_UY11zMQ-';
const TABLE = 'produtos';

// Monta o endereço completo da API (URL + nome da tabela)
const API = `${SUPABASE_URL}/rest/v1/${TABLE}`;

// HEADERS = cabeçalhos que vão em toda requisição ao banco
// É como um "crachá" que prova que temos permissão de acesso
const HEADERS = {
  'Content-Type': 'application/json',      // Diz que enviamos dados em JSON
  'apikey': SUPABASE_KEY,                  // Chave de acesso
  'Authorization': `Bearer ${SUPABASE_KEY}`, // Autorização no padrão Bearer
  'Prefer': 'return=representation'        // Pede que o banco retorne o dado salvo
};


// ==============================================================
// CACHE LOCAL (MEMÓRIA TEMPORÁRIA)
// ==============================================================
// _cache guarda uma cópia dos produtos na memória do navegador
// Assim não precisamos ir ao banco a cada pequena ação
// O underscore (_) no início é uma convenção para "variável interna"
let _cache = [];


// ==============================================================
// FUNÇÕES DE ACESSO AO BANCO DE DADOS (CRUD)
// CRUD = Create (criar), Read (ler), Update (atualizar), Delete (excluir)
// ==============================================================

// LER todos os produtos do banco
// "async" significa que a função é assíncrona (pode demorar para responder)
// "await" significa "espera terminar antes de continuar"
async function dbGetAll() {
  // fetch() faz uma requisição HTTP para o servidor
  // order=created_at.desc = ordena do mais novo para o mais antigo
  const res = await fetch(`${API}?order=created_at.desc`, { headers: HEADERS });
  
  // Se der erro (ex: sem internet), lança uma exceção
  if (!res.ok) throw new Error('Erro ao buscar produtos');
  
  // Converte a resposta de JSON para objeto JavaScript
  return res.json();
}

// INSERIR um novo produto no banco
async function dbInsert(product) {
  const res = await fetch(API, {
    method: 'POST',           // POST = enviar dados novos
    headers: HEADERS,
    body: JSON.stringify(product) // Converte objeto JS para texto JSON
  });
  if (!res.ok) throw new Error('Erro ao salvar produto');
  return res.json();
}

// ATUALIZAR um produto existente (pelo id)
async function dbUpdate(id, data) {
  // O "?id=eq.${id}" filtra para atualizar só o produto com aquele id
  const res = await fetch(`${API}?id=eq.${id}`, {
    method: 'PATCH',          // PATCH = atualizar parte dos dados
    headers: HEADERS,
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Erro ao atualizar produto');
  return res.json();
}

// DELETAR um produto pelo id
async function dbDelete(id) {
  const res = await fetch(`${API}?id=eq.${id}`, {
    method: 'DELETE',         // DELETE = excluir o registro
    headers: HEADERS
  });
  if (!res.ok) throw new Error('Erro ao excluir produto');
  return true;
}

// Função principal para buscar produtos
// Atualiza o _cache e retorna os dados
// Se der erro, mostra aviso mas retorna o cache antigo (não trava o sistema)
async function getProducts() {
  try {
    _cache = await dbGetAll();
    return _cache;
  } catch(e) {
    showToast('Erro de conexão com banco de dados', 'error');
    return _cache; // Retorna o que tinha antes se der erro
  }
}


// ==============================================================
// NAVEGAÇÃO ENTRE PÁGINAS
// ==============================================================

// Nomes que aparecem na barra do topo para cada página
const pageNames = {
  dashboard: 'Dashboard',
  produtos:  'Produtos',
  cadastro:  'Cadastrar',
  scanner:   'Scanner'
};

// Função chamada quando clica em um item do menu lateral
// page = qual página abrir (ex: 'dashboard', 'produtos')
// linkEl = o elemento HTML do menu que foi clicado
function navigate(page, linkEl) {
  // Para o scanner se estiver rodando ao trocar de página
  if (page !== 'scanner') stopScanner();

  // Remove a classe "active" de todas as páginas e itens do menu
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Ativa a página selecionada (torna ela visível)
  const target = document.getElementById('page-' + page);
  if (target) target.classList.add('active');

  // Marca o item do menu como ativo (destaque visual)
  if (linkEl) linkEl.classList.add('active');
  else {
    // Se não veio o elemento, busca pelo atributo data-page
    const nav = document.querySelector(`[data-page="${page}"]`);
    if (nav) nav.classList.add('active');
  }

  // Atualiza o título na barra do topo
  document.getElementById('topbar-title').textContent = pageNames[page] || page;

  // Chama a função de renderização de cada página
  if (page === 'dashboard') renderDashboard();
  if (page === 'produtos') renderProducts();
  if (page === 'cadastro') openBlankForm();

  // Fecha o menu lateral (importante no celular)
  closeSidebar();
}


// ==============================================================
// MENU LATERAL (SIDEBAR)
// ==============================================================

// Abre ou fecha o menu lateral no celular
function toggleSidebar() {
  // classList.toggle adiciona a classe se não tiver, remove se já tiver
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('visible');
}

// Fecha o menu lateral (chamado ao clicar no overlay escuro)
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('visible');
}


// ==============================================================
// DASHBOARD (PÁGINA INICIAL)
// ==============================================================

// Carrega e exibe todos os dados do dashboard
async function renderDashboard() {
  // Busca os produtos do banco de dados
  const products = await getProducts();

  // Calcula os totais usando reduce()
  // reduce() percorre o array acumulando um valor
  const totalPecas = products.reduce((s, p) => s + (parseInt(p.quantidade) || 0), 0);
  const totalModels = products.length; // .length = quantidade de itens no array
  const lowStock = products.filter(p => parseInt(p.quantidade) <= 3 && parseInt(p.quantidade) > 0);
  const totalValue = products.reduce((s, p) => s + ((parseFloat(p.preco) || 0) * (parseInt(p.quantidade) || 0)), 0);

  // Atualiza os números nos cards do dashboard
  // getElementById busca um elemento HTML pelo seu id
  // textContent = texto visível do elemento
  document.getElementById('stat-total').textContent = totalPecas;
  document.getElementById('stat-models').textContent = totalModels;
  document.getElementById('stat-low').textContent = lowStock.length;
  document.getElementById('stat-value').textContent = formatCurrency(totalValue);

  // ----- LISTA DE ESTOQUE BAIXO -----
  const lowEl = document.getElementById('low-stock-list');
  
  // filter() cria um novo array com apenas os itens que passam na condição
  const noStock = products.filter(p => parseInt(p.quantidade) === 0);
  
  // Spread operator (...) junta dois arrays em um só
  const alertList = [...noStock, ...lowStock.filter(p => parseInt(p.quantidade) > 0)];

  if (alertList.length === 0) {
    lowEl.innerHTML = '<div class="empty-mini">✓ Nenhum produto com estoque crítico</div>';
    document.getElementById('low-stock-section').style.display = 'none';
  } else {
    document.getElementById('low-stock-section').style.display = '';
    
    // map() transforma cada item do array em HTML
    // join('') junta tudo em uma string só
    lowEl.innerHTML = alertList.slice(0, 5).map(p => {
      const qty = parseInt(p.quantidade);
      const cls = qty === 0 ? 'rose' : 'amber'; // Operador ternário: condição ? seVerdade : seFalso
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

  // ----- LISTA DE PRODUTOS RECENTES -----
  const recentEl = document.getElementById('recent-list');
  const recent = products.slice(0, 4); // slice(0,4) = pega apenas os 4 primeiros
  
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


// ==============================================================
// BUSCA RÁPIDA (DASHBOARD)
// ==============================================================

// Chamada a cada letra digitada no campo de busca
function dashboardSearch(val) {
  const resultEl = document.getElementById('search-results');
  const clearBtn = document.getElementById('search-clear-btn');

  // Se o campo estiver vazio, esconde os resultados
  if (!val.trim()) { // trim() remove espaços em branco
    resultEl.style.display = 'none';
    clearBtn.style.display = 'none';
    return; // Para a execução da função aqui
  }

  clearBtn.style.display = 'flex';
  
  // Converte para minúsculo para busca sem diferenciar maiúsculas
  const t = val.toLowerCase();
  
  // Filtra o cache local (sem ir ao banco, mais rápido)
  const results = _cache.filter(p =>
    p.nome.toLowerCase().includes(t) ||       // includes() verifica se contém o texto
    (p.codigo && p.codigo.toLowerCase().includes(t)) ||
    (p.cor && p.cor.toLowerCase().includes(t))
  );

  resultEl.style.display = 'block';

  if (results.length === 0) {
    resultEl.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text3);font-size:13px">Nenhum produto encontrado</div>';
    return;
  }

  // Gera o HTML de cada resultado encontrado
  resultEl.innerHTML = results.map(p => {
    const qty = parseInt(p.quantidade);
    const stockCls = qty === 0 ? 'empty' : qty <= 3 ? 'low' : 'ok';
    // Gera a imagem diretamente com tamanho fixo para não vazar
    const imgHtml = p.foto
      ? `<img src="${p.foto}" alt="" style="width:52px;height:52px;object-fit:cover;border-radius:7px;flex-shrink:0;display:block;" />`
      : `<div style="width:52px;height:52px;border-radius:7px;background:var(--bg3);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:20px;color:var(--text3);flex-shrink:0;">◫</div>`;
    return `<div class="search-result-item" onclick="editProduct('${p.id}')">
      ${imgHtml}
      <div class="sri-info">
        <div class="sri-name">${esc(p.nome)}</div>
        <div class="sri-meta">${esc(p.cor)} · ${esc(p.tamanho)} · ${p.codigo ? '#'+esc(p.codigo) : 'sem código'}</div>
      </div>
      <div class="sri-stock ${stockCls}">${qty}</div>
    </div>`;
  }).join('');
}

// Limpa o campo de busca e esconde os resultados
function clearSearch() {
  document.getElementById('dashboard-search').value = '';
  document.getElementById('search-results').style.display = 'none';
  document.getElementById('search-clear-btn').style.display = 'none';
}


// ==============================================================
// LISTA DE PRODUTOS
// ==============================================================

// Renderiza (desenha na tela) a grade de produtos
// filter e sizeFilter são opcionais — se não passar, usa os valores dos campos
async function renderProducts(filter, sizeFilter) {
  const grid = document.getElementById('products-grid');
  
  // Mostra "Carregando..." enquanto busca no banco
  grid.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3)">Carregando...</div>';

  const products = await getProducts();
  
  // Se filter não foi passado, pega o valor do campo de busca na tela
  const term = (filter !== undefined ? filter : document.getElementById('produtos-search')?.value || '').toLowerCase();
  const size = sizeFilter !== undefined ? sizeFilter : (document.getElementById('filter-size')?.value || '');

  // Filtra os produtos conforme o texto e tamanho digitado
  let list = products.filter(p => {
    const matchTerm = !term ||
      p.nome.toLowerCase().includes(term) ||
      (p.codigo && p.codigo.toLowerCase().includes(term));
    const matchSize = !size || p.tamanho === size;
    return matchTerm && matchSize; // Retorna true só se passar nos dois filtros
  });

  const emptyEl = document.getElementById('products-empty');

  if (list.length === 0) {
    grid.innerHTML = '';
    emptyEl.style.display = 'block'; // Mostra mensagem de "sem produtos"
    return;
  }

  emptyEl.style.display = 'none';
  // Gera o HTML de todos os cards e insere na grade
  grid.innerHTML = list.map(p => productCard(p)).join('');
}

// Chamada quando o usuário digita no filtro ou muda o tamanho
function filterProducts(term) {
  const size = document.getElementById('filter-size')?.value || '';
  renderProducts(term, size);
}

// Gera o HTML de um card de produto
// Recebe um objeto "p" com todos os dados do produto
function productCard(p) {
  const qty = parseInt(p.quantidade) || 0;
  
  // Define classe e texto do badge de estoque
  const stockCls = qty === 0 ? 'empty' : qty <= 3 ? 'low' : 'ok';
  const stockLabel = qty === 0 ? 'SEM ESTOQUE' : qty <= 3 ? 'BAIXO' : qty + ' un';
  const cardCls = qty === 0 ? 'no-stock' : qty <= 3 ? 'low-stock' : '';

  // Template literal (crase) permite escrever HTML com variáveis JS
  // ${variavel} insere o valor da variável dentro do HTML
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


// ==============================================================
// VENDER (BAIXAR ESTOQUE)
// ==============================================================

// Registra uma venda, diminuindo 1 unidade do estoque
async function sellOne(id) {
  // find() busca o primeiro item do array que satisfaz a condição
  const p = _cache.find(p => p.id === id);
  if (!p) return; // Se não encontrou, para aqui

  const qty = parseInt(p.quantidade) || 0;
  if (qty <= 0) { showToast('Produto sem estoque!', 'error'); return; }

  try {
    // Atualiza no banco: quantidade atual menos 1
    await dbUpdate(id, { quantidade: qty - 1 });
    showToast(`✓ Venda registrada — ${esc(p.nome)} (${qty - 1} restantes)`, 'success');
    
    // Atualiza a tela após a venda
    await renderProducts();
    await renderDashboard();
  } catch(e) {
    showToast('Erro ao registrar venda', 'error');
  }
}


// ==============================================================
// EXCLUIR PRODUTO
// ==============================================================

// Mostra confirmação antes de excluir
function confirmDelete(id) {
  const p = _cache.find(p => p.id === id);
  if (!p) return;

  // Abre o modal de confirmação passando uma função callback
  // Callback = função que será executada SE o usuário confirmar
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


// ==============================================================
// FORMULÁRIO DE CADASTRO / EDIÇÃO
// ==============================================================

// Prepara o formulário vazio para cadastrar novo produto
function openBlankForm() {
  document.getElementById('form-title').textContent = 'Cadastrar Peça';
  document.getElementById('edit-id').value = ''; // Vazio = é um produto novo
  clearForm();
}

// Limpa todos os campos do formulário
function clearForm() {
  // Percorre o array de IDs e limpa cada campo
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
  _currentPhoto = null; // Limpa a foto da memória
}

// Volta para a lista de produtos sem salvar
function cancelForm() { navigate('produtos', null); }

// Preenche o formulário com os dados de um produto para editar
function editProduct(id) {
  // Busca o produto no cache local (mais rápido que ir ao banco)
  const p = _cache.find(p => p.id === id);
  if (!p) return;

  navigate('cadastro', null);
  
  // setTimeout com 50ms dá tempo para a página renderizar antes de preencher
  setTimeout(() => {
    document.getElementById('form-title').textContent = 'Editar Peça';
    document.getElementById('edit-id').value = p.id; // Guarda o id para saber que é edição
    document.getElementById('f-nome').value = p.nome || '';
    document.getElementById('f-codigo').value = p.codigo || '';
    document.getElementById('f-cor').value = p.cor || '';
    document.getElementById('f-tamanho').value = p.tamanho || '';
    document.getElementById('f-quantidade').value = p.quantidade || 0;
    document.getElementById('f-preco').value = p.preco || '';

    // Se tem foto, mostra ela; se não, mostra o placeholder
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

// Variável que guarda a foto atual em Base64 (texto que representa a imagem)
let _currentPhoto = null;

// Remove a foto do formulário
function removePhoto() {
  _currentPhoto = null;
  document.getElementById('photo-preview').style.display = 'none';
  document.getElementById('photo-preview').src = '';
  document.getElementById('photo-placeholder').style.display = 'flex';
  document.getElementById('foto-input').value = '';
  const btnRemove = document.getElementById('btn-remove-photo');
  if (btnRemove) btnRemove.disabled = true;
}

// Chamada quando o usuário escolhe uma foto
// Converte a imagem para Base64 para poder salvar no banco de dados
function previewPhoto(input) {
  const file = input.files[0]; // Pega o primeiro arquivo selecionado
  if (!file) return;
  
  // FileReader lê o arquivo e converte para Base64
  const reader = new FileReader();
  reader.onload = function(e) {
    _currentPhoto = e.target.result; // e.target.result = a imagem em Base64
    document.getElementById('photo-preview').src = _currentPhoto;
    document.getElementById('photo-preview').style.display = 'block';
    document.getElementById('photo-placeholder').style.display = 'none';
    const btnRemove = document.getElementById('btn-remove-photo');
    if (btnRemove) btnRemove.disabled = false;
  };
  reader.readAsDataURL(file); // Inicia a leitura como URL de dados (Base64)
}

// Salva o produto (novo ou editado) no banco de dados
async function saveProduct() {
  // Pega os valores de cada campo do formulário
  const nome      = document.getElementById('f-nome').value.trim();
  const codigo    = document.getElementById('f-codigo').value.trim();
  const cor       = document.getElementById('f-cor').value.trim();
  const tamanho   = document.getElementById('f-tamanho').value;
  const quantidade= document.getElementById('f-quantidade').value;
  const preco     = document.getElementById('f-preco').value;
  const editId    = document.getElementById('edit-id').value; // Vazio = novo, preenchido = edição

  // Validações — verifica se os campos obrigatórios foram preenchidos
  if (!nome)     { showToast('Preencha o nome da peça', 'error'); return; }
  if (!cor)      { showToast('Preencha a cor', 'error'); return; }
  if (!tamanho)  { showToast('Selecione o tamanho', 'error'); return; }
  if (quantidade === '' || isNaN(parseInt(quantidade))) { showToast('Informe a quantidade', 'error'); return; }
  if (!preco || isNaN(parseFloat(preco))) { showToast('Informe o preço', 'error'); return; }

  // Desabilita o botão para evitar duplo clique
  const btn = document.querySelector('.form-actions .btn-primary');
  btn.textContent = 'Salvando...';
  btn.disabled = true;

  try {
    if (editId) {
      // SE tem editId = está editando um produto existente
      const existing = _cache.find(p => p.id === editId);
      await dbUpdate(editId, {
        nome, codigo, cor, tamanho,
        quantidade: parseInt(quantidade),   // parseInt converte texto para número inteiro
        preco: parseFloat(preco),           // parseFloat converte texto para número decimal
        // Se _currentPhoto não é null, usa ela; se é null, mantém a foto antiga
        foto: _currentPhoto !== null ? _currentPhoto : (existing ? existing.foto : null),
        updated_at: new Date().toISOString() // Data/hora atual em formato ISO
      });
      showToast('✓ Produto atualizado!', 'success');
    } else {
      // SE não tem editId = está criando produto novo
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
    navigate('produtos', null); // Volta para a lista após salvar
  } catch(e) {
    showToast('Erro ao salvar. Verifique a conexão.', 'error');
    btn.textContent = 'Salvar Produto';
    btn.disabled = false; // Reabilita o botão se der erro
  }
}


// ==============================================================
// SCANNER DE CÓDIGO DE BARRAS
// ==============================================================

// Variáveis de controle do scanner
let html5QrcodeScanner = null; // Instância da biblioteca de leitura
let scannerRunning = false;    // true = câmera está ligada
let lastScannedCode = null;    // Evita ler o mesmo código duas vezes seguidas

// Inicia a câmera para leitura de código de barras
function startScanner() {
  const readerEl = document.getElementById('reader');
  readerEl.innerHTML = ''; // Limpa o leitor antes de iniciar

  // Adiciona a linha animada de escaneamento
  const scanFrame = document.getElementById('scanner-frame');
  let scanLine = scanFrame.querySelector('.scan-line');
  if (!scanLine) {
    scanLine = document.createElement('div'); // Cria elemento HTML dinamicamente
    scanLine.className = 'scan-line';
    scanFrame.appendChild(scanLine); // Adiciona dentro do frame
  }

  document.getElementById('btn-start-scanner').style.display = 'none';
  document.getElementById('btn-stop-scanner').style.display = 'flex';
  document.getElementById('scanner-result-area').style.display = 'none';

  // Configurações do scanner
  const config = {
    fps: 10,                              // Frames por segundo (velocidade de leitura)
    qrbox: { width: 260, height: 120 },  // Tamanho da área de leitura
    aspectRatio: 1.5,
    rememberLastUsedCamera: true,
    // Formatos de código suportados
    formatsToSupport: [
      Html5QrcodeSupportedFormats.EAN_13,  // Código de barras padrão supermercado
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.CODE_128, // Código alfanumérico
      Html5QrcodeSupportedFormats.CODE_39,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
      Html5QrcodeSupportedFormats.QR_CODE,  // QR Code
    ]
  };

  // Cria a instância do leitor usando a biblioteca html5-qrcode
  html5QrcodeScanner = new Html5Qrcode('reader');

  // Pede permissão e lista as câmeras disponíveis
  Html5Qrcode.getCameras().then(cameras => {
    if (!cameras || cameras.length === 0) {
      showToast('Nenhuma câmera encontrada', 'error');
      stopScanner();
      return;
    }

    // Tenta usar a câmera traseira (melhor para leitura de código)
    const backCamera = cameras.find(c =>
      c.label.toLowerCase().includes('back') ||
      c.label.toLowerCase().includes('traseira') ||
      c.label.toLowerCase().includes('rear')
    ) || cameras[cameras.length - 1]; // Se não achar traseira, usa a última da lista

    // Inicia a câmera
    // onScanSuccess é chamada toda vez que um código é lido com sucesso
    html5QrcodeScanner.start(
      backCamera.id, config,
      (decodedText) => onScanSuccess(decodedText), // Callback de sucesso
      () => {}                                      // Callback de erro (ignorado)
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

// Para a câmera e reseta os controles
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

  // Remove a linha de escaneamento
  const scanFrame = document.getElementById('scanner-frame');
  const scanLine = scanFrame?.querySelector('.scan-line');
  if (scanLine) scanLine.remove();

  document.getElementById('btn-start-scanner').style.display = 'flex';
  document.getElementById('btn-stop-scanner').style.display = 'none';
}

// Chamada automaticamente quando um código é lido com sucesso
function onScanSuccess(code) {
  // Evita processar o mesmo código duas vezes em 3 segundos
  if (code === lastScannedCode) return;
  lastScannedCode = code;

  playBeep();   // Toca o bip sonoro
  stopScanner(); // Para a câmera após ler

  // Mostra o código lido na tela
  document.getElementById('scanner-result-area').style.display = 'block';
  document.getElementById('scanner-code-display').textContent = code;

  // Busca o produto no cache pelo código de barras
  const product = _cache.find(p => p.codigo && p.codigo.toLowerCase() === code.toLowerCase());
  const foundEl = document.getElementById('scanner-product-found');
  const notFoundEl = document.getElementById('scanner-product-notfound');

  if (product) {
    // Produto encontrado: mostra os dados
    foundEl.style.display = 'flex';
    notFoundEl.style.display = 'none';
    foundEl.innerHTML = renderScannerProductCard(product);
  } else {
    // Produto não encontrado: oferece cadastrar
    foundEl.style.display = 'none';
    notFoundEl.style.display = 'block';
    notFoundEl.innerHTML = `
      <p>Código <strong>${esc(code)}</strong> não encontrado</p>
      <button class="btn-primary" onclick="cadastrarComCodigo()">Cadastrar com este código</button>
    `;
  }

  // Limpa o lastScannedCode após 3 segundos para permitir ler novamente
  setTimeout(() => { lastScannedCode = null; }, 3000);
}

// Gera o HTML do card do produto encontrado pelo scanner
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

// Atualiza o card do scanner após uma venda (sem recarregar tudo)
async function refreshScannerCard(id) {
  await getProducts(); // Busca dados atualizados do banco
  const p = _cache.find(p => p.id === id);
  if (!p) return;
  const foundEl = document.getElementById('scanner-product-found');
  foundEl.innerHTML = renderScannerProductCard(p);
}

// Mostra/esconde o campo de busca manual por código
function manualCodeSearch() {
  const ms = document.getElementById('manual-search');
  // Alterna entre mostrar e esconder
  ms.style.display = ms.style.display === 'none' ? 'block' : 'none';
  if (ms.style.display === 'block') document.getElementById('manual-code-input').focus();
}

// Busca o produto pelo código digitado manualmente
function searchByManualCode() {
  const code = document.getElementById('manual-code-input').value.trim();
  if (!code) { showToast('Digite um código', 'warning'); return; }
  onScanSuccess(code); // Reutiliza a mesma função do scanner
}

// Abre a página do scanner (chamado pelo botão no formulário)
function openScannerInline() {
  navigate('scanner', null);
}

// Leva o código lido para o campo de cadastro
function cadastrarComCodigo() {
  const code = document.getElementById('scanner-code-display').textContent;
  navigate('cadastro', null);
  setTimeout(() => { document.getElementById('f-codigo').value = code; }, 100);
}


// ==============================================================
// FUNÇÕES UTILITÁRIAS (AUXILIARES)
// ==============================================================

// Escapa caracteres especiais HTML para evitar bugs de exibição
// Exemplo: < vira &lt; para não quebrar o HTML
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Formata valores monetários de forma legível
// Exemplo: 1500 vira "R$1.5k", 800 vira "R$800"
function formatCurrency(val) {
  if (val >= 1000) return 'R$' + (val / 1000).toFixed(1) + 'k';
  return 'R$' + val.toFixed(0); // toFixed(0) = sem casas decimais
}

// Gera o HTML da miniatura (thumbnail) de um produto
// cls = classe CSS a aplicar no elemento
function thumbHtml(p, cls) {
  if (p.foto) return `<div class="${cls}"><img src="${p.foto}" alt="" /></div>`;
  return `<div class="${cls}">◫</div>`; // Ícone padrão quando não tem foto
}


// ==============================================================
// MODAL DE CONFIRMAÇÃO
// ==============================================================

// Guarda a função a ser executada quando confirmar o modal
let _modalCallback = null;

// Abre o modal com título, mensagem e uma função de confirmação
function showModal(icon, title, msg, onConfirm) {
  document.getElementById('modal-icon').textContent = icon;
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-msg').innerHTML = msg;
  document.getElementById('modal-overlay').style.display = 'flex';
  _modalCallback = onConfirm; // Guarda a função para chamar quando confirmar
}

// Fecha o modal sem executar nada
function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  _modalCallback = null;
}

// Quando clica em "Confirmar" no modal, executa o callback guardado
document.getElementById('modal-confirm-btn').addEventListener('click', () => {
  if (_modalCallback) _modalCallback(); // Executa a função guardada
  closeModal();
});


// ==============================================================
// TOAST (MENSAGEM FLUTUANTE)
// ==============================================================

let _toastTimer = null; // Guarda o temporizador para poder cancelar

// Mostra uma mensagem flutuante temporária
// type = 'success' (verde), 'error' (vermelho), 'warning' (laranja)
function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast ' + type; // Define a cor conforme o tipo

  // Cancela o timer anterior se existir (evita conflito)
  if (_toastTimer) clearTimeout(_toastTimer);

  // requestAnimationFrame garante que o CSS transition vai funcionar
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));

  // Remove o toast após 3 segundos (3000 milissegundos)
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}


// ==============================================================
// BIP SONORO
// ==============================================================

// Toca um bip curto quando um código é lido com sucesso
// Usa a Web Audio API — gera som diretamente no navegador sem arquivo de áudio
function playBeep() {
  try {
    // AudioContext = "placa de som" do navegador
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Oscillator = gerador de som (onda sonora)
    const osc = ctx.createOscillator();
    
    // GainNode = controle de volume
    const gain = ctx.createGain();
    
    // Conecta: oscillator → gain → saída de áudio
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.value = 1800; // Frequência em Hz (1800Hz = som agudo)
    osc.type = 'sine';          // Tipo de onda (sine = som suave)
    
    // Volume começa em 0.3 e vai caindo até quase zero em 0.15 segundos
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    
    osc.start(ctx.currentTime);              // Inicia o som agora
    osc.stop(ctx.currentTime + 0.15);        // Para após 0.15 segundos
  } catch(e) {} // Se der erro (ex: navegador sem suporte), ignora silenciosamente
}


// ==============================================================
// INICIALIZAÇÃO DO SISTEMA
// ==============================================================

// DOMContentLoaded = evento disparado quando a página HTML termina de carregar
// Tudo que precisa rodar no início do sistema fica aqui
window.addEventListener('DOMContentLoaded', async () => {
  
  // Carrega o dashboard logo ao abrir o sistema
  await renderDashboard();

  // Permite buscar código manual pressionando Enter
  document.getElementById('manual-code-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') searchByManualCode();
  });

  // ---- ATUALIZAÇÃO AUTOMÁTICA ----
  // setInterval executa uma função repetidamente em intervalos regulares
  // 30000 milissegundos = 30 segundos
  setInterval(async () => {
    // Verifica qual página está ativa antes de atualizar
    const paginaAtiva = document.querySelector('.page.active')?.id;
    if (paginaAtiva === 'page-dashboard') await renderDashboard();
    if (paginaAtiva === 'page-produtos') await renderProducts();
  }, 30000);

  // ---- ATUALIZA QUANDO VOLTA PARA A ABA ----
  // visibilitychange = evento que dispara quando o usuário muda de aba
  // document.visibilityState = 'visible' quando a aba está em foco
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      const paginaAtiva = document.querySelector('.page.active')?.id;
      if (paginaAtiva === 'page-dashboard') await renderDashboard();
      if (paginaAtiva === 'page-produtos') await renderProducts();
    }
  });
});