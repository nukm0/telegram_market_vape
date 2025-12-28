// Основной файл приложения
let tg = null;

// Инициализация приложения
async function initializeApp() {
    try {
        // Инициализация Firebase
        if (!initializeFirebase()) {
            throw new Error('Не удалось инициализировать Firebase');
        }
        
        // Инициализация Telegram Web App
        tg = window.Telegram.WebApp;
        tg.ready();
        
        // Авторизация
        if (!(await initializeAuth())) {
            throw new Error('Ошибка авторизации');
        }
        
        // Инициализация системы объявлений
        initializeAds();
        
        // Инициализация системы жалоб
        initializeComplaints();
        
        // Инициализация админ-панели (если пользователь админ)
        if (isAdmin()) {
            initializeAdminPanel();
        }
        
        // Инициализация FAQ
        initializeFAQ();
        
        // Инициализация навигации
        initializeNavigation();
        
        // Инициализация уведомлений
        initializeNotifications();
        
        // Устанавливаем тему из Telegram
        setThemeFromTelegram();
        
        console.log('Приложение инициализировано успешно');
        
    } catch (error) {
        console.error('Ошибка инициализации приложения:', error);
        showNotification('Ошибка загрузки приложения', 'error');
        showErrorScreen(error.message);
    }
}

// Инициализация навигации
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            const pageName = link.getAttribute('data-page');
            
            // Обновляем активную ссылку
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Показываем соответствующую страницу
            pages.forEach(page => {
                page.classList.remove('active');
                if (page.id === `${pageName}-page`) {
                    page.classList.add('active');
                    
                    // Загружаем данные для страницы
                    switch (pageName) {
                        case 'feed':
                            loadAds();
                            break;
                        case 'profile':
                            loadProfile();
                            loadMyAds();
                            break;
                        case 'faq':
                            loadStatistics();
                            break;
                        case 'admin':
                            if (isAdmin()) {
                                loadAdminData();
                            }
                            break;
                    }
                }
            });
            
            // Прокручиваем вверх
            window.scrollTo(0, 0);
        });
    });
}

// Загрузка профиля
async function loadProfile() {
    const profileContainer = document.getElementById('profile-info');
    if (!profileContainer || !currentUser) return;
    
    // Получаем актуальные данные пользователя
    const userData = await getData(`users/${getUserId()}`);
    if (!userData) return;
    
    const rating = appConfig.ratingFormula(userData.likesCount || 0, userData.dislikesCount || 0);
    
    profileContainer.innerHTML = `
        <div class="profile-header">
            <div class="profile-avatar">
                ${userData.photoUrl ? 
                    `<img src="${userData.photoUrl}" alt="${userData.firstName}">` : 
                    `<i class="fas fa-user"></i>`
                }
                ${userData.verified ? '<span class="verified-badge"><i class="fas fa-check"></i></span>' : ''}
            </div>
            <div class="profile-details">
                <h2>${escapeHtml(userData.firstName)} ${userData.lastName ? escapeHtml(userData.lastName) : ''}</h2>
                <div class="profile-username">@${userData.username}</div>
                <div class="profile-rating">
                    <i class="fas fa-star"></i>
                    <span>Рейтинг: ${rating.toFixed(1)}</span>
                </div>
                ${userData.blocked ? 
                    '<div class="profile-status blocked"><i class="fas fa-ban"></i> Аккаунт заблокирован</div>' : 
                    '<div class="profile-status active"><i class="fas fa-check-circle"></i> Аккаунт активен</div>'
                }
            </div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-value">${userData.adsCount || 0}</div>
                <div class="stat-label">Объявлений</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${userData.likesCount || 0}</div>
                <div class="stat-label">Получено лайков</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${userData.dislikesCount || 0}</div>
                <div class="stat-label">Получено дизлайков</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${userData.complaintsCount || 0}</div>
                <div class="stat-label">Жалоб</div>
            </div>
        </div>
        
        <div class="profile-meta">
            <div class="meta-item">
                <i class="fas fa-calendar-alt"></i>
                <span>Зарегистрирован: ${formatDate(userData.createdAt)}</span>
            </div>
            <div class="meta-item">
                <i class="fas fa-clock"></i>
                <span>Был онлайн: ${formatTimeAgo(userData.lastSeen)}</span>
            </div>
        </div>
        
        <div class="profile-actions">
            <button class="btn-primary" onclick="refreshProfile()">
                <i class="fas fa-sync-alt"></i> Обновить
            </button>
            <button class="btn-secondary" onclick="tg.openTelegramLink('https://t.me/${userData.username}')">
                <i class="fab fa-telegram"></i> Мой Telegram
            </button>
        </div>
    `;
}

