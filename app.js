// app.js - Vape Market Application

// ==================== FIREBASE КОНФИГУРАЦИЯ ====================
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
try {
    firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase успешно инициализирован");
} catch (error) {
    console.error("❌ Ошибка инициализации Firebase:", error);
}

const database = firebase.database();

// ==================== КОНСТАНТЫ И ПЕРЕМЕННЫЕ ====================
const ADMIN_USERS = {
    '998579758': { 
        id: '998579758', 
        username: 'nukm0', 
        name: '𓆩nukm0𓆪', 
        role: 'superadmin' 
    }
};

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
    firebaseListeners: {},
    myComplaints: []
};

// ==================== FIREBASE API ====================
const FirebaseMarketServer = {
    // Получить все объявления
    getAllAds: async function(filters = {}) {
        try {
            console.log('🔄 Получение объявлений из Firebase...');
            
            const snapshot = await database.ref('ads').once('value');
            let ads = [];
            
            snapshot.forEach((childSnapshot) => {
                const ad = childSnapshot.val();
                ad.id = childSnapshot.key;
                
                // Фильтрация по категории
                if (filters.category && filters.category !== 'all' && ad.category !== filters.category) {
                    return;
                }
                
                // Фильтрация по типу сделки
                if (filters.dealType && filters.dealType !== 'all' && ad.dealType !== filters.dealType) {
                    return;
                }
                
                // Фильтрация по поиску
                if (filters.searchQuery) {
                    const searchLower = filters.searchQuery.toLowerCase();
                    const matches = (
                        (ad.title && ad.title.toLowerCase().includes(searchLower)) ||
                        (ad.description && ad.description.toLowerCase().includes(searchLower)) ||
                        (ad.category && ad.category.toLowerCase().includes(searchLower))
                    );
                    if (!matches) return;
                }
                
                // Проверка фото
                if (!ad.photoUrls && ad.photos > 0) {
                    ad.photoUrls = [];
                    for (let i = 0; i < ad.photos; i++) {
                        ad.photoUrls.push(null);
                    }
                }
                
                ads.push(ad);
            });
            
            // Сортировка по дате (новые сначала)
            ads.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            
            console.log(`✅ Загружено ${ads.length} объявлений`);
            return ads;
            
        } catch (error) {
            console.error('❌ Ошибка загрузки объявлений:', error);
            throw error;
        }
    },
    
    // Получить рейтинги
    getRatings: async function() {
        try {
            const snapshot = await database.ref('ratings').once('value');
            return snapshot.val() || {};
        } catch (error) {
            console.error('❌ Ошибка загрузки рейтингов:', error);
            return {};
        }
    },
    
    // Обновить рейтинг
    updateRating: async function(sellerId, userId, rating) {
        try {
            await database.ref(`ratings/${sellerId}/${userId}`).set(rating);
            
            // Получаем все оценки
            const ratingsSnapshot = await database.ref(`ratings/${sellerId}`).once('value');
            const ratings = ratingsSnapshot.val() || {};
            
            // Считаем лайки/дизлайки
            let likes = 0, dislikes = 0;
            Object.values(ratings).forEach(r => {
                if (r === 'like') likes++;
                if (r === 'dislike') dislikes++;
            });
            
            // Рассчитываем рейтинг
            const total = likes + dislikes;
            const calculatedRating = total > 0 ? 0.1 + (likes / total) * 4.9 : 0.1;
            
            // Обновляем пользователя
            await database.ref(`users/${sellerId}`).update({
                likesCount: likes,
                dislikesCount: dislikes,
                rating: calculatedRating,
                lastActive: firebase.database.ServerValue.TIMESTAMP
            });
            
            return true;
        } catch (error) {
            console.error('❌ Ошибка обновления рейтинга:', error);
            return false;
        }
    },
    
    // Регистрация пользователя
    registerUser: async function(userData) {
        try {
            const userRef = database.ref(`users/${userData.id}`);
            const snapshot = await userRef.once('value');
            
            if (!snapshot.exists()) {
                await userRef.set({
                    id: userData.id,
                    name: userData.name || 'Пользователь',
                    username: userData.username || '',
                    registrationDate: firebase.database.ServerValue.TIMESTAMP,
                    lastActive: firebase.database.ServerValue.TIMESTAMP,
                    adsCount: 0,
                    likesCount: 0,
                    dislikesCount: 0,
                    rating: 0.1,
                    verified: false,
                    blocked: false,
                    blockReason: null,
                    blockedUntil: null,
                    warnings: 0,
                    complaintsCount: 0
                });
                console.log('✅ Новый пользователь зарегистрирован');
            } else {
                await userRef.update({
                    lastActive: firebase.database.ServerValue.TIMESTAMP
                });
            }
            
            return true;
        } catch (error) {
            console.error('❌ Ошибка регистрации:', error);
            return false;
        }
    },
    
    // Добавить объявление
    addAd: async function(adData) {
        try {
            console.log('🔄 Добавление объявления...');
            
            // Регистрируем пользователя
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
            
            // Обновляем счетчик пользователя
            await database.ref(`users/${adData.sellerId}/adsCount`).transaction((current) => {
                return (current || 0) + 1;
            });
            
            console.log('✅ Объявление добавлено, ID:', adId);
            return adId;
            
        } catch (error) {
            console.error('❌ Ошибка добавления объявления:', error);
            throw error;
        }
    },
    
    // Добавить в историю
    addToHistory: async function(userId, historyItem) {
        try {
            const historyRef = database.ref(`userHistory/${userId}`).push();
            await historyRef.set({
                ...historyItem,
                id: historyRef.key,
                timestamp: new Date().toISOString()
            });
            
            // Ограничиваем историю 50 записями
            const historySnapshot = await database.ref(`userHistory/${userId}`).once('value');
            const history = [];
            historySnapshot.forEach((child) => {
                history.push({ key: child.key, ...child.val() });
            });
            
            if (history.length > 50) {
                const toDelete = history.slice(50);
                for (const item of toDelete) {
                    await database.ref(`userHistory/${userId}/${item.key}`).remove();
                }
            }
            
            return true;
        } catch (error) {
            console.error('❌ Ошибка сохранения истории:', error);
            return false;
        }
    },
    
    // Получить историю пользователя
    getUserHistory: async function(userId) {
        try {
            const snapshot = await database.ref(`userHistory/${userId}`).once('value');
            const history = [];
            snapshot.forEach((childSnapshot) => {
                history.unshift(childSnapshot.val());
            });
            return history;
        } catch (error) {
            console.error('❌ Ошибка загрузки истории:', error);
            return [];
        }
    },
    
    // Получить статистику
    getStats: async function() {
        try {
            // Получаем количество объявлений
            const adsSnapshot = await database.ref('ads').once('value');
            const totalAds = adsSnapshot.numChildren();
            
            // Получаем количество пользователей
            const usersSnapshot = await database.ref('users').once('value');
            const totalUsers = usersSnapshot.numChildren();
            
            // Считаем сегодняшние объявления
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let todayAds = 0;
            
            adsSnapshot.forEach((childSnapshot) => {
                const ad = childSnapshot.val();
                if (ad.createdAt && new Date(ad.createdAt) >= today) {
                    todayAds++;
                }
            });
            
            // Считаем лайки и дизлайки
            const ratingsSnapshot = await database.ref('ratings').once('value');
            let totalLikes = 0;
            let totalDislikes = 0;
            
            ratingsSnapshot.forEach((userSnapshot) => {
                userSnapshot.forEach((ratingSnapshot) => {
                    if (ratingSnapshot.val() === 'like') totalLikes++;
                    if (ratingSnapshot.val() === 'dislike') totalDislikes++;
                });
            });
            
            // Считаем по категориям
            const categories = { liquids: 0, disposable: 0, pod: 0, consumables: 0, other: 0 };
            adsSnapshot.forEach((childSnapshot) => {
                const ad = childSnapshot.val();
                const category = ad.category || 'other';
                if (categories[category] !== undefined) {
                    categories[category]++;
                } else {
                    categories.other++;
                }
            });
            
            // Считаем активных пользователей
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            let activeUsers = 0;
            
            usersSnapshot.forEach((childSnapshot) => {
                const user = childSnapshot.val();
                if (user.lastActive && new Date(user.lastActive) > weekAgo) {
                    activeUsers++;
                }
            });
            
            return {
                totalUsers: totalUsers,
                activeUsers: activeUsers,
                totalAds: totalAds,
                todayAds: todayAds,
                totalLikes: totalLikes,
                totalDislikes: totalDislikes,
                categories: categories,
                lastUpdated: new Date().toISOString(),
                serverStatus: 'online'
            };
            
        } catch (error) {
            console.error('❌ Ошибка получения статистики:', error);
            return {
                totalUsers: 0,
                activeUsers: 0,
                totalAds: 0,
                todayAds: 0,
                totalLikes: 0,
                totalDislikes: 0,
                categories: { liquids: 0, disposable: 0, pod: 0, consumables: 0, other: 0 },
                lastUpdated: new Date().toISOString(),
                serverStatus: 'offline'
            };
        }
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
            const snapshot = await database.ref('complaints')
                .orderByChild('reporterId')
                .equalTo(userId)
                .once('value');
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
    
    // Удалить объявление
    deleteAd: async function(adId, sellerId) {
        try {
            await database.ref(`ads/${adId}`).remove();
            
            // Уменьшаем счетчик объявлений пользователя
            await database.ref(`users/${sellerId}/adsCount`).transaction((current) => {
                return Math.max(0, (current || 1) - 1);
            });
            
            return true;
        } catch (error) {
            console.error('❌ Ошибка удаления объявления:', error);
            return false;
        }
    },
    
    // Обновить объявление
    updateAd: async function(adId, adData) {
        try {
            await database.ref(`ads/${adId}`).update(adData);
            return true;
        } catch (error) {
            console.error('❌ Ошибка обновления объявления:', error);
            return false;
        }
    },
    
    // Очистить историю пользователя
    clearUserHistory: async function(userId) {
        try {
            await database.ref(`userHistory/${userId}`).remove();
            return true;
        } catch (error) {
            console.error('❌ Ошибка очистки истории:', error);
            return false;
        }
    }
};

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

// Инициализация приложения
function initApp() {
    console.log('🚀 Инициализация приложения...');
    
    const tg = window.Telegram?.WebApp;
    if (tg) {
        try {
            tg.expand();
            tg.ready();
            tg.setHeaderColor('#6D28D9');
            tg.setBackgroundColor('#7C3AED');
            
            tg.BackButton.show();
            tg.BackButton.onClick(() => tg.close());
            
            console.log('✅ Telegram Web App настроен');
        } catch (error) {
            console.warn('⚠️ Ошибка Telegram Web App:', error);
        }
    }
    
    // Создание тестового пользователя если нет Telegram
    if (!appData.currentUserId) {
        appData.currentUserId = 'test_user_' + Date.now();
        appData.currentUserData = {
            id: appData.currentUserId,
            first_name: 'Тестовый',
            username: 'testuser_' + Math.floor(Math.random() * 1000),
            photo_url: null
        };
        console.log('👤 Создан тестовый пользователь:', appData.currentUserId);
    }
    
    // Проверка на админа
    if (ADMIN_USERS[appData.currentUserId]) {
        appData.isAdmin = true;
        const adminNavItem = document.getElementById('admin-nav-item');
        const adminBadge = document.getElementById('adminBadge');
        if (adminNavItem) adminNavItem.style.display = 'flex';
        if (adminBadge) adminBadge.classList.add('show');
        console.log('👑 Пользователь является администратором');
    }
    
    // Регистрация пользователя
    if (appData.currentUserData) {
        FirebaseMarketServer.registerUser(appData.currentUserData)
            .then(success => {
                console.log('Регистрация пользователя:', success ? '✅ Успешно' : '❌ Ошибка');
                loadFromServer();
            })
            .catch(error => {
                console.error('Ошибка регистрации:', error);
                loadFromServer();
            });
    } else {
        loadFromServer();
    }
    
    // Настройка слушателей событий
    setupEventListeners();
    
    showNotification('Приложение загружено!', 'success');
}

// Настройка слушателей событий
function setupEventListeners() {
    console.log('🔧 Настройка слушателей событий...');
    
    // Поиск по Enter
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                performSearch();
            }
        });
    }
    
    // Закрытие модального окна фото
    const photoModal = document.getElementById('photoModal');
    if (photoModal) {
        photoModal.addEventListener('click', function(event) {
            if (event.target === this) {
                closePhotoModal();
            }
        });
    }
}

