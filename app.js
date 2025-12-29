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

// Сервер API
const FirebaseMarketServer = {
  async getRatings() {
    try {
      const snapshot = await db.ref('ratings').once('value');
      return snapshot.val() || {};
    } catch (error) {
      console.error("❌ Ошибка загрузки рейтингов:", error);
      return {};
    }
  }
};

// 1. Настройка обработчиков событий
function setupEventListeners() {
  console.log("🎯 Настройка обработчиков событий...");

  // Кнопка профиля
  const profileBtn = document.getElementById('profileBtn');
  if (profileBtn) {
    profileBtn.addEventListener('click', () => {
      window.location.href = 'pages/profile.html';
    });
  }

  // Кнопка FAQ
  const faqBtn = document.getElementById('faqBtn');
  if (faqBtn) {
    faqBtn.addEventListener('click', () => {
      window.location.href = 'pages/faq.html';
    });
  }

  // Поиск
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', function(e) {
      const searchTerm = e.target.value.toLowerCase().trim();
      if (!searchTerm) {
        updateItemsGrid(allItems);
        return;
      }
      const filteredItems = allItems.filter(item => 
        item.name.toLowerCase().includes(searchTerm) ||
        (item.description && item.description.toLowerCase().includes(searchTerm))
      );
      updateItemsGrid(filteredItems);
    });
  }

  // Кнопка обновления
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      showNotification("Обновление данных...", "info");
      await loadFromServer();
      updateUIAfterDataLoad();
    });
  }

  // Навигация внизу
  const profileBtnNav = document.getElementById('profileBtnNav');
  if (profileBtnNav) {
    profileBtnNav.addEventListener('click', () => {
      window.location.href = 'pages/profile.html';
    });
  }

  const cartBtnNav = document.getElementById('cartBtnNav');
  if (cartBtnNav) {
    cartBtnNav.addEventListener('click', () => {
      showNotification("Корзина в разработке", "info");
    });
  }
}

// 2. Обновление UI после загрузки данных
function updateUIAfterDataLoad() {
  console.log("🎨 Обновление интерфейса...");

  // Имя пользователя
  const userNameElement = document.getElementById('userName');
  if (userNameElement && currentUser) {
    userNameElement.textContent = currentUser.firstName;
  }

  // Категории
  updateCategories();

  // Товары
  updateItemsGrid();

  // Счетчик товаров
  const itemsCount = document.getElementById('itemsCount');
  if (itemsCount) {
    itemsCount.textContent = allItems.length;
  }

  // Динамические обработчики
  initDynamicEventListeners();
}

// 3. Обновление категорий
function updateCategories() {
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
    categoryElement.dataset.category = id;
    categoryElement.innerHTML = `
      <img src="${category.image || 'https://via.placeholder.com/150'}" alt="${category.name}">
      <span>${category.name}</span>
    `;
    categoriesContainer.appendChild(categoryElement);
  });
}

