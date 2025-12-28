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
    categories: ["Жидкости", "Одноразовые устройства", "Под-системы", "Расходники"],
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
let myAds = [];
let currentFilters = { category: 'all' };
let unsubscribeAds = null;

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

// ========== ADS SYSTEM ==========
async function loadAds() {
    const loadingSpinner = document.getElementById('loading-spinner');
    const noAds = document.getElementById('no-ads');
    const adsContainer = document.getElementById('ads-container');
    
    if (loadingSpinner) loadingSpinner.style.display = 'flex';
    if (adsContainer) adsContainer.innerHTML = '';
    
    try {
        const snapshot = await db.ref('ads').once('value');
        const adsData = snapshot.val();
        
        if (!adsData) {
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            if (noAds) noAds.style.display = 'block';
            return;
        }
        
        ads = Object.entries(adsData).map(([id, ad]) => ({
            id,
            ...ad
        })).filter(ad => !ad.blocked);
        
        applyFilters();
        
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        if (noAds) noAds.style.display = ads.length === 0 ? 'block' : 'none';
        
    } catch (error) {
        console.error('❌ Ошибка загрузки объявлений:', error);
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        showNotification('Ошибка загрузки объявлений', 'error');
    }
}

function applyFilters() {
    let filteredAds = [...ads];
    
    if (currentFilters.category !== 'all') {
        filteredAds = filteredAds.filter(ad => ad.category === currentFilters.category);
    }
    
    filteredAds.sort((a, b) => b.createdAt - a.createdAt);
    
    renderAds(filteredAds);
}

function renderAds(adsToRender) {
    const adsContainer = document.getElementById('ads-container');
    if (!adsContainer) return;
    
    if (adsToRender.length === 0) {
        adsContainer.innerHTML = `
            <div class="no-ads">
                <i class="fas fa-search"></i>
                <h3>Объявлений не найдено</h3>
                <p>Попробуйте изменить фильтры</p>
            </div>
        `;
        return;
    }
    
    adsContainer.innerHTML = adsToRender.map(ad => createAdCard(ad)).join('');
    
    // Добавляем обработчики
    adsToRender.forEach(ad => {
        const likeBtn = document.getElementById(`like-btn-${ad.id}`);
        const dislikeBtn = document.getElementById(`dislike-btn-${ad.id}`);
        
        if (likeBtn && dislikeBtn && currentUser) {
            checkUserRating(ad.id).then(rating => {
                if (rating === 'like') {
                    likeBtn.classList.add('liked');
                    dislikeBtn.classList.remove('active');
                } else if (rating === 'dislike') {
                    dislikeBtn.classList.add('active');
                    likeBtn.classList.remove('liked');
                }
            });
            
            likeBtn.addEventListener('click', () => rateAd(ad.id, 'like'));
            dislikeBtn.addEventListener('click', () => rateAd(ad.id, 'dislike'));
        }
        
        const complaintBtn = document.getElementById(`complaint-btn-${ad.id}`);
        if (complaintBtn) {
            complaintBtn.addEventListener('click', () => openComplaintModal(ad.id));
        }
        
        const contactBtn = document.getElementById(`contact-btn-${ad.id}`);
        if (contactBtn) {
            contactBtn.addEventListener('click', () => contactSeller(ad));
        }
    });
}

