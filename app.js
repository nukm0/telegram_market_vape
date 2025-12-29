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
let userRole = 'user'; // user, admin, superadmin

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Vape Market запускается...');
    
    try {
        // Инициализация Telegram
        await initTelegramApp();
        
        // Проверка роли пользователя
        await checkUserRole();
        
        // Загрузка данных
        await loadInitialData();
        
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

// ==================== ПРОВЕРКА РОЛИ ПОЛЬЗОВАТЕЛЯ ====================
async function checkUserRole() {
    if (!currentUser) return;
    
    // Проверяем ID пользователя
    const userId = currentUser.id.toString();
    
    if (userId === CONFIG.superAdmin) {
        userRole = 'superadmin';
        document.querySelector('.username').textContent = 'Суперадмин';
        document.querySelector('.user-avatar').innerHTML = '<i class="fas fa-crown"></i>';
        document.querySelector('.user-avatar').style.background = 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)';
    } else if (CONFIG.adminUsers.includes(userId)) {
        userRole = 'admin';
        document.querySelector('.username').textContent = 'Админ';
        document.querySelector('.user-avatar').innerHTML = '<i class="fas fa-shield-alt"></i>';
        document.querySelector('.user-avatar').style.background = 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)';
    }
    
    // Показываем кнопку админ панели
    if (userRole !== 'user') {
        document.getElementById('adminPanelBtn').style.display = 'flex';
        
        // Показываем рекламный баннер для админов
        if (userRole === 'superadmin') {
            document.getElementById('adBanner').style.display = 'block';
        }
    }
    
    console.log(`👤 Роль пользователя: ${userRole}`);
}

// ==================== ЗАГРУЗКА ДАННЫХ ====================
async function loadInitialData() {
    try {
        // Мок данные для примера
        allAds = getMockAds();
        
        // Фильтрация
        filterAds();
        
        // Обновление статистики
        updateStats();
        
        // Показ баннера если есть
        showAdBanner();
        
    } catch (error) {
        console.error('❌ Ошибка загрузки:', error);
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
            photoUrl: 'https://example.com/photo1.jpg',
            sellerId: '123',
            sellerName: 'Иван',
            sellerRating: 4.7,
            createdAt: new Date().toISOString(),
            views: 45,
            likes: 12,
            dislikes: 2,
            isVerified: true
        },
        {
            id: '2',
            title: 'Caliburn G3',
            price: 2500,
            category: 'pod',
            dealType: 'sell',
            description: 'Отличное состояние, 2 недели использования',
            photos: 0,
            sellerId: '456',
            sellerName: 'Алексей',
            sellerRating: 4.2,
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            views: 89,
            likes: 20,
            dislikes: 3,
            isVerified: false
        },
        {
            id: '3',
            title: 'Ищу одноразовые',
            price: 800,
            category: 'disposable',
            dealType: 'buy',
            description: 'Ищу Elf Bar или HQD, новые или б/у',
            photos: 0,
            sellerId: '789',
            sellerName: 'Максим',
            sellerRating: 4.5,
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            views: 23,
            likes: 5,
            dislikes: 1,
            isVerified: true
        }
    ];
}

// ==================== ОБНОВЛЕНИЕ UI ====================
function updateUI() {
    updateAdsGrid();
    updateStats();
}

