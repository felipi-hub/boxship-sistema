// whatsapp.js - Serviço de WhatsApp

class WhatsAppService {
    constructor() {
        this.settings = null;
    }

    loadSettings() {
        this.settings = db.getSettings();
    }

    formatPhone(phone) {
        let cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 11 || cleaned.length === 10) {
            cleaned = '55' + cleaned;
        }
        return cleaned;
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
            template = template.replace(new RegExp(key, 'g'), value);
        }

        return template;
    }

    openWhatsApp(phone, message) {
        const formattedPhone = this.formatPhone(phone);
        const encodedMessage = encodeURIComponent(message);
        const url = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
        window.open(url, '_blank');
        return true;
    }

    // Notificar recebimento de produto
    async notifyProductReceived(client, product) {
        const message = this.generateMessage('productReceived', {
            clientName: client.name,
            productName: product.description,
            weight: product.weight
        });

        this.openWhatsApp(client.phone, message);
        await this.logNotification(client.id, 'productReceived', message);
    }

    // Notificar caixa pronta
    async notifyBoxReady(client, box, products) {
        const totalWeight = products.reduce((sum, p) => sum + parseFloat(p.weight), 0);

        const message = this.generateMessage('boxReady', {
            clientName: client.name,
            boxNumber: box.boxNumber,
            productsCount: products.length,
            weight: totalWeight.toFixed(2)
        });

        this.openWhatsApp(client.phone, message);
        await this.logNotification(client.id, 'boxReady', message);
    }

    // Notificar envio
    async notifyBoxShipped(client, box, shipmentData) {
        const trackingLinks = {
            'correios': `https://www.linkcorreios.com.br/?id=${shipmentData.tracking}`,
            'jadlog': `https://www.jadlog.com.br/siteInstitucional/tracking.jad?cte=${shipmentData.tracking}`,
            'fedex': `https://www.fedex.com/fedextrack/?trknbr=${shipmentData.tracking}`,
            'dhl': `https://www.dhl.com/br-pt/home/tracking.html?tracking-id=${shipmentData.tracking}`,
            'outro': ''
        };

        const message = this.generateMessage('boxShipped', {
            clientName: client.name,
            boxNumber: box.boxNumber,
            carrier: shipmentData.carrier,
            tracking: shipmentData.tracking,
            trackingLink: trackingLinks[shipmentData.carrier] || ''
        });

        this.openWhatsApp(client.phone, message);
        await this.logNotification(client.id, 'boxShipped', message);
    }

    // Notificar entrega
    async notifyBoxDelivered(client, box) {
        const message = this.generateMessage('boxDelivered', {
            clientName: client.name,
            boxNumber: box.boxNumber
        });

        this.openWhatsApp(client.phone, message);
        await this.logNotification(client.id, 'boxDelivered', message);
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