// Загрузка данных
async function loadFromServer() {
    try {
        console.log('🔄 Загрузка данных...');
        
        // Загружаем объявления
        appData.ads = await FirebaseMarketServer.getAllAds();
        appData.filteredAds = [...appData.ads];
        
        // Загружаем рейтинги
        appData.userRatings = await FirebaseMarketServer.getRatings();
        
        // Загружаем историю
        if (appData.currentUserId) {
            appData.history = await FirebaseMarketServer.getUserHistory(appData.currentUserId);
        }
        
        // Загружаем жалобы
        if (appData.currentUserId) {
            appData.myComplaints = await FirebaseMarketServer.getUserComplaints(appData.currentUserId);
        }
        
        // Загружаем статистику
        appData.serverStats = await FirebaseMarketServer.getStats();
        
        appData.lastSyncTime = new Date();
        appData.isDataLoaded = true;
        
        updateSyncStatus();
        updateUIAfterDataLoad();
        
        console.log('✅ Данные успешно загружены');
        showNotification(`Загружено ${appData.ads.length} объявлений`, 'success');
        
    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error);
        showNotification('Ошибка загрузки данных', 'error');
        
        appData.isDataLoaded = true;
        appData.ads = [];
        appData.filteredAds = [];
        updateUIAfterDataLoad();
    }
}

