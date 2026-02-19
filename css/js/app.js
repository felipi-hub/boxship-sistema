// app.js - Aplicação Principal

// Variáveis globais
let currentBoxProducts = [];
let currentBoxClientId = null;

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await db.init();
        console.log('✅ Sistema inicializado');

        await loadAllData();
        setupEventListeners();

    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao carregar sistema', 'error');
    }
});

async function loadAllData() {
    await updateStats();
    await loadClients();
    await loadPendingClientsList();
    await loadRecentBoxes();
    await loadProducts();
    await loadBoxes();
    await loadShipments();
    await loadClientSelects();
    await loadRecentReceives();
}

function setupEventListeners() {
    // Form Cliente
    document.getElementById('form-client').addEventListener('submit', saveClient);

    // Form Receber Produto
    document.getElementById('form-receive').addEventListener('submit', receiveProduct);

    // Form Envio
    document.getElementById('form-shipment').addEventListener('submit', confirmShipment);

    // ESC para fechar modais
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeClientModal();
            closeBoxDetailsModal();
            closeShipmentModal();
            closeSettings();
        }
    });
}

// ==================== NAVEGAÇÃO ====================
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    document.getElementById('tab-' + tabName).classList.remove('hidden');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Recarregar dados da aba
    switch (tabName) {
        case 'dashboard': updateStats(); loadPendingClientsList(); loadRecentBoxes(); break;
        case 'clients': loadClients(); break;
        case 'receive': loadClientSelects(); loadRecentReceives(); break;
        case 'products': loadProducts(); break;
        case 'boxes': loadBoxes(); break;
        case 'assembly': loadClientSelects(); resetAssembly(); break;
        case 'shipments': loadShipments(); break;
    }
}

// ==================== ESTATÍSTICAS ====================
async function updateStats() {
    const products = await db.getAll('products');
    const boxes = await db.getAll('boxes');

    const pending = products.filter(p => p.status === 'pending').length;
    const assembling = boxes.filter(b => b.status === 'assembling').length;
    const ready = boxes.filter(b => b.status === 'ready').length;

    // Enviadas este mês
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const shipped = boxes.filter(b =>
        b.status === 'shipped' || b.status === 'delivered'
    ).filter(b => new Date(b.shippedAt) >= startOfMonth).length;

    document.getElementById('stat-pending').textContent = pending;
    document.getElementById('stat-assembling').textContent = assembling;
    document.getElementById('stat-ready').textContent = ready;
    document.getElementById('stat-shipped').textContent = shipped;

    document.getElementById('header-products').textContent = pending;
    document.getElementById('header-boxes').textContent = assembling + ready;
}

// ==================== CLIENTES ====================
function openClientModal(clientId = null) {
    document.getElementById('modal-client').classList.remove('hidden');
    document.getElementById('form-client').reset();

    if (clientId) {
        document.getElementById('modal-client-title').textContent = 'Editar Cliente';
        loadClientForEdit(clientId);
    } else {
        document.getElementById('modal-client-title').textContent = 'Novo Cliente';
        document.getElementById('client-id').value = '';
    }
}

function closeClientModal() {
    document.getElementById('modal-client').classList.add('hidden');
}

async function loadClientForEdit(id) {
    const client = await db.get('clients', id);
    if (client) {
        document.getElementById('client-id').value = client.id;
        document.getElementById('client-name').value = client.name;
        document.getElementById('client-phone').value = client.phone;
        document.getElementById('client-email').value = client.email || '';
        document.getElementById('client-address').value = client.address || '';
        document.getElementById('client-notes').value = client.notes || '';
    }
}

async function saveClient(event) {
    event.preventDefault();

    const clientId = document.getElementById('client-id').value;
    const clientData = {
        name: document.getElementById('client-name').value.trim(),
        phone: document.getElementById('client-phone').value.trim(),
        email: document.getElementById('client-email').value.trim(),
        address: document.getElementById('client-address').value.trim(),
        notes: document.getElementById('client-notes').value.trim(),
        active: true
    };

    try {
        if (clientId) {
            clientData.id = parseInt(clientId);
            await db.update('clients', clientData);
            showToast('Cliente atualizado!');
        } else {
            await db.add('clients', clientData);
            showToast('Cliente cadastrado!');
        }

        closeClientModal();
        loadClients();
        loadClientSelects();
    } catch (error) {
        if (error.name === 'ConstraintError') {
            showToast('Este telefone já está cadastrado!', 'error');
        } else {
            showToast('Erro: ' + error.message, 'error');
        }
    }
}

