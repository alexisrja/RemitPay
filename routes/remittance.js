const express = require('express');
const router = express.Router();
const {
  createAuthenticatedClient,
  OpenPaymentsClientError,
  isFinalizedGrant,
} = require("@interledger/open-payments");

// Configuración temporal (luego se moverá a variables de entorno)
const CLIENT_CONFIG = {
  walletAddressUrl: process.env.WALLET_ADDRESS_URL || "https://ilp.interledger-test.dev/ange",
  privateKey: process.env.PRIVATE_KEY || "private.key",
  keyId: process.env.KEY_ID || "b794dc58-b3bb-42eb-81d5-e68ab5a023af",
};

// Almacenamiento temporal de transacciones (en producción usar base de datos)
const transactions = new Map();

// Función para crear cliente autenticado
async function createClient() {
  return await createAuthenticatedClient(CLIENT_CONFIG);
}

// Función para obtener información de wallet
async function getWalletInfo(client, walletUrl) {
  return await client.walletAddress.get({ url: walletUrl });
}

// Función para calcular tipos de cambio (simulado)
function calculateExchangeRate(fromCurrency, toCurrency) {
  // Tipos de cambio simulados (en producción usar API real)
  const rates = {
    USD: 1.0,
    EUR: 0.85,
    MXN: 17.5,
    COP: 4200,
    ARS: 800,
    BRL: 5.2,
    PEN: 3.8
  };
  
  const fromRate = rates[fromCurrency] || 1;
  const toRate = rates[toCurrency] || 1;
  
  return toRate / fromRate;
}

// POST /api/remittance/quote - Obtener cotización
router.post('/quote', async (req, res) => {
  try {
    const { senderWallet, receiverWallet, amount, currency } = req.body;

    // Validación
    if (!senderWallet || !receiverWallet || !amount || !currency) {
      return res.status(400).json({
        error: 'Faltan campos requeridos: senderWallet, receiverWallet, amount, currency'
      });
    }

    // Crear cliente autenticado
    const client = await createClient();

    // Obtener información de wallets
    const sendingWalletAddress = await getWalletInfo(client, senderWallet);
    const receivingWalletAddress = await getWalletInfo(client, receiverWallet);

    console.log('Wallet addresses obtained:', {
      sender: sendingWalletAddress.assetCode,
      receiver: receivingWalletAddress.assetCode
    });

    // Calcular tipo de cambio
    const exchangeRate = calculateExchangeRate(
      sendingWalletAddress.assetCode,
      receivingWalletAddress.assetCode
    );

    // Calcular montos
    const debitAmount = parseFloat(amount);
    const fees = debitAmount * 0.02; // 2% de comisión
    const receiveAmount = (debitAmount - fees) * exchangeRate;

    // Crear incoming payment grant
    const incomingPaymentGrant = await client.grant.request(
      { url: receivingWalletAddress.authServer },
      {
        access_token: {
          access: [
            {
              type: "incoming-payment",
              actions: ["read", "complete", "create"],
            },
          ],
        },
      }
    );

    // Crear incoming payment
    const incomingPayment = await client.incomingPayment.create(
      {
        url: receivingWalletAddress.resourceServer,
        accessToken: incomingPaymentGrant.access_token.value,
      },
      {
        walletAddress: receivingWalletAddress.id,
        incomingAmount: {
          assetCode: receivingWalletAddress.assetCode,
          assetScale: receivingWalletAddress.assetScale,
          value: Math.round(receiveAmount * Math.pow(10, receivingWalletAddress.assetScale)).toString(),
        },
      }
    );

    // Obtener quote grant
    const quoteGrant = await client.grant.request(
      { url: sendingWalletAddress.authServer },
      {
        access_token: {
          access: [
            {
              type: "quote",
              actions: ["create", "read"],
            },
          ],
        },
      }
    );

    // Crear quote
    const quote = await client.quote.create(
      {
        url: sendingWalletAddress.resourceServer,
        accessToken: quoteGrant.access_token.value,
      },
      {
        walletAddress: sendingWalletAddress.id,
        receiver: incomingPayment.id,
        method: "ilp",
      }
    );

    console.log('Quote created:', quote);

    // Respuesta de cotización
    const quoteResponse = {
      id: quote.id,
      debitAmount: {
        value: (parseFloat(quote.debitAmount.value) / Math.pow(10, quote.debitAmount.assetScale)).toFixed(2),
        assetCode: quote.debitAmount.assetCode,
        assetScale: quote.debitAmount.assetScale
      },
      receiveAmount: {
        value: (parseFloat(quote.receiveAmount.value) / Math.pow(10, quote.receiveAmount.assetScale)).toFixed(2),
        assetCode: quote.receiveAmount.assetCode,
        assetScale: quote.receiveAmount.assetScale
      },
      exchangeRate: exchangeRate.toFixed(4),
      fees: fees.toFixed(2),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutos
      // Datos internos para el procesamiento
      _internal: {
        quote,
        incomingPayment,
        sendingWalletAddress,
        receivingWalletAddress,
        incomingPaymentGrant,
        quoteGrant
      }
    };

    res.json(quoteResponse);

  } catch (error) {
    console.error('Error creating quote:', error);
    res.status(500).json({
      error: 'Error al crear cotización',
      message: error.message
    });
  }
});

