// Firebase конфигурация
const firebaseConfig = {
  apiKey: "AIzaSyBLmzW0aLaZfFd5zCYvslbVrqYJgKqsNwM",
  authDomain: "telegram-market-vape.firebaseapp.com",
  databaseURL: "https://telegram-market-vape-default-rtdb.firebaseio.com",
  projectId: "telegram-market-vape",
  storageBucket: "telegram-market-vape.firebasestorage.app",
  messagingSenderId: "1072653718556",
  appId: "1:1072653718556:web:9e073a9259e2e728dfbb54",
  measurementId: "G-W8E5GL5JQ6"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let currentUser = null;
let serverCache = {};
let allItems = [];

// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();

// Инициализация приложения
async function initApp() {
  console.log("🚀 Инициализация приложения...");
  
  try {
    // Получение данных пользователя из Telegram
    const user = tg.initDataUnsafe?.user;
    if (user) {
      currentUser = {
        id: user.id,
        username: user.username || `user_${user.id}`,
        firstName: user.first_name || 'User',
        lastName: user.last_name || '',
        isPremium: user.is_premium || false
      };
      console.log("👤 Пользователь Telegram:", currentUser);
    } else {
      console.log("⚠️ Данные пользователя не получены");
      currentUser = {
        id: Date.now(),
        username: 'test_user',
        firstName: 'Test',
        lastName: 'User',
        isPremium: false
      };
    }

    // Проверка и создание профиля пользователя
    await checkOrCreateUserProfile(currentUser);

    // Загрузка данных
    await loadInitialData();
    
    // Обновление UI
    updateMainUI();
    
  } catch (error) {
    console.error("❌ Ошибка инициализации:", error);
    showNotification("Ошибка загрузки приложения", "error");
  }
}

// Загрузка начальных данных
async function loadInitialData() {
  try {
    // Загрузка кэшированных данных
    const cachedData = localStorage.getItem('market_cache');
    if (cachedData) {
      serverCache = JSON.parse(cachedData);
      console.log("📦 Загружены кэшированные данные");
    }

    // Загрузка данных из Firebase
    await loadFromServer();
    
    // Загрузка рекламы
    await loadAds();
    
  } catch (error) {
    console.error("❌ Ошибка загрузки данных:", error);
    showNotification("Ошибка загрузки данных", "error");
  }
}

// Загрузка данных с сервера
async function loadFromServer() {
  console.log("📡 Загрузка данных с сервера...");
  
  try {
    // Получение всех товаров
    const itemsSnapshot = await db.ref('items').once('value');
    const itemsData = itemsSnapshot.val() || {};
    
    // Получение категорий
    const categoriesSnapshot = await db.ref('categories').once('value');
    const categoriesData = categoriesSnapshot.val() || {};
    
    // Получение отзывов
    const reviewsSnapshot = await db.ref('reviews').once('value');
    const reviewsData = reviewsSnapshot.val() || {};
    
    // Сохранение в кэш
    serverCache = {
      items: itemsData,
      categories: categoriesData,
      reviews: reviewsData,
      lastUpdated: Date.now()
    };
    
    // Сохранение в localStorage
    localStorage.setItem('market_cache', JSON.stringify(serverCache));
    
    // Преобразование товаров в массив
    allItems = Object.entries(itemsData).map(([id, item]) => ({
      id,
      ...item
    }));
    
    console.log("✅ Данные загружены:", {
      items: allItems.length,
      categories: Object.keys(categoriesData).length,
      reviews: Object.keys(reviewsData).length
    });
    
  } catch (error) {
    console.error("❌ Ошибка загрузки данных:", error);
    throw error;
  }
}

// Загрузка рекламы
async function loadAds() {
  try {
    const response = await fetch('https://raw.githubusercontent.com/nukm0/telegram_market_vape/main/api/ads.js');
    if (response.ok) {
      const adsScript = await response.text();
      console.log("📢 Рекламный скрипт загружен");
      // Здесь можно выполнить скрипт или обработать данные
    }
  } catch (error) {
    console.error("❌ Ошибка загрузки рекламы:", error);
  }
}

// Проверка и создание профиля пользователя
async function checkOrCreateUserProfile(user) {
  try {
    const userRef = db.ref(`users/${user.id}`);
    const snapshot = await userRef.once('value');
    
    if (!snapshot.exists()) {
      // Создание нового профиля
      const userData = {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        isPremium: user.isPremium,
        joined: Date.now(),
        balance: 0,
        orders: 0,
        reviews: 0
      };
      
      await userRef.set(userData);
      console.log("✅ Создан новый профиль пользователя");
    } else {
      // Обновление существующего профиля
      await userRef.update({
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        isPremium: user.isPremium,
        lastSeen: Date.now()
      });
      console.log("✅ Профиль пользователя обновлен");
    }
  } catch (error) {
    console.error("❌ Ошибка создания профиля:", error);
  }
}

// Обновление основного UI
function updateMainUI() {
  console.log("🎨 Обновление интерфейса...");
  
  // Отображение имени пользователя
  const userNameElement = document.getElementById('userName');
  if (userNameElement && currentUser) {
    userNameElement.textContent = currentUser.firstName;
  }
  
  // Отображение категорий
  updateCategoriesUI();
  
  // Отображение товаров
  updateItemsUI();
  
  // Инициализация обработчиков событий
  initEventListeners();
}

// Обновление UI категорий
function updateCategoriesUI() {
  const categoriesContainer = document.getElementById('categories');
  if (!categoriesContainer) return;
  
  const categories = serverCache.categories || {};
  
  if (Object.keys(categories).length === 0) {
    categoriesContainer.innerHTML = '<p class="no-data">Категории не найдены</p>';
    return;
  }
  
  categoriesContainer.innerHTML = '';
  Object.entries(categories).forEach(([id, category]) => {
    const categoryElement = document.createElement('div');
    categoryElement.className = 'category-item';
    categoryElement.innerHTML = `
      <img src="${category.image || 'https://via.placeholder.com/150'}" alt="${category.name}">
      <span>${category.name}</span>
    `;
    categoryElement.addEventListener('click', () => filterByCategory(id));
    categoriesContainer.appendChild(categoryElement);
  });
}

// Обновление UI товаров
function updateItemsUI() {
  const itemsGrid = document.getElementById('itemsGrid');
  if (!itemsGrid) return;
  
  if (allItems.length === 0) {
    itemsGrid.innerHTML = '<p class="no-data">Товары не найдены</p>';
    return;
  }
  
  itemsGrid.innerHTML = '';
  allItems.forEach(item => {
    const itemElement = document.createElement('div');
    itemElement.className = 'item-card';
    itemElement.innerHTML = `
      <img src="${item.image || 'https://via.placeholder.com/200'}" alt="${item.name}">
      <h3>${item.name}</h3>
      <p class="price">${formatPrice(item.price)}</p>
      <p class="description">${item.description || ''}</p>
      <button class="buy-btn" data-id="${item.id}">Купить</button>
    `;
    itemsGrid.appendChild(itemElement);
  });
}

// Фильтрация по категории
function filterByCategory(categoryId) {
  const filteredItems = allItems.filter(item => item.categoryId === categoryId);
  console.log(`🔍 Фильтр: ${filteredItems.length} товаров в категории`);
  
  // Обновление отображения товаров
  const itemsGrid = document.getElementById('itemsGrid');
  if (!itemsGrid) return;
  
  if (filteredItems.length === 0) {
    itemsGrid.innerHTML = '<p class="no-data">Товары не найдены</p>';
    return;
  }
  
  itemsGrid.innerHTML = '';
  filteredItems.forEach(item => {
    const itemElement = document.createElement('div');
    itemElement.className = 'item-card';
    itemElement.innerHTML = `
      <img src="${item.image || 'https://via.placeholder.com/200'}" alt="${item.name}">
      <h3>${item.name}</h3>
      <p class="price">${formatPrice(item.price)}</p>
      <p class="description">${item.description || ''}</p>
      <button class="buy-btn" data-id="${item.id}">Купить</button>
    `;
    itemsGrid.appendChild(itemElement);
  });
}

// Инициализация обработчиков событий
function initEventListeners() {
  // Обработчики для кнопок покупки
  document.querySelectorAll('.buy-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      const itemId = e.target.dataset.id;
      const item = allItems.find(i => i.id === itemId);
      if (item) {
        showBuyModal(item);
      }
    });
  });
  
  // Обработчик поиска
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      const filteredItems = allItems.filter(item => 
        item.name.toLowerCase().includes(searchTerm) || 
        (item.description && item.description.toLowerCase().includes(searchTerm))
      );
      updateItemsGrid(filteredItems);
    });
  }
  
  // Обработчики навигации
  const profileBtn = document.getElementById('profileBtn');
  if (profileBtn) {
    profileBtn.addEventListener('click', () => {
      window.location.href = 'pages/profile.html';
    });
  }
  
  const faqBtn = document.getElementById('faqBtn');
  if (faqBtn) {
    faqBtn.addEventListener('click', () => {
      window.location.href = 'pages/faq.html';
    });
  }
}

