// ========== CONFIG ==========
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

const appConfig = {
    appName: "Vape Market",
    adminIds: [998579758],
    categories: ["Жидкости", "Одноразовые", "Под-системы", "Расходники"],
    categoryShort: {
        "Жидкости": "Жидкость",
        "Одноразовые": "Одноразово", 
        "Под-системы": "Под-системы",
        "Расходники": "Расходники"
    },
    complaintTypes: ["Мошенничество", "Неправильная категория", "Запрещенные товары", "Спам", "Оскорбления", "Другое"],
    maxPhotos: 3,
    ratingFormula: (likes, dislikes) => {
        const total = likes + dislikes;
        return total === 0 ? 0 : 0.1 + (likes / total) * 4.9;
    }
};

// ========== GLOBAL VARIABLES ==========
let db;
let currentUser = null;
let userData = null;
let tg = window.Telegram.WebApp;
let ads = [];
let currentFilters = { category: 'all' };

// ========== FIREBASE INIT ==========
function initializeFirebase() {
    try {
        const app = firebase.initializeApp(firebaseConfig);
        db = firebase.database();
        console.log('✅ Firebase инициализирован');
        return true;
    } catch (error) {
        console.error('❌ Ошибка инициализации Firebase:', error);
        showNotification('Ошибка подключения к базе данных', 'error');
        return false;
    }
}

// ========== AUTH ==========
async function initializeAuth() {
    if (!tg.initData) {
        showNotification('Ошибка авторизации', 'error');
        return false;
    }

    try {
        tg.expand();
        tg.enableClosingConfirmation();
        
        const tgUser = tg.initDataUnsafe.user;
        
        if (!tgUser) {
            throw new Error('Данные пользователя не получены');
        }

        userData = {
            id: tgUser.id.toString(),
            firstName: tgUser.first_name,
            lastName: tgUser.last_name || '',
            username: tgUser.username || `user_${tgUser.id}`,
            photoUrl: tgUser.photo_url || '',
            languageCode: tgUser.language_code || 'ru'
        };

        // Проверяем, есть ли пользователь в базе
        const userInDb = await getData(`users/${userData.id}`);
        
        if (!userInDb) {
            await registerUser();
        } else {
            currentUser = userInDb;
            await updateUserData();
        }

        // Проверяем блокировку
        if (currentUser?.blocked) {
            showBlockedScreen();
            return false;
        }

        // Показываем админ-панель
        toggleAdminPanel();
        
        return true;
    } catch (error) {
        console.error('❌ Ошибка авторизации:', error);
        showNotification('Ошибка авторизации', 'error');
        return false;
    }
}

async function registerUser() {
    const user = {
        ...userData,
        rating: 0,
        adsCount: 0,
        likesCount: 0,
        dislikesCount: 0,
        complaintsCount: 0,
        blocked: false,
        verified: false,
        createdAt: Date.now(),
        lastSeen: Date.now()
    };

    const success = await setData(`users/${userData.id}`, user);
    if (success) {
        currentUser = user;
        showNotification('Добро пожаловать!', 'success');
    }
    return success;
}

async function updateUserData() {
    const updates = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        username: userData.username,
        photoUrl: userData.photoUrl,
        lastSeen: Date.now()
    };
    await updateData(`users/${userData.id}`, updates);
}

// ========== MAIN APP INIT ==========
async function initializeApp() {
    console.log('🚀 Инициализация приложения...');
    
    try {
        // 1. Инициализируем Firebase
        if (!initializeFirebase()) {
            throw new Error('Не удалось инициализировать Firebase');
        }
        
        // 2. Инициализируем Telegram
        tg.ready();
        
        // 3. Авторизуем пользователя
        if (!(await initializeAuth())) {
            throw new Error('Ошибка авторизации');
        }
        
        // 4. Инициализируем UI
        initializeNavigation();
        initializeEventHandlers();
        
        // 5. Загружаем объявления
        await loadAds();
        
        console.log('✅ Приложение инициализировано');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        showNotification('Ошибка загрузки приложения', 'error');
    }
}

// ========== NAVIGATION ==========
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
            
            // Показываем страницу
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
                            break;
                        case 'faq':
                            loadFAQ();
                            break;
                        case 'admin':
                            if (isAdmin()) {
                                loadAdminPanel();
                            }
                            break;
                    }
                }
            });
        });
    });
}