// POST /api/remittance/send - Enviar remesa
router.post('/send', async (req, res) => {
  try {
    const { quote, description } = req.body;

    if (!quote || !quote._internal) {
      return res.status(400).json({
        error: 'Cotización inválida o expirada'
      });
    }

    // Verificar expiración de cotización
    if (new Date(quote.expiresAt) < new Date()) {
      return res.status(400).json({
        error: 'La cotización ha expirado'
      });
    }

    const {
      quote: ilpQuote,
      sendingWalletAddress,
      receivingWalletAddress
    } = quote._internal;

    // Crear cliente
    const client = await createClient();

    console.log('Starting outgoing payment process...');

    // Solicitar grant para outgoing payment (SIEMPRE interactivo)
    const outgoingPaymentGrant = await client.grant.request(
      { url: sendingWalletAddress.authServer },
      {
        access_token: {
          access: [
            {
              type: "outgoing-payment",
              actions: ["read", "create"],
              limits: {
                debitAmount: {
                  assetCode: ilpQuote.debitAmount.assetCode,
                  assetScale: ilpQuote.debitAmount.assetScale,
                  value: ilpQuote.debitAmount.value,
                },
              },
              identifier: sendingWalletAddress.id,
            },
          ],
        },
        interact: {
          start: ["redirect"],
        },
      }
    );

    console.log('Outgoing payment grant obtained:', outgoingPaymentGrant);
    console.log('Grant interact object:', outgoingPaymentGrant.interact);

    // Generar ID único para la transacción
    const transactionId = 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    // Guardar datos de la transacción (SIEMPRE requiere autorización)
    transactions.set(transactionId, {
      id: transactionId,
      quote,
      description: description || 'Remesa',
      status: 'PENDING',
      debitAmount: quote.debitAmount,
      receiveAmount: quote.receiveAmount,
      createdAt: new Date().toISOString(),
      requiresAuthorization: true,
      authorizationUrl: outgoingPaymentGrant.interact.redirect,
      _internal: {
        ...quote._internal,
        outgoingPaymentGrant,
        client
      }
    });

    console.log('Transaction saved:', transactionId);

    // Respuesta con datos de la transacción
    const response = {
      id: transactionId,
      status: 'PENDING',
      debitAmount: quote.debitAmount,
      receiveAmount: quote.receiveAmount,
      description: description || 'Remesa',
      requiresAuthorization: true,
      authorizationUrl: outgoingPaymentGrant.interact.redirect,
      createdAt: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    console.error('Error sending remittance:', error);
    res.status(500).json({
      error: 'Error al enviar remesa',
      message: error.message
    });
  }
});

// POST /api/remittance/complete/:transactionId - Completar autorización
router.post('/complete/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    const transaction = transactions.get(transactionId);
    if (!transaction) {
      return res.status(404).json({
        error: 'Transacción no encontrada'
      });
    }

    if (transaction.status !== 'PENDING') {
      return res.status(400).json({
        error: 'La transacción ya ha sido procesada'
      });
    }

    const { outgoingPaymentGrant, quote: ilpQuote, sendingWalletAddress } = transaction._internal;

    // Crear cliente (reutilizar si es posible)
    const client = await createClient();

    console.log('Completing grant continuation for transaction:', transactionId);

    // Continuar con el grant
    let finalizedOutgoingPaymentGrant;
    try {
      finalizedOutgoingPaymentGrant = await client.grant.continue({
        url: outgoingPaymentGrant.continue.uri,
        accessToken: outgoingPaymentGrant.continue.access_token.value,
      });
    } catch (err) {
      console.error('Grant continuation error:', err);
      
      // Actualizar estado de transacción
      transaction.status = 'FAILED';
      transaction.error = 'No se pudo completar la autorización. Verifica que hayas autorizado el pago.';
      transactions.set(transactionId, transaction);
      
      return res.status(400).json({
        error: 'No se pudo completar la autorización',
        message: 'Verifica que hayas autorizado el pago en tu wallet.'
      });
    }

    if (!isFinalizedGrant(finalizedOutgoingPaymentGrant)) {
      transaction.status = 'FAILED';
      transaction.error = 'Grant no finalizado correctamente';
      transactions.set(transactionId, transaction);
      
      return res.status(400).json({
        error: 'No se pudo finalizar la autorización'
      });
    }

    console.log('Grant finalized, creating outgoing payment...');

    // Crear outgoing payment
    const outgoingPayment = await client.outgoingPayment.create(
      {
        url: sendingWalletAddress.resourceServer,
        accessToken: finalizedOutgoingPaymentGrant.access_token.value,
      },
      {
        walletAddress: sendingWalletAddress.id,
        quoteId: ilpQuote.id,
      }
    );

    console.log('Outgoing payment created:', outgoingPayment);

    // Esperar un momento para que se procese el pago
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verificar el estado del pago
    let paymentStatus = 'PROCESSING';
    try {
      const paymentDetails = await client.outgoingPayment.get({
        url: outgoingPayment.id,
        accessToken: finalizedOutgoingPaymentGrant.access_token.value,
      });
      
      console.log('Payment details:', paymentDetails);
      
      // Determinar el estado basado en la respuesta
      if (paymentDetails.receiveAmount && paymentDetails.debitAmount) {
        if (paymentDetails.receiveAmount.value === ilpQuote.receiveAmount.value || 
            paymentDetails.debitAmount.value === ilpQuote.debitAmount.value) {
          paymentStatus = 'COMPLETED';
        }
      }
    } catch (error) {
      console.log('Could not verify payment status, assuming completed:', error.message);
      paymentStatus = 'COMPLETED'; // Asumir completado si no se puede verificar
    }

    // Actualizar transacción
    transaction.status = paymentStatus;
    transaction.requiresAuthorization = false;
    transaction.outgoingPaymentId = outgoingPayment.id;
    transaction.completedAt = new Date().toISOString();
    delete transaction.authorizationUrl;
    
    transactions.set(transactionId, transaction);

    // Respuesta
    const response = {
      id: transactionId,
      status: paymentStatus,
      debitAmount: transaction.debitAmount,
      receiveAmount: transaction.receiveAmount,
      description: transaction.description,
      requiresAuthorization: false,
      outgoingPaymentId: outgoingPayment.id,
      completedAt: transaction.completedAt
    };

    res.json(response);

  } catch (error) {
    console.error('Error completing transaction:', error);
    
    // Marcar transacción como fallida
    const transaction = transactions.get(req.params.transactionId);
    if (transaction) {
      transaction.status = 'FAILED';
      transaction.error = error.message;
      transactions.set(req.params.transactionId, transaction);
    }
    
    res.status(500).json({
      error: 'Error al completar la transacción',
      message: error.message
    });
  }
});