function updateAdsGrid() {
    const adsGrid = document.getElementById('adsGrid');
    
    if (filteredAds.length === 0) {
        adsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: #94A3B8;">
                <i class="fas fa-box-open" style="font-size: 48px; margin-bottom: 20px;"></i>
                <h3 style="color: #CBD5E1; margin-bottom: 10px;">Нет объявлений</h3>
                <p>Создайте первое объявление</p>
            </div>
        `;
        return;
    }
    
    adsGrid.innerHTML = filteredAds.map(ad => `
        <div class="ad-card" data-id="${ad.id}">
            <div class="ad-image">
                ${ad.photos > 0 && ad.photoUrl 
                    ? `<img src="${ad.photoUrl}" alt="${ad.title}" onerror="this.style.display='none'; this.parentElement.innerHTML='<i class=\"fas fa-box-open no-photo\"></i>';">`
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
                    <h3 class="ad-title">${ad.title}</h3>
                    <span class="ad-price">${formatPrice(ad.price)} ₽</span>
                </div>
                
                <!-- Рейтинг продавца -->
                ${ad.sellerRating ? `
                    <div class="rating-stars">
                        ${getStarsHTML(ad.sellerRating)}
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
                        <span class="seller-name">${ad.sellerName}</span>
                    </div>
                    <span class="ad-date">${formatDate(ad.createdAt)}</span>
                </div>
                
                <!-- Кнопки действий -->
                <div class="ad-actions">
                    <button class="action-btn message" onclick="messageSeller('${ad.sellerId}', '${ad.title}')">
                        <i class="fab fa-telegram"></i>
                        Написать
                    </button>
                    
                    <button class="action-btn like" onclick="rateAd('${ad.id}', 'like')">
                        <i class="fas fa-thumbs-up"></i>
                        ${ad.likes || 0}
                    </button>
                    
                    <button class="action-btn dislike" onclick="rateAd('${ad.id}', 'dislike')">
                        <i class="fas fa-thumbs-down"></i>
                        ${ad.dislikes || 0}
                    </button>
                    
                    <button class="action-btn report" onclick="showReportModal('${ad.id}')">
                        <i class="fas fa-flag"></i>
                        Жалоба
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function getStarsHTML(rating) {
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
    // Реальная статистика
    document.getElementById('totalUsers').textContent = '1,248';
    document.getElementById('totalAds').textContent = allAds.length.toString();
    document.getElementById('todayAds').textContent = '42';
    document.getElementById('totalDeals').textContent = '3,856';
}

// ==================== НОВЫЕ ФУНКЦИИ ====================

// 1. НАПИСАТЬ ПРОДАВЦУ
function messageSeller(sellerId, adTitle) {
    const message = `Привет! Я заинтересован в вашем объявлении: "${adTitle}". Можно уточнить детали?`;
    const url = `https://t.me/${sellerId}?text=${encodeURIComponent(message)}`;
    
    if (window.Telegram && Telegram.WebApp) {
        Telegram.WebApp.openTelegramLink(url);
    } else {
        window.open(url, '_blank');
    }
}

// 2. ОЦЕНКА ОБЪЯВЛЕНИЯ
function rateAd(adId, type) {
    const ad = allAds.find(a => a.id === adId);
    if (!ad) return;
    
    if (type === 'like') {
        ad.likes = (ad.likes || 0) + 1;
    } else {
        ad.dislikes = (ad.dislikes || 0) + 1;
    }
    
    // Пересчет рейтинга продавца
    updateSellerRating(ad.sellerId);
    
    // Обновление UI
    updateAdsGrid();
    
    showNotification(`Вы поставили ${type === 'like' ? 'лайк' : 'дизлайк'}`, 'success');
}

function updateSellerRating(sellerId) {
    // Находим все объявления продавца
    const sellerAds = allAds.filter(ad => ad.sellerId === sellerId);
    if (sellerAds.length === 0) return;
    
    // Считаем средний рейтинг
    const totalLikes = sellerAds.reduce((sum, ad) => sum + (ad.likes || 0), 0);
    const totalDislikes = sellerAds.reduce((sum, ad) => sum + (ad.dislikes || 0), 0);
    const totalRatings = totalLikes + totalDislikes;
    
    if (totalRatings > 0) {
        const rating = (totalLikes / totalRatings) * 5;
        
        // Обновляем рейтинг во всех объявлениях продавца
        sellerAds.forEach(ad => {
            ad.sellerRating = parseFloat(rating.toFixed(1));
        });
    }
}

// 3. ЖАЛОБА НА ОБЪЯВЛЕНИЕ
function showReportModal(adId) {
    currentAdId = adId;
    const modal = document.getElementById('reportModal');
    const ad = allAds.find(a => a.id === adId);
    
    modal.innerHTML = `
        <div class="modal-container">
            <div class="modal-header">
                <h2>Пожаловаться на объявление</h2>
                <button class="modal-close" onclick="hideModal('reportModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="modal-body">
                <p style="color: #CBD5E1; margin-bottom: 20px;">
                    Объявление: <strong>${ad?.title || 'Неизвестно'}</strong>
                </p>
                
                <div class="form-group">
                    <label>Причина жалобы</label>
                    <select id="reportReason" class="category-select">
                        <option value="spam">Спам</option>
                        <option value="fraud">Мошенничество</option>
                        <option value="wrong_category">Неправильная категория</option>
                        <option value="prohibited">Запрещенные товары</option>
                        <option value="fake_price">Неверная цена</option>
                        <option value="other">Другое</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Комментарий (необязательно)</label>
                    <textarea id="reportComment" class="form-textarea" 
                              placeholder="Опишите проблему подробнее..."
                              rows="3"></textarea>
                </div>
            </div>
            
            <div class="modal-footer">
                <button class="btn-cancel" onclick="hideModal('reportModal')">
                    Отмена
                </button>
                <button class="btn-publish" onclick="submitReport()">
                    <i class="fas fa-paper-plane"></i>
                    Отправить жалобу
                </button>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
}

function submitReport() {
    const reason = document.getElementById('reportReason').value;
    const comment = document.getElementById('reportComment').value;
    const ad = allAds.find(a => a.id === currentAdId);
    
    if (!ad) {
        showNotification('Объявление не найдено', 'error');
        return;
    }
    
    // Сохраняем жалобу (в реальном приложении - отправляем на сервер)
    const report = {
        id: 'report_' + Date.now(),
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
    
    // Сохраняем в localStorage
    saveReport(report);
    
    // Уведомляем админов
    notifyAdminsAboutReport(report);
    
    hideModal('reportModal');
    showNotification('Жалоба отправлена администраторам', 'success');
}

function saveReport(report) {
    let reports = JSON.parse(localStorage.getItem('reports') || '[]');
    reports.push(report);
    localStorage.setItem('reports', JSON.stringify(reports));
}

function notifyAdminsAboutReport(report) {
    // В реальном приложении здесь будет отправка уведомления админам
    console.log('📢 Новая жалоба:', report);
    
    // Показываем уведомление если пользователь - админ
    if (userRole !== 'user') {
        showNotification(`Новая жалоба: ${report.adTitle}`, 'warning');
    }
}

// 4. АДМИН ПАНЕЛЬ
function showAdminPanel() {
    if (userRole === 'user') {
        showNotification('Доступ запрещен', 'error');
        return;
    }
    
    const modal = document.getElementById('adminModal');
    
    modal.innerHTML = `
        <div class="modal-container" style="max-width: 800px;">
            <div class="modal-header">
                <h2>Админ панель</h2>
                <button class="modal-close" onclick="hideModal('adminModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="modal-body" style="padding: 0;">
                <!-- Вкладки админ панели -->
                <div class="profile-tabs" style="margin: 0; border-radius: 0; border: none;">
                    <button class="tab-btn active" onclick="switchAdminTab('reports')">
                        <i class="fas fa-flag"></i>
                        Жалобы
                    </button>
                    <button class="tab-btn" onclick="switchAdminTab('users')">
                        <i class="fas fa-users"></i>
                        Пользователи
                    </button>
                    ${userRole === 'superadmin' ? `
                        <button class="tab-btn" onclick="switchAdminTab('ads')">
                            <i class="fas fa-ad"></i>
                            Реклама
                        </button>
                        <button class="tab-btn" onclick="switchAdminTab('settings')">
                            <i class="fas fa-cog"></i>
                            Настройки
                        </button>
                    ` : ''}
                </div>
                
                <!-- Контент вкладок -->
                <div id="adminTabContent" style="padding: 20px;">
                    <!-- Загружается динамически -->
                </div>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
    loadAdminReports();
}

function switchAdminTab(tabName) {
    // Обновляем активные кнопки
    document.querySelectorAll('#adminModal .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Загружаем контент
    switch(tabName) {
        case 'reports':
            loadAdminReports();
            break;
        case 'users':
            loadAdminUsers();
            break;
        case 'ads':
            loadAdminAds();
            break;
        case 'settings':
            loadAdminSettings();
            break;
    }
}

function loadAdminReports() {
    const container = document.getElementById('adminTabContent');
    const reports = JSON.parse(localStorage.getItem('reports') || '[]');
    
    if (reports.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #94A3B8;">
                <i class="fas fa-flag" style="font-size: 48px; margin-bottom: 20px;"></i>
                <h3 style="color: #CBD5E1;">Нет жалоб</h3>
                <p>Здесь будут отображаться жалобы пользователей</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
            <h3 style="color: #FFFFFF;">Жалобы (${reports.length})</h3>
            <button class="action-btn" onclick="clearAllReports()">
                <i class="fas fa-trash"></i>
                Очистить все
            </button>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 15px; max-height: 400px; overflow-y: auto;">
            ${reports.map(report => `
                <div class="list-item" style="position: relative;">
                    <div class="item-header">
                        <h3 class="item-title">${report.adTitle}</h3>
                        <span style="color: ${getReportColor(report.status)}; font-size: 12px; font-weight: 600;">
                            ${getReportStatus(report.status)}
                        </span>
                    </div>
                    
                    <p style="color: #CBD5E1; margin-bottom: 10px; font-size: 14px;">
                        <strong>Продавец:</strong> ${report.sellerName}<br>
                        <strong>Причина:</strong> ${getReportReason(report.reason)}<br>
                        ${report.comment ? `<strong>Комментарий:</strong> ${report.comment}` : ''}
                    </p>
                    
                    <div class="item-footer">
                        <span class="item-date">${formatDate(report.createdAt)}</span>
                        
                        <div class="item-actions">
                            ${report.status === 'pending' ? `
                                <button class="action-btn edit" onclick="resolveReport('${report.id}')">
                                    <i class="fas fa-check"></i>
                                    Решено
                                </button>
                                <button class="action-btn delete" onclick="rejectReport('${report.id}')">
                                    <i class="fas fa-times"></i>
                                    Отклонить
                                </button>
                                <button class="action-btn" onclick="blockUserFromReport('${report.sellerId}', '${report.reason}')">
                                    <i class="fas fa-ban"></i>
                                    Блокировать
                                </button>
                            ` : ''}
                            <button class="action-btn delete" onclick="deleteReport('${report.id}')">
                                <i class="fas fa-trash"></i>
                                Удалить
                            </button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function getReportStatus(status) {
    const statuses = {
        'pending': 'На рассмотрении',
        'resolved': 'Решено',
        'rejected': 'Отклонено'
    };
    return statuses[status] || status;
}

function getReportColor(status) {
    const colors = {
        'pending': '#F59E0B',
        'resolved': '#10B981',
        'rejected': '#EF4444'
    };
    return colors[status] || '#94A3B8';
}

function getReportReason(reason) {
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

// 5. УПРАВЛЕНИЕ ЖАЛОБАМИ
function resolveReport(reportId) {
    updateReportStatus(reportId, 'resolved');
    showNotification('Жалоба помечена как решенная', 'success');
}

function rejectReport(reportId) {
    updateReportStatus(reportId, 'rejected');
    showNotification('Жалоба отклонена', 'warning');
}

function updateReportStatus(reportId, status) {
    let reports = JSON.parse(localStorage.getItem('reports') || '[]');
    const reportIndex = reports.findIndex(r => r.id === reportId);
    
    if (reportIndex !== -1) {
        reports[reportIndex].status = status;
        reports[reportIndex].resolvedAt = new Date().toISOString();
        reports[reportIndex].resolvedBy = currentUser?.id;
        localStorage.setItem('reports', JSON.stringify(reports));
        loadAdminReports();
    }
}

function deleteReport(reportId) {
    if (confirm('Удалить эту жалобу?')) {
        let reports = JSON.parse(localStorage.getItem('reports') || '[]');
        reports = reports.filter(r => r.id !== reportId);
        localStorage.setItem('reports', JSON.stringify(reports));
        loadAdminReports();
        showNotification('Жалоба удалена', 'success');
    }
}

function clearAllReports() {
    if (confirm('Очистить все жалобы? Это действие нельзя отменить.')) {
        localStorage.removeItem('reports');
        loadAdminReports();
        showNotification('Все жалобы очищены', 'success');
    }
}

// 6. БЛОКИРОВКА ПОЛЬЗОВАТЕЛЕЙ
function blockUserFromReport(userId, reason) {
    if (!confirm(`Заблокировать пользователя? Причина: ${getReportReason(reason)}`)) {
        return;
    }
    
    let blockedUsers = JSON.parse(localStorage.getItem('blockedUsers') || '{}');
    
    blockedUsers[userId] = {
        blockedAt: new Date().toISOString(),
        blockedBy: currentUser?.id,
        reason: reason,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 дней
    };
    
    localStorage.setItem('blockedUsers', JSON.stringify(blockedUsers));
    
    // Помечаем все объявления пользователя
    allAds.forEach(ad => {
        if (ad.sellerId === userId) {
            ad.status = 'blocked';
        }
    });
    
    showNotification('Пользователь заблокирован на 7 дней', 'success');
    updateAdsGrid();
}

function unblockUser(userId) {
    let blockedUsers = JSON.parse(localStorage.getItem('blockedUsers') || '{}');
    delete blockedUsers[userId];
    localStorage.setItem('blockedUsers', JSON.stringify(blockedUsers));
    
    // Разблокируем объявления
    allAds.forEach(ad => {
        if (ad.sellerId === userId) {
            ad.status = 'active';
        }
    });
    
    showNotification('Пользователь разблокирован', 'success');
    updateAdsGrid();
}

// 7. УПРАВЛЕНИЕ РЕКЛАМОЙ (только для суперадмина)
function showAdBanner() {
    const banner = JSON.parse(localStorage.getItem('adBanner') || 'null');
    
    if (banner && userRole === 'superadmin') {
        const adBanner = document.getElementById('adBanner');
        adBanner.querySelector('h3').textContent = banner.title;
        adBanner.querySelector('p').textContent = banner.text;
        adBanner.style.display = 'block';
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

// ==================== УТИЛИТЫ ====================
function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function formatPrice(price) {
    return price.toLocaleString('ru-RU');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Сегодня';
    if (days === 1) return 'Вчера';
    if (days < 7) return `${days} дня назад`;
    return date.toLocaleDateString('ru-RU');
}

function showNotification(message, type) {
    alert(`${type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'} ${message}`);
}

// ==================== ОБРАБОТЧИКИ ====================
function setupEventListeners() {
    // Кнопка админ панели
    document.getElementById('adminPanelBtn').addEventListener('click', showAdminPanel);
    
    // Кнопка создания объявления
    document.getElementById('createAdBtn').addEventListener('click', () => {
        showNotification('Функция в разработке', 'info');
    });
    
    // Фильтры
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            filterAds();
        });
    });
    
    // Поиск
    document.getElementById('searchInput').addEventListener('input', debounce(function() {
        filterAds();
    }, 300));
    
    // Навигация
    document.getElementById('profileBtn').addEventListener('click', () => {
        window.location.href = 'pages/profile.html';
    });
    
    document.getElementById('faqBtn').addEventListener('click', () => {
        window.location.href = 'pages/faq.html';
    });
}

function filterAds() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    filteredAds = allAds.filter(ad => {
        if (currentFilter !== 'all' && ad.dealType !== currentFilter) {
            return false;
        }
        
        if (searchTerm) {
            const matches = (
                ad.title.toLowerCase().includes(searchTerm) ||
                (ad.description && ad.description.toLowerCase().includes(searchTerm)) ||
                ad.category.toLowerCase().includes(searchTerm) ||
                ad.sellerName.toLowerCase().includes(searchTerm)
            );
            if (!matches) return false;
        }
        
        return true;
    });
    
    updateAdsGrid();
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

// ==================== ЭКСПОРТ ====================
window.VapeMarket = {
    currentUser,
    userRole,
    allAds,
    showAdminPanel,
    messageSeller,
    rateAd,
    showReportModal
};