function createAdCard(ad) {
    const isMyAd = ad.sellerId === getUserId();
    const contactBtnDisabled = isMyAd ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : '';
    const complaintBtnDisabled = isMyAd ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : '';
    
    const firstPhoto = ad.photoUrls && ad.photoUrls.length > 0 
        ? ad.photoUrls[0] 
        : 'https://via.placeholder.com/400x200/8a2be2/ffffff?text=Vape+Market';
    
    const rating = appConfig.ratingFormula(ad.likes || 0, ad.dislikes || 0);
    
    return `
        <div class="ad-card" data-id="${ad.id}">
            <img src="${firstPhoto}" alt="${ad.title}" class="ad-image">
            <div class="ad-info">
                <div class="ad-title">${escapeHtml(ad.title)}</div>
                <div class="ad-price">${ad.price} ₽</div>
                <span class="ad-category">${ad.category}</span>
                <div class="ad-description">${escapeHtml(ad.description)}</div>
                <div class="ad-footer">
                    <div class="seller-info">
                        ${ad.sellerPhoto ? 
                            `<img src="${ad.sellerPhoto}" alt="${ad.sellerName}" class="seller-avatar">` : 
                            `<div class="seller-avatar"><i class="fas fa-user"></i></div>`
                        }
                        <div>
                            <div class="seller-name">${escapeHtml(ad.sellerName)}</div>
                            <div class="rating">
                                <i class="fas fa-star"></i>
                                ${rating.toFixed(1)}
                            </div>
                        </div>
                    </div>
                    <div class="ad-actions">
                        <button class="action-btn" id="like-btn-${ad.id}" title="Лайк">
                            <i class="fas fa-thumbs-up"></i> ${ad.likes || 0}
                        </button>
                        <button class="action-btn" id="dislike-btn-${ad.id}" title="Дизлайк">
                            <i class="fas fa-thumbs-down"></i> ${ad.dislikes || 0}
                        </button>
                        <button class="action-btn" id="complaint-btn-${ad.id}" ${complaintBtnDisabled} title="Пожаловаться">
                            <i class="fas fa-flag"></i>
                        </button>
                        <button class="action-btn" id="contact-btn-${ad.id}" ${contactBtnDisabled} title="Написать продавцу">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ========== RATINGS ==========
async function checkUserRating(adId) {
    try {
        const snapshot = await db.ref(`ratings/${adId}/${getUserId()}`).once('value');
        return snapshot.val();
    } catch (error) {
        console.error('❌ Ошибка проверки оценки:', error);
        return null;
    }
}

async function rateAd(adId, rating) {
    if (!currentUser) {
        showNotification('Авторизуйтесь для оценки', 'warning');
        return;
    }
    
    const ad = ads.find(a => a.id === adId);
    if (!ad) {
        showNotification('Объявление не найдено', 'error');
        return;
    }
    
    if (ad.sellerId === getUserId()) {
        showNotification('Нельзя оценивать свои объявления', 'warning');
        return;
    }
    
    const currentRating = await checkUserRating(adId);
    
    if (currentRating === rating) {
        showNotification('Вы уже поставили эту оценку', 'info');
        return;
    }
    
    try {
        await setData(`ratings/${adId}/${getUserId()}`, rating);
        
        const updates = {};
        
        if (currentRating === 'like') {
            updates['ads/' + adId + '/likes'] = (ad.likes || 1) - 1;
            updates['ads/' + adId + '/dislikes'] = (ad.dislikes || 0) + 1;
            await updateCounter(`users/${ad.sellerId}/likesCount`, -1);
            await updateCounter(`users/${ad.sellerId}/dislikesCount`, 1);
            
        } else if (currentRating === 'dislike') {
            updates['ads/' + adId + '/dislikes'] = (ad.dislikes || 1) - 1;
            updates['ads/' + adId + '/likes'] = (ad.likes || 0) + 1;
            await updateCounter(`users/${ad.sellerId}/dislikesCount`, -1);
            await updateCounter(`users/${ad.sellerId}/likesCount`, 1);
            
        } else {
            if (rating === 'like') {
                updates['ads/' + adId + '/likes'] = (ad.likes || 0) + 1;
                await updateCounter(`users/${ad.sellerId}/likesCount`, 1);
            } else {
                updates['ads/' + adId + '/dislikes'] = (ad.dislikes || 0) + 1;
                await updateCounter(`users/${ad.sellerId}/dislikesCount`, 1);
            }
        }
        
        await updateData('/', updates);
        showNotification('Оценка сохранена', 'success');
        
    } catch (error) {
        console.error('❌ Ошибка оценки:', error);
        showNotification('Ошибка сохранения оценки', 'error');
    }
}

// ========== FIREBASE HELPERS ==========
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

// ========== UTILITIES ==========
function getCurrentUser() {
    return currentUser;
}

function getUserId() {
    return userData?.id;
}

function isAdmin() {
    return appConfig.adminIds.includes(parseInt(userData?.id || 0));
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// ========== INITIALIZATION ==========
async function initializeApp() {
    try {
        console.log('🚀 Инициализация приложения...');
        
        if (!initializeFirebase()) {
            throw new Error('Не удалось инициализировать Firebase');
        }
        
        tg.ready();
        
        if (!(await initializeAuth())) {
            throw new Error('Ошибка авторизации');
        }
        
        initializeNavigation();
        initializeEventHandlers();
        
        await loadAds();
        
        console.log('✅ Приложение инициализировано');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации приложения:', error);
        showNotification('Ошибка загрузки приложения', 'error');
    }
}

function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            const pageName = link.getAttribute('data-page');
            
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            pages.forEach(page => {
                page.classList.remove('active');
                if (page.id === `${pageName}-page`) {
                    page.classList.add('active');
                    
                    switch (pageName) {
                        case 'feed':
                            loadAds();
                            break;
                        case 'profile':
                            loadProfile();
                            break;
                    }
                }
            });
        });
    });
}

function initializeEventHandlers() {
    // Фильтры
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            currentFilters.category = e.target.value;
            applyFilters();
        });
    }
    
    // Кнопка создания объявления
    const createAdBtn = document.getElementById('create-ad-btn');
    if (createAdBtn) {
        createAdBtn.addEventListener('click', () => {
            showSimpleCreateForm();
        });
    }
}

// ========== SIMPLE CREATE FORM ==========
function showSimpleCreateForm() {
    const formHTML = `
        <div class="modal active" id="simple-create-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Новое объявление</h2>
                    <button class="close-modal" onclick="document.getElementById('simple-create-modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="simple-ad-form">
                        <div class="form-group">
                            <label>Название товара *</label>
                            <input type="text" id="simple-title" required>
                        </div>
                        <div class="form-group">
                            <label>Категория *</label>
                            <select id="simple-category" required>
                                <option value="">Выберите</option>
                                ${appConfig.categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Цена (₽) *</label>
                            <input type="number" id="simple-price" required min="1">
                        </div>
                        <div class="form-group">
                            <label>Описание *</label>
                            <textarea id="simple-description" rows="3" required></textarea>
                        </div>
                        <div class="form-group">
                            <label>Контакт (Telegram)</label>
                            <input type="text" id="simple-contact" value="@${currentUser?.username || ''}">
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-secondary" onclick="document.getElementById('simple-create-modal').remove()">Отмена</button>
                            <button type="submit" class="btn-primary">Опубликовать</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    const container = document.createElement('div');
    container.innerHTML = formHTML;
    document.body.appendChild(container.firstElementChild);
    
    const form = document.getElementById('simple-ad-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const adData = {
            title: document.getElementById('simple-title').value,
            category: document.getElementById('simple-category').value,
            price: parseInt(document.getElementById('simple-price').value),
            description: document.getElementById('simple-description').value,
            contact: document.getElementById('simple-contact').value || `@${currentUser?.username}`
        };
        
        await createSimpleAd(adData);
        document.getElementById('simple-create-modal').remove();
    });
}