// Обновление UI после загрузки данных
function updateUIAfterDataLoad() {
    if (!appData.isDataLoaded) return;
    
    // Обновляем профиль
    updateUserProfile();
    updateProfileStats();
    
    // Рендерим объявления
    renderAds();
    
    // Обновляем историю если на странице профиля
    if (document.getElementById('page-profile')?.classList.contains('active')) {
        updateMyAdsList();
        updateHistory();
        updateMyComplaintsList();
    }
    
    // Обновляем статистику сервера если на FAQ
    if (document.getElementById('page-faq')?.classList.contains('active')) {
        updateServerStatsUI();
    }
}

// Обновление статуса синхронизации
function updateSyncStatus() {
    const syncText = document.getElementById('sync-text');
    if (syncText && appData.lastSyncTime) {
        const now = new Date();
        const diff = Math.floor((now - appData.lastSyncTime) / 1000);
        
        let text;
        if (diff < 60) {
            text = 'Только что';
        } else if (diff < 3600) {
            text = `${Math.floor(diff / 60)} мин. назад`;
        } else {
            text = `${Math.floor(diff / 3600)} час. назад`;
        }
        
        syncText.textContent = `Обновлено: ${text}`;
    }
}

// Обновление профиля пользователя
function updateUserProfile() {
    if (!appData.currentUserData) return;
    
    const profileName = document.getElementById('profileName');
    const profileUsername = document.getElementById('profileUsername');
    const profileAvatar = document.getElementById('profileAvatar');
    
    if (profileName) {
        let fullName = appData.currentUserData.first_name || 'Пользователь';
        if (appData.currentUserData.last_name) {
            fullName += ' ' + appData.currentUserData.last_name;
        }
        profileName.textContent = fullName;
    }
    
    if (profileUsername) {
        if (appData.currentUserData.username) {
            profileUsername.textContent = '@' + appData.currentUserData.username;
        } else {
            profileUsername.textContent = 'Без username';
        }
    }
    
    if (profileAvatar) {
        if (appData.currentUserData.photo_url) {
            profileAvatar.innerHTML = `<img src="${appData.currentUserData.photo_url}" alt="Аватар">`;
        } else {
            const firstLetter = (appData.currentUserData.first_name || 'П').charAt(0).toUpperCase();
            profileAvatar.innerHTML = `<span>${firstLetter}</span>`;
        }
    }
}

// Обновление статистики профиля
function updateProfileStats() {
    if (!appData.isDataLoaded) {
        document.getElementById('myAdsCount').textContent = '0';
        document.getElementById('myLikesCount').textContent = '0';
        document.getElementById('myDislikesCount').textContent = '0';
        document.getElementById('myComplaintsCount').textContent = '0';
        document.getElementById('myRating').textContent = '0.0';
        return;
    }
    
    const myAds = appData.ads.filter(ad => ad.sellerId === appData.currentUserId).length;
    document.getElementById('myAdsCount').textContent = myAds;
    
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
    
    const myRating = calculateRating(appData.currentUserId);
    document.getElementById('myRating').textContent = myRating.toFixed(1);
}

// Рассчитать рейтинг
function calculateRating(sellerId) {
    if (!appData.userRatings[sellerId]) return 0.1;
    
    const ratings = Object.values(appData.userRatings[sellerId]);
    if (ratings.length === 0) return 0.1;
    
    const likes = ratings.filter(r => r === 'like').length;
    const dislikes = ratings.filter(r => r === 'dislike').length;
    const total = likes + dislikes;
    
    if (total === 0) return 0.1;
    return 0.1 + (likes / total) * 4.9;
}

