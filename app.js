// ==================== КОНФИГУРАЦИЯ ====================
const CONFIG = {
    maxPhotos: 3,
    maxDescriptionLength: 500,
    apiUrl: 'https://telegram-market-vape-cxld805tf-nukm0.vercel.app/api'
};

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let currentUser = null;
let allAds = [];
let filteredAds = [];
let selectedPhotos = [];
let currentFilter = 'all';

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Vape Market запускается...');
    
    try {
        // Инициализация Telegram Web App
        await initTelegramApp();
        
        // Инициализация пользователя
        await initUser();
        
        // Настройка обработчиков событий
        setupEventListeners();
        
        // Загрузка объявлений
        await loadAds();
        
        // Обновление UI
        updateUI();
        
        console.log('✅ Приложение успешно инициализировано');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        showNotification('Ошибка загрузки приложения', 'error');
    }
});

// ==================== TELEGRAM WEB APP ====================
async function initTelegramApp() {
    if (window.Telegram && Telegram.WebApp) {
        const tg = Telegram.WebApp;
        
        // Расширяем приложение на весь экран
        tg.expand();
        
        // Настройка темы
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
                isPremium: user.is_premium || false
            };
            
            // Обновляем имя в шапке если это не админ
            if (currentUser.id !== 998579758) { // ID админа из config.js
                const usernameEl = document.querySelector('.username');
                if (usernameEl) {
                    usernameEl.textContent = currentUser.firstName;
                    usernameEl.style.background = 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)';
                    usernameEl.style.webkitBackgroundClip = 'text';
                    usernameEl.style.webkitTextFillColor = 'transparent';
                }
            }
        }
        
        return tg;
    }
    return null;
}

// ==================== ПОЛЬЗОВАТЕЛЬ ====================
async function initUser() {
    // Если нет пользователя Telegram, создаем тестового
    if (!currentUser) {
        currentUser = {
            id: Date.now(),
            username: 'guest_user',
            firstName: 'Гость',
            lastName: '',
            photoUrl: null,
            isPremium: false
        };
    }
    
    // Сохраняем в localStorage
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    console.log('👤 Пользователь:', currentUser.username);
}

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================
function setupEventListeners() {
    // Кнопка создания объявления
    document.getElementById('createAdBtn').addEventListener('click', showCreateAdModal);
    
    // Закрытие модалки
    document.getElementById('closeModal').addEventListener('click', hideCreateAdModal);
    document.getElementById('cancelBtn').addEventListener('click', hideCreateAdModal);
    
    // Опубликовать объявление
    document.getElementById('publishBtn').addEventListener('click', publishAd);
    
    // Выбор фото
    document.getElementById('selectPhotos').addEventListener('click', () => {
        document.getElementById('photoInput').click();
    });
    
    document.getElementById('photoInput').addEventListener('change', handlePhotoSelect);
    
    // Типы сделок
    document.querySelectorAll('.deal-type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.deal-type-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.getElementById('dealType').value = this.dataset.type;
        });
    });
    
    // Счетчик символов в описании
    document.getElementById('description').addEventListener('input', function() {
        const count = this.value.length;
        document.getElementById('charCount').textContent = count;
        
        if (count > CONFIG.maxDescriptionLength) {
            this.value = this.value.substring(0, CONFIG.maxDescriptionLength);
            document.getElementById('charCount').textContent = CONFIG.maxDescriptionLength;
        }
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
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');
    
    searchInput.addEventListener('input', debounce(function() {
        filterAds();
        clearSearch.style.display = this.value ? 'flex' : 'none';
    }, 300));
    
    clearSearch.addEventListener('click', function() {
        searchInput.value = '';
        filterAds();
        this.style.display = 'none';
    });
    
    // Навигация
    document.getElementById('profileBtn').addEventListener('click', function() {
        window.location.href = 'pages/profile.html';
    });
    
    document.getElementById('faqBtn').addEventListener('click', function() {
        window.location.href = 'pages/faq.html';
    });
    
    // Закрытие модалки по клику вне
    document.getElementById('createAdModal').addEventListener('click', function(e) {
        if (e.target === this) {
            hideCreateAdModal();
        }
    });
}

// ==================== ОБЪЯВЛЕНИЯ ====================
async function loadAds() {
    try {
        showLoading(true);
        
        // Пока используем мок данные
        allAds = getMockAds();
        
        // Применяем фильтры
        filterAds();
        
        // Обновляем сетку
        updateAdsGrid();
        
        showNotification('Объявления загружены', 'success');
        
    } catch (error) {
        console.error('❌ Ошибка загрузки объявлений:', error);
        showNotification('Ошибка загрузки объявлений', 'error');
        
        // Показываем пустое состояние
        document.getElementById('emptyState').style.display = 'block';
        document.getElementById('adsGrid').innerHTML = '';
        
    } finally {
        showLoading(false);
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
            description: 'Новый, в упаковке, 2500 затяжек',
            photos: 1,
            sellerName: 'Иван',
            sellerId: '123',
            createdAt: new Date().toISOString(),
            views: 45,
            likes: 5
        },
        {
            id: '2',
            title: 'Caliburn G3 + жидкости',
            price: 2500,
            category: 'pod',
            dealType: 'sell',
            description: 'Отличное состояние, 2 недели использования. В комплекте 2 жидкости по 30мл',
            photos: 2,
            sellerName: 'Алексей',
            sellerId: '456',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            views: 89,
            likes: 12
        },
        {
            id: '3',
            title: 'Ищу одноразовые Elf Bar',
            price: 800,
            category: 'disposable',
            dealType: 'buy',
            description: 'Ищу Elf Bar 1500 затяжек, новые или б/у',
            photos: 0,
            sellerName: 'Максим',
            sellerId: '789',
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            views: 23,
            likes: 1
        },
        {
            id: '4',
            title: 'Жидкости Salt 20mg',
            price: 500,
            category: 'liquids',
            dealType: 'sell',
            description: 'Солевые жидкости 20mg, разные вкусы. Открытые, но не использованные',
            photos: 1,
            sellerName: 'Дмитрий',
            sellerId: '101',
            createdAt: new Date(Date.now() - 259200000).toISOString(),
            views: 67,
            likes: 8
        },
        {
            id: '5',
            title: 'Расходники для POD',
            price: 300,
            category: 'consumables',
            dealType: 'sell',
            description: 'Набор испарителей и картриджей для разных POD систем',
            photos: 1,
            sellerName: 'Сергей',
            sellerId: '102',
            createdAt: new Date(Date.now() - 345600000).toISOString(),
            views: 34,
            likes: 3
        }
    ];
}

