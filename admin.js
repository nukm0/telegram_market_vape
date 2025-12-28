// Админ-панель
let adminData = {
    complaints: [],
    users: [],
    ads: [],
    statistics: {}
};

// Инициализация админ-панели
function initializeAdminPanel() {
    if (!isAdmin()) return;
    
    // Инициализация табов
    initializeAdminTabs();
    
    // Загрузка данных
    loadAdminData();
}

// Инициализация табов админ-панели
function initializeAdminTabs() {
    const tabs = document.querySelectorAll('.admin-tab');
    const tabContents = document.querySelectorAll('.admin-tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            
            // Убираем активный класс у всех табов
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Добавляем активный класс текущему табу
            tab.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');
            
            // Загружаем данные для таба
            loadTabData(tabName);
        });
    });
}

// Загрузка данных для админ-панели
async function loadAdminData() {
    if (!isAdmin()) return;
    
    try {
        // Загружаем все данные параллельно
        const [complaintsData, usersData, adsData, statsData] = await Promise.all([
            getComplaintsForAdmin(),
            getAllUsers(),
            getAllAdsForAdmin(),
            getStatistics()
        ]);
        
        adminData = {
            complaints: complaintsData,
            users: usersData,
            ads: adsData,
            statistics: statsData
        };
        
        // Загружаем данные для активного таба
        const activeTab = document.querySelector('.admin-tab.active');
        if (activeTab) {
            loadTabData(activeTab.getAttribute('data-tab'));
        }
        
    } catch (error) {
        console.error('Ошибка загрузки данных админ-панели:', error);
        showNotification('Ошибка загрузки данных', 'error');
    }
}

// Загрузка данных для конкретного таба
function loadTabData(tabName) {
    switch (tabName) {
        case 'moderation':
            loadModerationTab();
            break;
        case 'users':
            loadUsersTab();
            break;
        case 'complaints':
            loadComplaintsTab();
            break;
        case 'analytics':
            loadAnalyticsTab();
            break;
    }
}

