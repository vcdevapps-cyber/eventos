[file name]: service-worker.js
[file content begin]
// Versão do Service Worker
const CACHE_VERSION = 'v2.0.0';
const CACHE_NAME = `proclame-cache-${CACHE_VERSION}`;

// Arquivos para cache (App Shell)
const APP_SHELL_FILES = [
  '/',
  '/index.html',
  '/discover.html',
  '/create.html',
  '/event.html',
  '/my-events.html',
  '/my-rsvps.html',
  '/js/app.js',
  '/css/custom.css',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Arquivos para cache dinâmico
const DYNAMIC_CACHE_FILES = [
  // Imagens e ícones serão cacheados dinamicamente
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Cacheando arquivos do App Shell');
        return cache.addAll(APP_SHELL_FILES);
      })
      .then(() => {
        console.log('[Service Worker] Instalação completa');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Erro na instalação:', error);
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Ativando...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Remove caches antigos
            if (cacheName !== CACHE_NAME) {
              console.log('[Service Worker] Removendo cache antigo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Ativação completa');
        return self.clients.claim();
      })
  );
});

// Estratégia de Cache: Network First com Fallback para Cache
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Ignora requisições não GET
  if (event.request.method !== 'GET') return;
  
  // Para páginas HTML, usa estratégia Network First
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clona a resposta para armazenar no cache
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone);
            });
          return response;
        })
        .catch(() => {
          // Fallback para cache
          return caches.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Fallback para página offline
              return caches.match('/index.html');
            });
        })
    );
    return;
  }
  
  // Para arquivos estáticos (CSS, JS, imagens), usa Cache First
  if (url.pathname.endsWith('.css') || 
      url.pathname.endsWith('.js') || 
      url.pathname.endsWith('.png') || 
      url.pathname.endsWith('.jpg') || 
      url.pathname.endsWith('.svg')) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          return fetch(event.request)
            .then((response) => {
              // Não cachea se não for uma resposta válida
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // Clona a resposta para armazenar no cache
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseClone);
                });
              
              return response;
            });
        })
    );
    return;
  }
  
  // Para APIs e outros recursos, usa Network First
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Sincronização em Background (para funcionalidades futuras)
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Sincronização em background:', event.tag);
  
  if (event.tag === 'sync-events') {
    event.waitUntil(syncEvents());
  }
});

// Notificações Push (para funcionalidades futuras)
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Notificação push recebida');
  
  const options = {
    body: event.data?.text() || 'Novo evento ou atualização disponível!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: event.data?.url() || '/'
    },
    actions: [
      {
        action: 'view',
        title: 'Ver'
      },
      {
        action: 'dismiss',
        title: 'Fechar'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Proclame', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notificação clicada');
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});

// Função de sincronização (exemplo)
async function syncEvents() {
  console.log('[Service Worker] Sincronizando eventos...');
  // Implementação futura para sincronização com backend
}

// Atualização automática do Service Worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
[file content end]