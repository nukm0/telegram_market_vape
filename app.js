// ==================== КОНФИГУРАЦИЯ ====================
import AppConfig from './config.js';

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let currentUser = null;
let allAds = [];
let filteredAds = [];
let categories = [];
let currentPage = 1;
let itemsPerPage = 10;
let sortType = 'newest';
let searchFilters = {
    category: 'all',
    dealType: 'all',
    minPrice: null,
    maxPrice: null,
    searchTerm: ''
};

// ==================== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ====================
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 Инициализация Vape Market...");
    
    try {
        // Инициализация Telegram Web App
        await initTelegramApp();
        
        // Инициализация Firebase
        await initFirebase();
        
        // Загрузка данных пользователя
        await loadUserData();
        
        // Загрузка начальных данных
        await loadInitialData();
        
        // Настройка обработчиков событий
        setupEventListeners();
        
        // Обновление UI
        updateUI();
        
        console.log("✅ Приложение успешно инициализировано");
        
    } catch (error) {
        console.error("❌ Ошибка инициализации:", error);
        showNotification("Ошибка загрузки приложения", "error");
    }
});

// ==================== TELEGRAM WEB APP ====================
async function initTelegramApp() {
    if (window.Telegram && Telegram.WebApp) {
        const tg = Telegram.WebApp;
        
        // Расширяем приложение на весь экран
        tg.expand();
        
        // Включаем кнопку "Назад"
        tg.BackButton.show();
        tg.BackButton.onClick(() => {
            window.history.back();
        });
        
        // Устанавливаем тему
        if (tg.colorScheme === 'dark') {
            document.body.classList.add('dark-theme');
        }
        
        // Получаем данные пользователя
        const user = tg.initDataUnsafe?.user;
        if (user) {
            currentUser = {
                id: user.id,
                username: user.username || `user_${user.id}`,
                firstName: user.first_name || 'Пользователь',
                lastName: user.last_name || '',
                photoUrl: user.photo_url,
                isPremium: user.is_premium || false,
                languageCode: user.language_code || 'ru'
            };
        }
        
        return tg;
    }
    return null;
}

// ==================== FIREBASE ====================
async function initFirebase() {
    const firebaseConfig = AppConfig.firebaseConfig;
    
    // Проверяем, не инициализирован ли Firebase
    if (!firebase.apps.length) {
        try {
            // Инициализируем Firebase
            firebase.initializeApp(firebaseConfig);
            console.log("✅ Firebase инициализирован");
        } catch (error) {
            console.error("❌ Ошибка инициализации Firebase:", error);
            throw error;
        }
    }
    
    // Возвращаем экземпляр базы данных
    return firebase.database();
}

// ==================== ЗАГРУЗКА ДАННЫХ ====================
async function loadUserData() {
    if (!currentUser) {
        // Если нет пользователя Telegram, создаем тестового
        currentUser = {
            id: Date.now(),
            username: 'guest_user',
            firstName: 'Гость',
            lastName: '',
            photoUrl: null,
            isPremium: false
        };
    }
    
    try {
        // Проверяем существование пользователя в базе
        const db = firebase.database();
        const userRef = db.ref(`users/${currentUser.id}`);
        const snapshot = await userRef.once('value');
        
        if (!snapshot.exists()) {
            // Создаем нового пользователя
            const userData = {
                ...currentUser,
                createdAt: Date.now(),
                rating: 0.0,
                adsCount: 0,
                likes: 0,
                dislikes: 0,
                isVerified: false,
                lastSeen: Date.now()
            };
            
            await userRef.set(userData);
            console.log("✅ Создан новый пользователь:", currentUser.id);
        } else {
            // Обновляем данные пользователя
            currentUser = { ...currentUser, ...snapshot.val() };
            await userRef.update({ lastSeen: Date.now() });
            console.log("✅ Пользователь загружен:", currentUser.username);
        }
        
        // Сохраняем в localStorage для быстрого доступа
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
    } catch (error) {
        console.error("❌ Ошибка загрузки данных пользователя:", error);
    }
}

