/// ==================== SERVICE WORKER VAPE MARKET ====================
const CACHE_NAME = 'vape-market-v2.0';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/config.js',
    '/pages/profile.html',
    '/pages/faq.html',
    '/pages/admin.html',
    '/manifest.json',
    'https://telegram.org/js/telegram-web-app.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Установка Service Worker
self.addEventListener('install', event => {
    console.log('✅ Service Worker: Установка');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('✅ Service Worker: Кэширование файлов');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                console.log('✅ Service Worker: Установка завершена');
                return self.skipWaiting();
            })
    );
});

// Активация Service Worker
self.addEventListener('activate', event => {
    console.log('✅ Service Worker: Активация');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log(`🗑️ Service Worker: Удаление старого кэша ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('✅ Service Worker: Активация завершена');
            return self.clients.claim();
        })
    );
});

// Обработка запросов
self.addEventListener('fetch', event => {
    // Игнорируем запросы к API и внешние ресурсы
    if (event.request.url.includes('/api/') ||
        event.request.url.includes('firebase') ||
        event.request.url.includes('googleapis')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    console.log('📦 Service Worker: Загрузка из кэша', event.request.url);
                    return response;
                }
                
                console.log('🌐 Service Worker: Загрузка из сети', event.request.url);
                return fetch(event.request)
                    .then(response => {
                        // Кэшируем только успешные GET запросы
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    })
                    .catch(error => {
                        console.error('❌ Service Worker: Ошибка загрузки', error);
                        
                        // Для страниц показываем оффлайн страницу
                        if (event.request.mode === 'navigate') {
                            return caches.match('/offline.html');
                        }
                        
                        return new Response('Нет подключения к интернету', {
                            status: 503,
                            headers: { 'Content-Type': 'text/plain' }
                        });
                    });
            })
    );
});

// Обработка push уведомлений
self.addEventListener('push', event => {
    console.log('🔔 Service Worker: Push уведомление');
    
    const data = event.data.json();
    
    const options = {
        body: data.body,
        icon: '/icon-192.png',
        badge: '/badge.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/'
        },
        actions: [
            {
                action: 'open',
                title: 'Открыть'
            },
            {
                action: 'close',
                title: 'Закрыть'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', event => {
    console.log('🖱️ Service Worker: Клик по уведомлению');
    
    event.notification.close();
    
    if (event.action === 'open') {
        event.waitUntil(
            clients.openWindow(event.notification.data.url)
        );
    }
});

// Фоновая синхронизация
self.addEventListener('sync', event => {
    console.log('🔄 Service Worker: Фоновая синхронизация', event.tag);
    
    if (event.tag === 'sync-ads') {
        event.waitUntil(syncAds());
    }
});

// Функция синхронизации объявлений
async function syncAds() {
    console.log('🔄 Service Worker: Синхронизация объявлений');
    
    try {
        // Здесь будет логика синхронизации
        // Пока просто логируем
        console.log('✅ Service Worker: Синхронизация завершена');
    } catch (error) {
        console.error('❌ Service Worker: Ошибка синхронизации', error);
    }
}

// Периодическая синхронизация
self.addEventListener('periodicsync', event => {
    if (event.tag === 'update-ads') {
        console.log('📅 Service Worker: Периодическая синхронизация');
        event.waitUntil(updateAds());
    }
});

// Функция обновления объявлений
async function updateAds() {
    console.log('🔄 Service Worker: Обновление объявлений');
    
    try {
        // Здесь будет логика обновления
        // Пока просто логируем
        console.log('✅ Service Worker: Обновление завершено');
    } catch (error) {
        console.error('❌ Service Worker: Ошибка обновления', error);
    }
}

// Обработка сообщений
self.addEventListener('message', event => {
    console.log('💬 Service Worker: Сообщение', event.data);
    
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
