// ==============================
// PWA MANAGER
// ==============================

const PWA = (function() {
    // Verificar se é uma PWA instalada
    function isStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches || 
               window.navigator.standalone === true;
    }
    
    // Verificar se é iOS
    function isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    }
    
    // Verificar se é Android
    function isAndroid() {
        return /Android/.test(navigator.userAgent);
    }
    
    // Verificar se o navegador suporta PWA
    function supportsPWA() {
        return 'serviceWorker' in navigator && 'PushManager' in window;
    }
    
    // Registrar Service Worker
    async function registerServiceWorker() {
        if (!supportsPWA()) {
            console.log('PWA não suportado neste navegador');
            return false;
        }
        
        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js', {
                scope: '/'
            });
            
            console.log('[PWA] Service Worker registrado com sucesso:', registration);
            
            // Verificar atualizações periodicamente
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('[PWA] Nova versão do Service Worker encontrada');
                
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        showUpdateNotification();
                    }
                });
            });
            
            return true;
        } catch (error) {
            console.error('[PWA] Falha ao registrar Service Worker:', error);
            return false;
        }
    }
    
    // Mostrar notificação de atualização
    function showUpdateNotification() {
        const updateNotification = document.createElement('div');
        updateNotification.id = 'pwa-update-notification';
        updateNotification.className = 'fixed bottom-4 left-4 right-4 bg-slate-800 border border-violet-500 rounded-xl p-4 shadow-2xl z-50';
        
        updateNotification.innerHTML = `
            <div class="flex items-center justify-between mb-2">
                <h3 class="font-bold text-white">
                    <i class="fas fa-sync-alt mr-2 text-violet-400"></i>
                    Nova versão disponível!
                </h3>
                <button onclick="PWA.dismissUpdate()" class="text-slate-400 hover:text-white">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <p class="text-slate-300 text-sm mb-4">
                Uma nova versão do Proclame está disponível. Atualize para ter a melhor experiência.
            </p>
            <div class="flex gap-3">
                <button onclick="PWA.updateApp()" 
                        class="flex-1 btn-primary py-2 rounded-lg font-medium text-sm">
                    <i class="fas fa-redo mr-2"></i>
                    Atualizar Agora
                </button>
                <button onclick="PWA.dismissUpdate()" 
                        class="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium text-sm">
                    Mais tarde
                </button>
            </div>
        `;
        
        document.body.appendChild(updateNotification);
    }
    
    // Atualizar aplicativo
    function updateApp() {
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
        }
    }
    
    // Fechar notificação de atualização
    function dismissUpdate() {
        const notification = document.getElementById('pwa-update-notification');
        if (notification) {
            notification.remove();
        }
    }
    
    // Solicitar permissão para notificações
    async function requestNotificationPermission() {
        if (!('Notification' in window)) {
            console.log('[PWA] Notificações não suportadas');
            return false;
        }
        
        if (Notification.permission === 'granted') {
            return true;
        }
        
        if (Notification.permission === 'denied') {
            console.log('[PWA] Permissão para notificações negada');
            return false;
        }
        
        try {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        } catch (error) {
            console.error('[PWA] Erro ao solicitar permissão:', error);
            return false;
        }
    }
    
    // Enviar notificação local
    function sendLocalNotification(title, options = {}) {
        if (!('Notification' in window) || Notification.permission !== 'granted') {
            return false;
        }
        
        const defaultOptions = {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            vibrate: [200, 100, 200]
        };
        
        const notification = new Notification(title, { ...defaultOptions, ...options });
        
        notification.onclick = () => {
            window.focus();
            notification.close();
        };
        
        return true;
    }
    
    // Verificar conexão
    function checkConnection() {
        return navigator.onLine;
    }
    
    // Monitorar conexão
    function setupConnectionMonitor() {
        window.addEventListener('online', () => {
            console.log('[PWA] Conexão restaurada');
            showNotification('Conexão restaurada!', 'success');
        });
        
        window.addEventListener('offline', () => {
            console.log('[PWA] Conexão perdida');
            showNotification('Você está offline. Algumas funcionalidades podem estar limitadas.', 'warning');
        });
    }
    
    // Mostrar botão de instalação
    let deferredPrompt;
    
    function setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevenir que o prompt apareça automaticamente
            e.preventDefault();
            deferredPrompt = e;
            
            showInstallButton();
        });
        
        window.addEventListener('appinstalled', () => {
            console.log('[PWA] Aplicativo instalado com sucesso');
            deferredPrompt = null;
            hideInstallButton();
            
            // Mostrar confirmação
            showNotification('Proclame instalado com sucesso!', 'success', 5000);
        });
    }
    
    function showInstallButton() {
        // Verificar se já está instalado
        if (isStandalone()) {
            return;
        }
        
        // Criar ou mostrar botão de instalação
        let installButton = document.getElementById('pwa-install-button');
        
        if (!installButton) {
            installButton = document.createElement('button');
            installButton.id = 'pwa-install-button';
            installButton.className = 'fixed bottom-4 right-4 z-40 p-3 bg-violet-600 hover:bg-violet-700 rounded-full shadow-2xl text-white transition-all transform hover:scale-110';
            installButton.innerHTML = '<i class="fas fa-download text-xl"></i>';
            installButton.title = 'Instalar Proclame';
            installButton.onclick = installPWA;
            
            document.body.appendChild(installButton);
        }
        
        installButton.classList.remove('hidden');
    }
    
    function hideInstallButton() {
        const installButton = document.getElementById('pwa-install-button');
        if (installButton) {
            installButton.classList.add('hidden');
        }
    }
    
    async function installPWA() {
        if (!deferredPrompt) {
            return;
        }
        
        deferredPrompt.prompt();
        
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`[PWA] Escolha do usuário: ${outcome}`);
        
        deferredPrompt = null;
        hideInstallButton();
    }
    
    // Configurar atalhos do teclado
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + N: Novo evento
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                window.location.href = '/create.html';
            }
            
            // Ctrl/Cmd + E: Meus eventos
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                window.location.href = '/my-events.html';
            }
            
            // Ctrl/Cmd + D: Descobrir eventos
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                window.location.href = '/discover.html';
            }
            
            // Ctrl/Cmd + H: Home
            if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
                e.preventDefault();
                window.location.href = '/index.html';
            }
            
            // Escape: Fechar modais
            if (e.key === 'Escape') {
                const modals = document.querySelectorAll('.modal-overlay:not(.hidden)');
                modals.forEach(modal => {
                    modal.classList.add('hidden');
                });
            }
        });
    }
    
    // Inicializar PWA
    async function init() {
        console.log('[PWA] Inicializando...');
        
        // Verificar se já é standalone
        if (isStandalone()) {
            console.log('[PWA] Executando como aplicativo instalado');
            document.documentElement.classList.add('pwa-installed');
        }
        
        // Registrar Service Worker
        await registerServiceWorker();
        
        // Configurar monitor de conexão
        setupConnectionMonitor();
        
        // Configurar prompt de instalação
        setupInstallPrompt();
        
        // Configurar atalhos de teclado
        setupKeyboardShortcuts();
        
        // Mostrar status offline se aplicável
        if (!checkConnection()) {
            showNotification('Você está offline. Algumas funcionalidades podem estar limitadas.', 'warning');
        }
        
        console.log('[PWA] Inicialização completa');
    }
    
    return {
        init,
        isStandalone,
        supportsPWA,
        requestNotificationPermission,
        sendLocalNotification,
        checkConnection,
        installPWA,
        updateApp,
        dismissUpdate,
        setupInstallPrompt
    };
})();

// Inicializar PWA quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    PWA.init();
});

// Exportar para uso global
window.PWA = PWA;