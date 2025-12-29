// ==================== КОНФИГУРАЦИЯ ====================
const CONFIG = {
    maxPhotos: 3,
    adminUsers: ['998579758'], // ID админов
    superAdmin: '998579758'    // ID суперадмина
};

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let currentUser = null;
let allAds = [];
let filteredAds = [];
let selectedPhotos = [];
let currentFilter = 'all';
let currentAdId = null;
let userRole = 'user';

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Vape Market запускается...');
    
    try {
        // Инициализация пользователя (без Telegram для начала)
        initUser();
        
        // Загрузка начальных данных
        loadInitialData();
        
        // Настройка обработчиков
        setupEventListeners();
        
        // Обновление UI
        updateUI();
        
        console.log('✅ Приложение успешно инициализировано');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        showNotification('Ошибка загрузки приложения', 'error');
    }
});

// ==================== ПОЛЬЗОВАТЕЛЬ ====================
function initUser() {
    // Создаем тестового пользователя для демо
    currentUser = {
        id: '998579758',
        username: 'admin',
        firstName: 'Админ',
        lastName: '',
        photoUrl: null,
        isPremium: true
    };
    
    // Проверяем роль пользователя
    checkUserRole();
    
    // Сохраняем в localStorage
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    console.log('👤 Пользователь инициализирован:', currentUser.username);
}

function checkUserRole() {
    if (!currentUser) return;
    
    const userId = currentUser.id.toString();
    
    if (userId === CONFIG.superAdmin) {
        userRole = 'superadmin';
        // Обновляем UI для суперадмина
        const usernameEl = document.querySelector('.username');
        const avatarEl = document.querySelector('.user-avatar');
        
        if (usernameEl) {
            usernameEl.textContent = 'Суперадмин';
        }
        
        if (avatarEl) {
            avatarEl.innerHTML = '<i class="fas fa-crown"></i>';
            avatarEl.style.background = 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)';
        }
        
    } else if (CONFIG.adminUsers.includes(userId)) {
        userRole = 'admin';
        // Обновляем UI для админа
        const usernameEl = document.querySelector('.username');
        const avatarEl = document.querySelector('.user-avatar');
        
        if (usernameEl) {
            usernameEl.textContent = 'Админ';
        }
        
        if (avatarEl) {
            avatarEl.innerHTML = '<i class="fas fa-shield-alt"></i>';
            avatarEl.style.background = 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)';
        }
    }
    
    // Показываем кнопку админ панели для админов
    const adminBtn = document.getElementById('adminPanelBtn');
    if (adminBtn && userRole !== 'user') {
        adminBtn.style.display = 'flex';
    }
    
    // Показываем рекламный баннер для суперадмина
    const adBanner = document.getElementById('adBanner');
    if (adBanner && userRole === 'superadmin') {
        adBanner.style.display = 'block';
        showAdBanner();
    }
    
    console.log(`👤 Роль пользователя: ${userRole}`);
}

// ==================== ЗАГРУЗКА ДАННЫХ ====================
function loadInitialData() {
    try {
        // Загружаем тестовые данные
        allAds = getMockAds();
        
        // Применяем фильтры
        filterAds();
        
        // Обновляем статистику
        updateStats();
        
        console.log('✅ Данные загружены:', allAds.length, 'объявлений');
        
    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error);
        showNotification('Ошибка загрузки данных', 'error');
    }
}

