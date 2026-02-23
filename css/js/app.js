// ADICIONAR ESTA FUNÇÃO NO app.js

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
            <div class="bg-white rounded-xl p-5 card-hover border border-gray-200 shadow-sm">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center space-x-3">
                        <div class="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center shadow-md">
                            <span class="text-white font-bold text-lg">${client.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                            <h3 class="font-bold text-gray-800">${client.name}</h3>
                            <p class="text-sm text-gray-500 flex items-center">
                                <i class="fab fa-whatsapp text-primary mr-1"></i>
                                ${client.phone}
                            </p>
                            ${client.email ? `<p class="text-xs text-gray-400">${client.email}</p>` : ''}
                        </div>
                    </div>
                </div>
                
                ${client.address ? `
                    <div class="mb-3 p-2 bg-gray-50 rounded-lg">
                        <p class="text-xs text-gray-600">
                            <i class="fas fa-map-marker-alt text-gray-400 mr-1"></i>
                            ${client.address}
                        </p>
                    </div>
                ` : ''}
                
                <div class="flex items-center space-x-4 mb-4 text-sm">
                    <span class="flex items-center ${clientProducts.length > 0 ? 'text-yellow-600 font-medium' : 'text-gray-500'}">
                        <i class="fas fa-cube mr-1"></i>${clientProducts.length} produtos
                    </span>
                    <span class="flex items-center ${clientBoxes.length > 0 ? 'text-blue-600 font-medium' : 'text-gray-500'}">
                        <i class="fas fa-box mr-1"></i>${clientBoxes.length} caixas
                    </span>
                    ${readyBoxes > 0 ? `
                        <span class="flex items-center text-green-600 font-medium">
                            <i class="fas fa-check mr-1"></i>${readyBoxes} pronta(s)
                        </span>
                    ` : ''}
                </div>
                
                <div class="grid grid-cols-2 gap-2">
                    <button onclick="openClientModal(${client.id})" class="bg-blue-50 border border-blue-200 text-blue-700 py-2 rounded-lg hover:bg-blue-100 transition text-sm flex items-center justify-center space-x-1">
                        <i class="fas fa-edit"></i>
                        <span>Editar</span>
                    </button>
                    
                    ${clientProducts.length > 0 ? `
                        <button onclick="startAssemblyForClient(${client.id})" class="bg-gradient-to-r from-primary to-secondary text-white py-2 rounded-lg hover:shadow-lg transition text-sm flex items-center justify-center space-x-1">
                            <i class="fas fa-box"></i>
                            <span>Montar</span>
                        </button>
                    ` : `
                        <button onclick="sendWhatsApp(${client.id})" class="bg-green-50 border border-green-200 text-green-700 py-2 rounded-lg hover:bg-green-100 transition text-sm flex items-center justify-center space-x-1">
                            <i class="fab fa-whatsapp"></i>
                            <span>WhatsApp</span>
                        </button>
                    `}
                    
                    <button onclick="viewClientDetails(${client.id})" class="bg-purple-50 border border-purple-200 text-purple-700 py-2 rounded-lg hover:bg-purple-100 transition text-sm flex items-center justify-center space-x-1">
                        <i class="fas fa-eye"></i>
                        <span>Detalhes</span>
                    </button>
                    
                    <button onclick="deleteClient(${client.id})" class="bg-red-50 border border-red-200 text-red-700 py-2 rounded-lg hover:bg-red-100 transition text-sm flex items-center justify-center space-x-1">
                        <i class="fas fa-trash"></i>
                        <span>Excluir</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// NOVA FUNÇÃO: Ver detalhes do cliente
async function viewClientDetails(clientId) {
    const client = await db.get('clients', clientId);
    const products = await db.getByIndex('products', 'clientId', clientId);
    const boxes = await db.getByIndex('boxes', 'clientId', clientId);

    const modal = document.getElementById('modal-box-details');
    document.getElementById('modal-box-title').textContent = `📋 ${client.name}`;

    const pendingProducts = products.filter(p => p.status === 'pending');
    const inBoxProducts = products.filter(p => p.status === 'in_box');
    const totalWeight = products.reduce((sum, p) => sum + parseFloat(p.weight || 0), 0);

    document.getElementById('modal-box-content').innerHTML = `
        <div class="space-y-4">
            <!-- Informações do Cliente -->
            <div class="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <p class="text-xs text-gray-500 mb-1">Nome</p>
                        <p class="font-medium text-gray-800">${client.name}</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500 mb-1">WhatsApp</p>
                        <div class="flex items-center space-x-2">
                            <p class="font-medium text-gray-800">${client.phone}</p>
                            <button onclick="copyToClipboard('${client.phone}')" class="text-primary hover:text-secondary">
                                <i class="fas fa-copy text-sm"></i>
                            </button>
                        </div>
                    </div>
                    ${client.email ? `
                        <div class="col-span-2">
                            <p class="text-xs text-gray-500 mb-1">E-mail</p>
                            <p class="font-medium text-gray-800">${client.email}</p>
                        </div>
                    ` : ''}
                    ${client.address ? `
                        <div class="col-span-2">
                            <p class="text-xs text-gray-500 mb-1">Endereço</p>
                            <p class="text-sm text-gray-700">${client.address}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <!-- Estatísticas -->
            <div class="grid grid-cols-3 gap-3">
                <div class="bg-yellow-50 rounded-lg p-3 text-center">
                    <p class="text-2xl font-bold text-yellow-600">${pendingProducts.length}</p>
                    <p class="text-xs text-yellow-700">Pendentes</p>
                </div>
                <div class="bg-blue-50 rounded-lg p-3 text-center">
                    <p class="text-2xl font-bold text-blue-600">${boxes.length}</p>
                    <p class="text-xs text-blue-700">Caixas</p>
                </div>
                <div class="bg-green-50 rounded-lg p-3 text-center">
                    <p class="text-2xl font-bold text-green-600">${totalWeight.toFixed(1)}</p>
                    <p class="text-xs text-green-700">kg Total</p>
                </div>
            </div>
            
            <!-- Produtos Pendentes -->
            ${pendingProducts.length > 0 ? `
                <div>
                    <h4 class="font-medium text-gray-800 mb-2 flex items-center">
                        <i class="fas fa-cube text-yellow-500 mr-2"></i>
                        Produtos Aguardando (${pendingProducts.length})
                    </h4>
                    <div class="space-y-2 max-h-32 overflow-y-auto">
                        ${pendingProducts.map(p => `
                            <div class="flex items-center justify-between p-2 bg-yellow-50 rounded-lg text-sm">
                                <span class="text-gray-700">${p.description}</span>
                                <span class="text-gray-500 font-medium">${p.weight}kg</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <!-- Caixas -->
            ${boxes.length > 0 ? `
                <div>
                    <h4 class="font-medium text-gray-800 mb-2 flex items-center">
                        <i class="fas fa-box text-blue-500 mr-2"></i>
                        Caixas (${boxes.length})
                    </h4>
                    <div class="space-y-2 max-h-32 overflow-y-auto">
                        ${boxes.map(box => `
                            <div class="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                                <div>
                                    <span class="font-medium text-gray-800">${box.boxNumber}</span>
                                    <span class="ml-2">${getBoxStatusBadge(box.status)}</span>
                                </div>
                                <button onclick="viewBoxDetails(${box.id}); closeBoxDetailsModal();" class="text-blue-600 hover:text-blue-800">
                                    <i class="fas fa-external-link-alt"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <!-- Ações -->
            <div class="grid grid-cols-2 gap-3 pt-2">
                <button onclick="sendWhatsApp(${clientId})" class="bg-green-500 text-white py-3 rounded-xl hover:bg-green-600 transition flex items-center justify-center space-x-2">
                    <i class="fab fa-whatsapp"></i>
                    <span>WhatsApp</span>
                </button>
                ${pendingProducts.length > 0 ? `
                    <button onclick="startAssemblyForClient(${clientId}); closeBoxDetailsModal();" class="bg-primary text-white py-3 rounded-xl hover:bg-secondary transition flex items-center justify-center space-x-2">
                        <i class="fas fa-box"></i>
                        <span>Montar Caixa</span>
                    </button>
                ` : `
                    <button onclick="openClientModal(${clientId}); closeBoxDetailsModal();" class="bg-blue-500 text-white py-3 rounded-xl hover:bg-blue-600 transition flex items-center justify-center space-x-2">
                        <i class="fas fa-edit"></i>
                        <span>Editar</span>
                    </button>
                `}
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
}

// CORRIGIR função deleteClient
async function deleteClient(clientId) {
    const client = await db.get('clients', clientId);
    const products = await db.getByIndex('products', 'clientId', clientId);
    const boxes = await db.getByIndex('boxes', 'clientId', clientId);

    const pendingProducts = products.filter(p => p.status === 'pending').length;
    const activeBoxes = boxes.filter(b => b.status !== 'delivered').length;

    let warningMsg = `⚠️ Excluir cliente "${client.name}"?\n\n`;

    if (pendingProducts > 0) {
        warningMsg += `• ${pendingProducts} produto(s) pendente(s) serão excluídos\n`;
    }
    if (activeBoxes > 0) {
        warningMsg += `• ${activeBoxes} caixa(s) ativa(s) serão excluídas\n`;
    }
    warningMsg += `\n Esta ação não pode ser desfeita!`;

    if (!confirm(warningMsg)) return;

    // Confirmação dupla se houver muitos itens
    if (pendingProducts > 5 || activeBoxes > 3) {
        if (!confirm(`Tem certeza? Digite "CONFIRMAR" para prosseguir:`)) {
            return;
        }
    }

    try {
        // Excluir produtos
        for (const product of products) {
            await db.delete('products', product.id);
        }

        // Excluir caixas
        for (const box of boxes) {
            await db.delete('boxes', box.id);
        }

        // Excluir cliente
        await db.delete('clients', clientId);

        showToast('Cliente excluído com sucesso!', 'success');
        loadClients();
        loadProducts();
        loadBoxes();
        updateStats();
        loadPendingClientsList();

    } catch (error) {
        showToast('Erro ao excluir: ' + error.message, 'error');
    }
}

// CORRIGIR loadProducts com botão de editar
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
                        ${product.tracking ? `
                            <p class="text-xs text-gray-500 flex items-center mt-1">
                                <i class="fas fa-barcode mr-1"></i>
                                ${product.tracking}
                                <button onclick="copyToClipboard('${product.tracking}')" class="ml-2 text-primary hover:text-secondary">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </p>
                        ` : ''}
                        ${product.notes ? `<p class="text-xs text-gray-500 italic mt-1">${product.notes}</p>` : ''}
                    </div>
                </td>
                <td class="px-4 py-3">
                    <div>
                        <p class="text-sm font-medium text-gray-800">${client?.name || 'N/A'}</p>
                        <p class="text-xs text-gray-500">${client?.phone || ''}</p>
                    </div>
                </td>
                <td class="px-4 py-3 text-sm font-medium text-gray-700">${product.weight} kg</td>
                <td class="px-4 py-3 text-sm text-gray-500">${formatDateShort(product.receivedAt)}</td>
                <td class="px-4 py-3">
                    <div class="flex flex-col space-y-1">
                        ${getProductStatusBadge(product.status)}
                        ${box ? `<span class="text-xs text-gray-500">${box.boxNumber}</span>` : ''}
                    </div>
                </td>
                <td class="px-4 py-3">
                    <div class="flex space-x-1">
                        ${product.status === 'pending' ? `
                            <button onclick="editProduct(${product.id})" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="deleteProduct(${product.id})" class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Excluir">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : `
                            <button onclick="viewProductDetails(${product.id})" class="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition" title="Ver detalhes">
                                <i class="fas fa-eye"></i>
                            </button>
                        `}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// NOVA FUNÇÃO: Editar produto
async function editProduct(productId) {
    const product = await db.get('products', productId);

    showTab('receive');

    // Aguardar DOM carregar
    setTimeout(() => {
        document.getElementById('receive-client').value = product.clientId;
        document.getElementById('receive-description').value = product.description;
        document.getElementById('receive-weight').value = product.weight;
        document.getElementById('receive-tracking').value = product.tracking || '';
        document.getElementById('receive-notes').value = product.notes || '';
        document.getElementById('receive-quantity').value = 1;

        // Alterar comportamento do formulário
        const form = document.getElementById('form-receive');
        form.onsubmit = async (e) => {
            e.preventDefault();

            product.description = document.getElementById('receive-description').value.trim();
            product.weight = parseFloat(document.getElementById('receive-weight').value);
            product.tracking = document.getElementById('receive-tracking').value.trim();
            product.notes = document.getElementById('receive-notes').value.trim();

            await db.update('products', product);
            showToast('Produto atualizado!', 'success');

            // Restaurar comportamento original
            form.onsubmit = receiveProduct;
            form.reset();

            loadProducts();
            showTab('products');
        };

        showToast('Editando produto...', 'info');
    }, 300);
}

// NOVA FUNÇÃO: Ver detalhes do produto
async function viewProductDetails(productId) {
    const product = await db.get('products', productId);
    const client = await db.get('clients', product.clientId);
    const box = product.boxId ? await db.get('boxes', product.boxId) : null;

    const modal = document.getElementById('modal-box-details');
    document.getElementById('modal-box-title').textContent = '📦 Detalhes do Produto';

    document.getElementById('modal-box-content').innerHTML = `
        <div class="space-y-4">
            <div class="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
                <h3 class="font-bold text-lg text-gray-800 mb-2">${product.description}</h3>
                <div class="grid grid-cols-2 gap-3 text-sm">
                    <div>
                        <p class="text-gray-500">Peso</p>
                        <p class="font-medium text-gray-800">${product.weight} kg</p>
                    </div>
                    <div>
                        <p class="text-gray-500">Status</p>
                        <div class="mt-1">${getProductStatusBadge(product.status)}</div>
                    </div>
                    <div>
                        <p class="text-gray-500">Recebido em</p>
                        <p class="font-medium text-gray-800">${formatDate(product.receivedAt)}</p>
                    </div>
                    ${product.tracking ? `
                        <div class="col-span-2">
                            <p class="text-gray-500">Rastreio</p>
                            <div class="flex items-center space-x-2">
                                <p class="font-mono text-sm text-gray-800">${product.tracking}</p>
                                <button onclick="copyToClipboard('${product.tracking}')" class="text-primary hover:text-secondary">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="bg-gray-50 rounded-xl p-4">
                <h4 class="font-medium text-gray-800 mb-2">Cliente</h4>
                <p class="font-medium">${client?.name || 'N/A'}</p>
                <p class="text-sm text-gray-600">${client?.phone || ''}</p>
            </div>
            
            ${box ? `
                <div class="bg-purple-50 rounded-xl p-4">
                    <h4 class="font-medium text-gray-800 mb-2">Caixa</h4>
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="font-medium">${box.boxNumber}</p>
                            ${getBoxStatusBadge(box.status)}
                        </div>
                        <button onclick="viewBoxDetails(${box.id}); closeBoxDetailsModal();" class="text-purple-600 hover:text-purple-800">
                            <i class="fas fa-external-link-alt"></i>
                        </button>
                    </div>
                </div>
            ` : ''}
            
            ${product.notes ? `
                <div class="bg-yellow-50 rounded-xl p-4">
                    <h4 class="font-medium text-gray-800 mb-2">Observações</h4>
                    <p class="text-sm text-gray-700">${product.notes}</p>
                </div>
            ` : ''}
            
            <button onclick="closeBoxDetailsModal()" class="w-full bg-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-300 transition">
                Fechar
            </button>
        </div>
    `;

    modal.classList.remove('hidden');
}

// CORRIGIR deleteProduct com confirmação melhorada
async function deleteProduct(productId) {
    const product = await db.get('products', productId);

    if (!confirm(`⚠️ Excluir produto?\n\n"${product.description}"\nPeso: ${product.weight}kg\n\nEsta ação não pode ser desfeita!`)) {
        return;
    }

    try {
        await db.delete('products', productId);
        showToast('Produto excluído!', 'success');
        loadProducts();
        updateStats();
        loadPendingClientsList();
    } catch (error) {
        showToast('Erro ao excluir: ' + error.message, 'error');
    }
}