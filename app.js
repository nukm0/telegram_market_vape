// Конфигурация и инициализация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBgPG4EXFQHoIOVLt2_BdCmiUJEWTXsGN8",
    authDomain: "telegram-market-vape.firebaseapp.com",
    databaseURL: "https://telegram-market-vape-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "telegram-market-vape",
    storageBucket: "telegram-market-vape.appspot.com",
    messagingSenderId: "35870048384",
    appId: "1:35870048384:web:acd6501459aa39180b6665",
    measurementId: "G-99R2PPBNF8"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Основные константы
const ADMIN_USERS = {
    '998579758': { id: '998579758', username: 'nukm0', name: '𓆩nukm0𓆪', role: 'superadmin' }
};

// Глобальные переменные приложения
const appData = {
    currentUserId: null,
    currentUserData: null,
    ads: [],
    filteredAds: [],
    userRatings: {},
    history: [],
    uploadedPhotos: [],
    currentPhotoIndex: 0,
    currentPhotoList: [],
    currentCategory: 'all',
    currentDealType: 'all',
    editingAdId: null,
    serverStats: null,
    lastSyncTime: null,
    isDataLoaded: false,
    isAdmin: false,
    adminData: { users: [], complaints: [], stats: {} },
    isUserBlocked: false,
    blockInfo: null,
    searchQuery: '',
    firebaseListeners: {}
};