function getMockAds() {
    return [
        {
            id: '1',
            title: 'HQD Cuvie Plus 2500',
            price: 1200,
            category: 'disposable',
            dealType: 'sell',
            description: 'Новый, в упаковке, 2500 затяжек. Отличное качество пара.',
            photos: 1,
            photoUrl: 'https://images.unsplash.com/photo-1603708736098-4cb1550b3ac4?w=400&h=300&fit=crop',
            sellerId: '123',
            sellerName: 'Иван',
            sellerRating: 4.7,
            createdAt: new Date().toISOString(),
            views: 45,
            likes: 12,
            dislikes: 2,
            isVerified: true,
            status: 'active'
        },
        {
            id: '2',
            title: 'Caliburn G3',
            price: 2500,
            category: 'pod',
            dealType: 'sell',
            description: 'Отличное состояние, 2 недели использования. В комплекте 2 картриджа.',
            photos: 0,
            sellerId: '456',
            sellerName: 'Алексей',
            sellerRating: 4.2,
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            views: 89,
            likes: 20,
            dislikes: 3,
            isVerified: false,
            status: 'active'
        },
        {
            id: '3',
            title: 'Ищу одноразовые Elf Bar',
            price: 800,
            category: 'disposable',
            dealType: 'buy',
            description: 'Ищу Elf Bar или HQD, новые или б/у. Могу забрать сегодня.',
            photos: 0,
            sellerId: '789',
            sellerName: 'Максим',
            sellerRating: 4.5,
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            views: 23,
            likes: 5,
            dislikes: 1,
            isVerified: true,
            status: 'active'
        },
        {
            id: '4',
            title: 'Жидкости Salt 20mg',
            price: 500,
            category: 'liquids',
            dealType: 'sell',
            description: 'Солевые жидкости разных вкусов: мята, ягоды, табак.',
            photos: 1,
            photoUrl: 'https://images.unsplash.com/photo-1604908558871-34188c2f5d9c?w=400&h=300&fit=crop',
            sellerId: '101',
            sellerName: 'Дмитрий',
            sellerRating: 4.8,
            createdAt: new Date(Date.now() - 259200000).toISOString(),
            views: 67,
            likes: 15,
            dislikes: 0,
            isVerified: true,
            status: 'active'
        }
    ];
}

// ==================== ФИЛЬТРАЦИЯ И ПОИСК ====================
function filterAds() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    filteredAds = allAds.filter(ad => {
        // Проверяем фильтр по типу
        if (currentFilter !== 'all' && ad.dealType !== currentFilter) {
            return false;
        }
        
        // Проверяем статус
        if (ad.status !== 'active') {
            return false;
        }
        
        // Проверяем поиск
        if (searchTerm) {
            const matches = (
                (ad.title && ad.title.toLowerCase().includes(searchTerm)) ||
                (ad.description && ad.description.toLowerCase().includes(searchTerm)) ||
                (ad.category && ad.category.toLowerCase().includes(searchTerm)) ||
                (ad.sellerName && ad.sellerName.toLowerCase().includes(searchTerm))
            );
            if (!matches) return false;
        }
        
        return true;
    });
    
    // Сортируем по дате (новые сначала)
    filteredAds.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Обновляем сетку
    updateAdsGrid();
}

// ==================== ОБНОВЛЕНИЕ UI ====================
function updateUI() {
    updateAdsGrid();
    updateStats();
    setupAdminFeatures();
}