// Обновление профиля
async function refreshProfile() {
    await updateUserData();
    await loadProfile();
    await loadMyAds();
    showNotification('Профиль обновлен', 'success');
}

// Загрузка моих объявлений
async function loadMyAds() {
    await loadMyAds(); // Функция из ads.js
}

// Установка темы из Telegram
function setThemeFromTelegram() {
    if (!tg) return;
    
    const theme = tg.colorScheme;
    const isDark = theme === 'dark';
    
    // Устанавливаем CSS переменные для темной темы
    if (isDark) {
        document.documentElement.style.setProperty('--bg-color', '#1a1a1a');
        document.documentElement.style.setProperty('--text-primary', '#ffffff');
        document.documentElement.style.setProperty('--text-secondary', '#cccccc');
        document.documentElement.style.setProperty('--card-bg', '#2d2d2d');
        document.documentElement.style.setProperty('--border-color', '#404040');
        document.documentElement.style.setProperty('--secondary-color', '#404040');
    }
    
    // Устанавливаем background color для body
    document.body.style.backgroundColor = isDark ? '#1a1a1a' : '#ffffff';
}

// Инициализация системы уведомлений
function initializeNotifications() {
    // Слушаем изменения в реальном времени для уведомлений
    if (isAdmin()) {
        listenToAdminNotifications();
    }
}

// Прослушивание уведомлений для админов
function listenToAdminNotifications() {
    listenToData('adminNotifications', (notifications) => {
        if (!notifications) return;
        
        // Фильтруем непрочитанные уведомления
        const unreadNotifications = Object.values(notifications).filter(
            n => !n.readBy || !n.readBy.includes(getUserId())
        );
        
        if (unreadNotifications.length > 0) {
            // Показываем badge на админ-кнопке
            const adminLink = document.getElementById('admin-link');
            if (adminLink) {
                let badge = adminLink.querySelector('.notification-badge');
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'notification-badge';
                    adminLink.appendChild(badge);
                }
                badge.textContent = unreadNotifications.length;
                badge.style.display = 'block';
            }
            
            // Показываем уведомление о новых событиях
            if (document.activeElement.id !== 'admin-link') {
                showNotification(`Новых уведомлений: ${unreadNotifications.length}`, 'info');
            }
        }
    });
}

