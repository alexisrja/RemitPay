# Flow Diagram - RemitPay

## 🔄 Main Application Flow

```mermaid
graph TD
    A[🏠 Home Page<br/>index.html] --> B{User Authenticated?}
    
    B -->|No| C[🔑 Unauthenticated Nav]
    B -->|Yes| D[👤 Authenticated Nav]
    
    C --> E[📝 Login<br/>login.html]
    C --> F[📝 Register<br/>register.html]
    
    D --> G[📊 Dashboard<br/>pago.html]
    D --> H[👤 Profile<br/>perfil.html]
    
    E --> I[🔐 POST /api/auth/login]
    F --> J[🔐 POST /api/auth/register]
    
    I --> K{Login Successful?}
    J --> L{Registration Successful?}
    
    K -->|Yes| M[💾 Save JWT Token]
    K -->|No| N[❌ Show Error]
    
    L -->|Yes| M
    L -->|No| O[❌ Show Error]
    
    M --> P[🔄 Redirect to Dashboard]
    N --> E
    O --> F
    
    P --> G
    
    G --> Q[💰 Remittance Process]
    H --> R[⚙️ Profile Management]
    
    Q --> S[📋 Fill Remittance Form]
    S --> T[💱 POST /api/remittance/quote]
    T --> U[📊 Show Quote]
    U --> V{Confirm Send?}
    
    V -->|No| W[❌ Cancel]
    V -->|Yes| X[🚀 POST /api/remittance/send]
    
    X --> Y[🔒 Interledger Authorization]
    Y --> Z[🌐 Authorization Window]
    Z --> AA[✅ Authorization Complete]
    AA --> BB[🔄 POST /api/remittance/complete]
    BB --> CC[✅ Transaction Completed]
    
    R --> DD[📝 Edit Information]
    DD --> EE[💾 PUT /api/auth/profile]
    EE --> FF[✅ Profile Updated]
    
    W --> G
    CC --> G
    FF --> H
    
    style A fill:#e1f5fe
    style G fill:#f3e5f5
    style H fill:#fff3e0
    style E fill:#ffebee
    style F fill:#e8f5e8
```

## 🔐 Detailed Authentication Flow

```mermaid
graph TD
    A[🌐 App Access] --> B[📄 navigation.js<br/>Check Token]
    
    B --> C{Token Exists?}
    
    C -->|No| D[🔓 Show Unauth Nav<br/>Login/Register]
    C -->|Yes| E[🔍 Verify Token<br/>GET /api/auth/profile]
    
    E --> F{Valid Token?}
    
    F -->|No| G[🗑️ Clear Storage<br/>Redirect to Login]
    F -->|Yes| H[👤 Show Auth Nav<br/>Dashboard/Profile]
    
    D --> I[📝 Login Form]
    D --> J[📝 Register Form]
    
    I --> K[🔐 POST /api/auth/login<br/>JWT Validation]
    J --> L[🔐 POST /api/auth/register<br/>Password Hash]
    
    K --> M{Credentials OK?}
    L --> N{Valid Data?}
    
    M -->|Yes| O[🎫 Generate JWT Token]
    M -->|No| P[❌ Login Error]
    
    N -->|Yes| Q[🔒 Create User<br/>bcryptjs Hash]
    N -->|No| R[❌ Validation Error]
    
    O --> S[💾 localStorage<br/>Token + User Data]
    Q --> T[🎫 Generate JWT Token]
    
    T --> S
    S --> U[🔄 Redirect Dashboard]
    
    P --> I
    R --> J
    G --> I
    U --> V[📊 Authenticated Dashboard]
    
    style K fill:#e3f2fd
    style L fill:#e8f5e8
    style O fill:#fff3e0
    style Q fill:#f3e5f5
```

## 💰 Interledger Transaction Flow

```mermaid
graph TD
    A[📊 Authenticated Dashboard] --> B[📝 Remittance Form]
    
    B --> C[🔄 Transform Wallets<br/>app.js validation]
    C --> D[💱 Request Quote<br/>POST /api/remittance/quote]
    
    D --> E[🏦 Get Wallet Info<br/>Interledger Client]
    E --> F[💹 Calculate Exchange Rate]
    F --> G[📊 Show Quote to User]
    
    G --> H{User Confirms?}
    
    H -->|No| I[❌ Cancel Transaction]
    H -->|Yes| J[🚀 Start Send<br/>POST /api/remittance/send]
    
    J --> K[🔐 Create Outgoing Payment Grant]
    K --> L[🌐 Interactive Authorization URL]
    L --> M[🖥️ Open Auth Window<br/>window.open()]
    
    M --> N[👤 User Authorizes in Wallet]
    N --> O[🔄 Auto Verification<br/>Polling every 5s]
    
    O --> P{Grant Authorized?}
    
    P -->|No| Q[⏳ Keep Waiting]
    P -->|Yes| R[💸 Create Outgoing Payment]
    
    R --> S[📋 Create Incoming Payment]
    S --> T[💰 Execute Transfer]
    T --> U[✅ Transaction Completed]
    
    Q --> O
    I --> A
    U --> V[📊 Update UI Status]
    V --> W[📚 Transaction History]
    
    style D fill:#e3f2fd
    style K fill:#fff3e0
    style R fill:#e8f5e8
    style T fill:#f3e5f5
```

## 🗄️ Database Architecture

