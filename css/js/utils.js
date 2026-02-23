// utils.js - Funções Utilitárias CORRIGIDAS

// Máscara de telefone com suporte internacional
function maskPhone(input) {
    let value = input.value.replace(/\D/g, '');

    // Detectar código do país
    if (value.startsWith('55')) {
        // Brasil: +55 (11) 99999-9999
        if (value.length > 13) value = value.slice(0, 13);

        if (value.length > 11) {
            value = value.replace(/^(\d{2})(\d{2})(\d{5})(\d{0,4})/, '+$1 ($2) $3-$4');
        } else if (value.length > 7) {
            value = value.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
        } else if (value.length > 2) {
            value = value.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
        }
    } else if (value.length > 0) {
        // Internacional: +XX XXXXXXXXXXX
        if (value.length > 15) value = value.slice(0, 15);

        // Adicionar + no início se não tiver
        if (!input.value.startsWith('+')) {
            value = '+' + value;
        }

        // Formatar: +XX XXXXXXXXXXX
        if (value.length > 3) {
            value = value.replace(/^(\+\d{1,3})(\d{0,})/, '$1 $2');
        }
    }

    input.value = value;
}

// Validar telefone
function validatePhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
}

// Toast notification MELHORADO
function showToast(message, type = 'success', duration = 3000) {
    const toast = document.getElementById('toast');
    const icon = document.getElementById('toast-icon');
    const text = document.getElementById('toast-message');

    text.textContent = message;

    const configs = {
        'success': { icon: 'fa-check-circle', color: 'text-green-400', bg: 'bg-gray-800' },
        'error': { icon: 'fa-times-circle', color: 'text-red-400', bg: 'bg-red-900' },
        'warning': { icon: 'fa-exclamation-circle', color: 'text-yellow-400', bg: 'bg-yellow-900' },
        'info': { icon: 'fa-info-circle', color: 'text-blue-400', bg: 'bg-blue-900' }
    };

    const config = configs[type] || configs['success'];

    icon.className = `fas ${config.icon} ${config.color}`;
    toast.querySelector('div').className = `${config.bg} text-white px-6 py-4 rounded-xl shadow-lg flex items-center space-x-3`;

    toast.classList.remove('translate-y-full', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');

    setTimeout(() => {
        toast.classList.add('translate-y-full', 'opacity-0');
        toast.classList.remove('translate-y-0', 'opacity-100');
    }, duration);
}

// Confirmar ação
function confirmAction(message, onConfirm, onCancel = null) {
    if (confirm(message)) {
        onConfirm();
    } else if (onCancel) {
        onCancel();
    }
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
    const boxNumberInput = document.getElementById('box-number');
    if (boxNumberInput) {
        boxNumberInput.value = newNumber;
    }
    return 'CX-' + newNumber;
}

// Status das caixas
function getBoxStatusBadge(status) {
    const badges = {
        'assembling': '<span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium"><i class="fas fa-tools mr-1"></i>Em Montagem</span>',
        'ready': '<span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium"><i class="fas fa-check-circle mr-1"></i>Pronta</span>',
        'shipped': '<span class="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-medium"><i class="fas fa-shipping-fast mr-1"></i>Enviada</span>',
        'delivered': '<span class="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-medium"><i class="fas fa-check-double mr-1"></i>Entregue</span>'
    };
    return badges[status] || status;
}

function getProductStatusBadge(status) {
    const badges = {
        'pending': '<span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium"><i class="fas fa-clock mr-1"></i>Aguardando</span>',
        'in_box': '<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium"><i class="fas fa-box mr-1"></i>Em Caixa</span>',
        'shipped': '<span class="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium"><i class="fas fa-shipping-fast mr-1"></i>Enviado</span>'
    };
    return badges[status] || status;
}

// Exportar dados
async function exportAllData() {
    try {
        const data = await db.exportAll();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `boxship-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();

        URL.revokeObjectURL(url);
        showToast('Backup criado com sucesso!', 'success');
    } catch (error) {
        showToast('Erro ao exportar: ' + error.message, 'error');
    }
}

async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!confirm('⚠️ ATENÇÃO!\n\nIsso irá substituir todos os dados atuais.\n\nDeseja continuar?')) {
            event.target.value = '';
            return;
        }

        await db.importAll(data);
        showToast('Dados importados! Recarregando...', 'success');

        setTimeout(() => {
            location.reload();
        }, 1500);

    } catch (error) {
        showToast('Erro ao importar: ' + error.message, 'error');
    }
    event.target.value = '';
}

// Copiar para área de transferência
function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
            .then(() => showToast('Copiado!', 'success', 1500))
            .catch(() => fallbackCopy(text));
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        showToast('Copiado!', 'success', 1500);
    } catch (err) {
        showToast('Erro ao copiar', 'error');
    }
    document.body.removeChild(textarea);
}

// Formatar peso
function formatWeight(weight) {
    return parseFloat(weight).toFixed(2) + ' kg';
}

// Validar campos obrigatórios
function validateRequired(formId) {
    const form = document.getElementById(formId);
    if (!form) return true;

    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.classList.add('border-red-500');
            isValid = false;
        } else {
            field.classList.remove('border-red-500');
        }
    });

    if (!isValid) {
        showToast('Preencha todos os campos obrigatórios!', 'error');
    }

    return isValid;
}

// Debounce para pesquisas
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Scroll suave
function smoothScroll(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}