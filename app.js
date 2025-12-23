[file name]: js/app.js
[file content begin]
// ==============================
// STORAGE MANAGER (LocalStorage)
// ==============================

const DB = (function() {
    const EVENTS_KEY = 'proclame_events_v2';
    const RSVPS_KEY = 'proclame_rsvps_v2';
    const USER_KEY = 'proclame_user_id';
    const SETTINGS_KEY = 'proclame_settings';

    // Gerar ID único
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    // Inicializar armazenamento
    function initStorage() {
        if (!localStorage.getItem(EVENTS_KEY)) {
            localStorage.setItem(EVENTS_KEY, JSON.stringify([]));
        }
        if (!localStorage.getItem(RSVPS_KEY)) {
            localStorage.setItem(RSVPS_KEY, JSON.stringify([]));
        }
        if (!localStorage.getItem(SETTINGS_KEY)) {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify({
                theme: 'dark',
                notifications: true,
                language: 'pt-BR'
            }));
        }
    }

    // ===== EVENTOS =====
    function saveEvent(event) {
        initStorage();
        const events = getAllEvents();
        
        // Verificar se é edição
        const existingIndex = events.findIndex(e => e.id === event.id);
        if (existingIndex !== -1) {
            events[existingIndex] = event;
        } else {
            events.push(event);
        }
        
        localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
        return event;
    }

    function getAllEvents() {
        initStorage();
        const events = JSON.parse(localStorage.getItem(EVENTS_KEY)) || [];
        
        // Ordenar por data (mais próximos primeiro)
        return events.sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}`);
            const dateB = new Date(`${b.date}T${b.time}`);
            return dateA - dateB;
        });
    }

    function getEventById(id) {
        const events = getAllEvents();
        return events.find(event => event.id === id);
    }

    function getPublicEvents() {
        const events = getAllEvents();
        const now = new Date();
        
        return events.filter(event => {
            const eventDate = new Date(`${event.date}T${event.time}`);
            return event.visibility === 'public' && eventDate > now;
        });
    }

    function getUserEvents(userId) {
        const events = getAllEvents();
        return events.filter(event => event.userId === userId);
    }

    function updateEvent(id, updates) {
        const events = getAllEvents();
        const index = events.findIndex(event => event.id === id);
        if (index !== -1) {
            events[index] = { ...events[index], ...updates, updatedAt: new Date().toISOString() };
            localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
            return events[index];
        }
        return null;
    }

    function deleteEvent(id) {
        const events = getAllEvents();
        const filtered = events.filter(event => event.id !== id);
        localStorage.setItem(EVENTS_KEY, JSON.stringify(filtered));
        
        // Remover RSVPs relacionados
        const rsvps = getAllRSVPs();
        const filteredRsvps = rsvps.filter(rsvp => rsvp.event_id !== id);
        localStorage.setItem(RSVPS_KEY, JSON.stringify(filteredRsvps));
        
        return true;
    }

    // ===== RSVPs =====
    function addRSVP(rsvp) {
        initStorage();
        const rsvps = getAllRSVPs();
        
        // Verificar se já existe RSVP do mesmo usuário para este evento
        const existingIndex = rsvps.findIndex(r => r.event_id === rsvp.event_id && r.user_id === rsvp.user_id);
        
        if (existingIndex !== -1) {
            rsvps[existingIndex] = rsvp;
        } else {
            rsvps.push(rsvp);
        }
        
        localStorage.setItem(RSVPS_KEY, JSON.stringify(filteredRsvps));
        return rsvp;
    }

    function getAllRSVPs() {
        initStorage();
        return JSON.parse(localStorage.getItem(RSVPS_KEY)) || [];
    }

    function getRSVPs(eventId) {
        const rsvps = getAllRSVPs();
        return rsvps.filter(rsvp => rsvp.event_id === eventId);
    }

    function getUserRSVPs(userId) {
        const rsvps = getAllRSVPs();
        return rsvps.filter(rsvp => rsvp.user_id === userId);
    }

    function removeRSVP(eventId, userId) {
        const rsvps = getAllRSVPs();
        const filtered = rsvps.filter(rsvp => !(rsvp.event_id === eventId && rsvp.user_id === userId));
        localStorage.setItem(RSVPS_KEY, JSON.stringify(filtered));
        return true;
    }

    function getEventAttendeeCount(eventId) {
        const rsvps = getRSVPs(eventId);
        return rsvps.reduce((total, rsvp) => total + 1 + (rsvp.guests || 0), 0);
    }

    // ===== USUÁRIO =====
    function getOrCreateUserId() {
        let userId = localStorage.getItem(USER_KEY);
        if (!userId) {
            userId = 'user_' + generateId();
            localStorage.setItem(USER_KEY, userId);
        }
        return userId;
    }

    function getUserProfile() {
        const userId = getOrCreateUserId();
        const userName = localStorage.getItem(`${USER_KEY}_name`) || 'Convidado';
        return { id: userId, name: userName };
    }

    function updateUserName(name) {
        localStorage.setItem(`${USER_KEY}_name`, name);
        return name;
    }

    // ===== CONFIGURAÇÕES =====
    function getSettings() {
        initStorage();
        return JSON.parse(localStorage.getItem(SETTINGS_KEY));
    }

    function updateSettings(newSettings) {
        const current = getSettings();
        const updated = { ...current, ...newSettings };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
        return updated;
    }

    // ===== EXPORTAÇÃO/IMPORTAÇÃO =====
    function exportData() {
        return {
            events: getAllEvents(),
            rsvps: getAllRSVPs(),
            user: getUserProfile(),
            settings: getSettings(),
            version: '2.0',
            exportedAt: new Date().toISOString()
        };
    }

    function importData(data) {
        if (data.version !== '2.0') {
            throw new Error('Versão de dados incompatível');
        }
        
        if (data.events) localStorage.setItem(EVENTS_KEY, JSON.stringify(data.events));
        if (data.rsvps) localStorage.setItem(RSVPS_KEY, JSON.stringify(data.rsvps));
        if (data.user && data.user.name) {
            localStorage.setItem(`${USER_KEY}_name`, data.user.name);
        }
        if (data.settings) localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
        
        return true;
    }

    // ===== LIMPEZA =====
    function cleanupOldEvents(days = 30) {
        const events = getAllEvents();
        const now = new Date();
        const cutoff = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
        
        const activeEvents = events.filter(event => {
            const eventDate = new Date(`${event.date}T${event.time}`);
            return eventDate > cutoff;
        });
        
        if (activeEvents.length < events.length) {
            localStorage.setItem(EVENTS_KEY, JSON.stringify(activeEvents));
            
            // Remover RSVPs de eventos excluídos
            const activeEventIds = activeEvents.map(e => e.id);
            const rsvps = getAllRSVPs();
            const activeRSVPs = rsvps.filter(rsvp => activeEventIds.includes(rsvp.event_id));
            localStorage.setItem(RSVPS_KEY, JSON.stringify(activeRSVPs));
            
            return events.length - activeEvents.length;
        }
        
        return 0;
    }

    function clearAllData() {
        localStorage.removeItem(EVENTS_KEY);
        localStorage.removeItem(RSVPS_KEY);
        localStorage.removeItem(SETTINGS_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(`${USER_KEY}_name`);
        initStorage();
        return true;
    }

    return {
        generateId,
        saveEvent,
        getAllEvents,
        getEventById,
        getPublicEvents,
        getUserEvents,
        updateEvent,
        deleteEvent,
        addRSVP,
        getAllRSVPs,
        getRSVPs,
        getUserRSVPs,
        removeRSVP,
        getEventAttendeeCount,
        getOrCreateUserId,
        getUserProfile,
        updateUserName,
        getSettings,
        updateSettings,
        exportData,
        importData,
        cleanupOldEvents,
        clearAllData
    };
})();

// ==============================
// UTILITY FUNCTIONS
// ==============================

// Gerar ID (para uso global)
function generateId() {
    return DB.generateId();
}

// Obter ID do usuário
function getUserId() {
    return DB.getOrCreateUserId();
}

// Obter perfil do usuário
function getUserProfile() {
    return DB.getUserProfile();
}

// Formatar data e hora
function formatDate(dateStr, timeStr) {
    try {
        const date = new Date(dateStr + 'T' + timeStr);
        
        // Verificar se a data é válida
        if (isNaN(date.getTime())) {
            return 'Data inválida';
        }
        
        const options = { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        return date.toLocaleDateString('pt-BR', options);
    } catch (error) {
        console.error('Erro ao formatar data:', error);
        return `${dateStr} às ${timeStr}`;
    }
}

// Formatar data apenas (sem hora)
function formatDateOnly(dateStr) {
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        
        const options = { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric'
        };
        return date.toLocaleDateString('pt-BR', options);
    } catch {
        return dateStr;
    }
}

// Formatar hora apenas
function formatTimeOnly(timeStr) {
    try {
        const [hours, minutes] = timeStr.split(':');
        return `${hours}:${minutes}`;
    } catch {
        return timeStr;
    }
}

// Formatar data relativa (ex: "em 3 dias")
function formatRelativeDate(dateStr, timeStr) {
    const eventDate = new Date(dateStr + 'T' + timeStr);
    const now = new Date();
    const diffMs = eventDate - now;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
        return 'Evento passado';
    } else if (diffDays === 0) {
        return 'Hoje';
    } else if (diffDays === 1) {
        return 'Amanhã';
    } else if (diffDays < 7) {
        return `Em ${diffDays} dias`;
    } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `Em ${weeks} semana${weeks > 1 ? 's' : ''}`;
    } else {
        return formatDateOnly(dateStr);
    }
}

// Validar URL do Google Maps
function isValidGoogleMapsUrl(url) {
    if (!url || url === 'none') return false;
    
    try {
        const urlObj = new URL(url);
        const validHosts = [
            'google.com',
            'maps.google.com',
            'goo.gl',
            'maps.app.goo.gl',
            'google.com.br',
            'maps.google.com.br'
        ];
        return validHosts.some(host => urlObj.hostname.includes(host));
    } catch {
        return false;
    }
}

// Verificar se data é futura
function isFutureDate(dateStr, timeStr) {
    const eventDate = new Date(dateStr + 'T' + timeStr);
    const now = new Date();
    return eventDate > now;
}

// Capitalizar primeira letra
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Obter iniciais do nome
function getInitials(name) {
    if (!name) return '?';
    return name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .substring(0, 2);
}

// Formatar número
function formatNumber(num) {
    if (!num && num !== 0) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Mostrar notificação
function showNotification(message, type = 'info', duration = 3000) {
    // Remover notificações existentes
    const existing = document.querySelectorAll('.proclame-notification');
    existing.forEach(el => el.remove());
    
    const notification = document.createElement('div');
    notification.className = `proclame-notification fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full opacity-0 ${
        type === 'success' ? 'bg-green-500/90 text-white' :
        type === 'error' ? 'bg-red-500/90 text-white' :
        type === 'warning' ? 'bg-yellow-500/90 text-black' :
        'bg-slate-800/90 text-white'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
        notification.classList.remove('translate-x-full', 'opacity-0');
        notification.classList.add('translate-x-0', 'opacity-100');
    }, 10);
    
    // Remover após duração
    setTimeout(() => {
        notification.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

// Validar formulário de evento
function validateEventForm(formData) {
    const errors = [];
    
    // Nome
    if (!formData.get('name')?.trim()) {
        errors.push('O nome do evento é obrigatório');
    }
    
    // Data
    const date = formData.get('date');
    if (!date) {
        errors.push('A data é obrigatória');
    } else {
        const eventDate = new Date(date + 'T' + formData.get('time'));
        if (eventDate < new Date()) {
            errors.push('A data do evento deve ser futura');
        }
    }
    
    // Hora
    if (!formData.get('time')) {
        errors.push('A hora é obrigatória');
    }
    
    // Localização
    const locationType = formData.get('locationType');
    const location = formData.get('location');
    if (locationType !== 'none' && !location?.trim()) {
        errors.push('O local é obrigatório');
    }
    
    // Capacidade limitada
    if (formData.get('type') === 'limited') {
        const limit = parseInt(formData.get('attendee_limit'));
        if (!limit || limit < 1) {
            errors.push('A capacidade limitada deve ser maior que 0');
        }
    }
    
    return errors;
}

// Copiar para área de transferência
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showNotification('Copiado para a área de transferência!', 'success');
        return true;
    } catch (err) {
        console.error('Falha ao copiar:', err);
        showNotification('Erro ao copiar', 'error');
        return false;
    }
}