// Обновление сетки товаров
function updateItemsGrid(items) {
  const itemsGrid = document.getElementById('itemsGrid');
  if (!itemsGrid) return;
  
  if (items.length === 0) {
    itemsGrid.innerHTML = '<p class="no-data">Товары не найдены</p>';
    return;
  }
  
  itemsGrid.innerHTML = '';
  items.forEach(item => {
    const itemElement = document.createElement('div');
    itemElement.className = 'item-card';
    itemElement.innerHTML = `
      <img src="${item.image || 'https://via.placeholder.com/200'}" alt="${item.name}">
      <h3>${item.name}</h3>
      <p class="price">${formatPrice(item.price)}</p>
      <p class="description">${item.description || ''}</p>
      <button class="buy-btn" data-id="${item.id}">Купить</button>
    `;
    itemsGrid.appendChild(itemElement);
  });
}

// Показать модальное окно покупки
function showBuyModal(item) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close">&times;</span>
      <h2>${item.name}</h2>
      <img src="${item.image || 'https://via.placeholder.com/300'}" alt="${item.name}">
      <p>${item.description || ''}</p>
      <p class="price">Цена: ${formatPrice(item.price)}</p>
      <button class="confirm-buy-btn">Подтвердить покупку</button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Обработчик закрытия
  modal.querySelector('.close').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  // Обработчик подтверждения покупки
  modal.querySelector('.confirm-buy-btn').addEventListener('click', () => {
    processPurchase(item);
    document.body.removeChild(modal);
  });
}

