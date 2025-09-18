class RemitPayApp {
    constructor() {
        this.currentQuote = null;
        this.currentTransaction = null;
        this.transactions = JSON.parse(localStorage.getItem('remitpay_transactions') || '[]');
        this.verificationInterval = null;
        this.user = null;
        this.token = localStorage.getItem('remitpay_token');
        
        // Verificar autenticación primero
        this.checkAuthentication().then(() => {
            this.initializeElements();
            this.attachEventListeners();
            this.loadTransactionHistory();
            this.updateUserDisplay();
        });
    }

    initializeElements() {
        // Form elements
        this.form = document.getElementById('remittanceForm');
        this.getQuoteBtn = document.getElementById('getQuoteBtn');
        this.sendBtn = document.getElementById('sendBtn');
        
        // Panels
        this.quotePanel = document.getElementById('quotePanel');
        this.statusPanel = document.getElementById('statusPanel');
        this.quoteDetails = document.getElementById('quoteDetails');
        this.statusDetails = document.getElementById('statusDetails');
        
        // Quote actions
        this.confirmQuoteBtn = document.getElementById('confirmQuoteBtn');
        this.cancelQuoteBtn = document.getElementById('cancelQuoteBtn');
        
        // Interactive grant elements
        this.interactiveGrant = document.getElementById('interactiveGrant');
        this.authLink = document.getElementById('authLink');
        this.authCompleteBtn = document.getElementById('authCompleteBtn');
        
        // History
        this.transactionHistory = document.getElementById('transactionHistory');
    }

    attachEventListeners() {
        this.getQuoteBtn.addEventListener('click', () => this.getQuote());
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.confirmQuoteBtn.addEventListener('click', () => this.confirmQuote());
        this.cancelQuoteBtn.addEventListener('click', () => this.cancelQuote());
        this.authCompleteBtn.addEventListener('click', () => this.completeAuthorization());
        
        // Validación en tiempo real
        const inputs = this.form.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('input', () => this.validateForm());
        });

        // Transformación automática de wallet addresses
        const walletInputs = ['senderWallet', 'receiverWallet'];
        walletInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                // Transformar al perder el foco
                input.addEventListener('blur', () => {
                    const transformed = this.transformWalletAddress(input.value);
                    if (transformed !== input.value) {
                        input.value = transformed;
                        this.showAlert(`✅ Wallet address transformada automáticamente`, 'info');
                    }
                    
                    // Detectar moneda automáticamente
                    if (inputId === 'senderWallet') {
                        this.updateCurrencyFromWallet('senderWallet', 'currency');
                    } else if (inputId === 'receiverWallet') {
                        this.updateCurrencyFromWallet('receiverWallet', 'currency');
                    }
                    
                    this.validateForm();
                });

                // También transformar al presionar Enter
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        const transformed = this.transformWalletAddress(input.value);
                        if (transformed !== input.value) {
                            input.value = transformed;
                        }
                        
                        // Detectar moneda automáticamente
                        if (inputId === 'senderWallet') {
                            this.updateCurrencyFromWallet('senderWallet', 'currency');
                        } else if (inputId === 'receiverWallet') {
                            this.updateCurrencyFromWallet('receiverWallet', 'currency');
                        }
                        
                        this.validateForm();
                    }
                });
            }
        });

        this.validateForm();
    }

    async checkAuthentication() {
        if (!this.token) {
            window.location.href = '/login';
            return;
        }

        try {
            const response = await fetch('/api/auth/profile', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.user = data.user;
            } else {
                localStorage.removeItem('remitpay_token');
                localStorage.removeItem('remitpay_user');
                window.location.href = '/login';
            }
        } catch (error) {
            console.error('Error verificando autenticación:', error);
            window.location.href = '/login';
        }
    }

    updateUserDisplay() {
        if (!this.user) return;

        // Actualizar elementos de la UI con información del usuario
        const dashboardTitle = document.querySelector('.dashboard-title');
        if (dashboardTitle) {
            dashboardTitle.innerHTML = `
                <i class="fas fa-tachometer-alt"></i>
                Bienvenido, ${this.user.firstName}
            `;
        }

        // Si el usuario tiene una wallet configurada, pre-llenar el campo
        const walletInput = document.getElementById('senderWallet');
        if (walletInput && this.user.walletAddress) {
            walletInput.value = this.user.walletAddress;
        }
    }

    validateForm() {
        const formData = new FormData(this.form);
        let senderWallet = formData.get('senderWallet');
        let receiverWallet = formData.get('receiverWallet');
        const amount = formData.get('amount');
        const currency = formData.get('currency');

        // Transformar wallet addresses automáticamente
        senderWallet = this.transformWalletAddress(senderWallet);
        receiverWallet = this.transformWalletAddress(receiverWallet);

        // Actualizar los campos si fueron transformados
        if (senderWallet !== formData.get('senderWallet')) {
            document.getElementById('senderWallet').value = senderWallet;
        }
        if (receiverWallet !== formData.get('receiverWallet')) {
            document.getElementById('receiverWallet').value = receiverWallet;
        }

        // Detectar moneda automáticamente basada en las wallet addresses
        // Priorizar la wallet del receptor si está disponible, sino usar la del remitente
        let detectedCurrency = null;
        if (receiverWallet) {
            detectedCurrency = this.detectCurrencyFromWallet(receiverWallet);
        } else if (senderWallet) {
            detectedCurrency = this.detectCurrencyFromWallet(senderWallet);
        }

        // Actualizar la moneda si se detectó una diferente
        if (detectedCurrency && currency !== detectedCurrency) {
            const currencySelect = document.getElementById('currency');
            const option = currencySelect.querySelector(`option[value="${detectedCurrency}"]`);
            if (option && currencySelect.value !== detectedCurrency) {
                currencySelect.value = detectedCurrency;
                // Solo mostrar alerta si hay contenido significativo en las wallets
                if ((senderWallet && senderWallet.length > 5) || (receiverWallet && receiverWallet.length > 5)) {
                    this.showAlert(`💰 Moneda detectada: ${detectedCurrency}`, 'info');
                }
            }
        }

        const isValid = senderWallet && receiverWallet && amount && currency;
        this.getQuoteBtn.disabled = !isValid;
        
        return isValid;
    }

    transformWalletAddress(address) {
        if (!address || typeof address !== 'string') {
            return address;
        }

        // Limpiar espacios en blanco
        address = address.trim();
        
        // Si está vacío después del trim, devolver vacío
        if (!address) {
            return address;
        }

        // Si empieza con $, transformar a https://
       if (address.startsWith('$')) {
            address = address.substring(1); // Remover el $
            // Solo agregar https:// si no tiene protocolo y parece un dominio válido
            if (!address.startsWith('http://') && !address.startsWith('https://') && address.includes('.')) {
                address = 'https://' + address;
            }
        }
        // Si no tiene protocolo pero parece un dominio, agregar https://
        else if (!address.startsWith('http://') && !address.startsWith('https://') && address.includes('.')) {
            // Verificar que no sea solo un número decimal
            if (!/^\d+\.\d+$/.test(address)) {
                address = 'https://' + address;
            }
        }
        // Si tiene http://, sugerir https://
        else if (address.startsWith('http://')) {
            address = address.replace('http://', 'https://');
        }

        return address;
    }

    detectCurrencyFromWallet(walletAddress) {
        if (!walletAddress || typeof walletAddress !== 'string') {
            return null;
        }

        const address = walletAddress.toLowerCase();
        
        // Patrones para detectar monedas basados en dominios y rutas comunes
        const currencyPatterns = {
            'USD': [
                'usd', 'dollar', 'dollars', 'united-states', 'usa', 'us-',
                'interledger-test.dev', // Dominio de prueba por defecto en USD
                'rafiki.money'
            ],
            'EUR': [
                'eur', 'euro', 'euros', 'europe', 'eu-', 'europa',
                'ecb.europa.eu', 'european'
            ],
            'MXN': [
                'mxn', 'peso', 'pesos', 'mexico', 'mx-', 'mexican',
                'banxico.org.mx', 'bancomer'
            ],
            'COP': [
                'cop', 'colombia', 'co-', 'colombian', 'peso-colombiano',
                'banrep.gov.co', 'bancolombia'
            ],
            'ARS': [
                'ars', 'argentina', 'ar-', 'argentinian', 'peso-argentino',
                'bcra.gob.ar', 'santander.com.ar'
            ],
            'BRL': [
                'brl', 'real', 'reais', 'brazil', 'brasil', 'br-', 'brazilian',
                'bcb.gov.br', 'itau.com.br', 'bradesco.com.br'
            ],
            'PEN': [
                'pen', 'sol', 'soles', 'peru', 'pe-', 'peruvian',
                'bcrp.gob.pe', 'bcp.com.pe'
            ]
        };

        // Buscar patrones en la wallet address
        for (const [currency, patterns] of Object.entries(currencyPatterns)) {
            for (const pattern of patterns) {
                if (address.includes(pattern)) {
                    return currency;
                }
            }
        }

        // Si no encuentra patrones específicos, por defecto USD
        return 'USD';
    }

    updateCurrencyFromWallet(inputId, currencySelectId) {
        const walletInput = document.getElementById(inputId);
        const currencySelect = document.getElementById(currencySelectId);
        
        if (!walletInput || !currencySelect) return;

        const walletAddress = walletInput.value;
        const detectedCurrency = this.detectCurrencyFromWallet(walletAddress);
        
        if (detectedCurrency && currencySelect.value !== detectedCurrency) {
            // Verificar que la moneda detectada esté disponible en el select
            const option = currencySelect.querySelector(`option[value="${detectedCurrency}"]`);
            if (option) {
                currencySelect.value = detectedCurrency;
                this.showAlert(`💰 Moneda detectada automáticamente: ${detectedCurrency}`, 'info');
                return true; // Indica que se cambió la moneda
            }
        }
        
        return false;
    }

    async getQuote() {
        if (!this.validateForm()) {
            this.showAlert('Por favor, completa todos los campos requeridos.', 'error');
            return;
        }

        const formData = new FormData(this.form);
        const quoteData = {
            senderWallet: formData.get('senderWallet'),
            receiverWallet: formData.get('receiverWallet'),
            amount: formData.get('amount'),
            currency: formData.get('currency'),
            description: formData.get('description')
        };

        try {
            this.setLoading(this.getQuoteBtn, true);
            
            const response = await fetch('/api/remittance/quote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(quoteData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Error al obtener cotización');
            }

            this.currentQuote = result;
            this.displayQuote(result);
            this.showQuotePanel();
            
            // Mensaje adicional para claridad
            setTimeout(() => {
                this.showAlert('💡 Puedes revisar la cotización y hacer clic en "Enviar Remesa" cuando estés listo.', 'info');
            }, 1000);

        } catch (error) {
            console.error('Error getting quote:', error);
            this.showAlert(`Error al obtener cotización: ${error.message}`, 'error');
        } finally {
            this.setLoading(this.getQuoteBtn, false);
        }
    }

    displayQuote(quote) {
        const { debitAmount, receiveAmount, exchangeRate, fees } = quote;
        
        this.quoteDetails.innerHTML = `
            <div class="quote-item">
                <span>Monto a enviar:</span>
                <span><strong>${debitAmount.value} ${debitAmount.assetCode}</strong></span>
            </div>
            <div class="quote-item">
                <span>Monto a recibir:</span>
                <span><strong>${receiveAmount.value} ${receiveAmount.assetCode}</strong></span>
            </div>
            <div class="quote-item">
                <span>Tipo de cambio:</span>
                <span>1 ${debitAmount.assetCode} = ${exchangeRate} ${receiveAmount.assetCode}</span>
            </div>
            <div class="quote-item">
                <span>Comisiones:</span>
                <span>${fees} ${debitAmount.assetCode}</span>
            </div>
            <div class="quote-item">
                <span><strong>Total a pagar:</strong></span>
                <span><strong>${(parseFloat(debitAmount.value) + parseFloat(fees)).toFixed(2)} ${debitAmount.assetCode}</strong></span>
            </div>
        `;
    }

    showQuotePanel() {
        this.quotePanel.style.display = 'block';
        this.quotePanel.scrollIntoView({ behavior: 'smooth' });
        this.sendBtn.disabled = false; // Habilitar directamente el botón de enviar
        this.showAlert('Cotización obtenida. Puedes proceder a enviar la remesa.', 'success');
    }

    hideQuotePanel() {
        this.quotePanel.style.display = 'none';
        this.sendBtn.disabled = true;
        this.currentQuote = null;
    }

    // Las funciones confirmQuote y cancelQuote ya no son necesarias
    // pero las mantenemos para compatibilidad
    confirmQuote() {
        // Ya no hace nada especial, solo log
        console.log('Quote already confirmed automatically');
    }

    cancelQuote() {
        this.hideQuotePanel();
        this.showAlert('Cotización cancelada.', 'info');
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        if (!this.currentQuote) {
            this.showAlert('Primero debes obtener una cotización.', 'warning');
            this.getQuoteBtn.focus(); // Dirigir la atención al botón de cotización
            return;
        }

        // Verificar que la cotización no haya expirado
        if (new Date(this.currentQuote.expiresAt) < new Date()) {
            this.showAlert('La cotización ha expirado. Obtén una nueva cotización.', 'warning');
            this.hideQuotePanel();
            return;
        }

        try {
            this.setLoading(this.sendBtn, true);
            this.showStatusPanel();

            const response = await fetch('/api/remittance/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    quote: this.currentQuote,
                    description: new FormData(this.form).get('description')
                })
            });

            const result = await response.json();
            
            console.log('Response from server:', result);

            if (!response.ok) {
                throw new Error(result.error || 'Error al enviar remesa');
            }

            this.currentTransaction = result;
            this.updateTransactionStatus(result);

            // SIEMPRE redirigir a autorización de Interledger
            console.log('Checking authorization:', {
                requiresAuthorization: result.requiresAuthorization,
                authorizationUrl: result.authorizationUrl
            });
            
            if (result.requiresAuthorization && result.authorizationUrl) {
                this.showAlert('✅ Abriendo ventana de autorización de Interledger...', 'info');
                
                console.log('Opening authorization window immediately:', result.authorizationUrl);
                
                // Redirección INMEDIATA
                try {
                    const authWindow = window.open(result.authorizationUrl, '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes,location=yes');
                    
                    if (authWindow) {
                        this.showInteractiveGrant(result.authorizationUrl);
                        this.showAlert('✅ Ventana de autorización abierta. Completa el proceso en Interledger.', 'success');
                    } else {
                        // Si la ventana fue bloqueada
                        this.showAlert('⚠️ La ventana emergente fue bloqueada. Haz clic en el enlace para autorizar:', 'warning');
                        this.showInteractiveGrant(result.authorizationUrl);
                    }
                } catch (error) {
                    console.error('Error opening window:', error);
                    this.showAlert('Error al abrir ventana. Usa el enlace manual:', 'error');
                    this.showInteractiveGrant(result.authorizationUrl);
                }
            } else {
                console.error('Authorization failed:', result);
                this.showAlert('Error: No se pudo obtener la URL de autorización', 'error');
                this.hideStatusPanel();
            }

        } catch (error) {
            console.error('Error sending remittance:', error);
            this.showAlert(`Error al enviar remesa: ${error.message}`, 'error');
            this.hideStatusPanel();
        } finally {
            this.setLoading(this.sendBtn, false);
        }
    }

    showStatusPanel() {
        this.statusPanel.style.display = 'block';
        this.statusPanel.scrollIntoView({ behavior: 'smooth' });
    }

    hideStatusPanel() {
        this.statusPanel.style.display = 'none';
        this.interactiveGrant.style.display = 'none';
    }

    updateTransactionStatus(transaction) {
        const { id, status, debitAmount, receiveAmount } = transaction;
        
        this.statusDetails.innerHTML = `
            <div class="status-item">
                <span>ID de Transacción:</span>
                <span><code>${id}</code></span>
            </div>
            <div class="status-item">
                <span>Estado:</span>
                <span class="status-badge status-${status.toLowerCase()}">${this.getStatusText(status)}</span>
            </div>
            <div class="status-item">
                <span>Monto enviado:</span>
                <span><strong>${debitAmount.value} ${debitAmount.assetCode}</strong></span>
            </div>
            <div class="status-item">
                <span>Monto a recibir:</span>
                <span><strong>${receiveAmount.value} ${receiveAmount.assetCode}</strong></span>
            </div>
            <div class="status-item">
                <span>Fecha:</span>
                <span>${new Date().toLocaleString('es-ES')}</span>
            </div>
        `;
    }

    showInteractiveGrant(authUrl) {
        this.authLink.href = authUrl;
        this.interactiveGrant.style.display = 'block';
        
        // Agregar evento click al enlace de autorización para tracking
        this.authLink.onclick = (e) => {
            e.preventDefault();
            window.open(authUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
            this.showAlert('Ventana de autorización abierta. Completa el proceso y regresa aquí.', 'info');
        };
    }

    showInteractiveGrant(authUrl) {
        this.authLink.href = authUrl;
        this.interactiveGrant.style.display = 'block';
        
        // Iniciar verificación automática cada 5 segundos
        this.startAutoVerification();
    }

    startAutoVerification() {
        if (this.verificationInterval) {
            clearInterval(this.verificationInterval);
        }

        let attemptCount = 0;
        const maxAttempts = 24; // 2 minutos máximo (24 * 5 segundos)

        this.verificationInterval = setInterval(async () => {
            attemptCount++;
            
            if (attemptCount > maxAttempts) {
                clearInterval(this.verificationInterval);
                this.showAlert('Tiempo de espera agotado. Por favor, verifica manualmente el estado del pago.', 'warning');
                return;
            }

            try {
                const response = await fetch(`/api/remittance/check-and-complete/${this.currentTransaction.id}`, {
                    method: 'POST'
                });

                const result = await response.json();

                if (response.ok && result.status === 'COMPLETED') {
                    clearInterval(this.verificationInterval);
                    this.currentTransaction = result;
                    this.updateTransactionStatus(result);
                    this.interactiveGrant.style.display = 'none';
                    
                    if (result.autoCompleted) {
                        this.showAlert('¡Pago autorizado y completado automáticamente! 🎉', 'success');
                    } else {
                        this.showAlert('¡Pago completado exitosamente! 🎉', 'success');
                    }
                    
                    this.completeTransaction();
                }
            } catch (error) {
                console.error('Error during auto-verification:', error);
                // Continuar intentando en caso de error temporal
            }
        }, 5000); // Verificar cada 5 segundos
    }

    async completeAuthorization() {
        if (!this.currentTransaction) return;

        try {
            this.setLoading(this.authCompleteBtn, true);

            const response = await fetch(`/api/remittance/complete/${this.currentTransaction.id}`, {
                method: 'POST'
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Error al completar autorización');
            }

            this.currentTransaction = result;
            this.updateTransactionStatus(result);
            this.interactiveGrant.style.display = 'none';

            // Detener verificación automática
            if (this.verificationInterval) {
                clearInterval(this.verificationInterval);
            }

            if (result.status === 'COMPLETED') {
                this.showAlert('¡Pago completado exitosamente! 🎉', 'success');
                this.completeTransaction();
            }

        } catch (error) {
            console.error('Error completing authorization:', error);
            this.showAlert(`Error al completar autorización: ${error.message}`, 'error');
        } finally {
            this.setLoading(this.authCompleteBtn, false);
        }
    }

    completeTransaction() {
        if (!this.currentTransaction) return;

        // Limpiar verificación automática
        if (this.verificationInterval) {
            clearInterval(this.verificationInterval);
            this.verificationInterval = null;
        }

        // Agregar a historial
        this.addToHistory(this.currentTransaction);
        
        // Limpiar formulario
        this.form.reset();
        this.hideQuotePanel();
        
        // Mostrar éxito
        this.showAlert('¡Remesa enviada exitosamente! Los fondos han sido transferidos. 💰✅', 'success');
        
        // Actualizar historial
        this.loadTransactionHistory();
        
        // Limpiar estado
        this.currentQuote = null;
        this.currentTransaction = null;
        
        setTimeout(() => {
            this.hideStatusPanel();
        }, 10000); // Mostrar estado por más tiempo para confirmar el éxito
    }

    addToHistory(transaction) {
        this.transactions.unshift({
            ...transaction,
            timestamp: new Date().toISOString()
        });
        
        // Mantener solo las últimas 50 transacciones
        if (this.transactions.length > 50) {
            this.transactions = this.transactions.slice(0, 50);
        }
        
        localStorage.setItem('remitpay_transactions', JSON.stringify(this.transactions));
    }

    loadTransactionHistory() {
        if (this.transactions.length === 0) {
            this.transactionHistory.innerHTML = '<p class="empty-state">No hay transacciones recientes</p>';
            return;
        }

        this.transactionHistory.innerHTML = this.transactions.map(transaction => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <h4>${transaction.description || 'Remesa'}</h4>
                    <p>ID: ${transaction.id}</p>
                    <p>${new Date(transaction.timestamp).toLocaleString('es-ES')}</p>
                </div>
                <div class="transaction-amount">
                    <div><strong>${transaction.debitAmount.value} ${transaction.debitAmount.assetCode}</strong></div>
                    <div class="status-badge status-${transaction.status.toLowerCase()}">${this.getStatusText(transaction.status)}</div>
                </div>
            </div>
        `).join('');
    }

    getStatusText(status) {
        const statusMap = {
            'PENDING': 'Pendiente',
            'PROCESSING': 'Procesando',
            'COMPLETED': 'Completado',
            'FAILED': 'Fallido',
            'CANCELLED': 'Cancelado'
        };
        return statusMap[status] || status;
    }

    setLoading(button, loading) {
        if (loading) {
            button.disabled = true;
            button.innerHTML = button.innerHTML.replace(/^/, '<span class="spinner"></span> ');
            button.classList.add('loading');
        } else {
            button.disabled = false;
            button.innerHTML = button.innerHTML.replace('<span class="spinner"></span> ', '');
            button.classList.remove('loading');
        }
    }

    showAlert(message, type = 'info') {
        // Crear elemento de alerta
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `
            <i class="fas fa-${this.getAlertIcon(type)}"></i>
            ${message}
        `;

        // Insertar al inicio del contenido principal
        const mainContent = document.querySelector('.main-content');
        mainContent.insertBefore(alert, mainContent.firstChild);

        // Eliminar después de 5 segundos
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 5000);

        // Scroll hacia la alerta
        alert.scrollIntoView({ behavior: 'smooth' });
        
        // Devolver el elemento para poder modificarlo
        return alert;
    }

    getAlertIcon(type) {
        const iconMap = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return iconMap[type] || 'info-circle';
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.remitPayApp = new RemitPayApp();
});