// Firebase API методы
const FirebaseMarketServer = {
    // Добавить объявление с типом сделки
    addAd: async function(adData) {
        try {
            await this.registerUser({
                id: adData.sellerId,
                name: adData.sellerName,
                username: adData.sellerUsername
            });
            
            const adToSave = {
                sellerId: adData.sellerId,
                sellerName: adData.sellerName,
                sellerUsername: adData.sellerUsername,
                sellerAvatar: adData.sellerAvatar || null,
                title: adData.title,
                category: adData.category,
                dealType: adData.dealType || 'sell',
                price: Number(adData.price),
                description: adData.description || '',
                photoUrls: adData.photoUrls || [],
                photos: adData.photoUrls?.length || 0,
                likes: 0,
                dislikes: 0,
                complaints: 0,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                updatedAt: firebase.database.ServerValue.TIMESTAMP,
                verified: false,
                status: 'active'
            };
            
            const newAdRef = database.ref('ads').push();
            const adId = newAdRef.key;
            
            await newAdRef.set(adToSave);
            
            await database.ref(`users/${adData.sellerId}/adsCount`).transaction((current) => {
                return (current || 0) + 1;
            });
            
            console.log('✅ Объявление добавлено, ID:', adId);
            return adId;
            
        } catch (error) {
            console.error('❌ Ошибка добавления:', error);
            throw error;
        }
    },
    
    // Получить все объявления с фильтрацией
    getAllAds: async function(filters = {}) {
        try {
            const snapshot = await database.ref('ads').once('value');
            let ads = [];
            
            snapshot.forEach((childSnapshot) => {
                const ad = childSnapshot.val();
                ad.id = childSnapshot.key;
                
                // Фильтрация
                if (filters.category && filters.category !== 'all' && ad.category !== filters.category) {
                    return;
                }
                if (filters.dealType && filters.dealType !== 'all' && ad.dealType !== filters.dealType) {
                    return;
                }
                if (filters.searchQuery && !this.matchesSearch(ad, filters.searchQuery)) {
                    return;
                }
                
                if (!ad.photoUrls && ad.photos > 0) {
                    ad.photoUrls = Array(ad.photos).fill(null);
                }
                ads.push(ad);
            });
            
            ads.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            return ads;
            
        } catch (error) {
            console.error('❌ Ошибка загрузки объявлений:', error);
            return [];
        }
    },
    
    // Проверка совпадения с поисковым запросом
    matchesSearch: function(ad, query) {
        const searchLower = query.toLowerCase();
        return (
            (ad.title && ad.title.toLowerCase().includes(searchLower)) ||
            (ad.description && ad.description.toLowerCase().includes(searchLower)) ||
            (ad.category && ad.category.toLowerCase().includes(searchLower)) ||
            (ad.sellerName && ad.sellerName.toLowerCase().includes(searchLower))
        );
    },
    
    // Добавить жалобу
    addComplaint: async function(complaintData) {
        try {
            const complaintRef = database.ref('complaints').push();
            await complaintRef.set({
                ...complaintData,
                id: complaintRef.key,
                status: 'new',
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
            
            // Увеличиваем счетчик жалоб у объявления
            await database.ref(`ads/${complaintData.adId}/complaints`).transaction((current) => {
                return (current || 0) + 1;
            });
            
            // Увеличиваем счетчик жалоб у пользователя
            await database.ref(`users/${complaintData.targetId}/complaintsCount`).transaction((current) => {
                return (current || 0) + 1;
            });
            
            return complaintRef.key;
            
        } catch (error) {
            console.error('❌ Ошибка добавления жалобы:', error);
            return null;
        }
    },
    
    // Получить жалобы пользователя
    getUserComplaints: async function(userId) {
        try {
            const snapshot = await database.ref('complaints').orderByChild('reporterId').equalTo(userId).once('value');
            const complaints = [];
            snapshot.forEach((child) => {
                complaints.unshift(child.val());
            });
            return complaints;
        } catch (error) {
            console.error('❌ Ошибка загрузки жалоб:', error);
            return [];
        }
    },
    
    // Остальные методы Firebase (getRatings, updateRating, registerUser и т.д.)
    // ... включите остальные методы из вашего предыдущего кода
};

// Инициализация приложения
function initApp() {
    console.log('🚀 Инициализация приложения...');
    
    // Проверка Telegram Web App
    const tg = window.Telegram?.WebApp;
    if (tg) {
        tg.expand();
        tg.ready();
        tg.setHeaderColor('#6D28D9');
        tg.setBackgroundColor('#7C3AED');
    }
    
    // Создание тестового пользователя если нет Telegram
    if (!appData.currentUserId) {
        appData.currentUserId = 'test_user_' + Date.now();
        appData.currentUserData = {
            id: appData.currentUserId,
            first_name: 'Тестовый',
            username: 'testuser',
            photo_url: null
        };
    }
    
    // Проверка на админа
    if (ADMIN_USERS[appData.currentUserId]) {
        appData.isAdmin = true;
        document.getElementById('admin-nav-item').style.display = 'flex';
        document.getElementById('adminBadge').classList.add('show');
    }
    
    // Загрузка данных
    loadFromServer();
    
    // Слушатели событий
    setupEventListeners();
    
    showNotification(`Добро пожаловать, ${appData.currentUserData?.first_name || 'Пользователь'}!`, 'success');
}

// Загрузка данных с Firebase
async function loadFromServer() {
    try {
        console.log('🔄 Загрузка данных с Firebase...');
        
        // Загружаем объявления
        appData.ads = await FirebaseMarketServer.getAllAds();
        appData.filteredAds = [...appData.ads];
        
        // Загружаем рейтинги
        appData.userRatings = await FirebaseMarketServer.getRatings();
        
        // Загружаем историю
        if (appData.currentUserId) {
            appData.history = await FirebaseMarketServer.getUserHistory(appData.currentUserId);
        }
        
        // Загружаем жалобы пользователя
        appData.myComplaints = await FirebaseMarketServer.getUserComplaints(appData.currentUserId);
        
        // Загружаем статистику
        appData.serverStats = await FirebaseMarketServer.getStats();
        
        // Загружаем админ-данные если админ
        if (appData.isAdmin) {
            await loadAdminData();
        }
        
        appData.lastSyncTime = new Date();
        appData.isDataLoaded = true;
        
        updateSyncStatus();
        updateUIAfterDataLoad();
        
        showNotification(`Данные загружены (${appData.ads.length} объявлений)`, 'success');
        
    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error);
        showNotification('Ошибка загрузки данных', 'warning');
        appData.isDataLoaded = true;
        appData.ads = [];
        appData.filteredAds = [];
        updateUIAfterDataLoad();
    }
}

// Поиск объявлений
function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.trim();
    
    if (!query) {
        clearSearch();
        return;
    }
    
    appData.searchQuery = query;
    filterAndRenderAds();
    
    // Показать заголовок результатов поиска
    document.getElementById('searchResultsHeader').style.display = 'flex';
    document.getElementById('searchQueryText').textContent = query;
    
    showNotification(`Найдено ${appData.filteredAds.length} результатов`, 'info');
}