// Таб модерации
function loadModerationTab() {
    const container = document.getElementById('moderation-tab');
    if (!container) return;
    
    // Фильтруем неверифицированные объявления
    const unverifiedAds = adminData.ads.filter(ad => !ad.verified && !ad.blocked);
    
    if (unverifiedAds.length === 0) {
        container.innerHTML = `
            <div class="admin-empty-state">
                <i class="fas fa-check-circle"></i>
                <h3>Нет объявлений для модерации</h3>
                <p>Все объявления проверены</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="moderation-header">
            <h3><i class="fas fa-clipboard-check"></i> Объявления на модерации (${unverifiedAds.length})</h3>
            <button class="btn-secondary" onclick="verifyAllVisible()">
                <i class="fas fa-check-double"></i> Верифицировать все
            </button>
        </div>
        <div class="moderation-list">
            ${unverifiedAds.map(ad => createModerationItem(ad)).join('')}
        </div>
    `;
    
    // Добавляем обработчики для кнопок
    unverifiedAds.forEach(ad => {
        const verifyBtn = document.getElementById(`verify-btn-${ad.id}`);
        const rejectBtn = document.getElementById(`reject-btn-${ad.id}`);
        const blockBtn = document.getElementById(`block-ad-btn-${ad.id}`);
        
        if (verifyBtn) {
            verifyBtn.addEventListener('click', () => verifyAd(ad.id));
        }
        if (rejectBtn) {
            rejectBtn.addEventListener('click', () => rejectAd(ad.id));
        }
        if (blockBtn) {
            blockBtn.addEventListener('click', () => blockAd(ad.id));
        }
    });
}

// Создание элемента модерации
function createModerationItem(ad) {
    const firstPhoto = ad.photoUrls && ad.photoUrls.length > 0 
        ? ad.photoUrls[0] 
        : 'https://via.placeholder.com/150x150/8a2be2/ffffff?text=Vape';
    
    return `
        <div class="moderation-item" data-id="${ad.id}">
            <div class="moderation-preview">
                <img src="${firstPhoto}" alt="${ad.title}" class="moderation-image">
                <div class="moderation-info">
                    <h4>${escapeHtml(ad.title)}</h4>
                    <div class="moderation-meta">
                        <span class="price">${ad.price} ₽</span>
                        <span class="category">${ad.category}</span>
                        <span class="seller">${escapeHtml(ad.sellerName)}</span>
                    </div>
                    <p class="description">${escapeHtml(ad.description)}</p>
                    <div class="moderation-stats">
                        <span><i class="fas fa-thumbs-up"></i> ${ad.likes || 0}</span>
                        <span><i class="fas fa-thumbs-down"></i> ${ad.dislikes || 0}</span>
                        <span><i class="fas fa-flag"></i> ${ad.complaints || 0}</span>
                    </div>
                </div>
            </div>
            <div class="moderation-actions">
                <button class="btn-success" id="verify-btn-${ad.id}">
                    <i class="fas fa-check"></i> Одобрить
                </button>
                <button class="btn-warning" id="reject-btn-${ad.id}">
                    <i class="fas fa-times"></i> Отклонить
                </button>
                <button class="btn-danger" id="block-ad-btn-${ad.id}">
                    <i class="fas fa-ban"></i> Заблокировать
                </button>
            </div>
        </div>
    `;
}

// Таб пользователей
function loadUsersTab() {
    const container = document.getElementById('users-tab');
    if (!container) return;
    
    container.innerHTML = `
        <div class="users-header">
            <h3><i class="fas fa-users"></i> Пользователи (${adminData.users.length})</h3>
            <div class="search-box">
                <input type="text" id="user-search" placeholder="Поиск по имени или username...">
                <i class="fas fa-search"></i>
            </div>
        </div>
        <div class="users-list">
            ${adminData.users.map(user => createUserItem(user)).join('')}
        </div>
    `;
    
    // Добавляем поиск
    const searchInput = document.getElementById('user-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const userItems = document.querySelectorAll('.user-item');
            
            userItems.forEach(item => {
                const userName = item.getAttribute('data-name').toLowerCase();
                const userUsername = item.getAttribute('data-username').toLowerCase();
                
                if (userName.includes(searchTerm) || userUsername.includes(searchTerm)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }
    
    // Добавляем обработчики для кнопок
    adminData.users.forEach(user => {
        const blockBtn = document.getElementById(`block-user-btn-${user.id}`);
        const verifyBtn = document.getElementById(`verify-user-btn-${user.id}`);
        
        if (blockBtn) {
            blockBtn.addEventListener('click', () => toggleUserBlock(user.id, !user.blocked));
        }
        if (verifyBtn) {
            verifyBtn.addEventListener('click', () => toggleUserVerify(user.id, !user.verified));
        }
    });
}

// Создание элемента пользователя
function createUserItem(user) {
    const userRating = appConfig.ratingFormula(user.likesCount || 0, user.dislikesCount || 0);
    
    return `
        <div class="user-item" data-id="${user.id}" data-name="${user.firstName} ${user.lastName || ''}" data-username="${user.username}">
            <div class="user-avatar">
                ${user.photoUrl ? 
                    `<img src="${user.photoUrl}" alt="${user.firstName}">` : 
                    `<i class="fas fa-user"></i>`
                }
                ${user.verified ? '<span class="verified-badge"><i class="fas fa-check"></i></span>' : ''}
            </div>
            <div class="user-info">
                <h4>${escapeHtml(user.firstName)} ${user.lastName ? escapeHtml(user.lastName) : ''}</h4>
                <div class="user-meta">
                    <span class="username">@${user.username}</span>
                    <span class="rating"><i class="fas fa-star"></i> ${userRating.toFixed(1)}</span>
                </div>
                <div class="user-stats">
                    <span><i class="fas fa-box"></i> ${user.adsCount || 0}</span>
                    <span><i class="fas fa-thumbs-up"></i> ${user.likesCount || 0}</span>
                    <span><i class="fas fa-thumbs-down"></i> ${user.dislikesCount || 0}</span>
                    <span><i class="fas fa-flag"></i> ${user.complaintsCount || 0}</span>
                </div>
                <div class="user-status">
                    ${user.blocked ? 
                        '<span class="status-badge blocked"><i class="fas fa-ban"></i> Заблокирован</span>' : 
                        '<span class="status-badge active"><i class="fas fa-check"></i> Активен</span>'
                    }
                    <span class="join-date">Зарегистрирован: ${formatDate(user.createdAt)}</span>
                </div>
            </div>
            <div class="user-actions">
                ${!user.verified ? `
                    <button class="btn-success" id="verify-user-btn-${user.id}">
                        <i class="fas fa-check"></i> Верифицировать
                    </button>
                ` : ''}
                <button class="${user.blocked ? 'btn-success' : 'btn-danger'}" id="block-user-btn-${user.id}">
                    <i class="fas fa-${user.blocked ? 'unlock' : 'ban'}"></i> 
                    ${user.blocked ? 'Разблокировать' : 'Заблокировать'}
                </button>
            </div>
        </div>
    `;
}

// Таб жалоб
function loadComplaintsTab() {
    const container = document.getElementById('complaints-tab');
    if (!container) return;
    
    // Фильтруем новые жалобы
    const newComplaints = adminData.complaints.filter(c => c.status === 'new');
    const resolvedComplaints = adminData.complaints.filter(c => c.status === 'resolved');
    const rejectedComplaints = adminData.complaints.filter(c => c.status === 'rejected');
    
    container.innerHTML = `
        <div class="complaints-header">
            <h3><i class="fas fa-flag"></i> Система жалоб</h3>
            <div class="complaints-stats">
                <span class="stat new">Новые: ${newComplaints.length}</span>
                <span class="stat resolved">Решено: ${resolvedComplaints.length}</span>
                <span class="stat rejected">Отклонено: ${rejectedComplaints.length}</span>
            </div>
        </div>
        
        <div class="complaints-tabs">
            <button class="complaints-tab-btn active" data-status="new">Новые (${newComplaints.length})</button>
            <button class="complaints-tab-btn" data-status="resolved">Решено (${resolvedComplaints.length})</button>
            <button class="complaints-tab-btn" data-status="rejected">Отклонено (${rejectedComplaints.length})</button>
        </div>
        
        <div id="complaints-list" class="complaints-list">
            ${newComplaints.map(complaint => createComplaintItem(complaint)).join('')}
        </div>
    `;
    
    // Инициализация табов жалоб
    initializeComplaintsTabs();
    
    // Добавляем обработчики для кнопок жалоб
    newComplaints.forEach(complaint => {
        const resolveBtn = document.getElementById(`resolve-complaint-${complaint.id}`);
        const rejectBtn = document.getElementById(`reject-complaint-${complaint.id}`);
        
        if (resolveBtn) {
            resolveBtn.addEventListener('click', () => openResolveComplaintModal(complaint));
        }
        if (rejectBtn) {
            rejectBtn.addEventListener('click', () => openRejectComplaintModal(complaint));
        }
    });
}

// Инициализация табов жалоб
function initializeComplaintsTabs() {
    const tabBtns = document.querySelectorAll('.complaints-tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const status = btn.getAttribute('data-status');
            
            // Убираем активный класс у всех кнопок
            tabBtns.forEach(b => b.classList.remove('active'));
            // Добавляем активный класс текущей кнопке
            btn.classList.add('active');
            
            // Показываем соответствующие жалобы
            showComplaintsByStatus(status);
        });
    });
}

// Показать жалобы по статусу
function showComplaintsByStatus(status) {
    const container = document.getElementById('complaints-list');
    const filteredComplaints = adminData.complaints.filter(c => c.status === status);
    
    if (filteredComplaints.length === 0) {
        container.innerHTML = `
            <div class="admin-empty-state">
                <i class="fas fa-${status === 'new' ? 'inbox' : status === 'resolved' ? 'check-circle' : 'times-circle'}"></i>
                <h3>${getComplaintsStatusTitle(status)}</h3>
                <p>${getComplaintsStatusMessage(status)}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredComplaints.map(complaint => createComplaintItem(complaint)).join('');
    
    // Добавляем обработчики только для новых жалоб
    if (status === 'new') {
        filteredComplaints.forEach(complaint => {
            const resolveBtn = document.getElementById(`resolve-complaint-${complaint.id}`);
            const rejectBtn = document.getElementById(`reject-complaint-${complaint.id}`);
            
            if (resolveBtn) {
                resolveBtn.addEventListener('click', () => openResolveComplaintModal(complaint));
            }
            if (rejectBtn) {
                rejectBtn.addEventListener('click', () => openRejectComplaintModal(complaint));
            }
        });
    }
}

// Создание элемента жалобы
function createComplaintItem(complaint) {
    const statusClass = {
        'new': 'new',
        'resolved': 'resolved',
        'rejected': 'rejected'
    }[complaint.status];
    
    const statusText = {
        'new': 'Новая',
        'resolved': 'Решена',
        'rejected': 'Отклонена'
    }[complaint.status];
    
    const date = formatDate(complaint.createdAt);
    
    return `
        <div class="complaint-item ${statusClass}" data-id="${complaint.id}">
            <div class="complaint-header">
                <span class="complaint-type">${complaint.type}</span>
                <span class="complaint-status ${statusClass}">
                    <i class="fas fa-circle"></i> ${statusText}
                </span>
                <span class="complaint-date">${date}</span>
            </div>
            
            <div class="complaint-body">
                <div class="complaint-side">
                    <h4>От:</h4>
                    <p>${escapeHtml(complaint.reporterName)} (@${complaint.reporterUsername})</p>
                    
                    <h4>На:</h4>
                    <p>${escapeHtml(complaint.targetUserName)} (@${complaint.targetUserUsername})</p>
                    
                    <h4>Объявление:</h4>
                    <p>"${escapeHtml(complaint.adTitle)}" - ${complaint.adPrice} ₽</p>
                </div>
                
                <div class="complaint-main">
                    <h4>Описание проблемы:</h4>
                    <p class="complaint-description">${escapeHtml(complaint.description)}</p>
                    
                    ${complaint.photoUrl ? `
                        <div class="complaint-photo">
                            <img src="${complaint.photoUrl}" alt="Доказательство">
                        </div>
                    ` : ''}
                    
                    ${complaint.status === 'resolved' && complaint.resolution ? `
                        <div class="complaint-resolution">
                            <h4><i class="fas fa-check-circle"></i> Решение:</h4>
                            <p>${escapeHtml(complaint.resolution)}</p>
                            <small>Решено: ${formatDate(complaint.resolvedAt)}</small>
                        </div>
                    ` : ''}
                    
                    ${complaint.status === 'rejected' && complaint.rejectionReason ? `
                        <div class="complaint-rejection">
                            <h4><i class="fas fa-times-circle"></i> Причина отклонения:</h4>
                            <p>${escapeHtml(complaint.rejectionReason)}</p>
                            <small>Отклонено: ${formatDate(complaint.resolvedAt)}</small>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            ${complaint.status === 'new' ? `
                <div class="complaint-actions">
                    <button class="btn-success" id="resolve-complaint-${complaint.id}">
                        <i class="fas fa-check"></i> Решить
                    </button>
                    <button class="btn-danger" id="reject-complaint-${complaint.id}">
                        <i class="fas fa-times"></i> Отклонить
                    </button>
                    <button class="btn-secondary" onclick="viewAd('${complaint.targetAdId}')">
                        <i class="fas fa-eye"></i> Посмотреть объявление
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

// Таб аналитики
function loadAnalyticsTab() {
    const container = document.getElementById('analytics-tab');
    if (!container) return;
    
    const stats = adminData.statistics;
    
    container.innerHTML = `
        <div class="analytics-header">
            <h3><i class="fas fa-chart-bar"></i> Аналитика и статистика</h3>
            <button class="btn-secondary" onclick="refreshStatistics()">
                <i class="fas fa-sync-alt"></i> Обновить
            </button>
        </div>
        
        <div class="analytics-grid">
            <div class="analytics-card">
                <h4><i class="fas fa-users"></i> Пользователи</h4>
                <div class="stat-value">${stats.totalUsers || 0}</div>
                <div class="stat-details">
                    <span>Активных: ${stats.activeUsers || 0}</span>
                    <span>Заблокировано: ${stats.blockedUsers || 0}</span>
                </div>
            </div>
            
            <div class="analytics-card">
                <h4><i class="fas fa-box"></i> Объявления</h4>
                <div class="stat-value">${stats.totalAds || 0}</div>
                <div class="stat-details">
                    <span>Новые: ${stats.newAds || 0}</span>
                    <span>Верифицировано: ${stats.verifiedAds || 0}</span>
                </div>
            </div>
            
            <div class="analytics-card">
                <h4><i class="fas fa-flag"></i> Жалобы</h4>
                <div class="stat-value">${stats.totalComplaints || 0}</div>
                <div class="stat-details">
                    <span>Новые: ${stats.newComplaints || 0}</span>
                    <span>Решено: ${stats.resolvedComplaints || 0}</span>
                </div>
            </div>
            
            <div class="analytics-card">
                <h4><i class="fas fa-star"></i> Активность</h4>
                <div class="stat-value">${stats.dailyActivity || 0}</div>
                <div class="stat-details">
                    <span>Лайков: ${stats.totalLikes || 0}</span>
                    <span>Дизлайков: ${stats.totalDislikes || 0}</span>
                </div>
            </div>
        </div>
        
        <div class="analytics-charts">
            <div class="chart-container">
                <h4>Объявления по категориям</h4>
                <div id="category-chart" class="chart-placeholder">
                    <!-- Здесь будет график -->
                    <div class="chart-bars">
                        ${Object.entries(stats.adsByCategory || {}).map(([category, count]) => `
                            <div class="chart-bar" style="height: ${(count / Math.max(1, stats.totalAds)) * 100}%">
                                <span class="bar-label">${category}</span>
                                <span class="bar-value">${count}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <div class="chart-container">
                <h4>Статистика за неделю</h4>
                <div id="weekly-chart" class="chart-placeholder">
                    <!-- Здесь будет график активности -->
                    <canvas id="activityChart" width="400" height="200"></canvas>
                </div>
            </div>
        </div>
        
        <div class="recent-activity">
            <h4><i class="fas fa-history"></i> Недавняя активность</h4>
            <div class="activity-list">
                ${(stats.recentActivity || []).slice(0, 10).map(activity => `
                    <div class="activity-item">
                        <i class="fas fa-${getActivityIcon(activity.type)}"></i>
                        <div class="activity-text">${getActivityText(activity)}</div>
                        <div class="activity-time">${formatTimeAgo(activity.timestamp)}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    // Инициализация графиков
    initializeCharts();
}

// Вспомогательные функции админ-панели

// Получение всех пользователей
async function getAllUsers() {
    try {
        const snapshot = await db.ref('users').once('value');
        const usersData = snapshot.val();
        
        if (!usersData) return [];
        
        return Object.entries(usersData).map(([id, user]) => ({
            id,
            ...user
        }));
        
    } catch (error) {
        console.error('Ошибка получения пользователей:', error);
        return [];
    }
}

// Получение всех объявлений для админа
async function getAllAdsForAdmin() {
    try {
        const snapshot = await db.ref('ads').once('value');
        const adsData = snapshot.val();
        
        if (!adsData) return [];
        
        return Object.entries(adsData).map(([id, ad]) => ({
            id,
            ...ad
        }));
        
    } catch (error) {
        console.error('Ошибка получения объявлений:', error);
        return [];
    }
}

// Получение статистики
async function getStatistics() {
    try {
        const [usersSnapshot, adsSnapshot, complaintsSnapshot] = await Promise.all([
            db.ref('users').once('value'),
            db.ref('ads').once('value'),
            db.ref('complaints').once('value')
        ]);
        
        const users = usersSnapshot.val() || {};
        const ads = adsSnapshot.val() || {};
        const complaints = complaintsSnapshot.val() || {};
        
        // Считаем статистику
        const stats = {
            totalUsers: Object.keys(users).length,
            activeUsers: Object.values(users).filter(u => !u.blocked).length,
            blockedUsers: Object.values(users).filter(u => u.blocked).length,
            verifiedUsers: Object.values(users).filter(u => u.verified).length,
            
            totalAds: Object.keys(ads).length,
            newAds: Object.values(ads).filter(a => !a.verified && !a.blocked).length,
            verifiedAds: Object.values(ads).filter(a => a.verified).length,
            blockedAds: Object.values(ads).filter(a => a.blocked).length,
            
            totalComplaints: Object.keys(complaints).length,
            newComplaints: Object.values(complaints).filter(c => c.status === 'new').length,
            resolvedComplaints: Object.values(complaints).filter(c => c.status === 'resolved').length,
            rejectedComplaints: Object.values(complaints).filter(c => c.status === 'rejected').length,
            
            totalLikes: Object.values(ads).reduce((sum, ad) => sum + (ad.likes || 0), 0),
            totalDislikes: Object.values(ads).reduce((sum, ad) => sum + (ad.dislikes || 0), 0),
            
            dailyActivity: Object.values(ads).filter(ad => {
                return Date.now() - ad.createdAt < 24 * 60 * 60 * 1000;
            }).length,
            
            adsByCategory: Object.values(ads).reduce((acc, ad) => {
                acc[ad.category] = (acc[ad.category] || 0) + 1;
                return acc;
            }, {}),
            
            recentActivity: [] // Здесь можно добавить реальные данные активности
        };
        
        return stats;
        
    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        return {};
    }
}

// Обновление статистики
async function refreshStatistics() {
    adminData.statistics = await getStatistics();
    loadAnalyticsTab();
    showNotification('Статистика обновлена', 'success');
}

// Верификация объявления
async function verifyAd(adId) {
    if (!isAdmin()) return;
    
    try {
        await updateData(`ads/${adId}`, {
            verified: true,
            verifiedAt: Date.now(),
            verifiedBy: getUserId()
        });
        
        // Обновляем локальные данные
        const adIndex = adminData.ads.findIndex(a => a.id === adId);
        if (adIndex !== -1) {
            adminData.ads[adIndex].verified = true;
        }
        
        // Перезагружаем таб модерации
        loadModerationTab();
        
        showNotification('Объявление верифицировано', 'success');
        
    } catch (error) {
        console.error('Ошибка верификации объявления:', error);
        showNotification('Ошибка верификации', 'error');
    }
}

// Верификация всех видимых объявлений
async function verifyAllVisible() {
    if (!isAdmin()) return;
    
    const unverifiedAds = adminData.ads.filter(ad => !ad.verified && !ad.blocked);
    
    if (unverifiedAds.length === 0) {
        showNotification('Нет объявлений для верификации', 'info');
        return;
    }
    
    try {
        const updates = {};
        const timestamp = Date.now();
        
        unverifiedAds.forEach(ad => {
            updates[`ads/${ad.id}/verified`] = true;
            updates[`ads/${ad.id}/verifiedAt`] = timestamp;
            updates[`ads/${ad.id}/verifiedBy`] = getUserId();
        });
        
        await updateData('/', updates);
        
        // Обновляем локальные данные
        adminData.ads.forEach(ad => {
            if (!ad.verified && !ad.blocked) {
                ad.verified = true;
            }
        });
        
        // Перезагружаем таб модерации
        loadModerationTab();
        
        showNotification(`Верифицировано ${unverifiedAds.length} объявлений`, 'success');
        
    } catch (error) {
        console.error('Ошибка массовой верификации:', error);
        showNotification('Ошибка верификации', 'error');
    }
}

// Отклонение объявления
async function rejectAd(adId) {
    if (!isAdmin()) return;
    
    const reason = prompt('Укажите причину отклонения объявления:');
    if (!reason || reason.trim().length === 0) {
        showNotification('Не указана причина', 'warning');
        return;
    }
    
    try {
        await updateData(`ads/${adId}`, {
            blocked: true,
            blockedAt: Date.now(),
            blockedBy: getUserId(),
            blockReason: reason.trim()
        });
        
        // Обновляем локальные данные
        const adIndex = adminData.ads.findIndex(a => a.id === adId);
        if (adIndex !== -1) {
            adminData.ads[adIndex].blocked = true;
        }
        
        // Перезагружаем таб модерации
        loadModerationTab();
        
        showNotification('Объявление отклонено и заблокировано', 'success');
        
    } catch (error) {
        console.error('Ошибка отклонения объявления:', error);
        showNotification('Ошибка отклонения', 'error');
    }
}

// Блокировка объявления
async function blockAd(adId) {
    if (!isAdmin()) return;
    
    const reason = prompt('Укажите причину блокировки объявления:');
    if (!reason || reason.trim().length === 0) {
        showNotification('Не указана причина', 'warning');
        return;
    }
    
    try {
        await updateData(`ads/${adId}`, {
            blocked: true,
            blockedAt: Date.now(),
            blockedBy: getUserId(),
            blockReason: reason.trim()
        });
        
        // Обновляем локальные данные
        const adIndex = adminData.ads.findIndex(a => a.id === adId);
        if (adIndex !== -1) {
            adminData.ads[adIndex].blocked = true;
        }
        
        // Перезагружаем таб модерации
        loadModerationTab();
        
        showNotification('Объявление заблокировано', 'success');
        
    } catch (error) {
        console.error('Ошибка блокировки объявления:', error);
        showNotification('Ошибка блокировки', 'error');
    }
}

// Блокировка/разблокировка пользователя
async function toggleUserBlock(userId, block) {
    if (!isAdmin()) return;
    
    const reason = block 
        ? prompt('Укажите причину блокировки пользователя:')
        : 'Разблокирован администратором';
    
    if (block && (!reason || reason.trim().length === 0)) {
        showNotification('Не указана причина', 'warning');
        return;
    }
    
    try {
        await updateData(`users/${userId}`, {
            blocked: block,
            blockedAt: block ? Date.now() : null,
            blockedBy: block ? getUserId() : null,
            blockReason: block ? reason.trim() : null
        });
        
        // Обновляем локальные данные
        const userIndex = adminData.users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            adminData.users[userIndex].blocked = block;
        }
        
        // Перезагружаем таб пользователей
        loadUsersTab();
        
        showNotification(`Пользователь ${block ? 'заблокирован' : 'разблокирован'}`, 'success');
        
    } catch (error) {
        console.error('Ошибка блокировки пользователя:', error);
        showNotification('Ошибка операции', 'error');
    }
}

// Верификация пользователя
async function toggleUserVerify(userId, verify) {
    if (!isAdmin()) return;
    
    try {
        await updateData(`users/${userId}`, {
            verified: verify,
            verifiedAt: verify ? Date.now() : null,
            verifiedBy: verify ? getUserId() : null
        });
        
        // Обновляем локальные данные
        const userIndex = adminData.users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            adminData.users[userIndex].verified = verify;
        }
        
        // Перезагружаем таб пользователей
        loadUsersTab();
        
        showNotification(`Пользователь ${verify ? 'верифицирован' : 'снята верификация'}`, 'success');
        
    } catch (error) {
        console.error('Ошибка верификации пользователя:', error);
        showNotification('Ошибка операции', 'error');
    }
}

// Модальное окно решения жалобы
function openResolveComplaintModal(complaint) {
    const modal = createActionModal(
        'Решить жалобу',
        `
            <p>Вы уверены, что хотите пометить жалобу как решенную?</p>
            <div class="form-group">
                <label for="resolution">Решение (опционально):</label>
                <textarea id="resolution" rows="3" placeholder="Опишите решение по жалобе..."></textarea>
            </div>
        `,
        async () => {
            const resolution = document.getElementById('resolution').value.trim();
            const success = await resolveComplaint(complaint.id, resolution || 'Жалоба решена', getUserId());
            
            if (success) {
                // Обновляем локальные данные
                const complaintIndex = adminData.complaints.findIndex(c => c.id === complaint.id);
                if (complaintIndex !== -1) {
                    adminData.complaints[complaintIndex].status = 'resolved';
                    adminData.complaints[complaintIndex].resolution = resolution || 'Жалоба решена';
                    adminData.complaints[complaintIndex].resolvedAt = Date.now();
                    adminData.complaints[complaintIndex].resolvedBy = getUserId();
                }
                
                // Перезагружаем таб жалоб
                loadComplaintsTab();
                
                showNotification('Жалоба отмечена как решенная', 'success');
            }
        }
    );
    
    modal.show();
}

// Модальное окно отклонения жалобы
function openRejectComplaintModal(complaint) {
    const modal = createActionModal(
        'Отклонить жалобу',
        `
            <p>Вы уверены, что хотите отклонить эту жалобу?</p>
            <div class="form-group">
                <label for="rejection-reason">Причина отклонения (обязательно):</label>
                <textarea id="rejection-reason" rows="3" placeholder="Укажите причину отклонения жалобы..." required></textarea>
            </div>
        `,
        async () => {
            const reason = document.getElementById('rejection-reason').value.trim();
            
            if (!reason) {
                showNotification('Укажите причину отклонения', 'error');
                return;
            }
            
            const success = await rejectComplaint(complaint.id, reason, getUserId());
            
            if (success) {
                // Обновляем локальные данные
                const complaintIndex = adminData.complaints.findIndex(c => c.id === complaint.id);
                if (complaintIndex !== -1) {
                    adminData.complaints[complaintIndex].status = 'rejected';
                    adminData.complaints[complaintIndex].rejectionReason = reason;
                    adminData.complaints[complaintIndex].resolvedAt = Date.now();
                    adminData.complaints[complaintIndex].resolvedBy = getUserId();
                }
                
                // Перезагружаем таб жалоб
                loadComplaintsTab();
                
                showNotification('Жалоба отклонена', 'success');
            }
        }
    );
    
    modal.show();
}

// Создание модального окна действия
function createActionModal(title, content, confirmAction) {
    const modalId = 'action-modal-' + Date.now();
    
    const modalHTML = `
        <div id="${modalId}" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${title}</h2>
                    <button class="close-modal" onclick="document.getElementById('${modalId}').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                    <div class="form-actions">
                        <button class="btn-secondary" onclick="document.getElementById('${modalId}').remove()">Отмена</button>
                        <button class="btn-primary" id="confirm-action">Подтвердить</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const container = document.createElement('div');
    container.innerHTML = modalHTML;
    document.body.appendChild(container.firstElementChild);
    
    const modal = document.getElementById(modalId);
    
    // Обработчик подтверждения
    document.getElementById('confirm-action').addEventListener('click', () => {
        confirmAction();
        modal.remove();
    });
    
    // Закрытие по клику вне модального окна
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    return {
        show: () => modal.classList.add('active'),
        hide: () => modal.classList.remove('active')
    };
}

// Просмотр объявления
function viewAd(adId) {
    // Находим объявление
    const ad = adminData.ads.find(a => a.id === adId);
    if (!ad) {
        showNotification('Объявление не найдено', 'error');
        return;
    }
    
    // Создаем модальное окно с деталями объявления
    const modal = createAdDetailsModal(ad);
    modal.show();
}

// Создание модального окна с деталями объявления
function createAdDetailsModal(ad) {
    const modalId = 'ad-details-modal-' + Date.now();
    
    const photosHTML = ad.photoUrls && ad.photoUrls.length > 0 
        ? ad.photoUrls.map((url, index) => `
            <img src="${url}" alt="Фото ${index + 1}" class="ad-details-photo">
        `).join('')
        : '<p>Нет фотографий</p>';
    
    const modalHTML = `
        <div id="${modalId}" class="modal">
            <div class="modal-content wide-modal">
                <div class="modal-header">
                    <h2>Детали объявления</h2>
                    <button class="close-modal" onclick="document.getElementById('${modalId}').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="ad-details">
                        <div class="ad-details-photos">
                            ${photosHTML}
                        </div>
                        <div class="ad-details-info">
                            <h3>${escapeHtml(ad.title)}</h3>
                            <div class="ad-details-price">${ad.price} ₽</div>
                            <div class="ad-details-category">${ad.category}</div>
                            <div class="ad-details-description">
                                <h4>Описание:</h4>
                                <p>${escapeHtml(ad.description)}</p>
                            </div>
                            <div class="ad-details-seller">
                                <h4>Продавец:</h4>
                                <p>${escapeHtml(ad.sellerName)} (@${ad.sellerUsername})</p>
                            </div>
                            <div class="ad-details-contact">
                                <h4>Контакт:</h4>
                                <p>${ad.contact}</p>
                            </div>
                            <div class="ad-details-stats">
                                <h4>Статистика:</h4>
                                <div class="stats-grid">
                                    <span>Лайки: ${ad.likes || 0}</span>
                                    <span>Дизлайки: ${ad.dislikes || 0}</span>
                                    <span>Жалобы: ${ad.complaints || 0}</span>
                                    <span>Создано: ${formatDate(ad.createdAt)}</span>
                                </div>
                            </div>
                            <div class="ad-details-status">
                                <h4>Статус:</h4>
                                <div class="status-badges">
                                    ${ad.verified ? '<span class="badge success">Верифицировано</span>' : ''}
                                    ${ad.blocked ? '<span class="badge danger">Заблокировано</span>' : ''}
                                    ${!ad.verified && !ad.blocked ? '<span class="badge warning">На модерации</span>' : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const container = document.createElement('div');
    container.innerHTML = modalHTML;
    document.body.appendChild(container.firstElementChild);
    
    const modal = document.getElementById(modalId);
    
    // Закрытие по клику вне модального окна
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    return {
        show: () => modal.classList.add('active'),
        hide: () => modal.classList.remove('active')
    };
}

// Инициализация графиков
function initializeCharts() {
    // Простая реализация без сторонних библиотек
    // В реальном приложении можно использовать Chart.js или другую библиотеку
    
    const categoryChart = document.querySelector('#category-chart .chart-bars');
    if (categoryChart) {
        const bars = categoryChart.querySelectorAll('.chart-bar');
        bars.forEach(bar => {
            const value = bar.querySelector('.bar-value').textContent;
            bar.style.height = `${Math.min(100, parseInt(value) * 5)}px`;
        });
    }
}

// Вспомогательные функции для форматирования
function formatDate(timestamp) {
    if (!timestamp) return 'Неизвестно';
    
    const date = new Date(timestamp);
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatTimeAgo(timestamp) {
    if (!timestamp) return 'давно';
    
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'только что';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} мин. назад`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} ч. назад`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)} дн. назад`;
    
    return formatDate(timestamp);
}

function getComplaintsStatusTitle(status) {
    switch (status) {
        case 'new': return 'Нет новых жалоб';
        case 'resolved': return 'Нет решенных жалоб';
        case 'rejected': return 'Нет отклоненных жалоб';
        default: return 'Нет данных';
    }
}

function getComplaintsStatusMessage(status) {
    switch (status) {
        case 'new': return 'Все жалобы обработаны';
        case 'resolved': return 'Решенные жалобы будут появляться здесь';
        case 'rejected': return 'Отклоненные жалобы будут появляться здесь';
        default: return '';
    }
}

function getActivityIcon(activityType) {
    const icons = {
        'create_ad': 'plus-circle',
        'edit_ad': 'edit',
        'delete_ad': 'trash',
        'rate_ad': 'star',
        'create_complaint': 'flag',
        'resolve_complaint': 'check-circle',
        'reject_complaint': 'times-circle',
        'block_user': 'ban',
        'verify_user': 'check',
        'verify_ad': 'check-double'
    };
    
    return icons[activityType] || 'info-circle';
}

function getActivityText(activity) {
    // В реальном приложении здесь будет генерироваться текст на основе данных активности
    return activity.text || 'Действие пользователя';
}

// Добавление записи в историю модерации
async function addModerationHistory(entry) {
    const historyId = 'history_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    await setData(`moderationHistory/${historyId}`, entry);
}
