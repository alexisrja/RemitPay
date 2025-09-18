# RemitPay

Aplicación web para envío de remesas internacionales, basada en el protocolo Interledger. Permite transferencias rápidas, seguras y multi-moneda entre wallets compatibles.

Web application for international remittance transfers, based on the Interledger protocol. Enables fast, secure, multi-currency transfers between compatible wallets.

---

## Tabla de Contenidos / Table of Contents

- [Características / Features](#características--features)
- [Requisitos Previos / Prerequisites](#requisitos-previos--prerequisites)
- [Instalación / Installation](#instalación--installation)
- [Configuración / Configuration](#configuración--configuration)
- [Ejecutar la Aplicación / Run the Application](#ejecutar-la-aplicación--run-the-application)
- [Uso / Usage](#uso--usage)
- [API Endpoints](#api-endpoints)
- [Estructura del Proyecto / Project Structure](#estructura-del-proyecto--project-structure)
- [Seguridad / Security](#seguridad--security)
- [Monedas Soportadas / Supported Currencies](#monedas-soportadas--supported-currencies)
- [Scripts Disponibles / Available Scripts](#scripts-disponibles--available-scripts)
- [Solución de Problemas / Troubleshooting](#solución-de-problemas--troubleshooting)
- [Contribuir / Contributing](#contribuir--contributing)
- [Licencia / License](#licencia--license)
- [Soporte / Support](#soporte--support)

---

## Características / Features

- Interfaz web moderna e intuitiva  
    Modern and intuitive web interface
- Soporte para múltiples monedas (USD, EUR, MXN, COP, ARS, BRL, PEN)  
    Support for multiple currencies (USD, EUR, MXN, COP, ARS, BRL, PEN)
- Transferencias seguras mediante Interledger Protocol (ILP)  
    Secure transfers via Interledger Protocol (ILP)
- Cotizaciones en tiempo real antes de enviar remesas  
    Real-time quotes before sending remittances
- Historial y seguimiento de transacciones  
    Transaction history and tracking
- Proceso de autorización seguro e interactivo  
    Secure and interactive authorization process

---

## Requisitos Previos / Prerequisites

- Node.js v16 o superior  
    Node.js v16 or higher
- npm o yarn  
    npm or yarn
- Wallets Interledger configuradas y activas  
    Configured and active Interledger wallets
- Clave privada de tu wallet  
    Your wallet's private key

---

## Instalación / Installation

1. **Clona el repositorio / Clone the repository**
        ```bash
        git clone https://github.com/tu-usuario/RemitPay.git
        cd RemitPay
        ```

2. **Instala las dependencias / Install dependencies**
        ```bash
        npm install
        ```

---

## Configuración / Configuration

1. **Variables de entorno / Environment variables**

        Crea o edita el archivo `.env` en la raíz del proyecto con tus datos:  
        Create or edit the `.env` file in the project root with your data:
        ```env
        WALLET_ADDRESS_URL=https://ilp.interledger-test.dev/tu-wallet
        PRIVATE_KEY=private.key
        KEY_ID=tu-key-id
        PORT=3000
        ```

2. **Clave privada / Private key**

        Coloca el archivo `private.key` en el directorio raíz.  
        Place the `private.key` file in the root directory.

---

## Ejecutar la Aplicación / Run the Application

- **Modo desarrollo / Development mode**
    ```bash
    npm run dev
    ```
- **Modo producción / Production mode**
    ```bash
    npm start
    ```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).  
The application will be available at [http://localhost:3000](http://localhost:3000).

---

## Uso / Usage

1. Accede a la interfaz web en tu navegador.  
     Access the web interface in your browser.
2. Completa el formulario de remesa con los datos requeridos.  
     Fill out the remittance form with the required data.
3. Obtén la cotización y revisa los detalles.  
     Get the quote and review the details.
4. Confirma y autoriza el pago desde tu wallet.  
     Confirm and authorize the payment from your wallet.
5. Haz seguimiento del estado de la transacción y consulta el historial.  
     Track the transaction status and view the history.

---

## API Endpoints

- **POST `/api/remittance/quote`**: Obtener cotización / Get quote
- **POST `/api/remittance/send`**: Iniciar envío de remesa / Initiate remittance
- **POST `/api/remittance/complete/:transactionId`**: Completar autorización / Complete authorization
- **GET `/api/remittance/status/:transactionId`**: Consultar estado / Check status
- **GET `/api/remittance/supported-currencies`**: Listar monedas soportadas / List supported currencies

---

## Estructura del Proyecto / Project Structure

```
RemitPay/
├── public/              # Archivos estáticos / Static files
├── routes/              # Endpoints de API / API endpoints
├── server.js            # Servidor principal / Main server
├── interledger-core.js  # Script Interledger / Interledger script
├── package.json         # Configuración / Configuration
├── .env                 # Variables de entorno / Environment variables
└── README.md            # Documentación / Documentation
```

---

## Seguridad / Security

- Configuración sensible en `.env`  
    Sensitive configuration in `.env`
- Autorización interactiva y validación de datos  
    Interactive authorization and data validation
- Recomendado usar HTTPS en producción  
    Recommended to use HTTPS in production

---

## Monedas Soportadas / Supported Currencies

| Código | Nombre                | Símbolo |
|--------|-----------------------|---------|
| USD    | Dólar Estadounidense / US Dollar  | $       |
| EUR    | Euro                  | €       |
| MXN    | Peso Mexicano / Mexican Peso      | $       |
| COP    | Peso Colombiano / Colombian Peso  | $       |
| ARS    | Peso Argentino / Argentine Peso   | $       |
| BRL    | Real Brasileño / Brazilian Real   | R$      |
| PEN    | Sol Peruano / Peruvian Sol        | S/      |

---

## Scripts Disponibles / Available Scripts

- `npm start` - Modo producción / Production mode
- `npm run dev` - Modo desarrollo / Development mode
- `npm run interledger-demo` - Demo Interledger / Interledger demo

---

## Solución de Problemas / Troubleshooting

- **Cannot find module**: Ejecuta `npm install` / Run `npm install`
- **Port already in use**: Cambia el puerto en `.env` / Change the port in `.env`
- **Errores de autorización/cotización**: Verifica wallets, fondos y configuración  
    Authorization/quote errors: Check wallets, funds, and configuration

---

## Contribuir / Contributing

1. Haz fork del repositorio / Fork the repository
2. Crea una rama (`git checkout -b feature/nueva-caracteristica`)  
     Create a branch (`git checkout -b feature/new-feature`)
3. Realiza tus cambios y haz commit / Make your changes and commit
4. Haz push y crea un Pull Request / Push and create a Pull Request

---

## Licencia / License

Este proyecto está bajo la Licencia ISC. Consulta el archivo `LICENSE` para más información.  
This project is licensed under the ISC License. See the `LICENSE` file for more information.

---

## Soporte / Support

- Crea un issue en GitHub / Create an issue on GitHub
- Consulta la documentación de [Interledger](https://interledger.org/)  
    See the [Interledger documentation](https://interledger.org/)
- Consulta [Open Payments Guide](https://openpayments.guide/)  
    See [Open Payments Guide](https://openpayments.guide/)

---

**RemitPay** - Powered by Interledger Protocol 🚀