function updateAdsGrid() {
    const adsGrid = document.getElementById('adsGrid');
    if (!adsGrid) return;
    
    if (filteredAds.length === 0) {
        adsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: #94A3B8;">
                <i class="fas fa-box-open" style="font-size: 48px; margin-bottom: 20px;"></i>
                <h3 style="color: #CBD5E1; margin-bottom: 10px;">Нет объявлений</h3>
                <p>Попробуйте изменить параметры поиска</p>
                <button onclick="clearFilters()" style="
                    margin-top: 15px;
                    padding: 10px 20px;
                    background: rgba(168, 85, 247, 0.1);
                    border: 1px solid rgba(168, 85, 247, 0.3);
                    border-radius: 10px;
                    color: #C084FC;
                    cursor: pointer;
                ">
                    Сбросить фильтры
                </button>
            </div>
        `;
        return;
    }
    
    adsGrid.innerHTML = filteredAds.map(ad => createAdCardHTML(ad)).join('');
    
    // Добавляем обработчики для карточек
    document.querySelectorAll('.ad-card').forEach(card => {
        const adId = card.dataset.id;
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.ad-actions')) {
                showAdDetails(adId);
            }
        });
    });
}

function createAdCardHTML(ad) {
    const ratingStars = getStarsHTML(ad.sellerRating);
    const hasPhoto = ad.photos > 0 && ad.photoUrl;
    
    return `
        <div class="ad-card" data-id="${ad.id}">
            <div class="ad-image">
                ${hasPhoto 
                    ? `<img src="${ad.photoUrl}" alt="${ad.title}" 
                         onerror="this.style.display='none'; this.parentElement.innerHTML='<i class=\"fas fa-box-open no-photo\"></i>';"
                         style="width: 100%; height: 100%; object-fit: cover;">`
                    : `<i class="fas fa-box-open no-photo"></i>`
                }
                ${ad.isVerified ? `
                    <div class="ad-badge">
                        <i class="fas fa-check-circle"></i>
                        Проверен
                    </div>
                ` : ''}
            </div>
            
            <div class="ad-info">
                <div class="ad-header">
                    <h3 class="ad-title">${ad.title || 'Без названия'}</h3>
                    <span class="ad-price">${formatPrice(ad.price)} ₽</span>
                </div>
                
                ${ratingStars ? `
                    <div class="rating-stars">
                        ${ratingStars}
                        <span style="color: #94A3B8; font-size: 12px; margin-left: 5px;">
                            ${ad.sellerRating.toFixed(1)}
                        </span>
                    </div>
                ` : ''}
                
                <p class="ad-description">${ad.description || 'Нет описания'}</p>
                
                <div class="ad-footer">
                    <div class="seller-info">
                        <div class="seller-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <span class="seller-name">${ad.sellerName || 'Продавец'}</span>
                    </div>
                    <span class="ad-date">${formatDate(ad.createdAt)}</span>
                </div>
                
                <div class="ad-actions">
                    <button class="action-btn message" onclick="messageSeller('${ad.sellerId}', '${ad.title}')">
                        <i class="fab fa-telegram"></i>
                        Написать
                    </button>
                    
                    <button class="action-btn like" onclick="rateAd('${ad.id}', 'like', event)">
                        <i class="fas fa-thumbs-up"></i>
                        ${ad.likes || 0}
                    </button>
                    
                    <button class="action-btn dislike" onclick="rateAd('${ad.id}', 'dislike', event)">
                        <i class="fas fa-thumbs-down"></i>
                        ${ad.dislikes || 0}
                    </button>
                    
                    <button class="action-btn report" onclick="showReportModal('${ad.id}', event)">
                        <i class="fas fa-flag"></i>
                        Жалоба
                    </button>
                </div>
            </div>
        </div>
    `;
}

function getStarsHTML(rating) {
    if (!rating || rating <= 0) return '';
    
    let stars = '';
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
        if (i <= fullStars) {
            stars += '<i class="fas fa-star star"></i>';
        } else if (i === fullStars + 1 && hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt star"></i>';
        } else {
            stars += '<i class="far fa-star star empty"></i>';
        }
    }
    
    return stars;
}

// ==================== СТАТИСТИКА ====================
function updateStats() {
    // Обновляем статистику платформы
    const totalUsers = '1,248';
    const totalAds = allAds.length.toString();
    const todayAds = allAds.filter(ad => {
        const adDate = new Date(ad.createdAt);
        const today = new Date();
        return adDate.toDateString() === today.toDateString();
    }).length.toString();
    const totalDeals = '3,856';
    
    // Обновляем элементы если они существуют
    const totalUsersEl = document.getElementById('totalUsers');
    const totalAdsEl = document.getElementById('totalAds');
    const todayAdsEl = document.getElementById('todayAds');
    const totalDealsEl = document.getElementById('totalDeals');
    
    if (totalUsersEl) totalUsersEl.textContent = totalUsers;
    if (totalAdsEl) totalAdsEl.textContent = totalAds;
    if (todayAdsEl) todayAdsEl.textContent = todayAds;
    if (totalDealsEl) totalDealsEl.textContent = totalDeals;
}

// ==================== АДМИН ФУНКЦИИ ====================
function setupAdminFeatures() {
    const adminPanelBtn = document.getElementById('adminPanelBtn');
    if (adminPanelBtn && userRole !== 'user') {
        adminPanelBtn.style.display = 'flex';
        adminPanelBtn.addEventListener('click', showAdminPanel);
    }
    
    // Показываем баннер для суперадмина
    if (userRole === 'superadmin') {
        const adBanner = document.getElementById('adBanner');
        if (adBanner) {
            adBanner.style.display = 'block';
            showAdBanner();
        }
    }
}

function showAdBanner() {
    const banner = JSON.parse(localStorage.getItem('adBanner') || 'null');
    const adBanner = document.getElementById('adBanner');
    
    if (banner && adBanner) {
        const h3 = adBanner.querySelector('h3');
        const p = adBanner.querySelector('p');
        
        if (h3) h3.textContent = banner.title || 'Рекламное место';
        if (p) p.textContent = banner.text || 'Текст рекламы здесь';
    }
}

function editAdBanner() {
    const currentBanner = JSON.parse(localStorage.getItem('adBanner') || '{"title":"Рекламное место","text":"Текст рекламы здесь"}');
    
    const title = prompt('Заголовок рекламы:', currentBanner.title);
    if (title === null) return;
    
    const text = prompt('Текст рекламы:', currentBanner.text);
    if (text === null) return;
    
    const newBanner = {
        title: title,
        text: text,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.id
    };
    
    localStorage.setItem('adBanner', JSON.stringify(newBanner));
    showAdBanner();
    showNotification('Рекламный баннер обновлен', 'success');
}

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

// 1. НАПИСАТЬ ПРОДАВЦУ
function messageSeller(sellerId, adTitle) {
    const message = `Привет! Я заинтересован в вашем объявлении: "${adTitle}". Можно уточнить детали?`;
    const url = `https://t.me/share/url?url=&text=${encodeURIComponent(message)}`;
    
    if (window.Telegram && Telegram.WebApp) {
        Telegram.WebApp.openTelegramLink(url);
    } else {
        window.open(url, '_blank');
    }
    
    // Предотвращаем всплытие события
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
}

// 2. ОЦЕНКА ОБЪЯВЛЕНИЯ
function rateAd(adId, type, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    const ad = allAds.find(a => a.id === adId);
    if (!ad) {
        showNotification('Объявление не найдено', 'error');
        return;
    }
    
    if (type === 'like') {
        ad.likes = (ad.likes || 0) + 1;
        showNotification('Вы поставили лайк!', 'success');
    } else {
        ad.dislikes = (ad.dislikes || 0) + 1;
        showNotification('Вы поставили дизлайк', 'warning');
    }
    
    // Пересчитываем рейтинг продавца
    updateSellerRating(ad.sellerId);
    
    // Обновляем UI
    updateAdsGrid();
}

function updateSellerRating(sellerId) {
    const sellerAds = allAds.filter(ad => ad.sellerId === sellerId);
    if (sellerAds.length === 0) return;
    
    let totalLikes = 0;
    let totalDislikes = 0;
    
    sellerAds.forEach(ad => {
        totalLikes += ad.likes || 0;
        totalDislikes += ad.dislikes || 0;
    });
    
    const totalRatings = totalLikes + totalDislikes;
    
    if (totalRatings > 0) {
        const rating = (totalLikes / totalRatings) * 5;
        const finalRating = parseFloat(rating.toFixed(1));
        
        // Обновляем рейтинг во всех объявлениях продавца
        sellerAds.forEach(ad => {
            ad.sellerRating = finalRating;
        });
    }
}

// 3. ЖАЛОБА НА ОБЪЯВЛЕНИЕ
function showReportModal(adId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    currentAdId = adId;
    const ad = allAds.find(a => a.id === adId);
    
    if (!ad) {
        showNotification('Объявление не найдено', 'error');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'reportModalOverlay';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.right = '0';
    modal.style.bottom = '0';
    modal.style.background = 'rgba(0, 0, 0, 0.8)';
    modal.style.backdropFilter = 'blur(20px)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '2000';
    modal.style.padding = '20px';
    
    modal.innerHTML = `
        <div class="modal-container">
            <div class="modal-header">
                <h2>Пожаловаться на объявление</h2>
                <button class="modal-close" onclick="closeReportModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="modal-body" style="padding: 20px;">
                <p style="color: #CBD5E1; margin-bottom: 20px;">
                    Объявление: <strong>${ad.title}</strong><br>
                    Продавец: <strong>${ad.sellerName}</strong>
                </p>
                
                <div class="form-group">
                    <label style="color: #CBD5E1; display: block; margin-bottom: 8px;">Причина жалобы</label>
                    <select id="reportReason" class="category-select" style="width: 100%; padding: 12px; background: rgba(30,41,59,0.8); border: 1px solid rgba(168,85,247,0.3); border-radius: 10px; color: white;">
                        <option value="spam">Спам</option>
                        <option value="fraud">Мошенничество</option>
                        <option value="wrong_category">Неправильная категория</option>
                        <option value="prohibited">Запрещенные товары</option>
                        <option value="fake_price">Неверная цена</option>
                        <option value="other">Другое</option>
                    </select>
                </div>
                
                <div class="form-group" style="margin-top: 15px;">
                    <label style="color: #CBD5E1; display: block; margin-bottom: 8px;">Комментарий (необязательно)</label>
                    <textarea id="reportComment" style="width: 100%; padding: 12px; background: rgba(30,41,59,0.8); border: 1px solid rgba(168,85,247,0.3); border-radius: 10px; color: white; min-height: 80px;" 
                              placeholder="Опишите проблему подробнее..."></textarea>
                </div>
            </div>
            
            <div class="modal-footer" style="padding: 20px; display: flex; gap: 10px; border-top: 1px solid rgba(255,255,255,0.1);">
                <button onclick="closeReportModal()" style="flex: 1; padding: 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; color: #CBD5E1; cursor: pointer;">
                    Отмена
                </button>
                <button onclick="submitReport()" style="flex: 1; padding: 12px; background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); border: none; border-radius: 10px; color: white; font-weight: 600; cursor: pointer;">
                    <i class="fas fa-paper-plane"></i>
                    Отправить жалобу
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Закрытие по клику вне модалки
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeReportModal();
        }
    });
}

function closeReportModal() {
    const modal = document.getElementById('reportModalOverlay');
    if (modal) {
        modal.remove();
    }
}

function submitReport() {
    const reason = document.getElementById('reportReason').value;
    const comment = document.getElementById('reportComment').value;
    const ad = allAds.find(a => a.id === currentAdId);
    
    if (!ad) {
        showNotification('Объявление не найдено', 'error');
        return;
    }
    
    // Создаем объект жалобы
    const report = {
        id: 'report_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        adId: currentAdId,
        adTitle: ad.title,
        sellerId: ad.sellerId,
        sellerName: ad.sellerName,
        reporterId: currentUser?.id || 'anonymous',
        reporterName: currentUser?.firstName || 'Аноним',
        reason: reason,
        comment: comment,
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    
    // Сохраняем жалобу
    saveReport(report);
    
    // Закрываем модалку
    closeReportModal();
    
    // Показываем уведомление
    showNotification('Жалоба отправлена администраторам', 'success');
    
    // Уведомляем админов если они онлайн
    if (userRole !== 'user') {
        console.log('📢 Новая жалоба получена:', report);
    }
}

function saveReport(report) {
    try {
        let reports = JSON.parse(localStorage.getItem('reports') || '[]');
        reports.push(report);
        localStorage.setItem('reports', JSON.stringify(reports));
        console.log('✅ Жалоба сохранена:', report.id);
    } catch (error) {
        console.error('❌ Ошибка сохранения жалобы:', error);
    }
}

// 4. АДМИН ПАНЕЛЬ
function showAdminPanel() {
    if (userRole === 'user') {
        showNotification('Доступ запрещен', 'error');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'adminModalOverlay';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.right = '0';
    modal.style.bottom = '0';
    modal.style.background = 'rgba(0, 0, 0, 0.8)';
    modal.style.backdropFilter = 'blur(20px)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '2000';
    modal.style.padding = '20px';
    
    modal.innerHTML = `
        <div class="modal-container" style="max-width: 800px; width: 100%;">
            <div class="modal-header">
                <h2>Админ панель</h2>
                <button class="modal-close" onclick="closeAdminPanel()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="modal-body" style="padding: 0;">
                <div class="profile-tabs" style="margin: 0; border-radius: 0; border: none; display: flex; gap: 5px; padding: 10px; background: rgba(30,41,59,0.6);">
                    <button class="tab-btn active" onclick="switchAdminTab('reports')" style="flex: 1; padding: 10px; background: rgba(139,92,246,0.2); border: none; border-radius: 10px; color: white; cursor: pointer;">
                        <i class="fas fa-flag"></i>
                        Жалобы
                    </button>
                    <button class="tab-btn" onclick="switchAdminTab('users')" style="flex: 1; padding: 10px; background: transparent; border: none; border-radius: 10px; color: #94A3B8; cursor: pointer;">
                        <i class="fas fa-users"></i>
                        Пользователи
                    </button>
                    ${userRole === 'superadmin' ? `
                        <button class="tab-btn" onclick="switchAdminTab('ads')" style="flex: 1; padding: 10px; background: transparent; border: none; border-radius: 10px; color: #94A3B8; cursor: pointer;">
                            <i class="fas fa-ad"></i>
                            Реклама
                        </button>
                    ` : ''}
                </div>
                
                <div id="adminTabContent" style="padding: 20px; max-height: 500px; overflow-y: auto;">
                    <!-- Контент будет загружен здесь -->
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Загружаем первую вкладку
    switchAdminTab('reports');
    
    // Закрытие по клику вне модалки
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeAdminPanel();
        }
    });
}

