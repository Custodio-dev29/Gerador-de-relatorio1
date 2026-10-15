(function () {
    const DB_NAME = 'geradorRelatoriosDB';
    const DB_VERSION = 1;
    const STORE_NAME = 'servicos';

    let dbPromise = null;

    function abrirBanco() {
        if (dbPromise) return dbPromise;
        dbPromise = new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject(new Error('IndexedDB indisponível'));
                return;
            }
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
            req.onblocked = () => reject(new Error('IndexedDB bloqueado'));
        });
        return dbPromise;
    }

    function idbGet(chave) {
        return abrirBanco().then((db) => new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const req = tx.objectStore(STORE_NAME).get(chave);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        }));
    }

    function idbSet(chave, valor) {
        return abrirBanco().then((db) => new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).put(valor, chave);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error || new Error('Transação abortada'));
        }));
    }

    function lerLocalStorage(chave) {
        try {
            const bruto = localStorage.getItem(chave);
            return bruto ? JSON.parse(bruto) : null;
        } catch (e) {
            return null;
        }
    }

    function limparLocalStorage(chave) {
        try {
            localStorage.removeItem(chave);
        } catch (e) {
            /* ignora */
        }
    }

    async function carregar(chave) {
        let valor = null;
        let idbOk = true;
        try {
            valor = await idbGet(chave);
        } catch (e) {
            idbOk = false;
            console.warn('IndexedDB indisponível, usando localStorage como reserva:', e);
        }

        const valorLocal = lerLocalStorage(chave);

        if (valor === undefined || valor === null) {
            if (valorLocal && valorLocal.length) {
                if (idbOk) {
                    try {
                        await idbSet(chave, valorLocal);
                    } catch (e) {
                        /* segue usando local */
                    }
                    limparLocalStorage(chave);
                }
                return valorLocal;
            }
            return valorLocal || [];
        }

        if (valorLocal && valorLocal.length) {
            limparLocalStorage(chave);
        }
        return valor;
    }

    async function salvar(chave, valor) {
        try {
            await idbSet(chave, valor);
            limparLocalStorage(chave);
            return true;
        } catch (e) {
            console.warn('Falha ao salvar no IndexedDB, tentando localStorage:', e);
            try {
                localStorage.setItem(chave, JSON.stringify(valor));
                return true;
            } catch (e2) {
                console.error('Falha ao salvar dados:', e2);
                alert('Não foi possível salvar os dados: o armazenamento do navegador está cheio. Exclua relatórios antigos e tente novamente.');
                return false;
            }
        }
    }

    window.RelatorioStorage = { carregar, salvar };
})();
