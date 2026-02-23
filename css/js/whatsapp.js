// whatsapp.js - Serviço de WhatsApp CORRIGIDO

class WhatsAppService {
    constructor() {
        this.settings = null;
    }

    loadSettings() {
        this.settings = db.getSettings();
    }

    // Formatar telefone com suporte internacional
    formatPhone(phone) {
        let cleaned = phone.replace(/\D/g, '');

        // Se já tem código do país (mais de 11 dígitos), usar como está
        if (cleaned.length > 11) {
            return cleaned;
        }

        // Se tem 11 ou 10 dígitos, adicionar código do Brasil (55)
        if (cleaned.length === 11 || cleaned.length === 10) {
            return '55' + cleaned;
        }

        // Retornar como está se não se encaixar nos padrões
        return cleaned;
    }

    // Detectar se é mobile
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // Abrir WhatsApp com suporte para mobile e desktop
    openWhatsApp(phone, message) {
        const formattedPhone = this.formatPhone(phone);
        const encodedMessage = encodeURIComponent(message);

        // Para mobile, usar api.whatsapp.com (funciona melhor)
        // Para desktop, usar web.whatsapp.com
        const baseUrl = this.isMobile()
            ? 'https://api.whatsapp.com/send'
            : 'https://web.whatsapp.com/send';

        const url = `${baseUrl}?phone=${formattedPhone}&text=${encodedMessage}`;

        // Abrir em nova janela
        const newWindow = window.open(url, '_blank');

        // Fallback se o popup foi bloqueado
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
            // Tentar abrir no mesmo tab
            window.location.href = url;
        }

        return true;
    }

    // Validar número de telefone
    isValidPhone(phone) {
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length >= 10 && cleaned.length <= 15;
    }

    generateMessage(templateKey, data) {
        this.loadSettings();
        let template = this.settings.templates[templateKey] || '';

        const replacements = {
            '{cliente}': data.clientName || '',
            '{produto}': data.productName || '',
            '{peso}': data.weight || '',
            '{caixa}': data.boxNumber || '',
            '{qtd_produtos}': data.productsCount || '',
            '{transportadora}': data.carrier || '',
            '{rastreio}': data.tracking || '',
            '{link_rastreio}': data.trackingLink || '',
            '{empresa}': this.settings.companyName || '',
            '{data}': new Date().toLocaleDateString('pt-BR')
        };

        for (const [key, value] of Object.entries(replacements)) {
            template = template.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
        }

        return template;
    }

    // Notificar recebimento de produto
    async notifyProductReceived(client, product) {
        if (!this.isValidPhone(client.phone)) {
            showToast('Número de telefone inválido!', 'error');
            return false;
        }

        const message = this.generateMessage('productReceived', {
            clientName: client.name,
            productName: product.description,
            weight: product.weight
        });

        this.openWhatsApp(client.phone, message);
        await this.logNotification(client.id, 'productReceived', message);
        return true;
    }

    // Notificar caixa pronta
    async notifyBoxReady(client, box, products) {
        if (!this.isValidPhone(client.phone)) {
            showToast('Número de telefone inválido!', 'error');
            return false;
        }

        const totalWeight = products.reduce((sum, p) => sum + parseFloat(p.weight), 0);

        const message = this.generateMessage('boxReady', {
            clientName: client.name,
            boxNumber: box.boxNumber,
            productsCount: products.length,
            weight: totalWeight.toFixed(2)
        });

        this.openWhatsApp(client.phone, message);
        await this.logNotification(client.id, 'boxReady', message);
        return true;
    }

    // Notificar envio
    async notifyBoxShipped(client, box, shipmentData) {
        if (!this.isValidPhone(client.phone)) {
            showToast('Número de telefone inválido!', 'error');
            return false;
        }

        const trackingLinks = {
            'correios': `https://rastreamento.correios.com.br/app/index.php?codigo=${shipmentData.tracking}`,
            'jadlog': `https://www.jadlog.com.br/siteInstitucional/tracking.jad?cte=${shipmentData.tracking}`,
            'fedex': `https://www.fedex.com/fedextrack/?trknbr=${shipmentData.tracking}`,
            'dhl': `https://www.dhl.com/br-pt/home/tracking.html?tracking-id=${shipmentData.tracking}`,
            'ups': `https://www.ups.com/track?tracknum=${shipmentData.tracking}`,
            'outro': ''
        };

        const message = this.generateMessage('boxShipped', {
            clientName: client.name,
            boxNumber: box.boxNumber,
            carrier: this.getCarrierName(shipmentData.carrier),
            tracking: shipmentData.tracking,
            trackingLink: trackingLinks[shipmentData.carrier] || ''
        });

        this.openWhatsApp(client.phone, message);
        await this.logNotification(client.id, 'boxShipped', message);
        return true;
    }

    // Notificar entrega
    async notifyBoxDelivered(client, box) {
        if (!this.isValidPhone(client.phone)) {
            showToast('Número de telefone inválido!', 'error');
            return false;
        }

        const message = this.generateMessage('boxDelivered', {
            clientName: client.name,
            boxNumber: box.boxNumber
        });

        this.openWhatsApp(client.phone, message);
        await this.logNotification(client.id, 'boxDelivered', message);
        return true;
    }

    // Mensagem personalizada
    async sendCustomMessage(phone, message) {
        if (!this.isValidPhone(phone)) {
            showToast('Número de telefone inválido!', 'error');
            return false;
        }

        this.openWhatsApp(phone, message);
        return true;
    }

    getCarrierName(carrier) {
        const names = {
            'correios': 'Correios',
            'jadlog': 'Jadlog',
            'fedex': 'FedEx',
            'dhl': 'DHL',
            'ups': 'UPS',
            'outro': 'Transportadora'
        };
        return names[carrier] || carrier;
    }

    async logNotification(clientId, type, message) {
        await db.add('notifications', {
            clientId,
            type,
            message,
            date: new Date().toISOString()
        });
    }
}

const whatsapp = new WhatsAppService();