// GET /api/remittance/status/:transactionId - Consultar estado
router.get('/status/:transactionId', (req, res) => {
  const { transactionId } = req.params;
  
  const transaction = transactions.get(transactionId);
  if (!transaction) {
    return res.status(404).json({
      error: 'Transacción no encontrada'
    });
  }

  // Remover datos internos antes de enviar respuesta
  const response = {
    id: transaction.id,
    status: transaction.status,
    debitAmount: transaction.debitAmount,
    receiveAmount: transaction.receiveAmount,
    description: transaction.description,
    createdAt: transaction.createdAt,
    completedAt: transaction.completedAt,
    requiresAuthorization: transaction.requiresAuthorization,
    authorizationUrl: transaction.authorizationUrl,
    error: transaction.error
  };

  res.json(response);
});

// GET /api/remittance/supported-currencies - Obtener monedas soportadas
router.get('/supported-currencies', (req, res) => {
  const currencies = [
    { code: 'USD', name: 'Dólar Estadounidense', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'MXN', name: 'Peso Mexicano', symbol: '$' },
    { code: 'COP', name: 'Peso Colombiano', symbol: '$' },
    { code: 'ARS', name: 'Peso Argentino', symbol: '$' },
    { code: 'BRL', name: 'Real Brasileño', symbol: 'R$' },
    { code: 'PEN', name: 'Sol Peruano', symbol: 'S/' }
  ];

  res.json(currencies);
});