// ==================== РЕНДЕР ОБЪЯВЛЕНИЙ ====================

function renderAds() {
    const container = document.getElementById('ads-container');
    if (!container) return;
    
    if (!appData.isDataLoaded) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.7);">
                <i class="fas fa-spinner fa-spin" style="font-size: 48px; margin-bottom: 20px;"></i>
                <h3 style="margin-bottom: 10px;">Загрузка объявлений...</h3>
            </div>
        `;
        return;
    }
    
    // Фильтрация объявлений
    filterAndRenderAds();
}

function filterAndRenderAds() {
    const container = document.getElementById('ads-container');
    if (!container) return;
    
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
    
    if (filtered.length === 0) {
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
    
    filtered.forEach(ad => {
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
        
        // Описание
        const descriptionHtml = getDescriptionHtml(ad);
        
        // Фото
        const photoHtml = getPhotoHtml(ad);
        
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
            
            ${photoHtml}
            
            <div class="product-info">
                <div class="product-title">${dealTypeBadge} ${ad.title || 'Без названия'}</div>
                <div class="product-category">${getCategoryName(ad.category)}</div>
                <div class="product-price">${(ad.price || 0).toLocaleString()} ₽</div>
                <div class="description-container">
                    ${descriptionHtml}
                </div>
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

function getDescriptionHtml(ad) {
    const description = ad.description || 'Без описания';
    
    if (description.length <= 100) {
        return `<div class="description-full">${description}</div>`;
    }
    
    const shortDescription = description.substring(0, 100) + '...';
    return `
        <div class="description-short">${shortDescription}</div>
        <button class="read-more-btn" onclick="toggleDescription('${ad.id}')">Читать полностью</button>
        <div class="description-full" id="desc-full-${ad.id}" style="display: none;">${description}</div>
    `;
}

function getPhotoHtml(ad) {
    if (!ad.photoUrls || ad.photoUrls.length === 0 || !ad.photoUrls[0]) {
        return `
            <div class="photo-gallery">
                <div class="photo-item">
                    <div class="photo-placeholder" style="background: #835AF9;">
                        <i class="fas fa-image"></i>
                        <span>Фото 1</span>
                    </div>
                    <div class="photo-label">Фото 1</div>
                </div>
            </div>
        `;
    }
    
    const validPhotos = ad.photoUrls.filter(url => url && url !== 'null');
    if (validPhotos.length === 0) {
        return `
            <div class="photo-gallery">
                <div class="photo-item">
                    <div class="photo-placeholder" style="background: #835AF9;">
                        <i class="fas fa-image"></i>
                        <span>Фото 1</span>
                    </div>
                    <div class="photo-label">Фото 1</div>
                </div>
            </div>
        `;
    }
    
    let photoHtml = '<div class="photo-gallery">';
    validPhotos.forEach((photoUrl, index) => {
        photoHtml += `
            <div class="photo-item" onclick="openPhotoViewer('${ad.id}', ${index})">
                <img src="${photoUrl}" alt="Фото ${index + 1}" onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEyMCIgaGVpZ2h0PSIxMjAiIHJ4PSIxNSIgZmlsbD0iIzgzNUFGOSIvPjxwYXRoIGQ9Ik03NSA2MEw1NSA3NUw0NSA2MEw2MCA0NUw3NSA2MFoiIGZpbGw9IndoaXRlIi8+PHRleHQgeD0iNjAiIHk9Ijg1IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5GJmFtcDsjeDQ0Mzt0byAxPC90ZXh0Pjwvc3ZnPg=='">
                <div class="photo-label">Фото ${index + 1}</div>
            </div>
        `;
    });
    photoHtml += '</div>';
    
    return photoHtml;
}

// ==================== ОСНОВНЫЕ ВЗАИМОДЕЙСТВИЯ ====================

function toggleAddForm() {
    const form = document.getElementById('addAdForm');
    const btnText = document.getElementById('toggle-btn-text');
    
    if (form.classList.contains('active')) {
        form.classList.remove('active');
        btnText.textContent = 'Добавить';
    } else {
        form.classList.add('active');
        btnText.textContent = 'Скрыть';
    }
}

function hideAddForm() {
    const form = document.getElementById('addAdForm');
    const btnText = document.getElementById('toggle-btn-text');
    
    form.classList.remove('active');
    btnText.textContent = 'Добавить';
    clearAddForm();
}

function clearAddForm() {
    document.getElementById('adTitle').value = '';
    document.getElementById('adCategory').value = '';
    document.getElementById('adDealType').value = 'sell';
    document.getElementById('adPrice').value = '';
    document.getElementById('adDescription').value = '';
    
    appData.uploadedPhotos = [];
    updatePhotoPreviews();
    
    appData.editingAdId = null;
}

function openPhotoPicker() {
    document.getElementById('photoInput').click();
}

function handlePhotoUpload(event) {
    const files = event.target.files;
    const maxFiles = 3;
    
    if (files.length > maxFiles) {
        showNotification(`Можно загрузить только ${maxFiles} фото!`, 'error');
        return;
    }
    
    if (appData.uploadedPhotos.length + files.length > maxFiles) {
        showNotification(`Максимум ${maxFiles} фото!`, 'error');
        return;
    }
    
    const promises = [];
    
    for (let i = 0; i < Math.min(files.length, maxFiles - appData.uploadedPhotos.length); i++) {
        const file = files[i];
        const reader = new FileReader();
        
        const promise = new Promise((resolve) => {
            reader.onload = function(e) {
                appData.uploadedPhotos.push({
                    id: Date.now() + i,
                    url: e.target.result,
                    file: file
                });
                resolve();
            };
            reader.onerror = function() {
                showNotification(`Ошибка загрузки фото ${i + 1}`, 'error');
                resolve();
            };
            reader.readAsDataURL(file);
        });
        
        promises.push(promise);
    }
    
    Promise.all(promises).then(() => {
        updatePhotoPreviews();
        event.target.value = '';
    });
}

function updatePhotoPreviews() {
    const container = document.getElementById('uploaded-photos-container');
    container.innerHTML = '';
    
    appData.uploadedPhotos.forEach((photo, index) => {
        const photoItem = document.createElement('div');
        photoItem.className = 'uploaded-photo-item';
        photoItem.innerHTML = `
            <img src="${photo.url}" alt="Фото ${index + 1}">
            <button class="remove-photo-btn" onclick="removeUploadedPhoto(${photo.id})">×</button>
        `;
        container.appendChild(photoItem);
    });
    
    document.getElementById('photo-count').textContent = appData.uploadedPhotos.length;
    
    if (appData.uploadedPhotos.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; width: 100%; color: #A78BFA; padding: 20px;">
                <i class="fas fa-images" style="font-size: 48px; opacity: 0.5; margin-bottom: 10px;"></i>
                <div>Нажмите "Загрузить фотографии"</div>
            </div>
        `;
    }
}