async function loadInitialData() {
    try {
        const db = firebase.database();
        
        // Загружаем категории
        const categoriesSnapshot = await db.ref('categories').once('value');
        categories = Object.entries(categoriesSnapshot.val() || {}).map(([id, data]) => ({
            id,
            ...data
        }));
        
        // Загружаем объявления
        const adsSnapshot = await db.ref('ads')
            .orderByChild('createdAt')
            .limitToLast(100)
            .once('value');
        
        allAds = [];
        adsSnapshot.forEach((child) => {
            const ad = child.val();
            ad.id = child.key;
            
            // Загружаем рейтинг продавца
            if (ad.sellerId) {
                ad.sellerRating = calculateSellerRating(ad.sellerId);
            }
            
            allAds.unshift(ad); // Новые объявления в начало
        });
        
        // Применяем начальную фильтрацию
        filteredAds = [...allAds];
        
        // Загружаем избранное из localStorage
        loadFavorites();
        
        console.log(`✅ Загружено: ${allAds.length} объявлений, ${categories.length} категорий`);
        
    } catch (error) {
        console.error("❌ Ошибка загрузки данных:", error);
        showNotification("Ошибка загрузки данных", "error");
    }
}

// ==================== ФИЛЬТРАЦИЯ И СОРТИРОВКА ====================
function applyFilters() {
    filteredAds = allAds.filter(ad => {
        // Фильтр по категории
        if (searchFilters.category !== 'all' && ad.category !== searchFilters.category) {
            return false;
        }
        
        // Фильтр по типу сделки
        if (searchFilters.dealType !== 'all' && ad.dealType !== searchFilters.dealType) {
            return false;
        }
        
        // Фильтр по цене
        if (searchFilters.minPrice && ad.price < searchFilters.minPrice) {
            return false;
        }
        if (searchFilters.maxPrice && ad.price > searchFilters.maxPrice) {
            return false;
        }
        
        // Фильтр по поисковому запросу
        if (searchFilters.searchTerm) {
            const searchLower = searchFilters.searchTerm.toLowerCase();
            const matches = (
                (ad.title && ad.title.toLowerCase().includes(searchLower)) ||
                (ad.description && ad.description.toLowerCase().includes(searchLower)) ||
                (ad.category && ad.category.toLowerCase().includes(searchLower)) ||
                (ad.sellerName && ad.sellerName.toLowerCase().includes(searchLower))
            );
            if (!matches) return false;
        }
        
        return true;
    });
    
    // Применяем сортировку
    sortAds();
}

function sortAds() {
    switch (sortType) {
        case 'newest':
            filteredAds.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            break;
        case 'cheapest':
            filteredAds.sort((a, b) => (a.price || 0) - (b.price || 0));
            break;
        case 'expensive':
            filteredAds.sort((a, b) => (b.price || 0) - (a.price || 0));
            break;
        case 'rating':
            filteredAds.sort((a, b) => (b.sellerRating || 0) - (a.sellerRating || 0));
            break;
    }
}

// ==================== ОБНОВЛЕНИЕ UI ====================
function updateUI() {
    updateUserInfo();
    updateCategories();
    updateAdsGrid();
    updatePagination();
    updateCounters();
}

function updateUserInfo() {
    const userNameElement = document.getElementById('userName');
    const userAvatarElement = document.getElementById('userAvatar');
    
    if (userNameElement && currentUser) {
        userNameElement.textContent = currentUser.firstName;
    }
    
    if (userAvatarElement && currentUser) {
        if (currentUser.photoUrl) {
            userAvatarElement.innerHTML = `<img src="${currentUser.photoUrl}" alt="Аватар" style="width:100%;height:100%;border-radius:50%;">`;
        } else {
            userAvatarElement.innerHTML = `<i class="fas fa-user"></i>`;
        }
    }
}