// ========== ADS SYSTEM ==========
async function loadAds() {
    showLoading(true);
    
    try {
        const snapshot = await db.ref('ads').once('value');
        const adsData = snapshot.val();
        
        if (!adsData) {
            showNoAds();
            return;
        }
        
        ads = Object.entries(adsData)
            .map(([id, ad]) => ({ id, ...ad }))
            .filter(ad => !ad.blocked);
        
        renderAds();
        
    } catch (error) {
        console.error('❌ Ошибка загрузки:', error);
        showNotification('Ошибка загрузки объявлений', 'error');
    } finally {
        showLoading(false);
    }
}

function renderAds() {
    const container = document.getElementById('ads-container');
    if (!container) return;
    
    let filteredAds = [...ads];
    
    // Фильтр по категории
    if (currentFilters.category !== 'all') {
        filteredAds = filteredAds.filter(ad => ad.category === currentFilters.category);
    }
    
    // Сортировка по дате
    filteredAds.sort((a, b) => b.createdAt - a.createdAt);
    
    if (filteredAds.length === 0) {
        container.innerHTML = `
            <div class="no-ads-message">
                <i class="fas fa-box-open"></i>
                <h3>Объявлений пока нет</h3>
                <p>Будьте первым!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredAds.map(ad => `
        <div class="ad-card" data-id="${ad.id}">
            <div class="ad-image">
                ${ad.photoUrls && ad.photoUrls.length > 0 
                    ? `<img src="${ad.photoUrls[0]}" alt="${ad.title}">`
                    : `<div class="no-photo"><i class="fas fa-image"></i></div>`
                }
                <div class="ad-badge">${appConfig.categoryShort[ad.category] || ad.category}</div>
            </div>
            <div class="ad-content">
                <h3 class="ad-title">${escapeHtml(ad.title)}</h3>
                <div class="ad-price">${ad.price} ₽</div>
                <div class="ad-description">${escapeHtml(ad.description.substring(0, 80))}${ad.description.length > 80 ? '...' : ''}</div>
                <div class="ad-footer">
                    <div class="seller-info">
                        <span class="seller-name">${escapeHtml(ad.sellerName)}</span>
                        <span class="seller-contact">${ad.contact}</span>
                    </div>
                    <div class="ad-stats">
                        <span><i class="fas fa-thumbs-up"></i> ${ad.likes || 0}</span>
                        <span><i class="fas fa-thumbs-down"></i> ${ad.dislikes || 0}</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// ========== PROFILE PAGE ==========
async function loadProfile() {
    const container = document.getElementById('profile-info');
    if (!container || !currentUser) return;
    
    const userData = await getData(`users/${getUserId()}`);
    if (!userData) return;
    
    const rating = appConfig.ratingFormula(userData.likesCount || 0, userData.dislikesCount || 0);
    
    container.innerHTML = `
        <div class="profile-card">
            <div class="profile-header">
                <div class="profile-avatar">
                    ${userData.photoUrl 
                        ? `<img src="${userData.photoUrl}" alt="${userData.firstName}">`
                        : `<div class="avatar-placeholder">${getInitials(userData.firstName, userData.lastName)}</div>`
                    }
                </div>
                <div class="profile-info">
                    <h2 class="profile-name">${userData.firstName} ${userData.lastName || ''}</h2>
                    <div class="profile-username">@${userData.username}</div>
                    <div class="profile-rating">
                        <i class="fas fa-star"></i>
                        <span>${rating.toFixed(1)}</span>
                    </div>
                </div>
            </div>
            
            <div class="stats-tabs">
                <div class="stat-tab active" data-stat="ads">
                    <div class="stat-value">${userData.adsCount || 0}</div>
                    <div class="stat-label">Объявления</div>
                </div>
                <div class="stat-tab" data-stat="likes">
                    <div class="stat-value">${userData.likesCount || 0}</div>
                    <div class="stat-label">Лайки</div>
                </div>
                <div class="stat-tab" data-stat="dislikes">
                    <div class="stat-value">${userData.dislikesCount || 0}</div>
                    <div class="stat-label">Дизлайки</div>
                </div>
            </div>
            
            <div class="my-ads-section">
                <h3><i class="fas fa-box"></i> Мои объявления</h3>
                <div class="my-ads-list" id="my-ads-list">
                    <!-- Объявления загружаются динамически -->
                </div>
            </div>
        </div>
    `;
    
    // Загружаем мои объявления
    await loadMyAds();
}

async function loadMyAds() {
    const container = document.getElementById('my-ads-list');
    if (!container || !currentUser) return;
    
    try {
        const snapshot = await db.ref('ads').once('value');
        const adsData = snapshot.val();
        
        if (!adsData) {
            container.innerHTML = '<div class="empty-state">У вас пока нет объявлений</div>';
            return;
        }
        
        const myAds = Object.entries(adsData)
            .filter(([id, ad]) => ad.sellerId === getUserId())
            .map(([id, ad]) => ({ id, ...ad }))
            .sort((a, b) => b.createdAt - a.createdAt);
        
        if (myAds.length === 0) {
            container.innerHTML = '<div class="empty-state">У вас пока нет объявлений</div>';
            return;
        }
        
        container.innerHTML = myAds.map(ad => `
            <div class="my-ad-item" data-id="${ad.id}">
                <div class="my-ad-image">
                    ${ad.photoUrls && ad.photoUrls.length > 0 
                        ? `<img src="${ad.photoUrls[0]}" alt="${ad.title}">`
                        : `<div class="no-photo-small"><i class="fas fa-image"></i></div>`
                    }
                </div>
                <div class="my-ad-info">
                    <h4>${escapeHtml(ad.title)}</h4>
                    <div class="my-ad-price">${ad.price} ₽</div>
                    <div class="my-ad-stats">
                        <span><i class="fas fa-thumbs-up"></i> ${ad.likes || 0}</span>
                        <span><i class="fas fa-thumbs-down"></i> ${ad.dislikes || 0}</span>
                    </div>
                </div>
                <div class="my-ad-actions">
                    <button class="btn-icon" onclick="editAd('${ad.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-danger" onclick="deleteAd('${ad.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('❌ Ошибка загрузки моих объявлений:', error);
        container.innerHTML = '<div class="empty-state">Ошибка загрузки</div>';
    }
}

// ========== FAQ PAGE ==========
function loadFAQ() {
    const container = document.getElementById('faq-content');
    if (!container) return;
    
    container.innerHTML = `
        <div class="faq-card">
            <h2><i class="fas fa-question-circle"></i> Помощь</h2>
            
            <div class="faq-section">
                <h3>Частые вопросы</h3>
                <div class="faq-items">
                    <div class="faq-item">
                        <div class="faq-question">
                            <i class="fas fa-plus-circle"></i>
                            <span>Как добавить объявление?</span>
                        </div>
                        <div class="faq-answer">
                            Нажмите кнопку "Разместить объявление" на главной странице, заполните все поля и подтвердите публикацию.
                        </div>
                    </div>
                    
                    <div class="faq-item">
                        <div class="faq-question">
                            <i class="fas fa-star"></i>
                            <span>Как работает система рейтинга?</span>
                        </div>
                        <div class="faq-answer">
                            Рейтинг рассчитывается по формуле: 0.1 + (лайки / (лайки + дизлайки)) × 4.9
                        </div>
                    </div>
                    
                    <div class="faq-item">
                        <div class="faq-question">
                            <i class="fas fa-image"></i>
                            <span>Как загрузить фото?</span>
                        </div>
                        <div class="faq-answer">
                            При создании объявления нажмите "Загрузить фотографии". Можно загрузить до 3 фотографий.
                        </div>
                    </div>
                    
                    <div class="faq-item">
                        <div class="faq-question">
                            <i class="fas fa-paper-plane"></i>
                            <span>Как написать продавцу?</span>
                        </div>
                        <div class="faq-answer">
                            Нажмите кнопку "Написать продавцу" на карточке объявления. Чат откроется в Telegram.
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="stats-section">
                <h3><i class="fas fa-chart-bar"></i> Статистика сервера</h3>
                <div class="stats-grid">
                    <div class="stat-box">
                        <div class="stat-title">Пользователей</div>
                        <div class="stat-value" id="users-count">--</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-title">Объявления</div>
                        <div class="stat-value" id="ads-count">--</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-title">Активные</div>
                        <div class="stat-value" id="active-count">--</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-title">Сводная</div>
                        <div class="stat-value" id="summary-count">--</div>
                    </div>
                </div>
                <div class="stats-note">
                    <i class="fas fa-info-circle"></i>
                    Данные обновляются в реальном времени
                </div>
            </div>
        </div>
    `;
    
    // Загружаем статистику
    loadStats();
}

async function loadStats() {
    try {
        const [usersData, adsData] = await Promise.all([
            getData('users'),
            getData('ads')
        ]);
        
        const usersCount = usersData ? Object.keys(usersData).length : 0;
        const adsCount = adsData ? Object.keys(adsData).length : 0;
        const activeUsers = usersData ? Object.values(usersData).filter(u => !u.blocked).length : 0;
        const activeAds = adsData ? Object.values(adsData).filter(a => !a.blocked).length : 0;
        
        // Обновляем статистику
        document.getElementById('users-count').textContent = usersCount;
        document.getElementById('ads-count').textContent = adsCount;
        document.getElementById('active-count').textContent = activeUsers;
        document.getElementById('summary-count').textContent = activeAds;
        
    } catch (error) {
        console.error('❌ Ошибка загрузки статистики:', error);
    }
}

// ========== CREATE AD MODAL ==========
function showCreateAdModal() {
    const modalHTML = `
        <div class="modal active" id="create-ad-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-plus"></i> Разместить объявление</h2>
                    <button class="close-modal" onclick="closeModal()">&times;</button>
                </div>
                
                <div class="modal-body">
                    <div class="photo-upload-section">
                        <div class="photo-upload-area" id="photo-upload-area">
                            <i class="fas fa-camera"></i>
                            <span>Загрузить фотографии</span>
                            <input type="file" id="photo-input" accept="image/*" multiple style="display: none;">
                        </div>
                        <div class="photo-count">Можно загрузить до 3 фотографий. Выбрано: <span id="photo-count">0/3</span></div>
                        <div class="photo-preview" id="photo-preview"></div>
                    </div>
                    
                    <form id="ad-form">
                        <div class="form-group">
                            <label for="ad-title">Название товара</label>
                            <input type="text" id="ad-title" placeholder="Введите название" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Выберите категорию</label>
                            <div class="category-buttons">
                                ${appConfig.categories.map(category => `
                                    <button type="button" class="category-btn" data-category="${category}">
                                        ${appConfig.categoryShort[category] || category}
                                    </button>
                                `).join('')}
                            </div>
                            <input type="hidden" id="ad-category" required>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="ad-price">Цена (₽)</label>
                                <input type="number" id="ad-price" placeholder="0" min="1" required>
                            </div>
                            <div class="form-group">
                                <label for="ad-contact">Контакт</label>
                                <input type="text" id="ad-contact" value="@${currentUser?.username || ''}" placeholder="@username" required>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="ad-description">Описание товара</label>
                            <textarea id="ad-description" rows="3" placeholder="Опишите ваш товар..." required></textarea>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn-secondary" onclick="closeModal()">✘ Отмена</button>
                            <button type="submit" class="btn-primary">✔ Опубликовать</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    const container = document.createElement('div');
    container.innerHTML = modalHTML;
    document.body.appendChild(container.firstElementChild);
    
    // Инициализируем модальное окно
    initializeCreateAdModal();
}

function initializeCreateAdModal() {
    // Категории
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.getElementById('ad-category').value = this.dataset.category;
        });
    });
    
    // Загрузка фото
    const uploadArea = document.getElementById('photo-upload-area');
    const photoInput = document.getElementById('photo-input');
    const photoPreview = document.getElementById('photo-preview');
    const photoCount = document.getElementById('photo-count');
    
    uploadArea.addEventListener('click', () => photoInput.click());
    
    photoInput.addEventListener('change', function() {
        const files = Array.from(this.files).slice(0, appConfig.maxPhotos);
        photoPreview.innerHTML = '';
        
        files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const previewItem = document.createElement('div');
                previewItem.className = 'preview-item';
                previewItem.innerHTML = `
                    <img src="${e.target.result}" alt="Preview">
                    <button type="button" class="remove-photo" data-index="${index}">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                photoPreview.appendChild(previewItem);
                
                // Обработчик удаления фото
                previewItem.querySelector('.remove-photo').addEventListener('click', function() {
                    previewItem.remove();
                    updatePhotoCount();
                });
            };
            reader.readAsDataURL(file);
        });
        
        updatePhotoCount();
    });
    
    function updatePhotoCount() {
        const count = photoPreview.children.length;
        photoCount.textContent = `${count}/${appConfig.maxPhotos}`;
    }
    
    // Форма
    const form = document.getElementById('ad-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const adData = {
            title: document.getElementById('ad-title').value,
            category: document.getElementById('ad-category').value,
            price: parseInt(document.getElementById('ad-price').value),
            description: document.getElementById('ad-description').value,
            contact: document.getElementById('ad-contact').value
        };
        
        if (!adData.category) {
            showNotification('Выберите категорию', 'error');
            return;
        }
        
        await createAd(adData);
        closeModal();
    });
}

async function createAd(adData) {
    if (!currentUser) return false;
    
    const adId = generateId();
    const ad = {
        id: adId,
        sellerId: getUserId(),
        sellerName: currentUser.firstName + (currentUser.lastName ? ' ' + currentUser.lastName : ''),
        sellerUsername: currentUser.username,
        sellerPhoto: currentUser.photoUrl,
        title: adData.title.trim(),
        category: adData.category,
        price: adData.price,
        description: adData.description.trim(),
        contact: adData.contact.trim(),
        photoUrls: [], // В реальном приложении загружаем фото
        likes: 0,
        dislikes: 0,
        complaints: 0,
        verified: false,
        blocked: false,
        createdAt: Date.now()
    };
    
    try {
        await setData(`ads/${adId}`, ad);
        await updateCounter(`users/${getUserId()}/adsCount`, 1);
        
        showNotification('Объявление успешно создано!', 'success');
        await loadAds();
        
        return true;
    } catch (error) {
        console.error('❌ Ошибка создания объявления:', error);
        showNotification('Ошибка создания объявления', 'error');
        return false;
    }
}

// ========== UTILITY FUNCTIONS ==========
function showLoading(show) {
    const loading = document.getElementById('loading-spinner');
    const noAds = document.getElementById('no-ads');
    
    if (loading) loading.style.display = show ? 'flex' : 'none';
    if (noAds && !show) noAds.style.display = 'none';
}

function showNoAds() {
    const container = document.getElementById('ads-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="no-ads-message">
            <i class="fas fa-box-open"></i>
            <h3>Объявлений пока нет</h3>
            <p>Будьте первым!</p>
        </div>
    `;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getInitials(firstName, lastName) {
    const first = firstName ? firstName[0].toUpperCase() : '';
    const last = lastName ? lastName[0].toUpperCase() : '';
    return first + last;
}

function generateId() {
    return 'ad_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

async function getData(path) {
    try {
        const snapshot = await db.ref(path).once('value');
        return snapshot.val();
    } catch (error) {
        console.error('❌ Ошибка получения данных:', error);
        return null;
    }
}

async function setData(path, data) {
    try {
        await db.ref(path).set(data);
        return true;
    } catch (error) {
        console.error('❌ Ошибка записи данных:', error);
        return false;
    }
}

async function updateData(path, updates) {
    try {
        await db.ref(path).update(updates);
        return true;
    } catch (error) {
        console.error('❌ Ошибка обновления данных:', error);
        return false;
    }
}

async function updateCounter(path, delta) {
    try {
        await db.ref(path).transaction((current) => {
            return (current || 0) + delta;
        });
        return true;
    } catch (error) {
        console.error('❌ Ошибка обновления счетчика:', error);
        return false;
    }
}

function getCurrentUser() {
    return currentUser;
}

function getUserId() {
    return userData?.id;
}

function isAdmin() {
    return appConfig.adminIds.includes(parseInt(userData?.id || 0));
}

function showNotification(message, type = 'info') {
    // Создаем уведомление если его нет
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.className = 'notification';
        document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function closeModal() {
    const modal = document.getElementById('create-ad-modal');
    if (modal) modal.remove();
}

// ========== EVENT HANDLERS ==========
function initializeEventHandlers() {
    // Фильтр категорий
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            currentFilters.category = e.target.value;
            renderAds();
        });
    }
    
    // Кнопка создания объявления
    const createAdBtn = document.getElementById('create-ad-btn');
    if (createAdBtn) {
        createAdBtn.addEventListener('click', showCreateAdModal);
    }
}

// ========== ADMIN PANEL ==========
function toggleAdminPanel() {
    const adminLink = document.getElementById('admin-link');
    if (adminLink && isAdmin()) {
        adminLink.style.display = 'flex';
    }
}

// ========== START APP ==========
document.addEventListener('DOMContentLoaded', initializeApp);