// Gerar QR Code URL
function generateQRCodeUrl(text, size = 200) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
}

// ==============================
// INITIALIZATION
// ==============================

// Inicializar dados de exemplo
function initSampleData() {
    const events = DB.getAllEvents();
    
    if (events.length === 0) {
        const userId = getUserId();
        const sampleEvents = [
            {
                id: generateId(),
                name: "🎉 Festa de Aniversário Surpresa",
                date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                time: "20:00",
                location: "Rua das Flores, 123 - Jardins, São Paulo - SP",
                locationType: "text",
                type: "limited",
                attendeeLimit: 30,
                visibility: "public",
                description: "Venha celebrar comigo! Traga seu sorriso e disposição para dançar. Teremos música ao vivo, comida e muitas surpresas!",
                userId: userId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: generateId(),
                name: "💻 Workshop de Desenvolvimento Web",
                date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                time: "14:00",
                location: "https://maps.app.goo.gl/example123",
                locationType: "maps",
                type: "unlimited",
                attendeeLimit: null,
                visibility: "public",
                description: "Aprenda as melhores práticas de desenvolvimento web front-end com React e Tailwind CSS. Traga seu notebook!",
                userId: userId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: generateId(),
                name: "🍖 Churrasco de Confraternização",
                date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                time: "12:00",
                location: "none",
                locationType: "none",
                type: "limited",
                attendeeLimit: 25,
                visibility: "private",
                description: "Churrasco entre amigos na casa do João. Cada um traz sua bebida!",
                userId: userId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];

        sampleEvents.forEach(event => DB.saveEvent(event));
        
        // Adicionar alguns RSVPs de exemplo
        const sampleRSVPs = [
            {
                id: generateId(),
                event_id: sampleEvents[0].id,
                user_id: generateId(),
                name: "Ana Silva",
                email: "ana@email.com",
                guests: 1,
                comment: "Mal posso esperar!",
                created_at: new Date().toISOString()
            },
            {
                id: generateId(),
                event_id: sampleEvents[0].id,
                user_id: generateId(),
                name: "Carlos Mendes",
                email: "carlos@email.com",
                guests: 2,
                comment: "Levarei meus primos",
                created_at: new Date().toISOString()
            },
            {
                id: generateId(),
                event_id: sampleEvents[1].id,
                user_id: generateId(),
                name: "Mariana Costa",
                email: "mariana@email.com",
                guests: 0,
                comment: "Ansiosa para aprender!",
                created_at: new Date().toISOString()
            }
        ];

        sampleRSVPs.forEach(rsvp => DB.addRSVP(rsvp));
        
        // Configurar nome do usuário principal
        DB.updateUserName('Organizador');
        
        console.log('📊 Dados de exemplo inicializados!');
    }
}

// Limpar eventos antigos automaticamente
function autoCleanup() {
    const cleaned = DB.cleanupOldEvents(60); // 60 dias
    if (cleaned > 0) {
        console.log(`🧹 Limpos ${cleaned} eventos antigos`);
    }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    // Executar limpeza automática
    autoCleanup();
    
    // Inicializar dados de exemplo (comente para produção)
    initSampleData();
    
    // Atualizar contador de eventos na navbar se existir
    updateEventCounters();
    
    // Configurar tema
    setupTheme();
});