function removeUploadedPhoto(photoId) {
    appData.uploadedPhotos = appData.uploadedPhotos.filter(photo => photo.id !== photoId);
    updatePhotoPreviews();
    showNotification(`Фото удалено (${appData.uploadedPhotos.length}/3)`, 'warning');
}

async function publishAd() {
    const title = document.getElementById('adTitle').value.trim();
    const category = document.getElementById('adCategory').value;
    const dealType = document.getElementById('adDealType').value;
    const price = parseInt(document.getElementById('adPrice').value);
    const description = document.getElementById('adDescription').value.trim();
    
    if (!title) {
        showNotification('Введите название товара!', 'error');
        return;
    }
    
    if (!category) {
        showNotification('Выберите категорию!', 'error');
        return;
    }
    
    if (!price || isNaN(price) || price <= 0) {
        showNotification('Введите корректную цену!', 'error');
        return;
    }
    
    if (appData.uploadedPhotos.length === 0) {
        showNotification('Добавьте хотя бы одну фотографию!', 'error');
        return;
    }
    
    const newAd = {
        sellerId: appData.currentUserId,
        sellerName: appData.currentUserData.first_name || 'Пользователь',
        sellerUsername: appData.currentUserData.username ? '@' + appData.currentUserData.username : 'Без username',
        sellerAvatar: appData.currentUserData.photo_url || null,
        title: title,
        category: category,
        dealType: dealType,
        price: price,
        description: description || 'Без описания',
        photoUrls: appData.uploadedPhotos.map(p => p.url)
    };
    
    try {
        const adId = await FirebaseMarketServer.addAd(newAd);
        showNotification('Объявление успешно опубликовано!', 'success');
        
        clearAddForm();
        hideAddForm();
        
        // Перезагрузка данных
        await loadFromServer();
        
    } catch (error) {
        console.error('Ошибка публикации:', error);
        showNotification('Ошибка при публикации объявления', 'error');
    }
}

function filterCategory(category) {
    appData.currentCategory = category;
    
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    filterAndRenderAds();
}

function filterDealType(type) {
    appData.currentDealType = type;
    
    document.querySelectorAll('.deal-type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    filterAndRenderAds();
}

function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.trim();
    
    if (!query) {
        clearSearch();
        return;
    }
    
    appData.searchQuery = query;
    
    // Показать заголовок результатов
    const resultsHeader = document.getElementById('searchResultsHeader');
    const queryText = document.getElementById('searchQueryText');
    
    if (resultsHeader && queryText) {
        resultsHeader.style.display = 'flex';
        queryText.textContent = query;
    }
    
    filterAndRenderAds();
    
    showNotification(`Найдено ${appData.filteredAds.length} результатов`, 'info');
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    appData.searchQuery = '';
    
    const resultsHeader = document.getElementById('searchResultsHeader');
    if (resultsHeader) {
        resultsHeader.style.display = 'none';
    }
    
    filterAndRenderAds();
}

async function rateSeller(sellerId, type, adId) {
    if (!appData.isDataLoaded) {
        showNotification('Данные еще загружаются', 'warning');
        return;
    }
    
    const ad = appData.ads.find(a => a.id === adId);
    if (!ad) return;
    
    if (ad.sellerId === appData.currentUserId) {
        showNotification('Нельзя оценивать собственное объявление', 'warning');
        return;
    }
    
    const userRating = appData.userRatings[sellerId]?.[appData.currentUserId];
    
    if (userRating === type) {
        showNotification('Вы уже поставили эту оценку', 'warning');
        return;
    }
    
    const success = await FirebaseMarketServer.updateRating(sellerId, appData.currentUserId, type);
    
    if (success) {
        if (!appData.userRatings[sellerId]) {
            appData.userRatings[sellerId] = {};
        }
        appData.userRatings[sellerId][appData.currentUserId] = type;
        
        // Перезагрузка данных
        appData.userRatings = await FirebaseMarketServer.getRatings();
        
        // Обновление UI
        renderAds();
        updateProfileStats();
        
        showNotification(`Вы поставили ${type === 'like' ? 'лайк' : 'дизлайк'}`, 'success');
    } else {
        showNotification('Ошибка при оценке', 'error');
    }
}

