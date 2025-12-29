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
// Инициализация приложения
document.addEventListener('DOMContentLoaded', async function() {
    // Проверяем, что зашли через Telegram Web App
    if (typeof Telegram === 'undefined' || !Telegram.WebApp) {
        // Блокируем вход через браузер
        if (!window.location.href.includes('telegram')) {
            document.body.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; height: 100vh;">
                    <div style="text-align: center; padding: 20px;">
                        <h2 style="color: white;">Доступ запрещен</h2>
                        <p style="color: white;">Это приложение работает только через Telegram</p>
                    </div>
                </div>
            `;
            return;
        }
    }

    // Инициализация Telegram Web App
    const tg = window.Telegram.WebApp;
    tg.expand();
    tg.enableClosingConfirmation();
    
    // Получаем данные пользователя
    const user = tg.initDataUnsafe?.user;
    const userId = user?.id || 'guest';
    const userName = user?.first_name || 'Пользователь';
    
    // Сохраняем данные пользователя
    localStorage.setItem('tg_user_id', userId);
    localStorage.setItem('tg_user_name', userName);
    
    // Проверяем права доступа
    const userRole = await checkUserRole(userId);
    localStorage.setItem('user_role', userRole);
    
    // Показываем/скрываем админ-панель
    if (userRole === 'admin1' || userRole === 'admin2' || userRole === 'owner') {
        document.getElementById('adminPanelNav').style.display = 'block';
        document.getElementById('adminAdSpot').style.display = 'block';
    }
    
    // Загружаем объявления
    await loadAds();
    
    // Загружаем рекламу (если есть)
    if (userRole === 'admin2' || userRole === 'owner') {
        await loadAdvertisement();
    }
    
    // Инициализируем обработчики событий
    initEventListeners();
    
    // Обновляем статистику
    updateStats();
});

// Проверка роли пользователя
async function checkUserRole(userId) {
    try {
        // В реальном приложении здесь должен быть запрос к серверу
        // Для примеси используем локальные данные
        const adminUsers = JSON.parse(localStorage.getItem('admin_users') || '{}');
        
        if (adminUsers[userId]) {
            return adminUsers[userId].role;
        }
        
        // По умолчанию обычный пользователь
        return 'user';
    } catch (error) {
        console.error('Ошибка проверки роли:', error);
        return 'user';
    }
}

// Загрузка объявлений
async function loadAds() {
    try {
        const ads = await AdsAPI.getAllAds();
        const adsList = document.getElementById('adsList');
        
        if (!ads.length) {
            adsList.innerHTML = `
                <div class="no-ads">
                    <i class="fas fa-box-open" style="font-size: 48px; color: #667eea; margin-bottom: 15px;"></i>
                    <p style="color: #666; text-align: center;">Объявлений пока нет</p>
                </div>
            `;
            return;
        }
        
        adsList.innerHTML = ads.map(ad => createAdCard(ad)).join('');
        
        // Добавляем обработчики для кнопок
        ads.forEach(ad => {
            const likeBtn = document.getElementById(`likeBtn_${ad.id}`);
            const dislikeBtn = document.getElementById(`dislikeBtn_${ad.id}`);
            const contactBtn = document.getElementById(`contactBtn_${ad.id}`);
            const reportBtn = document.getElementById(`reportBtn_${ad.id}`);
            
            if (likeBtn) {
                likeBtn.addEventListener('click', () => rateProfile(ad.userId, 'like'));
            }
            
            if (dislikeBtn) {
                dislikeBtn.addEventListener('click', () => rateProfile(ad.userId, 'dislike'));
            }
            
            if (contactBtn) {
                contactBtn.addEventListener('click', () => contactSeller(ad));
            }
            
            if (reportBtn) {
                reportBtn.addEventListener('click', () => openReportModal(ad.id));
            }
        });
    } catch (error) {
        console.error('Ошибка загрузки объявлений:', error);
    }
}

// Создание карточки объявления
function createAdCard(ad) {
    const hasImage = ad.images && ad.images.length > 0;
    const imageUrl = hasImage ? ad.images[0] : '';
    
    return `
        <div class="ad-card" data-ad-id="${ad.id}">
            <div class="ad-image-container">
                ${hasImage ? 
                    `<img src="${imageUrl}" alt="${ad.title}" class="ad-image">` : 
                    `<div class="no-image">
                        <i class="fas fa-camera"></i>
                        <p>Нет фото</p>
                    </div>`
                }
            </div>
            <div class="ad-content">
                <h3 class="ad-title">${ad.title}</h3>
                <div class="ad-price">${ad.price} ₽</div>
                <div class="ad-location">
                    <i class="fas fa-map-marker-alt"></i>
                    ${ad.location}
                </div>
                <div class="ad-actions">
                    <button class="btn btn-primary btn-small" id="contactBtn_${ad.id}">
                        <i class="fas fa-comment"></i>
                        Написать
                    </button>
                    <button class="btn btn-secondary btn-small" id="reportBtn_${ad.id}">
                        <i class="fas fa-flag"></i>
                        Жалоба
                    </button>
                </div>
                <div class="rating-buttons" style="margin-top: 10px;">
                    <button class="rating-btn like" id="likeBtn_${ad.id}">
                        <i class="fas fa-thumbs-up"></i>
                        Лайк
                    </button>
                    <button class="rating-btn dislike" id="dislikeBtn_${ad.id}">
                        <i class="fas fa-thumbs-down"></i>
                        Дизлайк
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Инициализация обработчиков событий
function initEventListeners() {
    // Кнопка создания объявления
    const createAdBtn = document.getElementById('createAdBtn');
    if (createAdBtn) {
        createAdBtn.addEventListener('click', openCreateAdModal);
    }
    
    // Кнопка "Мои объявления"
    const myAdsBtn = document.getElementById('myAdsBtn');
    if (myAdsBtn) {
        myAdsBtn.addEventListener('click', () => {
            window.location.href = 'pages/profile.html';
        });
    }
    
    // Закрытие модальных окон
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
    
    // Форма создания объявления
    const adForm = document.getElementById('adForm');
    if (adForm) {
        adForm.addEventListener('submit', handleAdSubmit);
    }
    
    // Форма жалобы
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
        reportForm.addEventListener('submit', handleReportSubmit);
    }
    
    // Загрузка фото
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        uploadArea.addEventListener('click', () => {
            document.getElementById('photoUpload').click();
        });
        
        const photoUpload = document.getElementById('photoUpload');
        if (photoUpload) {
            photoUpload.addEventListener('change', handleImageUpload);
        }
    }
}

// Открытие модального окна создания объявления
function openCreateAdModal() {
    const userId = localStorage.getItem('tg_user_id');
    if (!userId || userId === 'guest') {
        alert('Пожалуйста, войдите через Telegram');
        return;
    }
    
    document.getElementById('createAdModal').classList.add('active');
}

// Закрытие всех модальных окон
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    
    // Очищаем форму
    const adForm = document.getElementById('adForm');
    if (adForm) adForm.reset();
    
    const previewContainer = document.getElementById('previewContainer');
    if (previewContainer) previewContainer.innerHTML = '';
}

// Обработка загрузки изображений
function handleImageUpload(event) {
    const files = event.target.files;
    const previewContainer = document.getElementById('previewContainer');
    
    if (!previewContainer) return;
    
    for (let file of files) {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const imagePreview = document.createElement('div');
                imagePreview.className = 'image-preview';
                imagePreview.innerHTML = `
                    <img src="${e.target.result}" alt="Preview">
                    <button type="button" class="remove-image" onclick="removeImage(this)">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                previewContainer.appendChild(imagePreview);
            };
            reader.readAsDataURL(file);
        }
    }
}

// Удаление изображения
function removeImage(button) {
    const previewContainer = button.closest('.image-preview');
    if (previewContainer) {
        previewContainer.remove();
    }
}

// Обработка отправки объявления
async function handleAdSubmit(e) {
    e.preventDefault();
    
    const userId = localStorage.getItem('tg_user_id');
    if (!userId || userId === 'guest') {
        alert('Пожалуйста, войдите через Telegram');
        return;
    }
    
    try {
        // Собираем данные формы
        const adData = {
            title: document.getElementById('adTitle').value,
            category: document.getElementById('adCategory').value,
            description: document.getElementById('adDescription').value,
            price: parseInt(document.getElementById('adPrice').value),
            location: document.getElementById('adLocation').value,
            userId: userId,
            userName: localStorage.getItem('tg_user_name')
        };
        
        // Собираем изображения
        const images = [];
        const previews = document.querySelectorAll('.image-preview img');
        previews.forEach(img => {
            images.push(img.src);
        });
        
        adData.images = images;
        
        // Отправляем объявление
        await AdsAPI.createAd(adData);
        
        // Закрываем модальное окно
        closeAllModals();
        
        // Обновляем список объявлений
        await loadAds();
        
        // Обновляем статистику
        updateStats();
        
        alert('Объявление успешно создано!');
        
    } catch (error) {
        console.error('Ошибка создания объявления:', error);
        alert('Ошибка при создании объявления');
    }
}

// Оценка профиля
async function rateProfile(userId, rating) {
    try {
        const currentUserId = localStorage.getItem('tg_user_id');
        if (!currentUserId || currentUserId === 'guest') {
            alert('Пожалуйста, войдите через Telegram');
            return;
        }
        
        if (currentUserId === userId) {
            alert('Нельзя оценивать свой профиль');
            return;
        }
        
        await ServerAPI.rateUser(userId, rating, currentUserId);
        alert(`Вы поставили ${rating === 'like' ? 'лайк' : 'дизлайк'}`);
        
    } catch (error) {
        console.error('Ошибка оценки:', error);
        alert('Ошибка при отправке оценки');
    }
}

// Написать продавцу
function contactSeller(ad) {
    const userId = localStorage.getItem('tg_user_id');
    if (!userId || userId === 'guest') {
        alert('Пожалуйста, войдите через Telegram');
        return;
    }
    
    const message = `Привет! Меня интересует ваш товар: "${ad.title}" за ${ad.price} ₽`;
    
    // В реальном приложении здесь должен быть вызов Telegram API
    // для открытия чата с пользователем
    const tg = window.Telegram.WebApp;
    
    if (tg && tg.openTelegramLink) {
        // Формируем ссылку на чат с продавцом
        const chatLink = `https://t.me/${ad.userName}`;
        tg.openTelegramLink(chatLink);
    } else {
        // Запасной вариант
        alert(`Сообщение для продавца:\n${message}\n\nСкопируйте это сообщение и отправьте продавцу @${ad.userName}`);
    }
}

// Открытие модального окна жалобы
function openReportModal(adId) {
    const userId = localStorage.getItem('tg_user_id');
    if (!userId || userId === 'guest') {
        alert('Пожалуйста, войдите через Telegram');
        return;
    }
    
    document.getElementById('reportAdId').value = adId;
    document.getElementById('reportModal').classList.add('active');
}

// Обработка отправки жалобы
async function handleReportSubmit(e) {
    e.preventDefault();
    
    try {
        const reportData = {
            adId: document.getElementById('reportAdId').value,
            reason: document.getElementById('reportReason').value,
            details: document.getElementById('reportDetails').value,
            reporterId: localStorage.getItem('tg_user_id'),
            reporterName: localStorage.getItem('tg_user_name')
        };
        
        await ServerAPI.reportAd(reportData);
        
        closeAllModals();
        alert('Жалоба успешно отправлена');
        
    } catch (error) {
        console.error('Ошибка отправки жалобы:', error);
        alert('Ошибка при отправке жалобы');
    }
}

// Загрузка рекламы
async function loadAdvertisement() {
    try {
        const ad = await ServerAPI.getAdvertisement();
        const adContent = document.getElementById('adContent');
        
        if (ad && ad.enabled) {
            adContent.innerHTML = `
                <h4>${ad.title}</h4>
                ${ad.image ? `<img src="${ad.image}" alt="Реклама" style="max-width: 100%; border-radius: 8px; margin: 10px 0;">` : ''}
                <p>${ad.text}</p>
                ${ad.link ? `<a href="${ad.link}" target="_blank" style="color: #667eea;">Подробнее</a>` : ''}
            `;
        } else {
            adContent.innerHTML = '<p>Реклама не настроена</p>';
        }
    } catch (error) {
        console.error('Ошибка загрузки рекламы:', error);
    }
}

// Открытие редактора рекламы
function openAdEditor() {
    const userRole = localStorage.getItem('user_role');
    if (userRole !== 'admin2' && userRole !== 'owner') {
        alert('У вас нет прав для редактирования рекламы');
        return;
    }
    
    document.getElementById('adEditorModal').classList.add('active');
}

// Обновление статистики
async function updateStats() {
    try {
        const stats = await ServerAPI.getStats();
        
        // Обновляем статистику на главной
        // В реальном приложении здесь можно обновлять счетчики
        console.log('Статистика обновлена:', stats);
        
    } catch (error) {
        console.error('Ошибка обновления статистики:', error);
    }
}

// Экспортируем функции для использования в других файлах
window.App = {
    rateProfile,
    contactSeller,
    openReportModal,
    openAdEditor,
    closeAllModals
};