// Обработка покупки
async function processPurchase(item) {
  try {
    // Создание заказа
    const orderId = `order_${Date.now()}_${currentUser.id}`;
    const orderData = {
      itemId: item.id,
      itemName: item.name,
      price: item.price,
      userId: currentUser.id,
      userName: currentUser.username,
      timestamp: Date.now(),
      status: 'pending'
    };
    
    await db.ref(`orders/${orderId}`).set(orderData);
    
    // Обновление статистики пользователя
    await db.ref(`users/${currentUser.id}/orders`).transaction(current => (current || 0) + 1);
    
    showNotification(`✅ Заказ "${item.name}" оформлен!`, "success");
    
  } catch (error) {
    console.error("❌ Ошибка оформления заказа:", error);
    showNotification("Ошибка оформления заказа", "error");
  }
}

// Форматирование цены
function formatPrice(price) {
  return typeof price === 'number' ? `${price.toLocaleString()} ₽` : `${price} ₽`;
}

// Показать уведомление
function showNotification(message, type = "info") {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    background: ${type === 'error' ? '#ff4444' : type === 'success' ? '#4CAF50' : '#2196F3'};
    color: white;
    border-radius: 5px;
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
        }
      }, 300);
    }
  }, 3000);
}

// Добавление стилей для анимации
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// Запуск приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  console.log("📄 DOM загружен");
  initApp();
});

// Обработчик обновления данных
setInterval(async () => {
  try {
    await loadFromServer();
    updateMainUI();
    console.log("🔄 Данные обновлены");
  } catch (error) {
    console.error("❌ Ошибка обновления данных:", error);
  }
}, 300000); // Обновление каждые 5 минут