async function contactSeller(username, adId, adTitle, category, price, dealType) {
    if (!appData.isDataLoaded) {
        showNotification('Данные еще загружаются', 'warning');
        return;
    }
    
    const ad = appData.ads.find(a => a.id === adId);
    if (!ad) return;
    
    const categoryName = getCategoryName(category);
    const dealTypeText = dealType === 'buy' ? 'хочу купить' : 'продаю';
    
    const message = `Привет! Вижу твое объявление в Vape Market:\n\n` +
                   `📦 Товар: ${adTitle}\n` +
                   `🏷️ Категория: ${categoryName}\n` +
                   `💰 Цена: ${price.toLocaleString()} ₽\n` +
                   `🔄 Тип: ${dealTypeText}\n\n` +
                   `Можешь рассказать подробнее?`;
    
    const historyItem = {
        id: Date.now(),
        adId: adId,
        title: adTitle,
        sellerUsername: username,
        date: new Date().toLocaleDateString('ru-RU'),
        category: categoryName,
        price: price,
        dealType: dealType
    };
    
    await FirebaseMarketServer.addToHistory(appData.currentUserId, historyItem);
    
    // Обновляем историю
    appData.history = await FirebaseMarketServer.getUserHistory(appData.currentUserId);
    
    if (document.getElementById('page-profile')?.classList.contains('active')) {
        updateHistory();
    }
    
    const tg = window.Telegram?.WebApp;
    if (tg) {
        try {
            const cleanUsername = username.replace('@', '');
            const encodedMessage = encodeURIComponent(message);
            const telegramUrl = `https://t.me/${cleanUsername}?text=${encodedMessage}`;
            
            tg.openTelegramLink(telegramUrl);
            showNotification(`Открывается чат с ${username}`, 'success');
        } catch (error) {
            tg.showAlert(`Для связи напишите ${username} в Telegram:\n\n${message}`);
        }
    } else {
        alert(`Сообщение для ${username}:\n\n${message}`);
        showNotification(`Сообщение для ${username} отправлено`, 'info');
    }
}

function toggleDescription(adId) {
    const short = document.querySelector(`#ad-${adId} .description-short`);
    const full = document.querySelector(`#ad-${adId} .description-full`);
    const btn = document.querySelector(`#ad-${adId} .read-more-btn`);
    
    if (!short || !full || !btn) return;
    
    if (full.style.display === 'none') {
        full.style.display = 'block';
        if (short) short.style.display = 'none';
        btn.textContent = 'Свернуть';
    } else {
        full.style.display = 'none';
        if (short) short.style.display = 'block';
        btn.textContent = 'Читать полностью';
    }
}

// ==================== ФУНКЦИИ ПРОФИЛЯ ====================

