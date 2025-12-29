// Service Worker для Vape Market
const CACHE_NAME = 'vape-market-v1.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/config.js',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://telegram.org/js/telegram-web-app.js'
];

// Установка Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Кэширование файлов...');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Активация и очистка старых кэшей
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Удаление старого кэша:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Обработка запросов
self.addEventListener('fetch', event => {
  // Игнорируем запросы к API
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Возвращаем из кэша если есть
        if (response) {
          return response;
        }

        // Иначе загружаем из сети
        return fetch(event.request)
          .then(response => {
            // Копируем ответ
            const responseToCache = response.clone();

            // Кэшируем для будущего использования
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(error => {
            console.error('❌ Ошибка загрузки:', error);
            
            // Для HTML страниц показываем офлайн страницу
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/offline.html');
            }
            
            // Для других файлов возвращаем ошибку
            return new Response('Офлайн режим', {
              status: 503,
              statusText: 'Нет подключения',
              headers: new Headers({
                'Content-Type': 'text/plain; charset=utf-8'
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

// Пуш-уведомления
self.addEventListener('push', event => {
  const options = {
    body: event.data.text(),
    icon: 'https://cdn.jsdelivr.net/npm/@mdi/svg@7.2.96/svg/cigarette.svg',
    badge: 'https://cdn.jsdelivr.net/npm/@mdi/svg@7.2.96/svg/cigarette.svg',
    vibrate: [200, 100, 200],
    data: {
      url: 'https://telegram-market-vape.vercel.app'
    }
  };

  event.waitUntil(
    self.registration.showNotification('Vape Market', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});

// Вспомогательные функции
async function syncAds() {
  try {
    const response = await fetch('/api/ads');
    const ads = await response.json();
    
    // Сохраняем в IndexedDB или localStorage
    const db = await openDatabase();
    await saveAdsToDB(db, ads);
    
    console.log('✅ Объявления синхронизированы');
    
  } catch (error) {
    console.error('❌ Ошибка синхронизации:', error);
  }
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VapeMarketDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      
      // Создаем хранилище для объявлений
      if (!db.objectStoreNames.contains('ads')) {
        const store = db.createObjectStore('ads', { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('category', 'category', { unique: false });
      }
      
      // Создаем хранилище для пользователей
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'id' });
      }
    };
  });
}

function saveAdsToDB(db, ads) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['ads'], 'readwrite');
    const store = transaction.objectStore('ads');
    
    // Очищаем старые данные
    store.clear();
    
    // Сохраняем новые объявления
    ads.forEach(ad => {
      store.put(ad);
    });
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