function closeAdminPanel() {
    const modal = document.getElementById('adminModalOverlay');
    if (modal) {
        modal.remove();
    }
}

function switchAdminTab(tabName) {
    // Обновляем активные кнопки
    const modal = document.getElementById('adminModalOverlay');
    if (!modal) return;
    
    modal.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = 'transparent';
        btn.style.color = '#94A3B8';
    });
    
    event.target.classList.add('active');
    event.target.style.background = 'rgba(139,92,246,0.2)';
    event.target.style.color = 'white';
    
    // Загружаем контент
    const container = modal.querySelector('#adminTabContent');
    
    switch(tabName) {
        case 'reports':
            loadAdminReports(container);
            break;
        case 'users':
            loadAdminUsers(container);
            break;
        case 'ads':
            loadAdminAds(container);
            break;
    }
}

function loadAdminReports(container) {
    const reports = JSON.parse(localStorage.getItem('reports') || '[]');
    
    container.innerHTML = `
        <h3 style="color: white; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-flag"></i>
            Жалобы пользователей
            <span style="background: #8B5CF6; color: white; padding: 2px 8px; border-radius: 10px; font-size: 12px;">
                ${reports.length}
            </span>
        </h3>
        
        ${reports.length === 0 ? `
            <div style="text-align: center; padding: 40px 20px; color: #94A3B8;">
                <i class="fas fa-flag" style="font-size: 48px; margin-bottom: 20px;"></i>
                <h3 style="color: #CBD5E1;">Нет жалоб</h3>
                <p>Здесь будут отображаться жалобы пользователей</p>
            </div>
        ` : `
            <div style="display: flex; flex-direction: column; gap: 15px;">
                ${reports.map(report => `
                    <div style="background: rgba(30,41,59,0.6); border-radius: 15px; padding: 15px; border: 1px solid rgba(168,85,247,0.2);">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                            <div>
                                <h4 style="color: white; margin-bottom: 5px;">${report.adTitle}</h4>
                                <p style="color: #94A3B8; font-size: 12px;">
                                    Продавец: ${report.sellerName} | 
                                    Причина: ${getReportReasonText(report.reason)}
                                </p>
                            </div>
                            <span style="background: ${getReportStatusColor(report.status)}; color: white; padding: 4px 10px; border-radius: 10px; font-size: 11px;">
                                ${getReportStatusText(report.status)}
                            </span>
                        </div>
                        
                        ${report.comment ? `
                            <p style="color: #CBD5E1; font-size: 13px; margin-bottom: 10px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px;">
                                <strong>Комментарий:</strong> ${report.comment}
                            </p>
                        ` : ''}
                        
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);">
                            <span style="color: #94A3B8; font-size: 11px;">
                                ${formatDate(report.createdAt)}
                            </span>
                            
                            <div style="display: flex; gap: 8px;">
                                ${report.status === 'pending' ? `
                                    <button onclick="adminResolveReport('${report.id}')" style="padding: 6px 12px; background: rgba(34,197,94,0.2); border: 1px solid rgba(34,197,94,0.3); border-radius: 8px; color: #10B981; font-size: 12px; cursor: pointer;">
                                        <i class="fas fa-check"></i> Решить
                                    </button>
                                    <button onclick="adminRejectReport('${report.id}')" style="padding: 6px 12px; background: rgba(239,68,68,0.2); border: 1px solid rgba(239,68,68,0.3); border-radius: 8px; color: #EF4444; font-size: 12px; cursor: pointer;">
                                        <i class="fas fa-times"></i> Отклонить
                                    </button>
                                ` : ''}
                                <button onclick="adminDeleteReport('${report.id}')" style="padding: 6px 12px; background: rgba(107,114,128,0.2); border: 1px solid rgba(107,114,128,0.3); border-radius: 8px; color: #94A3B8; font-size: 12px; cursor: pointer;">
                                    <i class="fas fa-trash"></i> Удалить
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `}
    `;
}

function getReportReasonText(reason) {
    const reasons = {
        'spam': 'Спам',
        'fraud': 'Мошенничество',
        'wrong_category': 'Неправильная категория',
        'prohibited': 'Запрещенные товары',
        'fake_price': 'Неверная цена',
        'other': 'Другое'
    };
    return reasons[reason] || reason;
}

function getReportStatusText(status) {
    const statuses = {
        'pending': 'На рассмотрении',
        'resolved': 'Решено',
        'rejected': 'Отклонено'
    };
    return statuses[status] || status;
}

function getReportStatusColor(status) {
    const colors = {
        'pending': '#F59E0B',
        'resolved': '#10B981',
        'rejected': '#EF4444'
    };
    return colors[status] || '#94A3B8';
}

function adminResolveReport(reportId) {
    updateAdminReportStatus(reportId, 'resolved');
}

function adminRejectReport(reportId) {
    updateAdminReportStatus(reportId, 'rejected');
}

function updateAdminReportStatus(reportId, status) {
    let reports = JSON.parse(localStorage.getItem('reports') || '[]');
    const reportIndex = reports.findIndex(r => r.id === reportId);
    
    if (reportIndex !== -1) {
        reports[reportIndex].status = status;
        reports[reportIndex].resolvedAt = new Date().toISOString();
        localStorage.setItem('reports', JSON.stringify(reports));
        
        // Обновляем интерфейс
        const modal = document.getElementById('adminModalOverlay');
        if (modal) {
            const container = modal.querySelector('#adminTabContent');
            loadAdminReports(container);
        }
        
        showNotification(`Жалоба ${status === 'resolved' ? 'решена' : 'отклонена'}`, 'success');
    }
}

function adminDeleteReport(reportId) {
    if (confirm('Удалить эту жалобу?')) {
        let reports = JSON.parse(localStorage.getItem('reports') || '[]');
        reports = reports.filter(r => r.id !== reportId);
        localStorage.setItem('reports', JSON.stringify(reports));
        
        // Обновляем интерфейс
        const modal = document.getElementById('adminModalOverlay');
        if (modal) {
            const container = modal.querySelector('#adminTabContent');
            loadAdminReports(container);
        }
        
        showNotification('Жалоба удалена', 'success');
    }
}

// ==================== УТИЛИТЫ ====================
function formatPrice(price) {
    if (!price && price !== 0) return '0';
    return parseInt(price).toLocaleString('ru-RU');
}

function formatDate(dateString) {
    if (!dateString) return '';
    
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) return 'Сегодня';
        if (days === 1) return 'Вчера';
        if (days < 7) return `${days} дня назад`;
        return date.toLocaleDateString('ru-RU');
    } catch (error) {
        return '';
    }
}

function showNotification(message, type = 'info') {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.padding = '15px 20px';
    notification.style.background = type === 'success' 
        ? 'linear-gradient(135deg, rgba(34,197,94,0.9) 0%, rgba(21,128,61,0.9) 100%)'
        : type === 'error'
        ? 'linear-gradient(135deg, rgba(239,68,68,0.9) 0%, rgba(185,28,28,0.9) 100%)'
        : 'linear-gradient(135deg, rgba(59,130,246,0.9) 0%, rgba(29,78,216,0.9) 100%)';
    notification.style.color = 'white';
    notification.style.borderRadius = '12px';
    notification.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
    notification.style.zIndex = '9999';
    notification.style.display = 'flex';
    notification.style.alignItems = 'center';
    notification.style.gap = '10px';
    notification.style.animation = 'slideIn 0.3s ease';
    
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    notification.innerHTML = `
        <span style="font-size: 20px;">${icon}</span>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Удаляем через 3 секунды
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
    
    // Добавляем стили анимации если их нет
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
}

function clearFilters() {
    // Сбрасываем фильтры
    currentFilter = 'all';
    
    // Сбрасываем активные кнопки фильтров
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === 'all') {
            btn.classList.add('active');
        }
    });
    
    // Очищаем поиск
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    
    // Применяем фильтры
    filterAds();
    
    showNotification('Фильтры сброшены', 'success');
}