async function loadClients() {
    const clients = await db.getAll('clients');
    const products = await db.getAll('products');
    const boxes = await db.getAll('boxes');

    const grid = document.getElementById('clients-grid');
    const noClients = document.getElementById('no-clients');

    if (clients.length === 0) {
        grid.innerHTML = '';
        noClients.classList.remove('hidden');
        return;
    }

    noClients.classList.add('hidden');

    grid.innerHTML = clients.map(client => {
        const clientProducts = products.filter(p => p.clientId === client.id && p.status === 'pending');
        const clientBoxes = boxes.filter(b => b.clientId === client.id);
        const readyBoxes = clientBoxes.filter(b => b.status === 'ready').length;

        return `
            <div class="bg-gray-50 rounded-xl p-5 card-hover border border-gray-100">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center space-x-3">
                        <div class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                            <span class="text-primary font-bold text-lg">${client.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                            <h3 class="font-bold text-gray-800">${client.name}</h3>
                            <p class="text-sm text-gray-500">${client.phone}</p>
                        </div>
                    </div>
                </div>
                
                <div class="flex items-center space-x-4 mb-4 text-sm">
                    <span class="flex items-center text-yellow-600">
                        <i class="fas fa-cube mr-1"></i>${clientProducts.length} produtos
                    </span>
                    <span class="flex items-center text-blue-600">
                        <i class="fas fa-box mr-1"></i>${clientBoxes.length} caixas
                    </span>
                    ${readyBoxes > 0 ? `<span class="flex items-center text-green-600"><i class="fas fa-check mr-1"></i>${readyBoxes} pronta(s)</span>` : ''}
                </div>
                
                <div class="flex space-x-2">
                    <button onclick="openClientModal(${client.id})" class="flex-1 bg-white border border-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition text-sm">
                        <i class="fas fa-edit mr-1"></i>Editar
                    </button>
                    <button onclick="startAssemblyForClient(${client.id})" class="flex-1 bg-primary text-white py-2 rounded-lg hover:bg-secondary transition text-sm" ${clientProducts.length === 0 ? 'disabled class="opacity-50 cursor-not-allowed"' : ''}>
                        <i class="fas fa-box mr-1"></i>Montar
                    </button>
                    <button onclick="sendWhatsApp(${client.id})" class="bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 transition">
                        <i class="fab fa-whatsapp"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function filterClients() {
    const search = document.getElementById('search-client').value.toLowerCase();
    const cards = document.querySelectorAll('#clients-grid > div');

    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(search) ? '' : 'none';
    });
}

async function sendWhatsApp(clientId) {
    const client = await db.get('clients', clientId);
    const message = `Olá, ${client.name}! Como posso ajudar?`;
    whatsapp.openWhatsApp(client.phone, message);
}

async function deleteClient(clientId) {
    if (!confirm('Excluir este cliente e todos os seus produtos?')) return;

    const products = await db.getByIndex('products', 'clientId', clientId);
    const boxes = await db.getByIndex('boxes', 'clientId', clientId);

    for (const p of products) await db.delete('products', p.id);
    for (const b of boxes) await db.delete('boxes', b.id);
    await db.delete('clients', clientId);

    showToast('Cliente excluído!');
    loadClients();
    updateStats();
}

// Carregar selects de clientes
async function loadClientSelects() {
    const clients = await db.getAll('clients');
    const selects = ['receive-client', 'assembly-client', 'filter-product-client'];

    selects.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;

        const firstOption = id === 'filter-product-client' ? '<option value="all">Todos os Clientes</option>' : '<option value="">Selecione o cliente</option>';

        select.innerHTML = firstOption + clients.map(c =>
            `<option value="${c.id}">${c.name} - ${c.phone}</option>`
        ).join('');
    });
}

// Lista de clientes pendentes (dashboard)
async function loadPendingClientsList() {
    const products = await db.getAll('products');
    const clients = await db.getAll('clients');

    const pendingByClient = {};
    products.filter(p => p.status === 'pending').forEach(p => {
        if (!pendingByClient[p.clientId]) pendingByClient[p.clientId] = [];
        pendingByClient[p.clientId].push(p);
    });

    const clientsWithPending = Object.entries(pendingByClient).map(([clientId, prods]) => {
        const client = clients.find(c => c.id === parseInt(clientId));
        return { client, products: prods };
    }).filter(item => item.client);

    const list = document.getElementById('pending-clients-list');
    document.getElementById('pending-clients-count').textContent = clientsWithPending.length;

    if (clientsWithPending.length === 0) {
        list.innerHTML = '<p class="text-gray-500 text-center py-8">Nenhum cliente com produtos pendentes</p>';
        return;
    }

    clientsWithPending.sort((a, b) => b.products.length - a.products.length);

    list.innerHTML = clientsWithPending.slice(0, 8).map(({ client, products }) => {
        const totalWeight = products.reduce((sum, p) => sum + parseFloat(p.weight), 0);
        return `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                        <span class="text-yellow-700 font-bold">${client.name.charAt(0)}</span>
                    </div>
                    <div>
                        <p class="font-medium text-gray-800">${client.name}</p>
                        <p class="text-sm text-gray-500">${products.length} produtos • ${totalWeight.toFixed(2)}kg</p>
                    </div>
                </div>
                <button onclick="startAssemblyForClient(${client.id})" class="bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary transition text-sm">
                    <i class="fas fa-box mr-1"></i>Montar
                </button>
            </div>
        `;
    }).join('');
}

// ==================== RECEBER PRODUTOS ====================
async function receiveProduct(event) {
    event.preventDefault();

    const clientId = parseInt(document.getElementById('receive-client').value);
    const quantity = parseInt(document.getElementById('receive-quantity').value) || 1;

    const productData = {
        clientId,
        description: document.getElementById('receive-description').value.trim(),
        weight: parseFloat(document.getElementById('receive-weight').value),
        tracking: document.getElementById('receive-tracking').value.trim(),
        notes: document.getElementById('receive-notes').value.trim(),
        status: 'pending',
        boxId: null,
        receivedAt: new Date().toISOString()
    };

    try {
        const client = await db.get('clients', clientId);

        // Adicionar múltiplos se quantidade > 1
        for (let i = 0; i < quantity; i++) {
            await db.add('products', { ...productData });
        }

        // Notificar se marcado
        if (document.getElementById('receive-notify').checked) {
            await whatsapp.notifyProductReceived(client, productData);
        }

        showToast(`${quantity} produto(s) registrado(s)!`);
        document.getElementById('form-receive').reset();

        loadRecentReceives();
        loadProducts();
        updateStats();
        loadPendingClientsList();

    } catch (error) {
        showToast('Erro: ' + error.message, 'error');
    }
}

async function loadRecentReceives() {
    const products = await db.getAll('products');
    const clients = await db.getAll('clients');
    const clientsMap = Object.fromEntries(clients.map(c => [c.id, c]));

    // Ordenar por data de recebimento
    products.sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));

    const today = new Date().toDateString();
    const todayCount = products.filter(p => new Date(p.receivedAt).toDateString() === today).length;
    document.getElementById('today-received').textContent = todayCount + ' hoje';

    const list = document.getElementById('recent-receives');

    if (products.length === 0) {
        list.innerHTML = '<p class="text-gray-500 text-center py-8">Nenhum produto recebido</p>';
        return;
    }

    list.innerHTML = products.slice(0, 15).map(product => {
        const client = clientsMap[product.clientId];
        return `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl product-item">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <i class="fas fa-cube text-blue-600"></i>
                    </div>
                    <div>
                        <p class="font-medium text-gray-800 text-sm">${product.description}</p>
                        <p class="text-xs text-gray-500">${client?.name || 'N/A'} • ${product.weight}kg</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-xs text-gray-500">${formatDateShort(product.receivedAt)}</p>
                    ${getProductStatusBadge(product.status)}
                </div>
            </div>
        `;
    }).join('');
}

// ==================== PRODUTOS ====================
async function loadProducts() {
    const products = await db.getAll('products');
    const clients = await db.getAll('clients');
    const boxes = await db.getAll('boxes');

    const clientsMap = Object.fromEntries(clients.map(c => [c.id, c]));
    const boxesMap = Object.fromEntries(boxes.map(b => [b.id, b]));

    // Filtros
    const statusFilter = document.getElementById('filter-product-status')?.value || 'all';
    const clientFilter = document.getElementById('filter-product-client')?.value || 'all';
    const searchFilter = document.getElementById('search-product')?.value.toLowerCase() || '';

    let filtered = products;

    if (statusFilter !== 'all') {
        filtered = filtered.filter(p => p.status === statusFilter);
    }
    if (clientFilter !== 'all') {
        filtered = filtered.filter(p => p.clientId === parseInt(clientFilter));
    }
    if (searchFilter) {
        filtered = filtered.filter(p =>
            p.description.toLowerCase().includes(searchFilter) ||
            (clientsMap[p.clientId]?.name || '').toLowerCase().includes(searchFilter)
        );
    }

    filtered.sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));

    const table = document.getElementById('products-table');
    const noProducts = document.getElementById('no-products');

    if (filtered.length === 0) {
        table.innerHTML = '';
        noProducts.classList.remove('hidden');
        return;
    }

    noProducts.classList.add('hidden');

    table.innerHTML = filtered.map(product => {
        const client = clientsMap[product.clientId];
        const box = product.boxId ? boxesMap[product.boxId] : null;

        return `
            <tr class="hover:bg-gray-50 transition">
                <td class="px-4 py-3">
                    <div>
                        <p class="font-medium text-gray-800">${product.description}</p>
                        ${product.tracking ? `<p class="text-xs text-gray-500">Rastreio: ${product.tracking}</p>` : ''}
                    </div>
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">${client?.name || 'N/A'}</td>
                <td class="px-4 py-3 text-sm font-medium">${product.weight}kg</td>
                <td class="px-4 py-3 text-sm text-gray-500">${formatDateShort(product.receivedAt)}</td>
                <td class="px-4 py-3">
                    ${getProductStatusBadge(product.status)}
                    ${box ? `<span class="text-xs text-gray-500 ml-2">${box.boxNumber}</span>` : ''}
                </td>
                <td class="px-4 py-3">
                    <div class="flex space-x-1">
                        ${product.status === 'pending' ? `
                            <button onclick="deleteProduct(${product.id})" class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Excluir">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function deleteProduct(productId) {
    if (!confirm('Excluir este produto?')) return;

    await db.delete('products', productId);
    showToast('Produto excluído!');
    loadProducts();
    updateStats();
    loadPendingClientsList();
}

// ==================== MONTAGEM DE CAIXAS ====================
function resetAssembly() {
    currentBoxProducts = [];
    currentBoxClientId = null;
    document.getElementById('assembly-client').value = '';
    document.getElementById('available-products').innerHTML = '<p class="text-gray-500 text-center py-8">Selecione um cliente para ver os produtos</p>';
    document.getElementById('box-products').innerHTML = '<p class="text-gray-400 text-sm text-center py-4">Adicione produtos à caixa</p>';
    updateBoxDisplay();
    generateBoxNumber();
}

async function startAssemblyForClient(clientId) {
    showTab('assembly');
    document.getElementById('assembly-client').value = clientId;
    await loadClientProductsForAssembly();
}

async function loadClientProductsForAssembly() {
    const clientId = parseInt(document.getElementById('assembly-client').value);
    const container = document.getElementById('available-products');

    if (!clientId) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">Selecione um cliente para ver os produtos</p>';
        currentBoxProducts = [];
        currentBoxClientId = null;
        updateBoxDisplay();
        return;
    }

    currentBoxClientId = clientId;

    const products = await db.getByIndex('products', 'clientId', clientId);
    const pendingProducts = products.filter(p => p.status === 'pending');

    if (pendingProducts.length === 0) {
        container.innerHTML = '<p class="text-yellow-600 text-center py-8"><i class="fas fa-info-circle mr-2"></i>Este cliente não possui produtos pendentes</p>';
        return;
    }

    container.innerHTML = pendingProducts.map(product => `
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition cursor-pointer product-item" onclick="addToBox(${product.id})">
            <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <i class="fas fa-cube text-yellow-600 text-sm"></i>
                </div>
                <div>
                    <p class="font-medium text-gray-800 text-sm">${product.description}</p>
                    <p class="text-xs text-gray-500">Recebido: ${formatDateShort(product.receivedAt)}</p>
                </div>
            </div>
            <div class="flex items-center space-x-3">
                <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-lg text-sm font-medium">${product.weight}kg</span>
                <button class="text-primary hover:text-secondary">
                    <i class="fas fa-plus-circle text-xl"></i>
                </button>
            </div>
        </div>
    `).join('');
}

async function addToBox(productId) {
    const settings = db.getSettings();
    const maxWeight = settings.maxWeight || 25;

    // Verificar se já está na caixa
    if (currentBoxProducts.find(p => p.id === productId)) {
        showToast('Produto já está na caixa!', 'warning');
        return;
    }

    const product = await db.get('products', productId);
    const currentWeight = currentBoxProducts.reduce((sum, p) => sum + parseFloat(p.weight), 0);

    if (currentWeight + parseFloat(product.weight) > maxWeight) {
        showToast(`Peso máximo de ${maxWeight}kg seria excedido!`, 'error');
        return;
    }

    currentBoxProducts.push(product);
    updateBoxDisplay();

    // Remover da lista de disponíveis
    const availableContainer = document.getElementById('available-products');
    const productElement = availableContainer.querySelector(`[onclick="addToBox(${productId})"]`);
    if (productElement) {
        productElement.remove();
    }

    // Verificar se ainda há produtos disponíveis
    if (availableContainer.children.length === 0) {
        availableContainer.innerHTML = '<p class="text-green-600 text-center py-8"><i class="fas fa-check-circle mr-2"></i>Todos os produtos foram adicionados</p>';
    }
}

function removeFromBox(productId) {
    currentBoxProducts = currentBoxProducts.filter(p => p.id !== productId);
    updateBoxDisplay();
    loadClientProductsForAssembly(); // Recarregar lista de disponíveis
}

function updateBoxDisplay() {
    const settings = db.getSettings();
    const maxWeight = settings.maxWeight || 25;
    const totalWeight = currentBoxProducts.reduce((sum, p) => sum + parseFloat(p.weight), 0);
    const percentage = (totalWeight / maxWeight) * 100;

    document.getElementById('box-weight').textContent = totalWeight.toFixed(2) + ' kg';
    document.getElementById('box-items-count').textContent = currentBoxProducts.length;
    document.getElementById('max-weight-display').textContent = maxWeight + ' kg (máx)';

    const weightBar = document.getElementById('weight-bar');
    weightBar.style.width = Math.min(percentage, 100) + '%';

    // Mudar cor se estiver próximo do limite
    if (percentage > 90) {
        weightBar.className = 'weight-bar h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full';
    } else if (percentage > 70) {
        weightBar.className = 'weight-bar h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full';
    } else {
        weightBar.className = 'weight-bar h-full bg-gradient-to-r from-primary to-secondary rounded-full';
    }

    // Lista de produtos na caixa
    const boxContainer = document.getElementById('box-products');
    const closeBtn = document.getElementById('btn-close-box');

    if (currentBoxProducts.length === 0) {
        boxContainer.innerHTML = '<p class="text-gray-400 text-sm text-center py-4">Adicione produtos à caixa</p>';
        closeBtn.disabled = true;
    } else {
        boxContainer.innerHTML = currentBoxProducts.map(product => `
            <div class="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                <div class="flex-1">
                    <p class="text-sm font-medium text-gray-800 truncate">${product.description}</p>
                    <p class="text-xs text-gray-500">${product.weight}kg</p>
                </div>
                <button onclick="removeFromBox(${product.id})" class="text-red-500 hover:text-red-700 p-1">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
        closeBtn.disabled = false;
    }
}

function selectAllProducts() {
    const items = document.querySelectorAll('#available-products [onclick^="addToBox"]');
    items.forEach(item => item.click());
}

async function saveBoxAsDraft() {
    if (currentBoxProducts.length === 0) {
        showToast('Adicione produtos à caixa!', 'warning');
        return;
    }

    const boxNumber = 'CX-' + (document.getElementById('box-number').value || await generateBoxNumber().replace('CX-', ''));

    const boxData = {
        clientId: currentBoxClientId,
        boxNumber: boxNumber,
        status: 'assembling',
        totalWeight: currentBoxProducts.reduce((sum, p) => sum + parseFloat(p.weight), 0),
        productsCount: currentBoxProducts.length
    };

    try {
        const boxId = await db.add('boxes', boxData);

        // Atualizar produtos
        for (const product of currentBoxProducts) {
            product.status = 'in_box';
            product.boxId = boxId;
            await db.update('products', product);
        }

        showToast('Caixa salva como rascunho!');
        resetAssembly();
        loadBoxes();
        updateStats();

    } catch (error) {
        if (error.name === 'ConstraintError') {
            showToast('Número de caixa já existe!', 'error');
        } else {
            showToast('Erro: ' + error.message, 'error');
        }
    }
}

async function closeAndNotify() {
    if (currentBoxProducts.length === 0) {
        showToast('Adicione produtos à caixa!', 'warning');
        return;
    }

    const boxNumberInput = document.getElementById('box-number').value;
    const boxNumber = 'CX-' + (boxNumberInput || (await generateBoxNumber()).replace('CX-', ''));

    const boxData = {
        clientId: currentBoxClientId,
        boxNumber: boxNumber,
        status: 'ready',
        totalWeight: currentBoxProducts.reduce((sum, p) => sum + parseFloat(p.weight), 0),
        productsCount: currentBoxProducts.length,
        closedAt: new Date().toISOString()
    };

    try {
        const boxId = await db.add('boxes', boxData);

        // Atualizar produtos
        for (const product of currentBoxProducts) {
            product.status = 'in_box';
            product.boxId = boxId;
            await db.update('products', product);
        }

        // Notificar cliente
        const client = await db.get('clients', currentBoxClientId);
        await whatsapp.notifyBoxReady(client, boxData, currentBoxProducts);

        showToast('Caixa fechada e cliente notificado!');
        resetAssembly();
        loadBoxes();
        updateStats();

    } catch (error) {
        if (error.name === 'ConstraintError') {
            showToast('Número de caixa já existe!', 'error');
        } else {
            showToast('Erro: ' + error.message, 'error');
        }
    }
}

// ==================== CAIXAS ====================
async function loadBoxes() {
    const boxes = await db.getAll('boxes');
    const clients = await db.getAll('clients');
    const products = await db.getAll('products');

    const clientsMap = Object.fromEntries(clients.map(c => [c.id, c]));

    // Filtro
    const statusFilter = document.getElementById('filter-box-status')?.value || 'all';
    let filtered = boxes;

    if (statusFilter !== 'all') {
        filtered = filtered.filter(b => b.status === statusFilter);
    }

    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const grid = document.getElementById('boxes-grid');
    const noBoxes = document.getElementById('no-boxes');

    if (filtered.length === 0) {
        grid.innerHTML = '';
        noBoxes.classList.remove('hidden');
        return;
    }

    noBoxes.classList.add('hidden');

    grid.innerHTML = filtered.map(box => {
        const client = clientsMap[box.clientId];
        const boxProducts = products.filter(p => p.boxId === box.id);

        return `
            <div class="bg-gray-50 rounded-xl p-5 card-hover border border-gray-100">
                <div class="flex items-center justify-between mb-3">
                    <span class="bg-primary text-white px-3 py-1 rounded-lg text-sm font-bold">${box.boxNumber}</span>
                    ${getBoxStatusBadge(box.status)}
                </div>
                
                <div class="mb-3">
                    <p class="font-medium text-gray-800">${client?.name || 'Cliente N/A'}</p>
                    <p class="text-sm text-gray-500">${client?.phone || ''}</p>
                </div>
                
                <div class="flex items-center space-x-4 mb-4 text-sm">
                    <span class="flex items-center text-gray-600">
                        <i class="fas fa-cube mr-1"></i>${boxProducts.length} itens
                    </span>
                    <span class="flex items-center text-gray-600">
                        <i class="fas fa-weight mr-1"></i>${box.totalWeight?.toFixed(2) || 0}kg
                    </span>
                </div>
                
                <div class="flex space-x-2">
                    <button onclick="viewBoxDetails(${box.id})" class="flex-1 bg-white border border-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition text-sm">
                        <i class="fas fa-eye mr-1"></i>Ver
                    </button>
                    ${box.status === 'assembling' ? `
                        <button onclick="closeBox(${box.id})" class="flex-1 bg-primary text-white py-2 rounded-lg hover:bg-secondary transition text-sm">
                            <i class="fas fa-check mr-1"></i>Fechar
                        </button>
                    ` : ''}
                    ${box.status === 'ready' ? `
                        <button onclick="openShipmentModal(${box.id})" class="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition text-sm">
                            <i class="fas fa-shipping-fast mr-1"></i>Enviar
                        </button>
                    ` : ''}
                    ${box.status === 'shipped' ? `
                        <button onclick="confirmDelivery(${box.id})" class="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition text-sm">
                            <i class="fas fa-check-double mr-1"></i>Entregue
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

async function loadRecentBoxes() {
    const boxes = await db.getAll('boxes');
    const clients = await db.getAll('clients');
    const clientsMap = Object.fromEntries(clients.map(c => [c.id, c]));

    boxes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const container = document.getElementById('recent-boxes');

    if (boxes.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8 col-span-3">Nenhuma caixa criada ainda</p>';
        return;
    }

    container.innerHTML = boxes.slice(0, 6).map(box => {
        const client = clientsMap[box.clientId];
        return `
            <div class="bg-gray-50 rounded-xl p-4 card-hover">
                <div class="flex items-center justify-between mb-2">
                    <span class="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-bold">${box.boxNumber}</span>
                    ${getBoxStatusBadge(box.status)}
                </div>
                <p class="font-medium text-gray-800 text-sm">${client?.name || 'N/A'}</p>
                <p class="text-xs text-gray-500">${box.productsCount || 0} itens • ${box.totalWeight?.toFixed(1) || 0}kg</p>
            </div>
        `;
    }).join('');
}

async function viewBoxDetails(boxId) {
    const box = await db.get('boxes', boxId);
    const client = await db.get('clients', box.clientId);
    const products = await db.getByIndex('products', 'boxId', boxId);

    const modal = document.getElementById('modal-box-details');
    document.getElementById('modal-box-title').textContent = box.boxNumber;

    document.getElementById('modal-box-content').innerHTML = `
        <div class="space-y-4">
            <div class="flex items-center justify-between">
                ${getBoxStatusBadge(box.status)}
                <span class="text-sm text-gray-500">Criada: ${formatDate(box.createdAt)}</span>
            </div>
            
            <div class="bg-gray-50 rounded-xl p-4">
                <h4 class="font-medium text-gray-800 mb-2">Cliente</h4>
                <p class="text-gray-600">${client?.name || 'N/A'}</p>
                <p class="text-sm text-gray-500">${client?.phone || ''}</p>
                ${client?.address ? `<p class="text-sm text-gray-500 mt-1">${client.address}</p>` : ''}
            </div>
            
            <div class="bg-gray-50 rounded-xl p-4">
                <h4 class="font-medium text-gray-800 mb-2">Resumo</h4>
                <div class="grid grid-cols-2 gap-4 text-center">
                    <div>
                        <p class="text-2xl font-bold text-primary">${products.length}</p>
                        <p class="text-sm text-gray-500">Produtos</p>
                    </div>
                    <div>
                        <p class="text-2xl font-bold text-blue-600">${box.totalWeight?.toFixed(2) || 0}kg</p>
                        <p class="text-sm text-gray-500">Peso Total</p>
                    </div>
                </div>
            </div>
            
            <div>
                <h4 class="font-medium text-gray-800 mb-2">Produtos (${products.length})</h4>
                <div class="space-y-2 max-h-48 overflow-y-auto">
                    ${products.map(p => `
                        <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <span class="text-sm text-gray-700">${p.description}</span>
                            <span class="text-sm text-gray-500">${p.weight}kg</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            ${box.tracking ? `
                <div class="bg-purple-50 rounded-xl p-4">
                    <h4 class="font-medium text-gray-800 mb-2">Envio</h4>
                    <p class="text-sm">Transportadora: ${box.carrier || 'N/A'}</p>
                    <p class="text-sm">Rastreio: <span class="font-mono">${box.tracking}</span></p>
                    ${box.shippedAt ? `<p class="text-sm text-gray-500">Enviado em: ${formatDate(box.shippedAt)}</p>` : ''}
                </div>
            ` : ''}
            
            <div class="flex space-x-3">
                ${box.status === 'ready' ? `
                    <button onclick="openShipmentModal(${box.id}); closeBoxDetailsModal();" class="flex-1 bg-purple-600 text-white py-3 rounded-xl hover:bg-purple-700 transition">
                        <i class="fas fa-shipping-fast mr-2"></i>Registrar Envio
                    </button>
                ` : ''}
                ${box.status === 'shipped' ? `
                    <button onclick="confirmDelivery(${box.id}); closeBoxDetailsModal();" class="flex-1 bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 transition">
                        <i class="fas fa-check-double mr-2"></i>Confirmar Entrega
                    </button>
                ` : ''}
                <button onclick="notifyClientAboutBox(${box.id})" class="flex-1 bg-primary text-white py-3 rounded-xl hover:bg-secondary transition">
                    <i class="fab fa-whatsapp mr-2"></i>Notificar Cliente
                </button>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
}

function closeBoxDetailsModal() {
    document.getElementById('modal-box-details').classList.add('hidden');
}

async function closeBox(boxId) {
    const box = await db.get('boxes', boxId);
    const client = await db.get('clients', box.clientId);
    const products = await db.getByIndex('products', 'boxId', boxId);

    box.status = 'ready';
    box.closedAt = new Date().toISOString();
    await db.update('boxes', box);

    // Notificar
    await whatsapp.notifyBoxReady(client, box, products);

    showToast('Caixa fechada e cliente notificado!');
    loadBoxes();
    updateStats();
}

async function notifyClientAboutBox(boxId) {
    const box = await db.get('boxes', boxId);
    const client = await db.get('clients', box.clientId);
    const products = await db.getByIndex('products', 'boxId', boxId);

    if (box.status === 'ready') {
        await whatsapp.notifyBoxReady(client, box, products);
    } else if (box.status === 'shipped') {
        await whatsapp.notifyBoxShipped(client, box, {
            tracking: box.tracking,
            carrier: box.carrier
        });
    }

    showToast('Abrindo WhatsApp...');
}

// ==================== ENVIOS ====================
function openShipmentModal(boxId) {
    document.getElementById('shipment-box-id').value = boxId;
    document.getElementById('form-shipment').reset();
    document.getElementById('shipment-notify').checked = true;
    document.getElementById('modal-shipment').classList.remove('hidden');
}

function closeShipmentModal() {
    document.getElementById('modal-shipment').classList.add('hidden');
}

async function confirmShipment(event) {
    event.preventDefault();

    const boxId = parseInt(document.getElementById('shipment-box-id').value);
    const tracking = document.getElementById('shipment-tracking').value.trim();
    const carrier = document.getElementById('shipment-carrier').value;
    const notes = document.getElementById('shipment-notes').value.trim();
    const shouldNotify = document.getElementById('shipment-notify').checked;

    const box = await db.get('boxes', boxId);
    const client = await db.get('clients', box.clientId);

    box.status = 'shipped';
    box.tracking = tracking;
    box.carrier = carrier;
    box.shipmentNotes = notes;
    box.shippedAt = new Date().toISOString();

    await db.update('boxes', box);

    // Atualizar produtos
    const products = await db.getByIndex('products', 'boxId', boxId);
    for (const product of products) {
        product.status = 'shipped';
        await db.update('products', product);
    }

    if (shouldNotify) {
        await whatsapp.notifyBoxShipped(client, box, { tracking, carrier });
    }

    closeShipmentModal();
    showToast('Envio registrado!');
    loadBoxes();
    loadShipments();
    updateStats();
}

async function confirmDelivery(boxId) {
    if (!confirm('Confirmar entrega desta caixa?')) return;

    const box = await db.get('boxes', boxId);
    const client = await db.get('clients', box.clientId);

    box.status = 'delivered';
    box.deliveredAt = new Date().toISOString();

    await db.update('boxes', box);

    await whatsapp.notifyBoxDelivered(client, box);

    showToast('Entrega confirmada!');
    loadBoxes();
    loadShipments();
    updateStats();
}

async function loadShipments() {
    const boxes = await db.getAll('boxes');
    const clients = await db.getAll('clients');
    const clientsMap = Object.fromEntries(clients.map(c => [c.id, c]));

    const statusFilter = document.getElementById('filter-shipment-status')?.value || 'ready';

    let filtered = boxes;
    if (statusFilter !== 'all') {
        filtered = boxes.filter(b => b.status === statusFilter);
    }

    filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    const list = document.getElementById('shipments-list');
    const noShipments = document.getElementById('no-shipments');

    if (filtered.length === 0) {
        list.innerHTML = '';
        noShipments.classList.remove('hidden');
        return;
    }

    noShipments.classList.add('hidden');

    list.innerHTML = filtered.map(box => {
        const client = clientsMap[box.clientId];
        return `
            <div class="bg-gray-50 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="flex items-center space-x-4">
                    <div class="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                        <span class="text-primary font-bold">${box.boxNumber.replace('CX-', '')}</span>
                    </div>
                    <div>
                        <div class="flex items-center space-x-2">
                            <span class="font-bold text-gray-800">${box.boxNumber}</span>
                            ${getBoxStatusBadge(box.status)}
                        </div>
                        <p class="text-sm text-gray-600">${client?.name || 'N/A'} • ${box.productsCount || 0} itens • ${box.totalWeight?.toFixed(1) || 0}kg</p>
                        ${box.tracking ? `<p class="text-xs text-gray-500 font-mono">${box.carrier}: ${box.tracking}</p>` : ''}
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    ${box.status === 'ready' ? `
                        <button onclick="openShipmentModal(${box.id})" class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm">
                            <i class="fas fa-shipping-fast mr-1"></i>Enviar
                        </button>
                    ` : ''}
                    ${box.status === 'shipped' ? `
                        <button onclick="confirmDelivery(${box.id})" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm">
                            <i class="fas fa-check-double mr-1"></i>Entregue
                        </button>
                    ` : ''}
                    <button onclick="viewBoxDetails(${box.id})" class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition text-sm">
                        <i class="fas fa-eye mr-1"></i>Ver
                    </button>
                    <button onclick="notifyClientAboutBox(${box.id})" class="bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary transition text-sm">
                        <i class="fab fa-whatsapp"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== CONFIGURAÇÕES ====================
function openSettings() {
    const settings = db.getSettings();
    document.getElementById('setting-company').value = settings.companyName || '';
    document.getElementById('setting-phone').value = settings.companyPhone || '';
    document.getElementById('setting-max-weight').value = settings.maxWeight || 25;
    document.getElementById('modal-settings').classList.remove('hidden');
}

function closeSettings() {
    document.getElementById('modal-settings').classList.add('hidden');
}

function saveSettings() {
    const settings = db.getSettings();
    settings.companyName = document.getElementById('setting-company').value;
    settings.companyPhone = document.getElementById('setting-phone').value;
    settings.maxWeight = parseFloat(document.getElementById('setting-max-weight').value) || 25;
    db.saveSettings(settings);
    closeSettings();
    showToast('Configurações salvas!');
}