function updateCategories() {
    const categoriesContainer = document.getElementById('categories');
    const categoryCount = document.getElementById('categoryCount');
    
    if (!categoriesContainer) return;
    
    categoryCount.textContent = categories.length;
    
    categoriesContainer.innerHTML = '';
    categories.forEach(category => {
        const categoryElement = document.createElement('div');
        categoryElement.className = 'category-item';
        categoryElement.dataset.category = category.id;
        categoryElement.innerHTML = `
            <div class="category-icon">
                <i class="fas ${category.icon || 'fa-box'}"></i>
            </div>
            <span>${category.label || category.name}</span>
        `;
        
        categoryElement.addEventListener('click', () => {
            searchFilters.category = category.id;
            applyFilters();
            updateAdsGrid();
        });
        
        categoriesContainer.appendChild(categoryElement);
    });
}

function updateAdsGrid() {
    const itemsGrid = document.getElementById('itemsGrid');
    const itemsCount = document.getElementById('itemsCount');
    
    if (!itemsGrid) return;
    
    itemsCount.textContent = filteredAds.length;
    
    if (filteredAds.length === 0) {
        itemsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 20px;"></i>
                <h3>Объявления не найдены</h3>
                <p>Попробуйте изменить параметры поиска</p>
                <button class="btn-secondary" onclick="clearFilters()" style="margin-top: 15px;">
                    Сбросить фильтры
                </button>
            </div>
        `;
        return;
    }
    
    // Пагинация
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const adsToShow = filteredAds.slice(startIndex, endIndex);
    
    itemsGrid.innerHTML = '';
    adsToShow.forEach(ad => {
        const adElement = createAdCard(ad);
        itemsGrid.appendChild(adElement);
    });
}

function createAdCard(ad) {
    const isFavorite = checkIfFavorite(ad.id);
    
    const div = document.createElement('div');
    div.className = 'item-card';
    div.dataset.adId = ad.id;
    div.innerHTML = `
        <div class="ad-badges">
            ${ad.sellerVerified ? '<span class="badge verified">✅ Проверен</span>' : ''}
            ${ad.dealType === 'buy' ? '<span class="badge buy">👀 Ищут</span>' : ''}
            <span class="badge category">${getCategoryLabel(ad.category)}</span>
        </div>
        
        <div class="ad-images">
            ${ad.photoUrls && ad.photoUrls.length > 0 
                ? `<img src="${ad.photoUrls[0]}" alt="${ad.title}" class="item-image">`
                : `<div class="no-image"><i class="fas fa-image"></i></div>`
            }
            ${ad.photos && ad.photos > 1 
                ? `<span class="photos-count">+${ad.photos - 1}</span>` 
                : ''
            }
        </div>
        
        <div class="item-info">
            <div class="ad-header">
                <h3 class="item-title">${ad.title || 'Без названия'}</h3>
                <button class="favorite-btn ${isFavorite ? 'active' : ''}" onclick="toggleFavorite('${ad.id}')">
                    <i class="fas ${isFavorite ? 'fa-heart' : 'fa-heart'}"></i>
                </button>
            </div>
            
            <p class="item-description">
                ${(ad.description || '').substring(0, 100)}
                ${ad.description && ad.description.length > 100 ? '...' : ''}
            </p>
            
            <div class="ad-meta">
                <div class="seller-info">
                    <span class="seller-name">${ad.sellerName || 'Продавец'}</span>
                    ${ad.sellerRating 
                        ? `<span class="seller-rating">⭐ ${ad.sellerRating.toFixed(1)}</span>`
                        : ''
                    }
                </div>
                <div class="ad-stats">
                    <span class="ad-views" title="Просмотры">
                        <i class="fas fa-eye"></i> ${ad.views || 0}
                    </span>
                    <span class="ad-likes" title="Лайки">
                        <i class="fas fa-thumbs-up"></i> ${ad.likes || 0}
                    </span>
                </div>
            </div>
            
            <div class="item-footer">
                <span class="item-price">${formatPrice(ad.price)}</span>
                <button class="btn-primary buy-btn" onclick="showAdModal('${ad.id}')">
                    ${ad.dealType === 'buy' ? 'Предложить' : 'Купить'}
                </button>
            </div>
        </div>
    `;
    
    return div;
}

// ==================== ИЗБРАННОЕ ====================
function loadFavorites() {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    return favorites;
}

function saveFavorites(favorites) {
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

function checkIfFavorite(adId) {
    const favorites = loadFavorites();
    return favorites[adId] || false;
}

function toggleFavorite(adId) {
    const favorites = loadFavorites();
    favorites[adId] = !favorites[adId];
    saveFavorites(favorites);
    
    // Обновляем UI
    const btn = document.querySelector(`.favorite-btn[onclick*="${adId}"]`);
    if (btn) {
        btn.classList.toggle('active');
        btn.querySelector('i').className = favorites[adId] 
            ? 'fas fa-heart' 
            : 'far fa-heart';
    }
}

// ==================== УТИЛИТЫ ====================
function formatPrice(price) {
    if (!price) return 'Цена не указана';
    return `${parseInt(price).toLocaleString('ru-RU')} ₽`;
}

function getCategoryLabel(categoryId) {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.label || category.name : 'Другое';
}

function calculateSellerRating(sellerId) {
    // Здесь будет логика расчета рейтинга продавца
    // Пока возвращаем случайное значение для демонстрации
    return Math.random() * 4 + 1;
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    container.appendChild(notification);
    
    // Автоматическое удаление через 3 секунды
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    container.removeChild(notification);
                }
            }, 300);
        }
    }, 3000);
}

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================
function setupEventListeners() {
    // Поиск
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            searchFilters.searchTerm = e.target.value.trim();
            currentPage = 1;
            applyFilters();
            updateAdsGrid();
            updatePagination();
        }, 500));
    }
    
    // Фильтры
    const categoryFilter = document.getElementById('categoryFilter');
    const dealTypeFilter = document.getElementById('dealTypeFilter');
    const sortSelect = document.getElementById('sortSelect');
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            searchFilters.category = e.target.value;
            applyFilters();
            updateAdsGrid();
        });
    }
    
    if (dealTypeFilter) {
        dealTypeFilter.addEventListener('change', (e) => {
            searchFilters.dealType = e.target.value;
            applyFilters();
            updateAdsGrid();
        });
    }
    
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            sortType = e.target.value;
            applyFilters();
            updateAdsGrid();
        });
    }
    
    // Кнопки навигации
    document.getElementById('profileBtnNav')?.addEventListener('click', () => {
        window.location.href = 'pages/profile.html';
    });
    
    document.getElementById('createAdBtn')?.addEventListener('click', () => {
        window.location.href = 'pages/create-ad.html';
    });
    
    document.getElementById('faqBtn')?.addEventListener('click', () => {
        window.location.href = 'pages/faq.html';
    });
    
    // Быстрые действия
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.currentTarget.dataset.action;
            handleQuickAction(action);
        });
    });
    
    // Пагинация
    document.getElementById('prevPage')?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            updateAdsGrid();
            updatePagination();
        }
    });
    
    document.getElementById('nextPage')?.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredAds.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            updateAdsGrid();
            updatePagination();
        }
    });
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function clearFilters() {
    searchFilters = {
        category: 'all',
        dealType: 'all',
        minPrice: null,
        maxPrice: null,
        searchTerm: ''
    };
    
    document.getElementById('searchInput').value = '';
    document.getElementById('categoryFilter').value = 'all';
    document.getElementById('dealTypeFilter').value = 'all';
    document.getElementById('sortSelect').value = 'newest';
    
    applyFilters();
    updateAdsGrid();
    updatePagination();
}

function updatePagination() {
    const pagination = document.getElementById('pagination');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    
    if (!pagination || !filteredAds.length) {
        if (pagination) pagination.style.display = 'none';
        return;
    }
    
    const totalPages = Math.ceil(filteredAds.length / itemsPerPage);
    
    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }
    
    pagination.style.display = 'flex';
    pageInfo.textContent = `Страница ${currentPage} из ${totalPages}`;
    
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
}

function updateCounters() {
    // Обновляем счетчики
    const stats = {
        totalAds: allAds.length,
        totalUsers: 0,
        totalDeals: 0
    };
    
    // Здесь будет API запрос для получения статистики
    // Пока используем статические данные
    document.getElementById('statUsers')?.textContent = '15,432';
    document.getElementById('statAds')?.textContent = stats.totalAds.toLocaleString();
    document.getElementById('statDeals')?.textContent = '8,921';
}

function handleQuickAction(action) {
    switch (action) {
        case 'create-ad':
            window.location.href = 'pages/create-ad.html';
            break;
        case 'my-ads':
            window.location.href = 'pages/profile.html?tab=my-ads';
            break;
        case 'favorites':
            window.location.href = 'pages/profile.html?tab=favorites';
            break;
        case 'recent':
            // Показать недавно просмотренные
            showNotification('Показаны недавние объявления', 'info');
            break;
    }
}

async function showAdModal(adId) {
    const ad = allAds.find(a => a.id === adId);
    if (!ad) return;
    
    const modal = document.getElementById('adModal');
    if (!modal) return;
    
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>${ad.title}</h2>
                <button class="modal-close" onclick="closeModal()">×</button>
            </div>
            
            <div class="modal-body">
                ${ad.photoUrls && ad.photoUrls.length > 0 
                    ? `<div class="modal-images">
                        <img src="${ad.photoUrls[0]}" alt="${ad.title}" class="modal-main-image">
                       </div>`
                    : ''
                }
                
                <div class="modal-info">
                    <div class="info-row">
                        <strong>Цена:</strong>
                        <span class="modal-price">${formatPrice(ad.price)}</span>
                    </div>
                    
                    <div class="info-row">
                        <strong>Категория:</strong>
                        <span>${getCategoryLabel(ad.category)}</span>
                    </div>
                    
                    <div class="info-row">
                        <strong>Продавец:</strong>
                        <div class="seller-modal-info">
                            <span>${ad.sellerName || 'Не указан'}</span>
                            ${ad.sellerRating 
                                ? `<span class="rating-badge">⭐ ${ad.sellerRating.toFixed(1)}</span>`
                                : ''
                            }
                        </div>
                    </div>
                    
                    <div class="info-row">
                        <strong>Описание:</strong>
                        <p class="modal-description">${ad.description || 'Нет описания'}</p>
                    </div>
                    
                    <div class="info-row">
                        <strong>Дата публикации:</strong>
                        <span>${new Date(ad.createdAt).toLocaleDateString('ru-RU')}</span>
                    </div>
                </div>
            </div>
            
            <div class="modal-footer">
                <div class="modal-actions">
                    <button class="btn-secondary" onclick="sendMessageToSeller('${ad.sellerId}')">
                        <i class="fab fa-telegram"></i>
                        Написать продавцу
                    </button>
                    
                    ${ad.dealType === 'sell' 
                        ? `<button class="btn-primary" onclick="processPurchase('${ad.id}')">
                            <i class="fas fa-shopping-cart"></i>
                            Купить
                          </button>`
                        : `<button class="btn-primary" onclick="makeOffer('${ad.id}')">
                            <i class="fas fa-handshake"></i>
                            Предложить товар
                          </button>`
                    }
                </div>
                
                <div class="additional-actions">
                    <button class="action-btn" onclick="toggleFavorite('${ad.id}')">
                        <i class="fas fa-heart"></i>
                        В избранное
                    </button>
                    <button class="action-btn" onclick="reportAd('${ad.id}')">
                        <i class="fas fa-flag"></i>
                        Жалоба
                    </button>
                    <button class="action-btn" onclick="shareAd('${ad.id}')">
                        <i class="fas fa-share-alt"></i>
                        Поделиться
                    </button>
                </div>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('adModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// ==================== ЭКСПОРТ ДЛЯ ГЛОБАЛЬНОГО ДОСТУПА ====================
window.VapeMarket = {
    currentUser,
    allAds,
    filteredAds,
    categories,
    loadInitialData,
    applyFilters,
    updateUI,
    showAdModal,
    closeModal,
    toggleFavorite,
    showNotification,
    clearFilters
};

// Закрываем при нажатии ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});
