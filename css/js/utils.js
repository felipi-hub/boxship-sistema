// utils.js - Funções Utilitárias

// Máscara de telefone
function maskPhone(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);

    if (value.length > 7) {
        value = value.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    } else if (value.length > 2) {
        value = value.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
    } else if (value.length > 0) {
        value = value.replace(/^(\d*)/, '($1');
    }

    input.value = value;
}

// Toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const icon = document.getElementById('toast-icon');
    const text = document.getElementById('toast-message');

    text.textContent = message;

    const icons = {
        'success': 'fa-check-circle text-green-400',
        'error': 'fa-times-circle text-red-400',
        'warning': 'fa-exclamation-circle text-yellow-400',
        'info': 'fa-info-circle text-blue-400'
    };

    icon.className = 'fas ' + (icons[type] || icons['success']);

    toast.classList.remove('translate-y-full', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');

    setTimeout(() => {
        toast.classList.add('translate-y-full', 'opacity-0');
        toast.classList.remove('translate-y-0', 'opacity-100');
    }, 3000);
}

// Formatar data
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateShort(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
}

// Gerar número de caixa
async function generateBoxNumber() {
    const boxes = await db.getAll('boxes');
    const lastNumber = boxes.reduce((max, box) => {
        const num = parseInt(box.boxNumber.replace('CX-', ''));
        return num > max ? num : max;
    }, 0);

    const newNumber = (lastNumber + 1).toString().padStart(4, '0');
    document.getElementById('box-number').value = newNumber;
    return 'CX-' + newNumber;
}

// Status das caixas
function getBoxStatusBadge(status) {
    const badges = {
        'assembling': '<span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">Em Montagem</span>',
        'ready': '<span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">Pronta p/ Envio</span>',
        'shipped': '<span class="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-medium">Enviada</span>',
        'delivered': '<span class="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-medium">Entregue</span>'
    };
    return badges[status] || status;
}

function getProductStatusBadge(status) {
    const badges = {
        'pending': '<span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">Aguardando</span>',
        'in_box': '<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">Em Caixa</span>',
        'shipped': '<span class="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">Enviado</span>'
    };
    return badges[status] || status;
}

// Exportar dados
async function exportAllData() {
    const data = await db.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `boxship-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);
    showToast('Dados exportados com sucesso!');
}

async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!confirm('Isso irá substituir todos os dados atuais. Continuar?')) return;

        await db.importAll(data);
        location.reload();
    } catch (error) {
        showToast('Erro ao importar: ' + error.message, 'error');
    }
    event.target.value = '';
}