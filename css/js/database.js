// database.js - Sistema de Banco de Dados Local (IndexedDB)

class Database {
    constructor() {
        this.dbName = 'BoxShipDB';
        this.dbVersion = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Clientes
                if (!db.objectStoreNames.contains('clients')) {
                    const store = db.createObjectStore('clients', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('phone', 'phone', { unique: true });
                    store.createIndex('name', 'name', { unique: false });
                }

                // Produtos recebidos
                if (!db.objectStoreNames.contains('products')) {
                    const store = db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('clientId', 'clientId', { unique: false });
                    store.createIndex('status', 'status', { unique: false });
                    store.createIndex('boxId', 'boxId', { unique: false });
                }

                // Caixas
                if (!db.objectStoreNames.contains('boxes')) {
                    const store = db.createObjectStore('boxes', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('clientId', 'clientId', { unique: false });
                    store.createIndex('status', 'status', { unique: false });
                    store.createIndex('boxNumber', 'boxNumber', { unique: true });
                }

                // Histórico de notificações
                if (!db.objectStoreNames.contains('notifications')) {
                    const store = db.createObjectStore('notifications', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('clientId', 'clientId', { unique: false });
                    store.createIndex('date', 'date', { unique: false });
                }
            };
        });
    }

    // CRUD genérico
    async add(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            data.createdAt = new Date().toISOString();
            data.updatedAt = new Date().toISOString();
            const request = store.add(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async update(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            data.updatedAt = new Date().toISOString();
            const request = store.put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async get(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async clear(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Configurações (LocalStorage)
    getSettings() {
        const defaults = {
            companyName: 'Minha Empresa',
            companyPhone: '',
            maxWeight: 25,
            templates: {
                productReceived: `✅ *Produto Recebido!*

Olá, {cliente}!

Recebemos seu produto:
📦 {produto}
⚖️ Peso: {peso}kg

Assim que sua caixa estiver pronta para envio, você será notificado.

Obrigado! 😊
_{empresa}_`,

                boxReady: `📦 *Sua Caixa Está Pronta!*

Olá, {cliente}!

Sua caixa *{caixa}* está pronta para envio!

📊 *Detalhes:*
• Produtos: {qtd_produtos} item(s)
• Peso total: {peso}kg

Aguardando confirmação para envio.

_{empresa}_`,

                boxShipped: `🚚 *Caixa Enviada!*

Olá, {cliente}!

Sua caixa *{caixa}* foi enviada!

📦 *Informações do Envio:*
• Transportadora: {transportadora}
• Rastreio: {rastreio}

🔗 Rastreie: {link_rastreio}

_{empresa}_`,

                boxDelivered: `✅ *Entrega Confirmada!*

Olá, {cliente}!

Sua caixa *{caixa}* foi entregue com sucesso!

Obrigado pela preferência! 💚

_{empresa}_`
            }
        };

        const saved = localStorage.getItem('boxship_settings');
        return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    }

    saveSettings(settings) {
        localStorage.setItem('boxship_settings', JSON.stringify(settings));
    }

    // Export/Import
    async exportAll() {
        const data = {
            exportDate: new Date().toISOString(),
            version: this.dbVersion,
            clients: await this.getAll('clients'),
            products: await this.getAll('products'),
            boxes: await this.getAll('boxes'),
            notifications: await this.getAll('notifications'),
            settings: this.getSettings()
        };
        return data;
    }

    async importAll(data) {
        if (data.clients) {
            await this.clear('clients');
            for (const item of data.clients) await this.add('clients', item);
        }
        if (data.products) {
            await this.clear('products');
            for (const item of data.products) await this.add('products', item);
        }
        if (data.boxes) {
            await this.clear('boxes');
            for (const item of data.boxes) await this.add('boxes', item);
        }
        if (data.settings) {
            this.saveSettings(data.settings);
        }
    }
}

const db = new Database();