```mermaid
erDiagram
    USERS {
        INTEGER id PK
        TEXT username UK
        TEXT email UK
        TEXT password_hash
        TEXT first_name
        TEXT last_name
        TEXT phone
        TEXT country
        TEXT wallet_address
        TEXT profile_image
        DATETIME created_at
        DATETIME updated_at
    }
    
    TRANSACTIONS {
        INTEGER id PK
        INTEGER user_id FK
        TEXT transaction_id UK
        TEXT status
        TEXT sender_wallet
        TEXT receiver_wallet
        REAL debit_amount
        TEXT debit_currency
        REAL receive_amount
        TEXT receive_currency
        TEXT description
        TEXT authorization_url
        DATETIME created_at
        DATETIME completed_at
    }
    
    USERS ||--o{ TRANSACTIONS : creates
```

## 🌐 API Routes Structure

```mermaid
graph LR
    A[🚀 Express Server<br/>server.js] --> B[🔐 Auth Routes<br/>/api/auth]
    A --> C[💰 Remittance Routes<br/>/api/remittance]
    A --> D[📄 Static Files<br/>/public]
    
    B --> E[POST /register<br/>Create User]
    B --> F[POST /login<br/>Authenticate]
    B --> G[GET /profile<br/>Get Profile]
    B --> H[PUT /profile<br/>Update Profile]
    B --> I[POST /logout<br/>Logout]
    
    C --> J[POST /quote<br/>Get Quote]
    C --> K[POST /send<br/>Send Remittance]
    C --> L[POST /complete/:id<br/>Complete Auth]
    C --> M[GET /status/:id<br/>Check Status]
    C --> N[GET /supported-currencies<br/>Currencies]
    
    D --> O[📄 index.html<br/>Landing]
    D --> P[📊 pago.html<br/>Dashboard]
    D --> Q[👤 perfil.html<br/>Profile]
    D --> R[🔑 login.html<br/>Login]
    D --> S[📝 register.html<br/>Register]
    
    style A fill:#e1f5fe
    style B fill:#ffebee
    style C fill:#e8f5e8
    style D fill:#fff3e0
```

## 🔄 Navigation State Management

```mermaid
stateDiagram-v2
    [*] --> CheckingAuth : Page Load
    
    CheckingAuth --> Unauthenticated : No Token
    CheckingAuth --> ValidatingToken : Token Found
    
    ValidatingToken --> Authenticated : Valid Token
    ValidatingToken --> Unauthenticated : Invalid Token
    
    Unauthenticated --> ShowLoginNav : Update Navigation
    Authenticated --> ShowAuthNav : Update Navigation
    
    ShowLoginNav --> [*] : Ready
    ShowAuthNav --> [*] : Ready
    
    state ShowLoginNav {
        [*] --> Login
        [*] --> Register
        Login --> Home
        Register --> Home
    }
    
    state ShowAuthNav {
        [*] --> Dashboard
        [*] --> Profile
        Dashboard --> Home
        Profile --> Home
        [*] --> Logout
        Logout --> [*]
    }
```

## 📱 User Interaction Flow

```mermaid
journey
    title RemitPay User Experience
    
    section Registration/Login
        Visit website: 5: User
        View landing page: 4: User
        Click Register: 3: User
        Fill form: 2: User
        Submit data: 3: User
        Receive confirmation: 5: User
        
    section Sending Remittance
        Access Dashboard: 5: User
        Fill remittance data: 3: User
        Request quote: 4: User
        Review costs: 4: User
        Confirm send: 3: User
        Authorize in wallet: 2: User
        Receive confirmation: 5: User
        
    section Profile Management
        Go to profile: 4: User
        View information: 5: User
        Edit data: 3: User
        Save changes: 4: User
        See confirmation: 5: User
```

## 🔧 Technologies and Dependencies

```mermaid
mindmap
  root((RemitPay))
    Backend
      Node.js
      Express.js
      SQLite
      bcryptjs
      JWT
      @interledger/open-payments
    Frontend
      HTML5
      CSS3
      JavaScript ES6+
      Font Awesome
      Google Fonts
    Authentication
      JWT Tokens
      bcryptjs Hashing
      Session Management
      Protected Routes
    Database
      SQLite
      User Management
      Transaction History
      Profile Storage
    Interledger
      Open Payments
      Wallet Integration
      Interactive Authorization
      Real-time Quotes
```

---

## 📋 Feature Summary

### ✅ **Implemented Features:**

1. **🔐 Complete Authentication System**
   - User registration and login
   - Password encryption with bcryptjs
   - JWT tokens for secure sessions
   - Dynamic navigation based on auth state

2. **💰 Interledger Remittance System**
   - Real-time quotes
   - Interactive authorization
   - Multi-currency support
   - Transaction history

3. **👤 User Profile Management**
   - Editable personal information
   - Wallet configuration
   - User statistics
   - Custom avatar

4. **🗄️ SQLite Database**
   - User storage
   - Transaction history
   - Persistent profile data

5. **🌐 Responsive Web Interface**
   - Modern glassmorphism design
   - Intuitive navigation
   - Validated forms
   - Feedback messages

### 🎯 **Typical User Flow:**

1. **New User**: Home → Register → Dashboard → Send Remittance
2. **Existing User**: Home → Login → Dashboard → Manage Profile
3. **Transaction**: Dashboard → Form → Quote → Authorization → Completed

---

*This diagram shows the complete RemitPay architecture, including authentication, Interledger transactions, user management, and the complete user experience.*