// Показ галереи объявления
function showAdGallery(adId) {
    const ad = ads.find(a => a.id === adId);
    if (!ad || !ad.photoUrls || ad.photoUrls.length === 0) return;
    
    const modalId = 'gallery-modal-' + Date.now();
    
    const modalHTML = `
        <div id="${modalId}" class="modal">
            <div class="modal-content gallery-modal">
                <div class="modal-header">
                    <h2>${escapeHtml(ad.title)}</h2>
                    <button class="close-modal" onclick="document.getElementById('${modalId}').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="gallery-container">
                        <div class="gallery-main">
                            <img id="gallery-main-img" src="${ad.photoUrls[0]}" alt="Фото товара">
                        </div>
                        <div class="gallery-thumbnails">
                            ${ad.photoUrls.map((url, index) => `
                                <img src="${url}" alt="Фото ${index + 1}" 
                                     class="thumbnail ${index === 0 ? 'active' : ''}"
                                     onclick="changeGalleryImage('${modalId}', ${index}, '${adId}')">
                            `).join('')}
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
    modal.classList.add('active');
    
    // Закрытие по клику вне модального окна
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Смена изображения в галерее
function changeGalleryImage(modalId, index, adId) {
    const ad = ads.find(a => a.id === adId);
    if (!ad || !ad.photoUrls[index]) return;
    
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    // Обновляем главное изображение
    const mainImg = modal.querySelector('#gallery-main-img');
    if (mainImg) {
        mainImg.src = ad.photoUrls[index];
    }
    
    // Обновляем активный thumbnail
    const thumbnails = modal.querySelectorAll('.thumbnail');
    thumbnails.forEach((thumb, i) => {
        thumb.classList.toggle('active', i === index);
    });
}

// Показ экрана ошибки
function showErrorScreen(message) {
    document.body.innerHTML = `
        <div class="error-screen">
            <div class="error-content">
                <i class="fas fa-exclamation-triangle"></i>
                <h2>Ошибка загрузки приложения</h2>
                <p>${message}</p>
                <button class="btn-primary" onclick="location.reload()">
                    <i class="fas fa-redo"></i> Перезагрузить
                </button>
                <button class="btn-secondary" onclick="tg.close()">
                    <i class="fas fa-times"></i> Закрыть
                </button>
            </div>
        </div>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        .error-screen {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background-color: var(--bg-color);
            padding: 20px;
        }
        .error-content {
            text-align: center;
            max-width: 400px;
        }
        .error-content i {
            font-size: 4rem;
            color: var(--warning-color);
            margin-bottom: 20px;
        }
        .error-content h2 {
            color: var(--text-primary);
            margin-bottom: 16px;
        }
        .error-content p {
            color: var(--text-secondary);
            margin-bottom: 24px;
        }
        .error-content button {
            margin: 0 8px;
        }
    `;
    document.head.appendChild(style);
}

// Показать уведомление
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    // Автоматическое скрытие через 3 секунды
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Добавление CSS для модальных окон галереи
document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = `
        .gallery-modal .modal-content {
            max-width: 90vw;
            max-height: 90vh;
        }
        .gallery-container {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        .gallery-main {
            width: 100%;
            height: 60vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #000;
            border-radius: 8px;
            overflow: hidden;
        }
        .gallery-main img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }
        .gallery-thumbnails {
            display: flex;
            gap: 8px;
            overflow-x: auto;
            padding: 8px 0;
        }
        .gallery-thumbnails .thumbnail {
            width: 80px;
            height: 80px;
            object-fit: cover;
            border-radius: 4px;
            cursor: pointer;
            opacity: 0.6;
            transition: opacity 0.3s;
        }
        .gallery-thumbnails .thumbnail.active {
            opacity: 1;
            border: 2px solid var(--primary-color);
        }
        .gallery-thumbnails .thumbnail:hover {
            opacity: 0.8;
        }
        
        .wide-modal .modal-content {
            max-width: 800px;
        }
        .ad-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
        }
        @media (max-width: 768px) {
            .ad-details {
                grid-template-columns: 1fr;
            }
        }
        .ad-details-photos {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 12px;
        }
        .ad-details-photo {
            width: 100%;
            height: 150px;
            object-fit: cover;
            border-radius: 8px;
        }
        .ad-details-info h3 {
            margin-bottom: 12px;
            color: var(--text-primary);
        }
        .ad-details-price {
            font-size: 1.8rem;
            font-weight: bold;
            color: var(--primary-color);
            margin-bottom: 12px;
        }
        .ad-details-category {
            display: inline-block;
            background-color: var(--secondary-color);
            color: var(--text-secondary);
            padding: 4px 12px;
            border-radius: 16px;
            margin-bottom: 16px;
        }
        .ad-details-description,
        .ad-details-seller,
        .ad-details-contact,
        .ad-details-stats,
        .ad-details-status {
            margin-bottom: 20px;
        }
        .ad-details-description h4,
        .ad-details-seller h4,
        .ad-details-contact h4,
        .ad-details-stats h4,
        .ad-details-status h4 {
            color: var(--text-primary);
            margin-bottom: 8px;
            font-size: 1rem;
        }
        .ad-details-description p,
        .ad-details-seller p,
        .ad-details-contact p {
            color: var(--text-secondary);
            line-height: 1.5;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
        }
        .stats-grid span {
            padding: 8px;
            background-color: var(--secondary-color);
            border-radius: 8px;
            text-align: center;
            font-size: 0.9rem;
        }
        .status-badges {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        .status-badges .badge {
            padding: 6px 12px;
            border-radius: 16px;
            font-size: 0.85rem;
            font-weight: 500;
        }
        .status-badges .badge.success {
            background-color: #d4edda;
            color: #155724;
        }
        .status-badges .badge.danger {
            background-color: #f8d7da;
            color: #721c24;
        }
        .status-badges .badge.warning {
            background-color: #fff3cd;
            color: #856404;
        }
        
        .notification-badge {
            position: absolute;
            top: -8px;
            right: -8px;
            background-color: var(--danger-color);
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            font-size: 0.7rem;
            display: flex;
            align-items: center;
            justify-content: center;
            display: none;
        }
        
        .admin-empty-state {
            text-align: center;
            padding: 40px 20px;
            color: var(--text-secondary);
        }
        .admin-empty-state i {
            font-size: 3rem;
            margin-bottom: 16px;
            opacity: 0.5;
        }
        .admin-empty-state h3 {
            margin-bottom: 8px;
            color: var(--text-primary);
        }
        
        .btn-success {
            background-color: var(--success-color);
            color: white;
        }
        .btn-warning {
            background-color: var(--warning-color);
            color: white;
        }
    `;
    document.head.appendChild(style);
});

// Запуск приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', initializeApp);

// Экспорт функций для глобального использования
window.showAdGallery = showAdGallery;
window.changeGalleryImage = changeGalleryImage;
window.viewAd = viewAd;
window.refreshProfile = refreshProfile;
window.removeComplaintPhoto = removeComplaintPhoto;