// Atualizar contadores
function updateEventCounters() {
    const publicEvents = DB.getPublicEvents();
    const userEvents = DB.getUserEvents(getUserId());
    const userRSVPs = DB.getUserRSVPs(getUserId());
    
    // Atualizar elementos com classes específicas
    document.querySelectorAll('.public-events-count').forEach(el => {
        el.textContent = publicEvents.length;
    });
    
    document.querySelectorAll('.my-events-count').forEach(el => {
        el.textContent = userEvents.length;
    });
    
    document.querySelectorAll('.my-rsvps-count').forEach(el => {
        el.textContent = userRSVPs.length;
    });
}

// Configurar tema
function setupTheme() {
    const settings = DB.getSettings();
    if (settings.theme === 'light') {
        document.documentElement.classList.add('light-theme');
    }
}

// Alternar tema
function toggleTheme() {
    const settings = DB.getSettings();
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
    DB.updateSettings({ theme: newTheme });
    
    if (newTheme === 'light') {
        document.documentElement.classList.add('light-theme');
    } else {
        document.documentElement.classList.remove('light-theme');
    }
    
    showNotification(`Tema alterado para ${newTheme === 'dark' ? 'escuro' : 'claro'}`, 'success');
}

// ==============================
// EXPORT FUNCTIONS FOR GLOBAL USE
// ==============================

// Tornar funções disponíveis globalmente
window.DB = DB;
window.generateId = generateId;
window.getUserId = getUserId;
window.getUserProfile = getUserProfile;
window.formatDate = formatDate;
window.formatDateOnly = formatDateOnly;
window.formatTimeOnly = formatTimeOnly;
window.formatRelativeDate = formatRelativeDate;
window.formatNumber = formatNumber;
window.showNotification = showNotification;
window.copyToClipboard = copyToClipboard;
window.generateQRCodeUrl = generateQRCodeUrl;
window.toggleTheme = toggleTheme;
window.updateEventCounters = updateEventCounters;
[file content end]