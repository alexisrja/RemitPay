// Gestión de navegación y autenticación global
class NavigationManager {
    constructor() {
        this.token = localStorage.getItem('remitpay_token');
        this.user = JSON.parse(localStorage.getItem('remitpay_user') || 'null');
        this.updateNavigation();
    }

    updateNavigation() {
        const navMenu = document.querySelector('.nav-menu');
        if (!navMenu) return;

        if (this.isAuthenticated()) {
            // Usuario autenticado - mostrar Dashboard y Perfil
            navMenu.innerHTML = `
                <a href="/" class="nav-item">Inicio</a>
                <a href="/pago" class="nav-item">Dashboard</a>
                <a href="/perfil" class="nav-item">Perfil</a>
                <div class="nav-user">
                    <span class="user-welcome">Hola, ${this.user.firstName}</span>
                    <button class="logout-btn" onclick="navigationManager.logout()">
                        <i class="fas fa-sign-out-alt"></i>
                    </button>
                </div>
            `;
        } else {
            // Usuario no autenticado - mostrar Login y Register
            navMenu.innerHTML = `
                <a href="/" class="nav-item">Inicio</a>
                <a href="/login" class="nav-item">Iniciar Sesión</a>
                <a href="/register" class="nav-item">Registrarse</a>
            `;
        }
    }

    isAuthenticated() {
        return this.token && this.user;
    }

    logout() {
        localStorage.removeItem('remitpay_token');
        localStorage.removeItem('remitpay_user');
        window.location.href = '/';
    }

    // Verificar autenticación de forma asíncrona
    async verifyAuthentication() {
        if (!this.token) return false;

        try {
            const response = await fetch('/api/auth/profile', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.user = data.user;
                localStorage.setItem('remitpay_user', JSON.stringify(this.user));
                this.updateNavigation();
                return true;
            } else {
                this.logout();
                return false;
            }
        } catch (error) {
            console.error('Error verificando autenticación:', error);
            return false;
        }
    }
}

// Estilos adicionales para la navegación de usuario
const navStyles = `
    .nav-user {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-left: auto;
    }

    .user-welcome {
        color: var(--text-secondary);
        font-size: 0.9rem;
        font-weight: 500;
    }

    .logout-btn {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        color: #ef4444;
        padding: 0.5rem;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
    }

    .logout-btn:hover {
        background: rgba(239, 68, 68, 0.2);
        transform: translateY(-1px);
    }

    @media (max-width: 768px) {
        .nav-user {
            margin-left: 0;
            justify-content: center;
        }

        .user-welcome {
            display: none;
        }
    }
`;

// Agregar estilos al documento
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = navStyles;
    document.head.appendChild(styleSheet);

    // Inicializar el gestor de navegación
    let navigationManager;
    document.addEventListener('DOMContentLoaded', () => {
        navigationManager = new NavigationManager();
        window.navigationManager = navigationManager; // Hacer global para el botón de logout
    });
}