async function createSimpleAd(adData) {
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
        photoUrls: [],
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
        
        currentUser.adsCount = (currentUser.adsCount || 0) + 1;
        
        showNotification('Объявление создано!', 'success');
        await loadAds();
        
        return true;
    } catch (error) {
        console.error('❌ Ошибка создания объявления:', error);
        showNotification('Ошибка создания', 'error');
        return false;
    }
}

// ========== PROFILE ==========
async function loadProfile() {
    const profileContainer = document.getElementById('profile-info');
    if (!profileContainer || !currentUser) return;
    
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
            </div>
            <div class="profile-details">
                <h2>${escapeHtml(userData.firstName)} ${userData.lastName ? escapeHtml(userData.lastName) : ''}</h2>
                <div class="profile-username">@${userData.username}</div>
                <div class="profile-rating">
                    <i class="fas fa-star"></i>
                    <span>Рейтинг: ${rating.toFixed(1)}</span>
                </div>
            </div>
        </div>
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-value">${userData.adsCount || 0}</div>
                <div class="stat-label">Объявлений</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${userData.likesCount || 0}</div>
                <div class="stat-label">Лайков</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${userData.dislikesCount || 0}</div>
                <div class="stat-label">Дизлайков</div>
            </div>
        </div>
    `;
}

// ========== CONTACT SELLER ==========
function contactSeller(ad) {
    if (ad.sellerId === getUserId()) {
        showNotification('Это ваше объявление', 'info');
        return;
    }
    
    const message = `Здравствуйте! Я пишу по поводу вашего объявления "${ad.title}" на Vape Market`;
    const username = ad.sellerUsername.startsWith('@') ? ad.sellerUsername : `@${ad.sellerUsername}`;
    
    const url = `https://t.me/${username.replace('@', '')}?text=${encodeURIComponent(message)}`;
    
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.openTelegramLink(url);
    } else {
        window.open(url, '_blank');
    }
}

// ========== ADMIN PANEL ==========
function toggleAdminPanel() {
    const adminLink = document.getElementById('admin-link');
    if (adminLink && isAdmin()) {
        adminLink.style.display = 'flex';
        
        adminLink.addEventListener('click', (e) => {
            e.preventDefault();
            showAdminPanel();
        });
    }
}

