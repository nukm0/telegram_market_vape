// Глобальные переменны
let currentUser = null;
let allAds = [];
let currentReportAdId = null;
let userRole = 'user';

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    // Быстрая инициализация
    initApp();
    
    // Загрузка данных
    loadInitialData();
});

// Быстрая инициализация
function initApp() {
    // Получаем пользователя
    currentUser = getCurrentUser();
    
    // Проверяем Telegram
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.expand();
        window.Telegram.WebApp.enableClosingConfirmation();
    }
    
    // Инициализируем кнопки
    initButtons();
    
    // Проверяем права
    checkUserRole();
}

// Получение текущего пользователя
function getCurrentUser() {
    const userId = localStorage.getItem('user_id') || generateUserId();
    const userName = localStorage.getItem('user_name') || 'Пользователь';
    
    if (!localStorage.getItem('user_id')) {
        localStorage.setItem('user_id', userId);
        localStorage.setItem('user_name', userName);
    }
    
    return {
        id: userId,
        name: userName,
        isVerified: localStorage.getItem('user_verified') === 'true'
    };
}

// Генерация ID пользователя
function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Проверка роли пользователя
function checkUserRole() {
    const adminUsers = JSON.parse(localStorage.getItem('admin_users') || '{}');
    userRole = adminUsers[currentUser.id]?.role || 'user';
    
    // Показываем админ-панель если нужно
    if (userRole !== 'user') {
        showAdminPanel();
    }
}

// Показать админ-панель
function showAdminPanel() {
    const navMenu = document.querySelector('.nav-menu');
    if (navMenu) {
        const adminLink = document.createElement('a');
        adminLink.href = 'pages/admin.html';
        adminLink.className = 'nav-item';
        adminLink.innerHTML = '<i class="fas fa-shield-alt"></i><span>Админ</span>';
        navMenu.appendChild(adminLink);
        
        // Показываем рекламный блок
        document.getElementById('adminAdContainer').style.display = 'block';
        document.getElementById('editAdBtn').style.display = 'inline-block';
        
        // Загружаем рекламу
        loadAdvertisement();
    }
}

// Инициализация кнопок
function initButtons() {
    // Кнопки уже инициализированы через onclick в HTML
    console.log('Кнопки инициализированы');
}

// Загрузка начальных данных
async function loadInitialData() {
    try {
        // Параллельная загрузка
        await Promise.all([
            loadAds(),
            loadUserData()
        ]);
        
        console.log('Данные загружены');
    } catch (error) {
        console.error('Ошибка загрузки:', error);
    }
}

// Загрузка объявлений
async function loadAds() {
    try {
        allAds = JSON.parse(localStorage.getItem('market_ads') || '[]');
        
        // Фильтруем заблокированные
        allAds = allAds.filter(ad => !ad.isBlocked);
        
        // Отображаем
        displayAds(allAds);
        
        return allAds;
    } catch (error) {
        console.error('Ошибка загрузки объявлений:', error);
        return [];
    }
}

// Отображение объявлений
function displayAds(ads) {
    const adsList = document.getElementById('adsList');
    if (!adsList) return;
    
    if (!ads || ads.length === 0) {
        adsList.innerHTML = '<p class="no-ads">Нет объявлений</p>';
        return;
    }
    
    adsList.innerHTML = ads.map(ad => createAdCard(ad)).join('');
    
    // Добавляем обработчики событий
    ads.forEach(ad => {
        const likeBtn = document.getElementById(`likeBtn_${ad.id}`);
        const dislikeBtn = document.getElementById(`dislikeBtn_${ad.id}`);
        const contactBtn = document.getElementById(`contactBtn_${ad.id}`);
        const reportBtn = document.getElementById(`reportBtn_${ad.id}`);
        
        if (likeBtn) likeBtn.onclick = () => rateUser(ad.userId, 'like');
        if (dislikeBtn) dislikeBtn.onclick = () => rateUser(ad.userId, 'dislike');
        if (contactBtn) contactBtn.onclick = () => contactSeller(ad);
        if (reportBtn) reportBtn.onclick = () => openReport(ad.id);
    });
}