// POST /api/remittance/check-and-complete/:transactionId - Verificar y completar pago automáticamente
router.post('/check-and-complete/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    const transaction = transactions.get(transactionId);
    if (!transaction) {
      return res.status(404).json({
        error: 'Transacción no encontrada'
      });
    }

    if (transaction.status !== 'PENDING') {
      // Si ya está completado, devolver el estado actual
      if (transaction.status === 'COMPLETED') {
        return res.json({
          id: transactionId,
          status: transaction.status,
          debitAmount: transaction.debitAmount,
          receiveAmount: transaction.receiveAmount,
          description: transaction.description,
          requiresAuthorization: false,
          outgoingPaymentId: transaction.outgoingPaymentId,
          completedAt: transaction.completedAt
        });
      }
      
      return res.status(400).json({
        error: 'La transacción ya ha sido procesada'
      });
    }

    const { outgoingPaymentGrant } = transaction._internal;

    // Crear cliente
    const client = await createClient();

    console.log('Auto-checking grant status for transaction:', transactionId);

    // Intentar continuar con el grant (esto verificará si ya fue autorizado)
    let finalizedOutgoingPaymentGrant;
    try {
      finalizedOutgoingPaymentGrant = await client.grant.continue({
        url: outgoingPaymentGrant.continue.uri,
        accessToken: outgoingPaymentGrant.continue.access_token.value,
      });

      console.log('Grant automatically continued, user has authorized!');

      if (isFinalizedGrant(finalizedOutgoingPaymentGrant)) {
        // El usuario ya autorizó, proceder con el pago
        const { quote: ilpQuote, sendingWalletAddress } = transaction._internal;

        console.log('Creating outgoing payment automatically...');

        const outgoingPayment = await client.outgoingPayment.create(
          {
            url: sendingWalletAddress.resourceServer,
            accessToken: finalizedOutgoingPaymentGrant.access_token.value,
          },
          {
            walletAddress: sendingWalletAddress.id,
            quoteId: ilpQuote.id,
          }
        );

        console.log('Outgoing payment created automatically:', outgoingPayment);

        // Actualizar transacción
        transaction.status = 'COMPLETED';
        transaction.requiresAuthorization = false;
        transaction.outgoingPaymentId = outgoingPayment.id;
        transaction.completedAt = new Date().toISOString();
        delete transaction.authorizationUrl;
        
        transactions.set(transactionId, transaction);

        return res.json({
          id: transactionId,
          status: 'COMPLETED',
          debitAmount: transaction.debitAmount,
          receiveAmount: transaction.receiveAmount,
          description: transaction.description,
          requiresAuthorization: false,
          outgoingPaymentId: outgoingPayment.id,
          completedAt: transaction.completedAt,
          autoCompleted: true
        });
      }
    } catch (err) {
      console.log('Grant not yet authorized or error:', err.message);
      // El grant aún no ha sido autorizado, esto es normal
    }

    // El pago aún está pendiente de autorización
    res.json({
      id: transactionId,
      status: 'PENDING',
      debitAmount: transaction.debitAmount,
      receiveAmount: transaction.receiveAmount,
      description: transaction.description,
      requiresAuthorization: true,
      authorizationUrl: transaction.authorizationUrl,
      message: 'Esperando autorización del usuario'
    });

  } catch (error) {
    console.error('Error checking transaction:', error);
    res.status(500).json({
      error: 'Error al verificar la transacción',
      message: error.message
    });
  }
});

module.exports = router;