function showAdDetails(adId) {
    const ad = allAds.find(a => a.id === adId);
    if (!ad) return;
    
    // Создаем модальное окно с деталями
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.right = '0';
    modal.style.bottom = '0';
    modal.style.background = 'rgba(0, 0, 0, 0.8)';
    modal.style.backdropFilter = 'blur(20px)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '2000';
    modal.style.padding = '20px';
    
    modal.innerHTML = `
        <div class="modal-container" style="max-width: 500px;">
            <div class="modal-header">
                <h2>${ad.title}</h2>
                <button class="modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="modal-body" style="padding: 20px;">
                ${ad.photoUrl ? `
                    <div style="margin-bottom: 20px; border-radius: 15px; overflow: hidden;">
                        <img src="${ad.photoUrl}" alt="${ad.title}" 
                             style="width: 100%; height: 300px; object-fit: cover;">
                    </div>
                ` : ''}
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
                    <div>
                        <strong style="color: #94A3B8;">Цена:</strong>
                        <div style="color: #10B981; font-size: 24px; font-weight: 800;">${formatPrice(ad.price)} ₽</div>
                    </div>
                    <div>
                        <strong style="color: #94A3B8;">Категория:</strong>
                        <div style="color: white;">${getCategoryName(ad.category)}</div>
                    </div>
                    <div>
                        <strong style="color: #94A3B8;">Продавец:</strong>
                        <div style="color: white;">${ad.sellerName}</div>
                    </div>
                    <div>
                        <strong style="color: #94A3B8;">Рейтинг:</strong>
                        <div style="color: #F59E0B;">${ad.sellerRating ? ad.sellerRating.toFixed(1) + ' ⭐' : 'Нет'}</div>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <strong style="color: #94A3B8; display: block; margin-bottom: 8px;">Описание:</strong>
                    <p style="color: white; line-height: 1.6;">${ad.description || 'Нет описания'}</p>
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <button onclick="messageSeller('${ad.sellerId}', '${ad.title}')" style="flex: 1; padding: 15px; background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); border: none; border-radius: 12px; color: white; font-weight: 600; cursor: pointer;">
                        <i class="fab fa-telegram"></i> Написать продавцу
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Закрытие по клику вне модалки
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function getCategoryName(category) {
    const categories = {
        'liquids': 'Жидкости',
        'disposable': 'Одноразовые',
        'pod': 'Под-системы',
        'consumables': 'Расходники',
        'other': 'Другое'
    };
    return categories[category] || 'Другое';
}

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================
function setupEventListeners() {
    // Фильтры
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Снимаем активный класс со всех кнопок
            document.querySelectorAll('.filter-btn').forEach(b => {
                b.classList.remove('active');
            });
            
            // Добавляем активный класс к текущей кнопке
            this.classList.add('active');
            
            // Устанавливаем текущий фильтр
            currentFilter = this.dataset.filter;
            
            // Применяем фильтры
            filterAds();
        });
    });
    
    // Поиск
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function() {
            filterAds();
        }, 300));
    }
    
    // Кнопка создания объявления
    const createAdBtn = document.getElementById('createAdBtn');
    if (createAdBtn) {
        createAdBtn.addEventListener('click', function() {
            showNotification('Функция создания объявления в разработке', 'info');
        });
    }
    
    // Навигация
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) {
        profileBtn.addEventListener('click', function() {
            window.location.href = 'pages/profile.html';
        });
    }
    
    const faqBtn = document.getElementById('faqBtn');
    if (faqBtn) {
        faqBtn.addEventListener('click', function() {
            window.location.href = 'pages/faq.html';
        });
    }
}

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

// ==================== ЭКСПОРТ ГЛОБАЛЬНЫХ ФУНКЦИЙ ====================
window.initUser = initUser;
window.filterAds = filterAds;
window.clearFilters = clearFilters;
window.messageSeller = messageSeller;
window.rateAd = rateAd;
window.showReportModal = showReportModal;
window.closeReportModal = closeReportModal;
window.submitReport = submitReport;
window.showAdminPanel = showAdminPanel;
window.closeAdminPanel = closeAdminPanel;
window.switchAdminTab = switchAdminTab;
window.adminResolveReport = adminResolveReport;
window.adminRejectReport = adminRejectReport;
window.adminDeleteReport = adminDeleteReport;
window.editAdBanner = editAdBanner;
window.showAdDetails = showAdDetails;
window.formatPrice = formatPrice;
window.formatDate = formatDate;
window.showNotification = showNotification;

// Инициализация при загрузке страницы
console.log('🔄 Vape Market app.js загружен');
