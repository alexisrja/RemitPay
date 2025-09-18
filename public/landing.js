// RemitPay Landing Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar todas las funcionalidades
    initializeParticles();
    initializeScrollAnimations();
    initializeParallax();
    initializeStatsCounter();
    initializeSmoothScrolling();
});

// Crear partículas animadas en el fondo
function initializeParticles() {
    const animatedBg = document.getElementById('animatedBg');
    if (!animatedBg) return;
    
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        const size = Math.random() * 8 + 4;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
        particle.style.animationDelay = Math.random() * 15 + 's';
        
        animatedBg.appendChild(particle);
    }
}

// Animaciones de scroll para elementos fade-in-up
function initializeScrollAnimations() {
    const elements = document.querySelectorAll('.fade-in-up');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animationPlayState = 'running';
            }
        });
    }, {
        threshold: 0.1
    });

    elements.forEach(element => {
        element.style.animationPlayState = 'paused';
        observer.observe(element);
    });
}

// Efecto de parallax suave en el hero
function initializeParallax() {
    // Temporalmente desactivado para evitar interferencias con el sticky footer
    // window.addEventListener('scroll', () => {
    //     const scrolled = window.pageYOffset;
    //     const parallaxElements = document.querySelectorAll('.hero-content');
        
    //     parallaxElements.forEach(element => {
    //         const speed = 0.5;
    //         element.style.transform = `translateY(${scrolled * speed}px)`;
    //     });
    // });
}

// Animación de números contadores para estadísticas
function animateCounters() {
    const counters = document.querySelectorAll('.stat-number');
    
    counters.forEach(counter => {
        const target = counter.textContent;
        let current = 0;
        const duration = 2000; // 2 segundos
        const steps = duration / 16; // 60 FPS
        const stepValue = parseFloat(target) / steps;

        const timer = setInterval(() => {
            current += stepValue;
            if (current >= parseFloat(target)) {
                current = parseFloat(target);
                clearInterval(timer);
            }
            
            // Formatear según el tipo de estadística
            if (target.includes('%')) {
                counter.textContent = current.toFixed(1) + '%';
            } else if (target.includes('+')) {
                counter.textContent = Math.floor(current) + '+';
            } else if (target.includes('min')) {
                counter.textContent = Math.floor(current) + ' min';
            } else if (target.includes('/')) {
                counter.textContent = target; // Para formato "24/7"
                clearInterval(timer);
            } else {
                counter.textContent = Math.floor(current);
            }
        }, 16);
    });
}

// Inicializar contador de estadísticas cuando entren en vista
function initializeStatsCounter() {
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters();
                statsObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.3
    });
    
    const statsSection = document.querySelector('.stats');
    if (statsSection) {
        statsObserver.observe(statsSection);
    }
}

// Smooth scrolling para enlaces internos
function initializeSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Función para agregar efectos adicionales a los botones
function enhanceButtons() {
    const buttons = document.querySelectorAll('.btn');
    
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-3px) scale(1.02)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
}

// Agregar efectos de ripple a las tarjetas
function addCardRippleEffect() {
    const cards = document.querySelectorAll('.feature-card');
    
    cards.forEach(card => {
        card.addEventListener('click', function(e) {
            const ripple = document.createElement('div');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s ease-out;
                pointer-events: none;
            `;
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

// Agregar CSS para el efecto ripple
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
    @keyframes ripple {
        to {
            transform: scale(2);
            opacity: 0;
        }
    }
    
    .feature-card {
        position: relative;
        overflow: hidden;
    }
`;
document.head.appendChild(rippleStyle);

// Inicializar efectos adicionales después de que el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    enhanceButtons();
    addCardRippleEffect();
});

// Función para mostrar notificaciones toast (opcional)
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--glass-bg);
        color: var(--text-primary);
        padding: 1rem 1.5rem;
        border-radius: 10px;
        border: 1px solid var(--glass-border);
        backdrop-filter: blur(20px);
        box-shadow: var(--shadow);
        z-index: 1000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    // Mostrar toast
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Ocultar toast después de 3 segundos
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// Exportar funciones para uso global si es necesario
window.RemitPayLanding = {
    showToast,
    animateCounters,
    initializeParticles,
    initializeScrollAnimations
};