function updateMyAdsList() {
    const container = document.getElementById('myAdsList');
    if (!container) return;
    
    const myAds = appData.ads.filter(ad => ad.sellerId === appData.currentUserId);
    
    if (myAds.length === 0) {
        container.innerHTML = '<div class="no-ads">У вас пока нет объявлений</div>';
        return;
    }
    
    let html = '';
    myAds.forEach(ad => {
        const rating = calculateRating(appData.currentUserId);
        
        html += `
            <div class="my-ad-item">
                <div class="my-ad-header">
                    <div class="my-ad-title">${ad.title}</div>
                    <div class="my-ad-price">${ad.price.toLocaleString()} ₽</div>
                </div>
                <div class="product-category" style="display: inline-block; margin-bottom: 10px;">
                    ${getCategoryName(ad.category)}
                </div>
                <div class="my-ad-description">${ad.description || 'Без описания'}</div>
                <div style="display: flex; gap: 15px; font-size: 12px; color: #D8B4FE;">
                    <div><i class="fas fa-thumbs-up"></i> ${ad.likes || 0}</div>
                    <div><i class="fas fa-thumbs-down"></i> ${ad.dislikes || 0}</div>
                    <div><i class="fas fa-star"></i> ${rating.toFixed(1)}</div>
                    ${ad.complaints > 0 ? `<div><i class="fas fa-flag"></i> ${ad.complaints}</div>` : ''}
                </div>
                <div class="my-ad-actions">
                    <button class="edit-ad-btn" onclick="editAd('${ad.id}')">
                        <i class="fas fa-edit"></i> Редактировать
                    </button>
                    <button class="delete-ad-btn" onclick="deleteAd('${ad.id}')">
                        <i class="fas fa-trash"></i> Удалить
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function updateHistory() {
    const container = document.getElementById('historyList');
    if (!container) return;
    
    if (!appData.history || appData.history.length === 0) {
        container.innerHTML = '<div class="no-history">История пуста</div>';
        return;
    }
    
    let html = '';
    appData.history.forEach(item => {
        html += `
            <div class="history-item">
                <div class="history-info">
                    <h4>${item.title}</h4>
                    <p>${item.sellerUsername} • ${item.category} • ${item.price.toLocaleString()} ₽ • ${item.date}</p>
                </div>
                <button class="remove-history-btn" onclick="removeFromHistory('${item.id}')">
                    Удалить
                </button>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

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
        const statusClass = `status-${complaint.status || 'new'}`;
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

async function deleteAd(adId) {
    if (!confirm('Вы уверены, что хотите удалить это объявление?')) {
        return;
    }
    
    const ad = appData.ads.find(a => a.id === adId);
    if (!ad) return;
    
    const success = await FirebaseMarketServer.deleteAd(adId, ad.sellerId);
    
    if (success) {
        appData.ads = appData.ads.filter(ad => ad.id !== adId);
        appData.filteredAds = appData.filteredAds.filter(ad => ad.id !== adId);
        
        renderAds();
        updateProfileStats();
        updateMyAdsList();
        
        showNotification('Объявление удалено', 'warning');
    } else {
        showNotification('Ошибка при удалении', 'error');
    }
}

function editAd(adId) {
    const ad = appData.ads.find(a => a.id === adId);
    if (!ad) return;
    
    document.getElementById('adTitle').value = ad.title;
    document.getElementById('adCategory').value = ad.category;
    document.getElementById('adDealType').value = ad.dealType || 'sell';
    document.getElementById('adPrice').value = ad.price;
    document.getElementById('adDescription').value = ad.description || '';
    
    appData.uploadedPhotos = [];
    if (ad.photoUrls && ad.photoUrls.length > 0) {
        ad.photoUrls.forEach((url, index) => {
            if (url && url !== 'null') {
                appData.uploadedPhotos.push({
                    id: Date.now() + index,
                    url: url,
                    file: null
                });
            }
        });
    }
    
    updatePhotoPreviews();
    
    appData.editingAdId = adId;
    
    toggleAddForm();
    
    showNotification('Редактирование объявления', 'info');
}

async function removeFromHistory(id) {
    // Здесь должна быть логика удаления из Firebase
    appData.history = appData.history.filter(item => item.id !== id);
    updateHistory();
    showNotification('Удалено из истории', 'warning');
}

async function clearHistory() {
    if (!confirm('Вы уверены, что хотите очистить всю историю?')) {
        return;
    }
    
    const success = await FirebaseMarketServer.clearUserHistory(appData.currentUserId);
    
    if (success) {
        appData.history = [];
        updateHistory();
        showNotification('История очищена', 'warning');
    } else {
        showNotification('Ошибка при очистке истории', 'error');
    }
}

// ==================== СИСТЕМА ЖАЛОБ ====================

let currentComplaintData = null;

function openComplaintModal(adId, targetId, targetUsername) {
    currentComplaintData = { adId, targetId, targetUsername };
    
    const modal = document.getElementById('complaintModal');
    if (modal) {
        modal.classList.add('active');
    } else {
        // Если модального окна нет в HTML, создаем его
        createComplaintModal();
    }
}

function createComplaintModal() {
    const modal = document.createElement('div');
    modal.className = 'complaint-modal active';
    modal.id = 'complaintModal';
    modal.innerHTML = `
        <div class="complaint-form">
            <h3>Подать жалобу</h3>
            <p style="color: #D8B4FE; margin-bottom: 15px; font-size: 14px;">
                На пользователя: ${currentComplaintData?.targetUsername || 'Неизвестно'}
            </p>
            
            <div class="complaint-reasons">
                <button class="complaint-reason-btn" onclick="selectComplaintReason('Мошенничество')">Мошенничество</button>
                <button class="complaint-reason-btn" onclick="selectComplaintReason('Неправильная категория')">Неправильная категория</button>
                <button class="complaint-reason-btn" onclick="selectComplaintReason('Запрещенные товары')">Запрещенные товары</button>
                <button class="complaint-reason-btn" onclick="selectComplaintReason('Неверная цена')">Неверная цена</button>
                <button class="complaint-reason-btn" onclick="selectComplaintReason('Спам')">Спам</button>
                <button class="complaint-reason-btn" onclick="selectComplaintReason('Другое')">Другое</button>
            </div>
            
            <textarea class="form-input" id="complaintDescription" placeholder="Дополнительное описание (необязательно)" rows="3"></textarea>
            
            <div class="form-buttons" style="margin-top: 20px;">
                <button class="publish-btn" onclick="submitComplaint()" style="flex: 2;">
                    <i class="fas fa-paper-plane"></i> Отправить жалобу
                </button>
                <button class="cancel-btn" onclick="closeComplaintModal()" style="flex: 1;">
                    <i class="fas fa-times"></i> Отмена
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function selectComplaintReason(reason) {
    document.querySelectorAll('.complaint-reason-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent === reason) {
            btn.classList.add('active');
        }
    });
}

async function submitComplaint() {
    if (!currentComplaintData) return;
    
    const activeReasonBtn = document.querySelector('.complaint-reason-btn.active');
    if (!activeReasonBtn) {
        showNotification('Выберите причину жалобы', 'error');
        return;
    }
    
    const reason = activeReasonBtn.textContent;
    const description = document.getElementById('complaintDescription')?.value || '';
    
    const complaintData = {
        adId: currentComplaintData.adId,
        targetId: currentComplaintData.targetId,
        targetUsername: currentComplaintData.targetUsername,
        reporterId: appData.currentUserId,
        reporterUsername: appData.currentUserData.username || 'Аноним',
        reason: reason,
        description: description,
        status: 'new'
    };
    
    const complaintId = await FirebaseMarketServer.addComplaint(complaintData);
    
    if (complaintId) {
        showNotification('Жалоба отправлена администратору', 'success');
        closeComplaintModal();
        
        // Обновляем список жалоб
        appData.myComplaints = await FirebaseMarketServer.getUserComplaints(appData.currentUserId);
        updateMyComplaintsList();
    } else {
        showNotification('Ошибка при отправке жалобы', 'error');
    }
}

function closeComplaintModal() {
    const modal = document.getElementById('complaintModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            if (modal.parentNode && modal.classList.contains('active') === false) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    }
    currentComplaintData = null;
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

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
    if (!notification) {
        // Создаем элемент уведомления если его нет
        const notificationElement = document.createElement('div');
        notificationElement.id = 'notification';
        notificationElement.className = `notification ${type}`;
        notificationElement.textContent = message;
        notificationElement.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(-100px);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px 25px;
            border-radius: 12px;
            backdrop-filter: blur(10px);
            z-index: 1000;
            transition: transform 0.5s ease;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            max-width: 90%;
            text-align: center;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-left: 4px solid ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : type === 'warning' ? '#F59E0B' : '#3B82F6'};
        `;
        document.body.appendChild(notificationElement);
        
        // Показываем
        setTimeout(() => {
            notificationElement.style.transform = 'translateX(-50%) translateY(0)';
        }, 10);
        
        // Скрываем через 3 секунды
        setTimeout(() => {
            notificationElement.style.transform = 'translateX(-50%) translateY(-100px)';
            setTimeout(() => {
                if (notificationElement.parentNode) {
                    notificationElement.parentNode.removeChild(notificationElement);
                }
            }, 500);
        }, 3000);
        return;
    }
    
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function updateServerStatsUI() {
    // Реализация обновления статистики сервера
}

function openPhotoViewer(adId, photoIndex = 0) {
    const ad = appData.ads.find(a => a.id === adId);
    if (!ad || !ad.photoUrls || ad.photoUrls.length === 0 || ad.photoUrls[0] === null) {
        showNotification('Фотографии не найдены', 'error');
        return;
    }
    
    const validPhotoUrls = ad.photoUrls.filter(url => url && url !== 'null');
    if (validPhotoUrls.length === 0) {
        showNotification('Фотографии не найдены', 'error');
        return;
    }
    
    appData.currentPhotoList = validPhotoUrls;
    appData.currentPhotoIndex = Math.min(photoIndex, validPhotoUrls.length - 1);
    
    const modal = document.getElementById('photoModal');
    const modalImg = document.getElementById('modalPhoto');
    const counter = document.getElementById('photoCounter');
    
    if (modal && modalImg && counter) {
        modalImg.src = validPhotoUrls[appData.currentPhotoIndex];
        modalImg.onerror = function() {
            this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiM4MzVBRjkiLz48cGF0aCBkPSJNMTYwIDE5MEwyNDAgMjQwTDE4MCAxOTBMMjIwIDE0MEwxNjAgMTkwWiIgZmlsbD0id2hpdGUiLz48dGV4dCB4PSIyMDAiIHk9IjI4MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjI0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Rm90byBub3QgZm91bmQ8L3RleHQ+PC9zdmc+';
        };
        
        counter.textContent = `${appData.currentPhotoIndex + 1} / ${validPhotoUrls.length}`;
        
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closePhotoModal() {
    const modal = document.getElementById('photoModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

function nextPhoto() {
    if (appData.currentPhotoList.length === 0) return;
    
    appData.currentPhotoIndex = (appData.currentPhotoIndex + 1) % appData.currentPhotoList.length;
    const modalImg = document.getElementById('modalPhoto');
    if (modalImg) {
        modalImg.src = appData.currentPhotoList[appData.currentPhotoIndex];
    }
    const counter = document.getElementById('photoCounter');
    if (counter) {
        counter.textContent = `${appData.currentPhotoIndex + 1} / ${appData.currentPhotoList.length}`;
    }
}

function prevPhoto() {
    if (appData.currentPhotoList.length === 0) return;
    
    appData.currentPhotoIndex = appData.currentPhotoIndex === 0 
        ? appData.currentPhotoList.length - 1 
        : appData.currentPhotoIndex - 1;
    
    const modalImg = document.getElementById('modalPhoto');
    if (modalImg) {
        modalImg.src = appData.currentPhotoList[appData.currentPhotoIndex];
    }
    const counter = document.getElementById('photoCounter');
    if (counter) {
        counter.textContent = `${appData.currentPhotoIndex + 1} / ${appData.currentPhotoList.length}`;
    }
}

function switchPage(page) {
    // Скрываем все страницы
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });
    
    // Показываем выбранную страницу
    const pageElement = document.getElementById(`page-${page}`);
    if (pageElement) {
        pageElement.classList.add('active');
    }
    
    // Обновляем активные кнопки навигации
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const navItem = document.querySelector(`[data-page="${page}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }
    
    // Обновляем заголовок
    const titles = {
        'ads': 'Vape Market',
        'profile': 'Личный кабинет',
        'faq': 'Помощь',
        'admin': 'Админ-панель'
    };
    const headerTitle = document.getElementById('header-title');
    if (headerTitle) {
        headerTitle.textContent = titles[page] || 'Vape Market';
    }
    
    // Скрываем форму добавления
    hideAddForm();
    
    // Обновляем данные если нужно
    if (appData.isDataLoaded) {
        if (page === 'profile') {
            updateProfileStats();
            updateMyAdsList();
            updateHistory();
            updateMyComplaintsList();
        }
        
        if (page === 'faq') {
            updateServerStatsUI();
        }
    }
}

function switchProfileTab(tab) {
    document.querySelectorAll('.profile-tab').forEach(t => {
        t.classList.remove('active');
    });
    document.querySelectorAll('.profile-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const tabElement = document.querySelector(`[onclick="switchProfileTab('${tab}')"]`);
    if (tabElement) {
        tabElement.classList.add('active');
    }
    
    const contentElement = document.getElementById(`${tab}-tab`);
    if (contentElement) {
        contentElement.classList.add('active');
    }
    
    if (tab === 'history' && appData.isDataLoaded) {
        updateHistory();
    }
    if (tab === 'complaints' && appData.isDataLoaded) {
        updateMyComplaintsList();
    }
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

// Инициализация Telegram
document.addEventListener('DOMContentLoaded', function() {
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
            console.log('✅ Пользователь Telegram получен:', appData.currentUserId);
        }
    }
    
    // Инициализация приложения
    initApp();
});

// Экспорт функций для глобального доступа
window.FirebaseMarketServer = FirebaseMarketServer;
window.appData = appData;
window.initApp = initApp;
window.toggleAddForm = toggleAddForm;
window.hideAddForm = hideAddForm;
window.openPhotoPicker = openPhotoPicker;
window.handlePhotoUpload = handlePhotoUpload;
window.removeUploadedPhoto = removeUploadedPhoto;
window.publishAd = publishAd;
window.filterCategory = filterCategory;
window.filterDealType = filterDealType;
window.performSearch = performSearch;
window.clearSearch = clearSearch;
window.rateSeller = rateSeller;
window.contactSeller = contactSeller;
window.toggleDescription = toggleDescription;
window.switchPage = switchPage;
window.switchProfileTab = switchProfileTab;
window.deleteAd = deleteAd;
window.editAd = editAd;
window.removeFromHistory = removeFromHistory;
window.clearHistory = clearHistory;
window.openComplaintModal = openComplaintModal;
window.closeComplaintModal = closeComplaintModal;
window.selectComplaintReason = selectComplaintReason;
window.submitComplaint = submitComplaint;
window.openPhotoViewer = openPhotoViewer;
window.closePhotoModal = closePhotoModal;
window.nextPhoto = nextPhoto;
window.prevPhoto = prevPhoto;
window.showNotification = showNotification;

console.log("✅ app.js загружен и готов к работе!");