// Очистить поиск
function clearSearch() {
    document.getElementById('searchInput').value = '';
    appData.searchQuery = '';
    document.getElementById('searchResultsHeader').style.display = 'none';
    filterAndRenderAds();
}

// Фильтрация и рендеринг объявлений
function filterAndRenderAds() {
    // Применяем все фильтры
    let filtered = [...appData.ads];
    
    // Фильтр по категории
    if (appData.currentCategory !== 'all') {
        filtered = filtered.filter(ad => ad.category === appData.currentCategory);
    }
    
    // Фильтр по типу сделки
    if (appData.currentDealType !== 'all') {
        filtered = filtered.filter(ad => ad.dealType === appData.currentDealType);
    }
    
    // Фильтр по поиску
    if (appData.searchQuery) {
        const query = appData.searchQuery.toLowerCase();
        filtered = filtered.filter(ad => 
            (ad.title && ad.title.toLowerCase().includes(query)) ||
            (ad.description && ad.description.toLowerCase().includes(query)) ||
            (ad.category && ad.category.toLowerCase().includes(query))
        );
    }
    
    appData.filteredAds = filtered;
    renderAds();
}

// Фильтр по типу сделки
function filterDealType(type) {
    appData.currentDealType = type;
    
    document.querySelectorAll('.deal-type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    filterAndRenderAds();
}

// Рендер объявлений
function renderAds() {
    const container = document.getElementById('ads-container');
    
    if (!appData.isDataLoaded) {
        container.innerHTML = '<div class="loading">Загрузка объявлений...</div>';
        return;
    }
    
    if (appData.filteredAds.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <i class="fas fa-box-open"></i>
                <h3>Нет объявлений</h3>
                <p>${appData.searchQuery ? 'По вашему запросу ничего не найдено' : 'В этой категории пока нет объявлений'}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    appData.filteredAds.forEach(ad => {
        const rating = calculateRating(ad.sellerId);
        const userRating = appData.userRatings[ad.sellerId]?.[appData.currentUserId];
        const isOwnAd = ad.sellerId === appData.currentUserId;
        
        const adElement = document.createElement('div');
        adElement.className = 'advertisement-card';
        adElement.id = `ad-${ad.id}`;
        
        // Тип сделки
        const dealTypeBadge = ad.dealType === 'buy' ? 
            '<span class="deal-type-badge deal-type-buy">Покупаю</span>' : 
            '<span class="deal-type-badge deal-type-sell">Продаю</span>';
        
        // Сокращенное описание
        const shortDescription = ad.description.length > 100 ? 
            ad.description.substring(0, 100) + '...' : 
            ad.description;
        
        const descriptionHtml = ad.description.length > 100 ? `
            <div class="description-short">${shortDescription}</div>
            <button class="read-more-btn" onclick="toggleDescription('${ad.id}')">Читать полностью</button>
            <div class="description-full" id="desc-full-${ad.id}" style="display: none;">${ad.description}</div>
        ` : `<div class="description-full">${ad.description}</div>`;
        
        // Кнопка жалобы
        const complaintBtn = !isOwnAd ? `
            <button class="complaint-post-btn" onclick="openComplaintModal('${ad.id}', '${ad.sellerId}', '${ad.sellerUsername}')">
                <i class="fas fa-flag"></i> Жалоба
            </button>
        ` : '';
        
        adElement.innerHTML = `
            ${complaintBtn}
            <div class="seller-header">
                <div class="seller-avatar">
                    ${ad.sellerAvatar ? `<img src="${ad.sellerAvatar}" alt="Аватар">` : 
                      `<span>${ad.sellerName?.charAt(0) || 'П'}</span>`}
                </div>
                <div class="seller-info">
                    <div class="seller-name">${ad.sellerName || 'Неизвестный'}</div>
                    <div class="seller-username">${ad.sellerUsername || 'Без username'}</div>
                    <div class="seller-stats">
                        <div class="seller-stat stat-rating">
                            <i class="fas fa-star"></i>
                            <span>${rating.toFixed(1)}</span>
                        </div>
                        <div class="seller-stat stat-likes">
                            <i class="fas fa-thumbs-up"></i>
                            <span>${ad.likes || 0}</span>
                        </div>
                        <div class="seller-stat stat-dislikes">
                            <i class="fas fa-thumbs-down"></i>
                            <span>${ad.dislikes || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="photo-gallery">
                <!-- Фото будут добавлены динамически -->
            </div>
            
            <div class="product-info">
                <div class="product-title">${dealTypeBadge} ${ad.title || 'Без названия'}</div>
                <div class="product-category">${getCategoryName(ad.category)}</div>
                <div class="product-price">${(ad.price || 0).toLocaleString()} ₽</div>
                ${descriptionHtml}
            </div>
            
            <div class="action-grid">
                <button class="rate-btn like-btn ${userRating === 'like' ? 'active' : ''} ${isOwnAd ? 'disabled' : ''}" 
                        onclick="rateSeller('${ad.sellerId}', 'like', '${ad.id}')"
                        ${isOwnAd ? 'disabled' : ''}>
                    <i class="fas fa-thumbs-up"></i>
                </button>
                
                <button class="contact-btn" onclick="contactSeller('${ad.sellerUsername}', '${ad.id}', '${ad.title}', '${ad.category}', ${ad.price}, '${ad.dealType}')">
                    <i class="fas fa-paper-plane"></i>
                    ${ad.dealType === 'buy' ? 'Предложить товар' : 'Написать продавцу'}
                </button>
                
                <button class="rate-btn dislike-btn ${userRating === 'dislike' ? 'active' : ''} ${isOwnAd ? 'disabled' : ''}" 
                        onclick="rateSeller('${ad.sellerId}', 'dislike', '${ad.id}')"
                        ${isOwnAd ? 'disabled' : ''}>
                    <i class="fas fa-thumbs-down"></i>
                </button>
            </div>
        `;
        
        container.appendChild(adElement);
    });
}

// Открыть модальное окно жалобы
function openComplaintModal(adId, targetId, targetUsername) {
    appData.currentComplaint = { adId, targetId, targetUsername };
    
    document.getElementById('complaintModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Отправить жалобу
async function submitComplaint(reason, description) {
    if (!appData.currentComplaint) return;
    
    const complaintData = {
        adId: appData.currentComplaint.adId,
        targetId: appData.currentComplaint.targetId,
        targetUsername: appData.currentComplaint.targetUsername,
        reporterId: appData.currentUserId,
        reporterUsername: appData.currentUserData.username,
        reason: reason,
        description: description || '',
        status: 'new'
    };
    
    const complaintId = await FirebaseMarketServer.addComplaint(complaintData);
    
    if (complaintId) {
        showNotification('Жалоба отправлена', 'success');
        closeComplaintModal();
        
        // Обновляем список жалоб в профиле
        appData.myComplaints = await FirebaseMarketServer.getUserComplaints(appData.currentUserId);
        updateMyComplaintsList();
    } else {
        showNotification('Ошибка при отправке жалобы', 'error');
    }
}

// Закрыть модальное окно жалобы
function closeComplaintModal() {
    document.getElementById('complaintModal').classList.remove('active');
    document.body.style.overflow = 'auto';
    appData.currentComplaint = null;
}

// Обновить список жалоб в профиле
function updateMyComplaintsList() {
    const container = document.getElementById('myComplaintsList');
    if (!container) return;
    
    if (!appData.myComplaints || appData.myComplaints.length === 0) {
        container.innerHTML = '<div class="no-complaints">У вас нет отправленных жалоб</div>';
        return;
    }
    
    let html = '';
    appData.myComplaints.forEach(complaint => {
        const date = new Date(complaint.createdAt).toLocaleDateString('ru-RU');
        const statusClass = `status-${complaint.status}`;
        const statusText = getComplaintStatusText(complaint.status);
        
        html += `
            <div class="my-complaint-item">
                <div class="complaint-header">
                    <strong>На: ${complaint.targetUsername}</strong>
                    <span class="complaint-status ${statusClass}">${statusText}</span>
                </div>
                <div class="complaint-reason">Причина: ${complaint.reason}</div>
                <div class="complaint-date">${date}</div>
                ${complaint.description ? `<div class="complaint-desc">${complaint.description}</div>` : ''}
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Переключение описания
function toggleDescription(adId) {
    const short = document.querySelector(`#ad-${adId} .description-short`);
    const full = document.querySelector(`#ad-${adId} .description-full`);
    const btn = document.querySelector(`#ad-${adId} .read-more-btn`);
    
    if (full.style.display === 'none') {
        full.style.display = 'block';
        short.style.display = 'none';
        btn.textContent = 'Свернуть';
    } else {
        full.style.display = 'none';
        short.style.display = 'block';
        btn.textContent = 'Читать полностью';
    }
}

// Обновить статистику профиля
function updateProfileStats() {
    if (!appData.isDataLoaded) return;
    
    // Мои объявления
    const myAds = appData.ads.filter(ad => ad.sellerId === appData.currentUserId).length;
    document.getElementById('myAdsCount').textContent = myAds;
    
    // Лайки и дизлайки
    let totalLikes = 0;
    let totalDislikes = 0;
    let complaintsCount = 0;
    
    appData.ads.forEach(ad => {
        if (ad.sellerId === appData.currentUserId) {
            totalLikes += ad.likes || 0;
            totalDislikes += ad.dislikes || 0;
            complaintsCount += ad.complaints || 0;
        }
    });
    
    document.getElementById('myLikesCount').textContent = totalLikes;
    document.getElementById('myDislikesCount').textContent = totalDislikes;
    document.getElementById('myComplaintsCount').textContent = complaintsCount;
    
    // Рейтинг
    const myRating = calculateRating(appData.currentUserId);
    document.getElementById('myRating').textContent = myRating.toFixed(1);
}

// Публикация объявления
async function publishAd() {
    const title = document.getElementById('adTitle').value.trim();
    const category = document.getElementById('adCategory').value;
    const dealType = document.getElementById('adDealType').value;
    const price = parseInt(document.getElementById('adPrice').value);
    const description = document.getElementById('adDescription').value.trim();
    
    // Валидация
    if (!title || !category || !price || price <= 0 || appData.uploadedPhotos.length === 0) {
        showNotification('Заполните все обязательные поля!', 'error');
        return;
    }
    
    const newAd = {
        sellerId: appData.currentUserId,
        sellerName: appData.currentUserData.first_name,
        sellerUsername: appData.currentUserData.username ? '@' + appData.currentUserData.username : 'Без username',
        sellerAvatar: appData.currentUserData.photo_url || null,
        title: title,
        category: category,
        dealType: dealType,
        price: price,
        description: description || 'Без описания',
        photos: appData.uploadedPhotos.length,
        photoUrls: appData.uploadedPhotos.map(p => p.url)
    };
    
    try {
        const adId = await FirebaseMarketServer.addAd(newAd);
        showNotification('Объявление успешно опубликовано!', 'success');
        
        // Сброс формы
        clearAddForm();
        toggleAddForm();
        
        // Перезагрузка данных
        await loadFromServer();
        
    } catch (error) {
        console.error('Ошибка публикации:', error);
        showNotification('Ошибка при публикации объявления', 'error');
    }
}

// Вспомогательные функции
function getCategoryName(category) {
    const categories = {
        'liquids': 'Жидкости',
        'disposable': 'Одноразовые устройства',
        'pod': 'Под-системы',
        'consumables': 'Расходники'
    };
    return categories[category] || category;
}

function getComplaintStatusText(status) {
    const statuses = {
        'new': 'Новая',
        'pending': 'В работе',
        'resolved': 'Решена',
        'rejected': 'Отклонена'
    };
    return statuses[status] || status;
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Остальные функции (rateSeller, contactSeller, calculateRating и т.д.)
// ... включите остальные функции из вашего предыдущего кода

// Запуск при загрузке
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация Telegram
    const tg = window.Telegram?.WebApp;
    if (tg) {
        const user = tg.initDataUnsafe?.user;
        if (user && user.id) {
            appData.currentUserId = user.id.toString();
            appData.currentUserData = {
                id: user.id,
                first_name: user.first_name || 'Пользователь',
                username: user.username || '',
                photo_url: user.photo_url || null
            };
        }
    }
    
    initApp();
});
