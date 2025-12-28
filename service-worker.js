const CACHE_NAME = 'vape-market-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/assets/css/style.css',
  '/assets/js/app.js',
  '/assets/js/config.js',
  '/assets/js/utils.js',
  '/assets/js/components.js',
  '/api/server-api.js',
  '/pages/profile.html',
  '/pages/faq.html',
  '/pages/admin.html',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://telegram.org/js/telegram-web-app.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js'
];

// Установка Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Кэширование файлов...');
        return cache.addAll(urlsToCache);
      })
  );
});

// Активация и очистка старых кэшей
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Удаление старого кэша:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Стратегия кэширования: Network First, Fallback to Cache
self.addEventListener('fetch', event => {
  // Пропускаем запросы к Firebase
  if (event.request.url.includes('firebaseio.com') || 
      event.request.url.includes('firebasestorage.googleapis.com')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Клонируем ответ для кэширования
        const responseToCache = response.clone();
        
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });
          
        return response;
      })
      .catch(() => {
        // Если нет сети, используем кэш
        return caches.match(event.request)
          .then(response => {
            if (response) {
              return response;
            }
            
            // Для страниц возвращаем index.html
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            
            return new Response('Нет соединения с интернетом', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Фоновая синхронизация
self.addEventListener('sync', event => {
  if (event.tag === 'sync-ads') {
    event.waitUntil(syncAds());
  }
});

async function syncAds() {
  console.log('Фоновая синхронизация объявлений...');
  // Здесь можно добавить логику фоновой синхронизации
}
