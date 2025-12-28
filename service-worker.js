// service-worker.js - упрощенная версия
const CACHE_NAME = 'vape-market-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/config.js',
  '/manifest.json'
];

// Установка Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker: установлен');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: кэшируем файлы');
        // Кэшируем только основные файлы
        return cache.addAll([
          '/index.html',
          '/style.css',
          '/app.js',
          '/config.js'
        ]).catch(error => {
          console.log('Service Worker: ошибка кэширования', error);
        });
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker: активирован');
  
  // Очистка старых кэшей
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: очистка старого кэша', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Перехват запросов
self.addEventListener('fetch', event => {
  // Пропускаем запросы к Firebase и внешним ресурсам
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('telegram') ||
      event.request.url.startsWith('data:') ||
      event.request.url.includes('chrome-extension')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Возвращаем из кэша или делаем сетевой запрос
        return response || fetch(event.request);
      })
  );
});