function showAdminPanel() {
    const pages = document.querySelectorAll('.page');
    const navLinks = document.querySelectorAll('.nav-link');
    
    pages.forEach(page => page.classList.remove('active'));
    navLinks.forEach(link => link.classList.remove('active'));
    
    document.getElementById('admin-page').classList.add('active');
    document.querySelector('[data-page="admin"]').classList.add('active');
    
    loadAdminContent();
}

async function loadAdminContent() {
    const container = document.getElementById('admin-page');
    if (!container) return;
    
    try {
        const [adsData, usersData] = await Promise.all([
            getData('ads'),
            getData('users')
        ]);
        
        const unverifiedAds = Object.entries(adsData || {})
            .filter(([id, ad]) => !ad.verified && !ad.blocked)
            .map(([id, ad]) => ({ id, ...ad }));
        
        const users = Object.entries(usersData || {})
            .map(([id, user]) => ({ id, ...user }));
        
        container.innerHTML = `
            <div class="page-header">
                <h1><i class="fas fa-shield-alt"></i> Админ-панель</h1>
            </div>
            
            <div class="admin-stats">
                <div class="stat-card">
                    <h3><i class="fas fa-box"></i> На модерации</h3>
                    <div class="stat-value">${unverifiedAds.length}</div>
                </div>
                <div class="stat-card">
                    <h3><i class="fas fa-users"></i> Пользователей</h3>
                    <div class="stat-value">${users.length}</div>
                </div>
            </div>
            
            ${unverifiedAds.length > 0 ? `
                <div class="moderation-section">
                    <h3>Объявления на проверку</h3>
                    <div class="moderation-list">
                        ${unverifiedAds.slice(0, 5).map(ad => `
                            <div class="moderation-item">
                                <div class="ad-preview">
                                    <strong>${escapeHtml(ad.title)}</strong>
                                    <span>${ad.price} ₽</span>
                                    <span>${ad.category}</span>
                                </div>
                                <div class="moderation-actions">
                                    <button class="btn-success" onclick="verifyAd('${ad.id}')">
                                        <i class="fas fa-check"></i> Одобрить
                                    </button>
                                    <button class="btn-danger" onclick="rejectAd('${ad.id}')">
                                        <i class="fas fa-ban"></i> Заблокировать
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <div class="users-section">
                <h3>Недавние пользователи</h3>
                <div class="users-list">
                    ${users.slice(0, 5).map(user => `
                        <div class="user-item">
                            <div class="user-info">
                                <strong>${escapeHtml(user.firstName)}</strong>
                                <span>@${user.username}</span>
                                <span>Объявлений: ${user.adsCount || 0}</span>
                            </div>
                            <div class="user-actions">
                                <button class="btn-${user.blocked ? 'success' : 'danger'}" 
                                        onclick="toggleUserBlock('${user.id}', ${!user.blocked})">
                                    ${user.blocked ? 'Разблокировать' : 'Заблокировать'}
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('❌ Ошибка загрузки админ-панели:', error);
        container.innerHTML = '<p>Ошибка загрузки данных</p>';
    }
}

async function verifyAd(adId) {
    if (!isAdmin()) return;
    
    try {
        await updateData(`ads/${adId}`, {
            verified: true,
            verifiedAt: Date.now()
        });
        
        showNotification('Объявление одобрено', 'success');
        loadAdminContent();
        
    } catch (error) {
        console.error('❌ Ошибка верификации:', error);
        showNotification('Ошибка', 'error');
    }
}

async function rejectAd(adId) {
    if (!isAdmin()) return;
    
    try {
        await updateData(`ads/${adId}`, {
            blocked: true,
            blockedAt: Date.now(),
            blockReason: 'Заблокировано администратором'
        });
        
        showNotification('Объявление заблокировано', 'success');
        loadAdminContent();
        
    } catch (error) {
        console.error('❌ Ошибка блокировки:', error);
        showNotification('Ошибка', 'error');
    }
}

async function toggleUserBlock(userId, block) {
    if (!isAdmin()) return;
    
    try {
        await updateData(`users/${userId}`, {
            blocked: block,
            blockedAt: block ? Date.now() : null
        });
        
        showNotification(`Пользователь ${block ? 'заблокирован' : 'разблокирован'}`, 'success');
        loadAdminContent();
        
    } catch (error) {
        console.error('❌ Ошибка блокировки пользователя:', error);
        showNotification('Ошибка', 'error');
    }
}

// ========== START APP ==========
document.addEventListener('DOMContentLoaded', initializeApp);