// Создание карточки объявления
function createAdCard(ad) {
    const user = getUserById(ad.userId);
    const hasImage = ad.images && ad.images.length > 0;
    const mainImage = hasImage ? ad.images[0] : 'default-image.jpg';
    
    return `
        <div class="ad-card" data-ad-id="${ad.id}">
            <div class="ad-image">
                ${hasImage ? 
                    `<img src="${mainImage}" alt="${ad.title}" onclick="viewAd('${ad.id}')">` : 
                    `<div class="no-image" onclick="viewAd('${ad.id}')">
                        <i class="fas fa-camera"></i>
                        <p>Нет фото</p>
                    </div>`
                }
            </div>
            <div class="ad-info">
                <div class="ad-header">
                    <h4 class="ad-title" title="${ad.title}">${ad.title}</h4>
                    <span class="ad-price">${ad.price} ₽</span>
                </div>
                <div class="ad-description" title="${ad.description}">${ad.description.substring(0, 100)}...</div>
                <div class="ad-footer">
                    <div class="ad-location">
                        <i class="fas fa-map-marker-alt"></i>
                        ${ad.location}
                    </div>
                    <div class="ad-user">
                        ${user.isVerified ? '<span class="verified-badge" title="Проверенный пользователь"><i class="fas fa-check-circle"></i></span>' : ''}
                        <span>${user.name}</span>
                    </div>
                </div>
                <div class="ad-actions">
                    <button class="btn btn-small btn-contact" id="contactBtn_${ad.id}">
                        <i class="fas fa-comment"></i> Написать
                    </button>
                    <button class="btn btn-small btn-report" id="reportBtn_${ad.id}">
                        <i class="fas fa-flag"></i> Жалоба
                    </button>
                </div>
                <div class="rating-buttons">
                    <button class="btn-rating like" id="likeBtn_${ad.id}" title="Лайк">
                        <i class="fas fa-thumbs-up"></i>
                    </button>
                    <button class="btn-rating dislike" id="dislikeBtn_${ad.id}" title="Дизлайк">
                        <i class="fas fa-thumbs-down"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Получение пользователя по ID
function getUserById(userId) {
    const users = JSON.parse(localStorage.getItem('market_users') || '[]');
    const user = users.find(u => u.id === userId) || {
        id: userId,
        name: 'Пользователь',
        isVerified: false
    };
    
    return user;
}

// Открытие создания объявления
function openCreateAd() {
    if (!currentUser) {
        alert('Пожалуйста, войдите в систему');
        return;
    }
    
    document.getElementById('createAdModal').style.display = 'block';
}

// Закрытие модального окна
function closeModal() {
    document.getElementById('createAdModal').style.display = 'none';
    document.getElementById('adForm').reset();
    document.getElementById('imagePreviews').innerHTML = '';
}

// Обработка загрузки изображений
function handleImages(event) {
    const files = event.target.files;
    const previews = document.getElementById('imagePreviews');
    
    if (!previews) return;
    
    previews.innerHTML = '';
    
    for (let i = 0; i < Math.min(files.length, 5); i++) {
        const file = files[i];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const imgDiv = document.createElement('div');
            imgDiv.className = 'image-preview-item';
            imgDiv.innerHTML = `
                <img src="${e.target.result}" alt="Preview ${i + 1}">
                <button type="button" class="remove-image" onclick="removeImage(this)">
                    <i class="fas fa-times"></i>
                </button>
            `;
            previews.appendChild(imgDiv);
        };
        
        reader.readAsDataURL(file);
    }
}

// Удаление изображения
function removeImage(button) {
    button.parentElement.remove();
}

// Отправка объявления
function submitAd(event) {
    event.preventDefault();
    
    try {
        // Собираем данные
        const adData = {
            id: 'ad_' + Date.now(),
            title: document.getElementById('adTitle').value,
            category: document.getElementById('adCategory').value,
            description: document.getElementById('adDescription').value,
            price: parseInt(document.getElementById('adPrice').value),
            location: document.getElementById('adLocation').value,
            userId: currentUser.id,
            userName: currentUser.name,
            images: [],
            createdAt: new Date().toISOString(),
            views: 0,
            likes: 0,
            isBlocked: false
        };
        
        // Собираем изображения
        const previews = document.querySelectorAll('.image-preview-item img');
        previews.forEach(img => {
            adData.images.push(img.src);
        });
        
        // Сохраняем объявление
        saveAdToStorage(adData);
        
        // Закрываем окно
        closeModal();
        
        // Перезагружаем объявления
        loadAds();
        
        // Показываем уведомление
        showNotification('Объявление успешно создано!', 'success');
        
        return true;
    } catch (error) {
        console.error('Ошибка создания объявления:', error);
        showNotification('Ошибка при создании объявления', 'error');
        return false;
    }
}

// Сохранение объявления в хранилище
function saveAdToStorage(ad) {
    const ads = JSON.parse(localStorage.getItem('market_ads') || '[]');
    ads.unshift(ad);
    localStorage.setItem('market_ads', JSON.stringify(ads));
    
    // Сохраняем пользователя если его нет
    saveUserIfNotExists(ad.userId, ad.userName);
}

// Сохранение пользователя
function saveUserIfNotExists(userId, userName) {
    const users = JSON.parse(localStorage.getItem('market_users') || '[]');
    
    if (!users.find(u => u.id === userId)) {
        users.push({
            id: userId,
            name: userName,
            isVerified: false,
            rating: 0,
            createdAt: new Date().toISOString()
        });
        localStorage.setItem('market_users', JSON.stringify(users));
    }
}

// Показать мои объявления
function showMyAds() {
    if (!currentUser) {
        alert('Пожалуйста, войдите в систему');
        return;
    }
    
    const myAds = allAds.filter(ad => ad.userId === currentUser.id);
    displayAds(myAds);
}

// Показать избранное
function showFavorites() {
    const favorites = JSON.parse(localStorage.getItem('user_favorites') || '[]');
    const favAds = allAds.filter(ad => favorites.includes(ad.id));
    displayAds(favAds);
}

// ФИЛЬТРАЦИЯ - ваша оригинальная функция
function filterAds() {
    const category = document.getElementById('categoryFilter').value;
    const price = document.getElementById('priceFilter').value;
    
    let filtered = allAds;
    
    // Фильтр по категории
    if (category) {
        filtered = filtered.filter(ad => ad.category === category);
    }
    
    // Фильтр по цене
    if (price) {
        if (price === '0-1000') {
            filtered = filtered.filter(ad => ad.price <= 1000);
        } else if (price === '1000-3000') {
            filtered = filtered.filter(ad => ad.price > 1000 && ad.price <= 3000);
        } else if (price === '3000+') {
            filtered = filtered.filter(ad => ad.price > 3000);
        }
    }
    
    displayAds(filtered);
}

// Поиск объявлений
function searchAds() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    
    if (!searchText) {
        displayAds(allAds);
        return;
    }
    
    const filtered = allAds.filter(ad => 
        ad.title.toLowerCase().includes(searchText) || 
        ad.description.toLowerCase().includes(searchText) ||
        ad.location.toLowerCase().includes(searchText)
    );
    
    displayAds(filtered);
}

// Оценка пользователя
function rateUser(userId, type) {
    if (!currentUser) {
        alert('Пожалуйста, войдите в систему');
        return;
    }
    
    if (userId === currentUser.id) {
        alert('Нельзя оценивать себя');
        return;
    }
    
    const ratings = JSON.parse(localStorage.getItem('user_ratings') || '[]');
    
    // Проверяем, не оценивал ли уже
    const existingRating = ratings.find(r => 
        r.userId === userId && r.raterId === currentUser.id
    );
    
    if (existingRating) {
        existingRating.type = type;
        existingRating.updatedAt = new Date().toISOString();
    } else {
        ratings.push({
            id: 'rating_' + Date.now(),
            userId: userId,
            raterId: currentUser.id,
            type: type,
            createdAt: new Date().toISOString()
        });
    }
    
    localStorage.setItem('user_ratings', JSON.stringify(ratings));
    
    // Обновляем рейтинг пользователя
    updateUserRating(userId);
    
    showNotification(`Вы поставили ${type === 'like' ? 'лайк' : 'дизлайк'}`, 'success');
}

// Обновление рейтинга пользователя
function updateUserRating(userId) {
    const ratings = JSON.parse(localStorage.getItem('user_ratings') || '[]');
    const userRatings = ratings.filter(r => r.userId === userId);
    
    const likes = userRatings.filter(r => r.type === 'like').length;
    const dislikes = userRatings.filter(r => r.type === 'dislike').length;
    const total = likes + dislikes;
    
    const rating = total > 0 ? Math.round((likes / total) * 100) : 0;
    
    // Обновляем пользователя
    const users = JSON.parse(localStorage.getItem('market_users') || '[]');
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex !== -1) {
        users[userIndex].rating = rating;
        users[userIndex].likes = likes;
        users[userIndex].dislikes = dislikes;
        localStorage.setItem('market_users', JSON.stringify(users));
    }
}

// Написать продавцу
function contactSeller(ad) {
    if (!currentUser) {
        alert('Пожалуйста, войдите в систему');
        return;
    }
    
    const message = `Привет! Меня интересует твой товар: "${ad.title}" за ${ad.price}₽`;
    
    // В реальном приложении здесь открывается Telegram
    alert(`Сообщение для продавца:\n\n${message}\n\nСкопируйте это сообщение и отправьте продавцу в Telegram`);
}

// Открытие жалобы
function openReport(adId) {
    if (!currentUser) {
        alert('Пожалуйста, войдите в систему');
        return;
    }
    
    currentReportAdId = adId;
    document.getElementById('reportAdId').value = adId;
    document.getElementById('reportModal').style.display = 'block';
}

// Закрытие окна жалобы
function closeReportModal() {
    document.getElementById('reportModal').style.display = 'none';
    document.getElementById('reportForm').reset();
    currentReportAdId = null;
}

// Отправка жалобы
function submitReport(event) {
    event.preventDefault();
    
    try {
        const report = {
            id: 'report_' + Date.now(),
            adId: currentReportAdId,
            reason: document.getElementById('reportReason').value,
            details: document.getElementById('reportDetails').value,
            reporterId: currentUser.id,
            reporterName: currentUser.name,
            createdAt: new Date().toISOString(),
            status: 'pending'
        };
        
        // Сохраняем жалобу
        const reports = JSON.parse(localStorage.getItem('ad_reports') || '[]');
        reports.push(report);
        localStorage.setItem('ad_reports', JSON.stringify(reports));
        
        // Закрываем окно
        closeReportModal();
        
        // Показываем уведомление
        showNotification('Жалоба отправлена администратору', 'success');
        
        // Если жалоб больше 3 - блокируем объявление
        checkAdForBlock(currentReportAdId);
        
        return true;
    } catch (error) {
        console.error('Ошибка отправки жалобы:', error);
        showNotification('Ошибка при отправке жалобы', 'error');
        return false;
    }
}

// Проверка на блокировку объявления
function checkAdForBlock(adId) {
    const reports = JSON.parse(localStorage.getItem('ad_reports') || '[]');
    const adReports = reports.filter(r => r.adId === adId && r.status === 'pending');
    
    if (adReports.length >= 3) {
        // Блокируем объявление
        const ads = JSON.parse(localStorage.getItem('market_ads') || '[]');
        const adIndex = ads.findIndex(a => a.id === adId);
        
        if (adIndex !== -1) {
            ads[adIndex].isBlocked = true;
            localStorage.setItem('market_ads', JSON.stringify(ads));
            
            // Обновляем список
            loadAds();
            
            // Уведомляем администраторов
            notifyAdmins(`Объявление ${adId} заблокировано из-за 3+ жалоб`);
        }
    }
}

// Уведомление администраторов
function notifyAdmins(message) {
    console.log('Уведомление админам:', message);
    // Здесь можно добавить отправку в Telegram
}

// Загрузка данных пользователя
function loadUserData() {
    // Загружаем пользователя если есть
    const userId = localStorage.getItem('user_id');
    if (userId) {
        const users = JSON.parse(localStorage.getItem('market_users') || '[]');
        const user = users.find(u => u.id === userId);
        
        if (user) {
            currentUser = {
                ...currentUser,
                ...user
            };
        }
    }
}

// Загрузка рекламы
function loadAdvertisement() {
    const ad = JSON.parse(localStorage.getItem('advertisement') || 'null');
    
    if (ad && ad.isActive) {
        document.getElementById('adTitle').textContent = ad.title;
        document.getElementById('adText').textContent = ad.text;
    }
}

// Редактирование рекламы
function editAd() {
    const ad = JSON.parse(localStorage.getItem('advertisement') || '{}');
    
    document.getElementById('editAdTitle').value = ad.title || '';
    document.getElementById('editAdText').value = ad.text || '';
    document.getElementById('editAdLink').value = ad.link || '';
    
    document.getElementById('adEditModal').style.display = 'block';
}

// Закрытие редактирования рекламы
function closeAdEditModal() {
    document.getElementById('adEditModal').style.display = 'none';
    document.getElementById('adImagePreview').innerHTML = '';
}

// Предпросмотр изображения рекламы
function previewAdImage(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('adImagePreview');
    
    if (!file || !preview) return;
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        preview.innerHTML = `
            <img src="${e.target.result}" alt="Предпросмотр">
            <button type="button" class="remove-image" onclick="removeAdImage()">
                <i class="fas fa-times"></i>
            </button>
        `;
    };
    
    reader.readAsDataURL(file);
}

// Удаление изображения рекламы
function removeAdImage() {
    document.getElementById('adImagePreview').innerHTML = '';
    document.getElementById('editAdImage').value = '';
}

// Сохранение рекламы
function saveAd(event) {
    event.preventDefault();
    
    try {
        const adData = {
            title: document.getElementById('editAdTitle').value,
            text: document.getElementById('editAdText').value,
            link: document.getElementById('editAdLink').value,
            isActive: true,
            updatedAt: new Date().toISOString()
        };
        
        // Сохраняем изображение если есть
        const previewImg = document.querySelector('#adImagePreview img');
        if (previewImg) {
            adData.image = previewImg.src;
        }
        
        localStorage.setItem('advertisement', JSON.stringify(adData));
        
        closeAdEditModal();
        loadAdvertisement();
        
        showNotification('Реклама сохранена', 'success');
        
        return true;
    } catch (error) {
        console.error('Ошибка сохранения рекламы:', error);
        showNotification('Ошибка при сохранении рекламы', 'error');
        return false;
    }
}

// Показать уведомление
function showNotification(message, type) {
    // Создаем уведомление
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    // Авто-удаление через 5 секунд
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Просмотр объявления
function viewAd(adId) {
    window.location.href = `pages/ad.html?id=${adId}`;
}

// Загрузка пользовательских данных
async function loadUserData() {
    // Быстрая загрузка без ожидания
    setTimeout(() => {
        const userId = localStorage.getItem('user_id');
        if (userId) {
            const users = JSON.parse(localStorage.getItem('market_users') || '[]');
            const user = users.find(u => u.id === userId);
            
            if (user) {
                currentUser = {
                    ...currentUser,
                    ...user
                };
            }
        }
    }, 100);
}