// 4. Обновление сетки товаров
function updateItemsGrid(items = allItems) {
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
      <img src="${item.image || 'https://via.placeholder.com/200'}" alt="${item.name}" class="item-image">
      <div class="item-info">
        <h3 class="item-title">${item.name}</h3>
        <div class="item-meta">
          <span class="item-category">${getCategoryName(item.categoryId)}</span>
        </div>
        <p class="item-description">${item.description?.substring(0, 100) || ''}${item.description?.length > 100 ? '...' : ''}</p>
        <div class="item-footer">
          <span class="item-price">${formatPrice(item.price)}</span>
          <button class="buy-btn" data-id="${item.id}">Купить</button>
        </div>
      </div>
    `;
    itemsGrid.appendChild(itemElement);
  });
}

// 5. Динамические обработчики
function initDynamicEventListeners() {
  // Кнопки покупки
  document.querySelectorAll('.buy-btn').forEach(button => {
    button.addEventListener('click', function(e) {
      const itemId = e.target.dataset.id;
      const item = allItems.find(i => i.id === itemId);
      if (item) {
        showBuyModal(item);
      }
    });
  });

  // Категории
  document.querySelectorAll('.category-item').forEach(category => {
    category.addEventListener('click', function(e) {
      const categoryId = e.currentTarget.dataset.category;
      filterItemsByCategory(categoryId);
    });
  });
}

// 6. Фильтрация по категории
function filterItemsByCategory(categoryId) {
  if (!categoryId) {
    updateItemsGrid(allItems);
    return;
  }
  
  const filteredItems = allItems.filter(item => item.categoryId === categoryId);
  updateItemsGrid(filteredItems);
}

// 7. Получение названия категории
function getCategoryName(categoryId) {
  if (!categoryId) return 'Без категории';
  const categories = serverCache.categories || {};
  return categories[categoryId]?.name || 'Без категории';
}

// 8. Форматирование цены
function formatPrice(price) {
  if (typeof price === 'number') {
    return `${price.toLocaleString('ru-RU')} ₽`;
  }
  return `${price} ₽`;
}

// 9. Инициализация приложения
async function initApp() {
  console.log("🚀 Инициализация приложения...");

  try {
    // Пользователь Telegram
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

    // Проверка профиля
    await checkOrCreateUserProfile(currentUser);

    // Загрузка данных
    await loadInitialData();

    // Настройка обработчиков
    setupEventListeners();

    // Обновление UI
    updateUIAfterDataLoad();

  } catch (error) {
    console.error("❌ Ошибка инициализации:", error);
    showNotification("Ошибка загрузки приложения", "error");
  }
}

// 10. Загрузка начальных данных
async function loadInitialData() {
  try {
    // Кэш
    const cachedData = localStorage.getItem('market_cache');
    if (cachedData) {
      serverCache = JSON.parse(cachedData);
      console.log("📦 Загружены кэшированные данные");
    }

    // Данные с сервера
    await loadFromServer();
    
  } catch (error) {
    console.error("❌ Ошибка загрузки данных:", error);
    showNotification("Ошибка загрузки данных", "error");
  }
}

// 11. Загрузка данных с сервера
async function loadFromServer() {
  console.log("📡 Загрузка данных с сервера...");

  try {
    // Товары
    const itemsSnapshot = await db.ref('items').once('value');
    const itemsData = itemsSnapshot.val() || {};
    
    // Категории
    const categoriesSnapshot = await db.ref('categories').once('value');
    const categoriesData = categoriesSnapshot.val() || {};
    
    // Отзывы
    const reviewsSnapshot = await db.ref('reviews').once('value');
    const reviewsData = reviewsSnapshot.val() || {};
    
    // Рейтинги
    const ratings = await FirebaseMarketServer.getRatings();
    
    // Кэш
    serverCache = {
      items: itemsData,
      categories: categoriesData,
      reviews: reviewsData,
      ratings: ratings,
      lastUpdated: Date.now()
    };
    
    localStorage.setItem('market_cache', JSON.stringify(serverCache));
    
    // Массив товаров
    allItems = Object.entries(itemsData).map(([id, item]) => ({
      id,
      ...item
    }));
    
    console.log("✅ Данные загружены:", {
      items: allItems.length,
      categories: Object.keys(categoriesData).length
    });
    
  } catch (error) {
    console.error("❌ Ошибка загрузки данных:", error);
    throw error;
  }
}

// 12. Проверка профиля
async function checkOrCreateUserProfile(user) {
  try {
    const userRef = db.ref(`users/${user.id}`);
    const snapshot = await userRef.once('value');
    
    if (!snapshot.exists()) {
      const userData = {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        isPremium: user.isPremium,
        joined: Date.now(),
        balance: 0,
        orders: 0,
        reviews: 0,
        lastSeen: Date.now()
      };
      
      await userRef.set(userData);
      console.log("✅ Создан новый профиль");
    } else {
      await userRef.update({
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        isPremium: user.isPremium,
        lastSeen: Date.now()
      });
      console.log("✅ Профиль обновлен");
    }
  } catch (error) {
    console.error("❌ Ошибка создания профиля:", error);
  }
}

// 13. Модальное окно покупки
function showBuyModal(item) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h2>${item.name}</h2>
        <button class="modal-close">×</button>
      </div>
      <div class="modal-body">
        <img src="${item.image || 'https://via.placeholder.com/300'}" alt="${item.name}">
        <div class="modal-info">
          <p><strong>Цена:</strong> ${formatPrice(item.price)}</p>
          <p><strong>Описание:</strong> ${item.description || 'Нет описания'}</p>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary modal-close">Отмена</button>
        <button class="btn-primary" id="confirmPurchase">Купить</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
  });
  
  modal.querySelector('#confirmPurchase').addEventListener('click', async () => {
    await processPurchase(item);
    document.body.removeChild(modal);
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

// 14. Обработка покупки
async function processPurchase(item) {
  try {
    const orderId = `order_${Date.now()}_${currentUser.id}`;
    const orderData = {
      id: orderId,
      itemId: item.id,
      itemName: item.name,
      price: item.price,
      userId: currentUser.id,
      userName: currentUser.username,
      timestamp: Date.now(),
      status: 'pending'
    };
    
    await db.ref(`orders/${orderId}`).set(orderData);
    
    const userRef = db.ref(`users/${currentUser.id}`);
    await userRef.transaction((user) => {
      if (user) {
        user.orders = (user.orders || 0) + 1;
        user.totalSpent = (user.totalSpent || 0) + item.price;
      }
      return user;
    });
    
    showNotification(`✅ Товар "${item.name}" заказан!`, "success");
    
  } catch (error) {
    console.error("❌ Ошибка оформления заказа:", error);
    showNotification("Ошибка оформления заказа", "error");
  }
}

// 15. Уведомление
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
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
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

// 16. Стили для анимации
if (!document.querySelector('#notification-styles')) {
  const style = document.createElement('style');
  style.id = 'notification-styles';
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
}

// 17. Запуск приложения
document.addEventListener('DOMContentLoaded', () => {
  console.log("📄 DOM загружен");
  initApp();
});

// 18. Обновление данных
setInterval(async () => {
  try {
    await loadFromServer();
    updateUIAfterDataLoad();
    console.log("🔄 Данные обновлены");
  } catch (error) {
    console.error("❌ Ошибка обновления данных:", error);
  }
}, 300000);