function filterAds() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    filteredAds = allAds.filter(ad => {
        // Фильтр по типу
        if (currentFilter !== 'all' && ad.dealType !== currentFilter) {
            return false;
        }
        
        // Поиск по тексту
        if (searchTerm) {
            const matches = (
                ad.title.toLowerCase().includes(searchTerm) ||
                (ad.description && ad.description.toLowerCase().includes(searchTerm)) ||
                ad.category.toLowerCase().includes(searchTerm)
            );
            if (!matches) return false;
        }
        
        return true;
    });
    
    // Сортируем по дате (новые сначала)
    filteredAds.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    updateAdsGrid();
}

function updateAdsGrid() {
    const adsGrid = document.getElementById('adsGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (!adsGrid) return;
    
    if (filteredAds.length === 0) {
        adsGrid.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    adsGrid.innerHTML = filteredAds.map(ad => `
        <div class="ad-card" data-id="${ad.id}">
            <div class="ad-image">
                ${ad.photos > 0 
                    ? `<img src="https://via.placeholder.com/300x180/8B5CF6/FFFFFF?text=Vape" alt="${ad.title}">`
                    : `<div class="no-image">
                          <i class="fas fa-box-open"></i>
                       </div>`
                }
                ${ad.photos > 1 ? `<span class="photos-badge">+${ad.photos - 1}</span>` : ''}
            </div>
            
            <div class="ad-info">
                <h3 class="ad-title">${ad.title}</h3>
                
                <div class="ad-meta">
                    <span class="ad-price">${formatPrice(ad.price)} ₽</span>
                    <span class="ad-category">${getCategoryName(ad.category)}</span>
                </div>
                
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
            </div>
        </div>
    `).join('');
    
    // Добавляем обработчики кликов на карточки
    document.querySelectorAll('.ad-card').forEach(card => {
        card.addEventListener('click', function() {
            const adId = this.dataset.id;
            showAdDetails(adId);
        });
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
    if (days < 30) return `${Math.floor(days / 7)} недели назад`;
    
    return date.toLocaleDateString('ru-RU');
}

// ==================== СОЗДАНИЕ ОБЪЯВЛЕНИЯ ====================
function showCreateAdModal() {
    const modal = document.getElementById('createAdModal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Сброс формы
    resetForm();
}

function hideCreateAdModal() {
    const modal = document.getElementById('createAdModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Подтверждение если есть данные
    if (hasFormData()) {
        if (confirm('Вы уверены? Все введенные данные будут потеряны.')) {
            resetForm();
        } else {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            return;
        }
    }
}

function hasFormData() {
    return (
        document.getElementById('title').value ||
        document.getElementById('price').value ||
        document.getElementById('description').value ||
        selectedPhotos.length > 0
    );
}

function resetForm() {
    // Сброс формы
    document.getElementById('adForm').reset();
    document.getElementById('dealType').value = 'sell';
    document.getElementById('charCount').textContent = '0';
    
    // Сброс фото
    selectedPhotos = [];
    document.getElementById('photoCount').textContent = 'Выбрано: 0/3';
    document.getElementById('photoPreview').innerHTML = '';
    document.getElementById('photoInput').value = '';
    
    // Сброс кнопок типа сделки
    document.querySelectorAll('.deal-type-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.type === 'sell') {
            btn.classList.add('active');
        }
    });
}

function handlePhotoSelect(event) {
    const files = Array.from(event.target.files);
    
    // Проверка количества
    if (selectedPhotos.length + files.length > CONFIG.maxPhotos) {
        showNotification(`Можно загрузить не более ${CONFIG.maxPhotos} фото`, 'error');
        return;
    }
    
    // Добавляем файлы
    files.forEach(file => {
        if (!file.type.startsWith('image/')) {
            showNotification('Можно загружать только изображения', 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) { // 5MB
            showNotification('Файл слишком большой (макс. 5MB)', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            selectedPhotos.push({
                file: file,
                dataUrl: e.target.result
            });
            
            updatePhotoPreview();
        };
        reader.readAsDataURL(file);
    });
    
    // Сброс input
    event.target.value = '';
}

function updatePhotoPreview() {
    const preview = document.getElementById('photoPreview');
    const count = document.getElementById('photoCount');
    
    preview.innerHTML = '';
    count.textContent = `Выбрано: ${selectedPhotos.length}/${CONFIG.maxPhotos}`;
    
    selectedPhotos.forEach((photo, index) => {
        const div = document.createElement('div');
        div.className = 'preview-image';
        div.innerHTML = `
            <img src="${photo.dataUrl}" alt="Фото ${index + 1}">
            <button class="remove-photo" data-index="${index}">
                <i class="fas fa-times"></i>
            </button>
        `;
        preview.appendChild(div);
    });
    
    // Обработчики удаления фото
    document.querySelectorAll('.remove-photo').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const index = parseInt(this.dataset.index);
            selectedPhotos.splice(index, 1);
            updatePhotoPreview();
        });
    });
}

async function publishAd() {
    try {
        // Валидация
        const title = document.getElementById('title').value.trim();
        const price = document.getElementById('price').value.trim();
        const category = document.getElementById('category').value;
        const dealType = document.getElementById('dealType').value;
        const description = document.getElementById('description').value.trim();
        
        if (!title || !price || !category) {
            showNotification('Заполните все обязательные поля', 'error');
            return;
        }
        
        if (title.length < 5) {
            showNotification('Название должно быть не менее 5 символов', 'error');
            return;
        }
        
        const priceNum = parseInt(price);
        if (isNaN(priceNum) || priceNum <= 0 || priceNum > 1000000) {
            showNotification('Введите корректную цену', 'error');
            return;
        }
        
        // Показываем загрузку
        const publishBtn = document.getElementById('publishBtn');
        const originalText = publishBtn.innerHTML;
        publishBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Публикация...';
        publishBtn.disabled = true;
        
        // Создаем объявление
        const newAd = {
            id: 'ad_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            title: title,
            price: priceNum,
            category: category,
            dealType: dealType,
            description: description,
            photos: selectedPhotos.length,
            photoUrls: [], // Здесь будут URL загруженных фото
            sellerId: currentUser.id,
            sellerName: currentUser.firstName,
            sellerUsername: currentUser.username,
            createdAt: new Date().toISOString(),
            views: 0,
            likes: 0,
            dislikes: 0,
            status: 'active'
        };
        
        // Здесь будет загрузка фото на сервер
        // Пока сохраняем dataUrl
        const photoDataUrls = selectedPhotos.map(photo => photo.dataUrl);
        
        // Добавляем в массив объявлений
        allAds.unshift(newAd);
        
        // Фильтруем и обновляем UI
        filterAds();
        
        // Закрываем модалку
        hideCreateAdModal();
        
        // Показываем уведомление
        showNotification('Объявление успешно опубликовано!', 'success');
        
        console.log('✅ Новое объявление:', newAd);
        
    } catch (error) {
        console.error('❌ Ошибка публикации:', error);
        showNotification('Ошибка публикации объявления', 'error');
        
    } finally {
        // Восстанавливаем кнопку
        const publishBtn = document.getElementById('publishBtn');
        publishBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Опубликовать';
        publishBtn.disabled = false;
    }
}

// ==================== УТИЛИТЫ ====================
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    
    // Автоматическое скрытие
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

function showLoading(show) {
    const loading = document.querySelector('.loading-ads');
    if (loading) {
        loading.style.display = show ? 'grid' : 'none';
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

function showAdDetails(adId) {
    const ad = allAds.find(a => a.id === adId);
    if (!ad) return;
    
    // Здесь можно показать детальное модальное окно
    // или перейти на отдельную страницу
    alert(`Детали объявления:\n\n${ad.title}\nЦена: ${ad.price} ₽\n\n${ad.description || 'Нет описания'}`);
}

// ==================== ОБНОВЛЕНИЕ UI ====================
function updateUI() {
    // Обновляем счетчики и т.д.
    console.log('UI обновлен');
}

// ==================== ЭКСПОРТ ДЛЯ ГЛОБАЛЬНОГО ДОСТУПА ====================
window.VapeMarket = {
    currentUser,
    allAds,
    filteredAds,
    loadAds,
    filterAds,
    showCreateAdModal,
    hideCreateAdModal,
    publishAd,
    showNotification
};
