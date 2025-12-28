// ============================================
// ОБЪЕДИНЕННЫЙ APP.JS ДЛЯ VAPE MARKET
// Объединяет: auth.js, ads.js, admin.js, complaints.js, faq.js
// ============================================

// Инициализация приложения
document.addEventListener('DOMContentLoaded', initializeApp);

// Глобальные переменные
let currentUser = null;
let allAds = [];
let currentScreen = 'main';

// ============================================
// ФУНКЦИИ ИЗ AUTH.JS
// ============================================

// Инициализация Firebase
function initializeFirebase() {
    try {
        console.log('🚀 Инициализация Firebase...');
        
        // Firebase уже должен быть загружен через CDN в index.html
        // Проверяем наличие firebase
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase не загружен. Проверьте CDN в index.html');
        }
        
        // Инициализируем Firebase
        firebase.initializeApp(firebaseConfig);
        console.log('✅ Firebase инициализирован');
        
        return {
            auth: firebase.auth(),
            database: firebase.database()
        };
    } catch (error) {
        console.error('❌ Ошибка инициализации Firebase:', error);
        throw error;
    }
}

// Инициализация Telegram Web App
function initializeTelegram() {
    try {
        console.log('🤖 Инициализация Telegram Web App...');
        
        if (typeof Telegram === 'undefined' || !Telegram.WebApp) {
            console.warn('⚠️ Telegram Web App SDK не загружен');
            return null;
        }
        
        const tg = Telegram.WebApp;
        
        // Настраиваем интерфейс
        tg.expand();
        tg.setHeaderColor('#6B21A8');
        tg.setBackgroundColor('#6B21A8');
        tg.enableClosingConfirmation();
        
        console.log('✅ Telegram Web App инициализирован');
        console.log('👤 Пользователь Telegram:', tg.initDataUnsafe.user);
        
        return tg;
    } catch (error) {
        console.error('❌ Ошибка инициализации Telegram:', error);
        return null;
    }
}

// Получение или создание пользователя
async function getOrCreateUser(tgUser, firebase) {
    try {
        const { database } = firebase;
        const userId = tgUser.id.toString();
        
        // Проверяем, существует ли пользователь
        const userRef = database.ref(`users/${userId}`);
        const snapshot = await userRef.once('value');
        
        if (snapshot.exists()) {
            // Пользователь существует - обновляем lastSeen
            const userData = snapshot.val();
            userRef.update({
                lastSeen: Date.now()
            });
            
            console.log('👤 Пользователь найден:', userData.username);
            return { ...userData, id: userId };
        } else {
            // Создаем нового пользователя
            const newUser = {
                id: userId,
                firstName: tgUser.first_name || '',
                lastName: tgUser.last_name || '',
                username: tgUser.username ? `@${tgUser.username}` : '',
                photoUrl: tgUser.photo_url || '',
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
            
            await userRef.set(newUser);
            console.log('👤 Новый пользователь создан:', newUser.username);
            return newUser;
        }
    } catch (error) {
        console.error('❌ Ошибка при работе с пользователем:', error);
        throw error;
    }
}

// Авторизация пользователя
async function authenticateUser() {
    try {
        // 1. Инициализируем Firebase
        const firebase = initializeFirebase();
        
        // 2. Инициализируем Telegram
        const tg = initializeTelegram();
        
        if (!tg || !tg.initDataUnsafe || !tg.initDataUnsafe.user) {
            throw new Error('Данные Telegram не доступны');
        }
        
        const tgUser = tg.initDataUnsafe.user;
        console.log('🔐 Авторизация пользователя:', tgUser.id);
        
        // 3. Получаем или создаем пользователя
        const user = await getOrCreateUser(tgUser, firebase);
        
        // 4. Проверяем, не заблокирован ли пользователь
        if (user.blocked) {
            showBlockedScreen();
            return null;
        }
        
        // 5. Сохраняем пользователя
        currentUser = user;
        
        // 6. Инициализируем анонимную авторизацию Firebase
        await firebase.auth().signInAnonymously();
        
        console.log('✅ Пользователь авторизован:', user.username);
        return user;
    } catch (error) {
        console.error('❌ Ошибка авторизации:', error);
        showErrorScreen('Ошибка авторизации. Пожалуйста, перезапустите приложение.');
        return null;
    }
}

// ============================================
// ФУНКЦИИ ИЗ ADS.JS
// ============================================

// Загрузка всех объявлений
async function loadAllAds() {
    try {
        console.log('📦 Загрузка объявлений...');
        showLoading(true);
        
        const db = firebase.database();
        const adsRef = db.ref('ads');
        
        const snapshot = await adsRef.orderByChild('createdAt').once('value');
        
        if (!snapshot.exists()) {
            console.log('📭 Нет объявлений');
            allAds = [];
            renderAds([]);
            return [];
        }
        
        const ads = [];
        snapshot.forEach((childSnapshot) => {
            const ad = childSnapshot.val();
            if (!ad.blocked) { // Не показываем заблокированные
                ads.push(ad);
            }
        });
        
        // Сортируем по дате (новые сверху)
        ads.sort((a, b) => b.createdAt - a.createdAt);
        
        allAds = ads;
        console.log(`✅ Загружено ${ads.length} объявлений`);
        renderAds(ads);
        
        return ads;
    } catch (error) {
        console.error('❌ Ошибка загрузки объявлений:', error);
        showError('Не удалось загрузить объявления');
        return [];
    } finally {
        showLoading(false);
    }
}

// Фильтрация объявлений по категории
function filterAdsByCategory(category) {
    if (category === 'all') {
        renderAds(allAds);
    } else {
        const filtered = allAds.filter(ad => ad.category === category);
        renderAds(filtered);
    }
}

// Создание нового объявления
async function createNewAd(adData) {
    try {
        console.log('➕ Создание нового объявления...');
        
        if (!currentUser) {
            throw new Error('Пользователь не авторизован');
        }
        
        // Валидация данных
        if (!adData.title || !adData.category || !adData.price || !adData.description) {
            throw new Error('Заполните все обязательные поля');
        }
        
        if (adData.price <= 0) {
            throw new Error('Цена должна быть больше 0');
        }
        
        const db = firebase.database();
        const newAdRef = db.ref('ads').push();
        
        const newAd = {
            id: newAdRef.key,
            sellerId: currentUser.id,
            sellerName: `${currentUser.firstName} ${currentUser.lastName}`.trim(),
            sellerUsername: currentUser.username,
            title: adData.title,
            category: adData.category,
            price: parseInt(adData.price),
            description: adData.description,
            contact: adData.contact || currentUser.username,
            photoUrls: adData.photoUrls || [],
            likes: 0,
            dislikes: 0,
            complaints: 0,
            verified: false,
            blocked: false,
            createdAt: Date.now()
        };
        
        // Сохраняем объявление
        await newAdRef.set(newAd);
        
        // Обновляем счетчик объявлений пользователя
        await db.ref(`users/${currentUser.id}`).update({
            adsCount: (currentUser.adsCount || 0) + 1
        });
        
        console.log('✅ Объявление создано:', newAd.id);
        showSuccess('Объявление успешно создано!');
        
        // Обновляем список объявлений
        await loadAllAds();
        
        return newAd;
    } catch (error) {
        console.error('❌ Ошибка создания объявления:', error);
        showError(error.message || 'Не удалось создать объявление');
        throw error;
    }
}

// Удаление объявления
async function deleteAd(adId) {
    try {
        if (!confirm('Вы уверены, что хотите удалить это объявление?')) {
            return false;
        }
        
        const db = firebase.database();
        const adRef = db.ref(`ads/${adId}`);
        
        // Проверяем права
        const snapshot = await adRef.once('value');
        const ad = snapshot.val();
        
        if (!ad) {
            throw new Error('Объявление не найдено');
        }
        
        if (ad.sellerId !== currentUser.id && !isAdmin()) {
            throw new Error('У вас нет прав для удаления этого объявления');
        }
        
        // Удаляем объявление
        await adRef.remove();
        
        // Удаляем оценки
        await db.ref(`ratings/${adId}`).remove();
        
        // Обновляем счетчик пользователя
        if (ad.sellerId === currentUser.id) {
            await db.ref(`users/${currentUser.id}`).update({
                adsCount: Math.max(0, (currentUser.adsCount || 0) - 1)
            });
        }
        
        console.log('🗑️ Объявление удалено:', adId);
        showSuccess('Объявление удалено');
        
        // Обновляем список
        if (currentScreen === 'myAds') {
            loadMyAds();
        } else {
            loadAllAds();
        }
        
        return true;
    } catch (error) {
        console.error('❌ Ошибка удаления объявления:', error);
        showError(error.message || 'Не удалось удалить объявление');
        return false;
    }
}

// Лайк/дизлайк объявления
async function rateAd(adId, ratingType) {
    try {
        if (!currentUser) {
            throw new Error('Войдите в систему');
        }
        
        const db = firebase.database();
        const adRef = db.ref(`ads/${adId}`);
        const ratingRef = db.ref(`ratings/${adId}/${currentUser.id}`);
        
        // Проверяем, существует ли объявление
        const adSnapshot = await adRef.once('value');
        const ad = adSnapshot.val();
        
        if (!ad) {
            throw new Error('Объявление не найдено');
        }
        
        // Нельзя оценивать свои объявления
        if (ad.sellerId === currentUser.id) {
            throw new Error('Нельзя оценивать свои объявления');
        }
        
        // Проверяем, оценивал ли уже пользователь
        const ratingSnapshot = await ratingRef.once('value');
        const previousRating = ratingSnapshot.val();
        
        // Обновляем счетчики в объявлении
        let updates = {};
        const currentLikes = ad.likes || 0;
        const currentDislikes = ad.dislikes || 0;
        
        if (previousRating === ratingType) {
            // Отмена оценки
            if (ratingType === 'like') {
                updates.likes = Math.max(0, currentLikes - 1);
            } else {
                updates.dislikes = Math.max(0, currentDislikes - 1);
            }
            await ratingRef.remove();
        } else {
            // Новая или измененная оценка
            if (ratingType === 'like') {
                updates.likes = currentLikes + 1;
                updates.dislikes = previousRating === 'dislike' ? Math.max(0, currentDislikes - 1) : currentDislikes;
            } else {
                updates.dislikes = currentDislikes + 1;
                updates.likes = previousRating === 'like' ? Math.max(0, currentLikes - 1) : currentLikes;
            }
            await ratingRef.set(ratingType);
        }
        
        // Обновляем объявление
        await adRef.update(updates);
        
        // Обновляем статистику продавца
        await updateSellerRating(ad.sellerId);
        
        console.log(`✅ Оценка обновлена: ${adId} - ${ratingType}`);
        
        // Обновляем отображение
        if (currentScreen === 'main') {
            loadAllAds();
        }
        
        return true;
    } catch (error) {
        console.error('❌ Ошибка оценки:', error);
        showError(error.message || 'Не удалось оценить объявление');
        return false;
    }
}

// Обновление рейтинга продавца
async function updateSellerRating(sellerId) {
    try {
        const db = firebase.database();
        
        // Получаем все объявления продавца
        const adsRef = db.ref('ads');
        const snapshot = await adsRef.orderByChild('sellerId').equalTo(sellerId).once('value');
        
        if (!snapshot.exists()) {
            return;
        }
        
        let totalLikes = 0;
        let totalDislikes = 0;
        
        snapshot.forEach((childSnapshot) => {
            const ad = childSnapshot.val();
            if (!ad.blocked) {
                totalLikes += ad.likes || 0;
                totalDislikes += ad.dislikes || 0;
            }
        });
        
        // Рассчитываем рейтинг
        const rating = appConfig.ratingFormula(totalLikes, totalDislikes);
        
        // Обновляем пользователя
        await db.ref(`users/${sellerId}`).update({
            rating: parseFloat(rating.toFixed(1)),
            likesCount: totalLikes,
            dislikesCount: totalDislikes
        });
        
        console.log(`📊 Рейтинг продавца ${sellerId} обновлен: ${rating}`);
    } catch (error) {
        console.error('❌ Ошибка обновления рейтинга:', error);
    }
}

// ============================================
// ФУНКЦИИ ИЗ ADMIN.JS
// ============================================

// Проверка, является ли пользователь админом
function isAdmin() {
    if (!currentUser) return false;
    return appConfig.adminIds.includes(parseInt(currentUser.id));
}

// Загрузка админ-панели
function loadAdminPanel() {
    if (!isAdmin()) {
        showError('Доступ запрещен');
        showMainScreen();
        return;
    }
    
    currentScreen = 'admin';
    renderAdminPanel();
    loadAdminStats();
}

// Загрузка статистики для админа
async function loadAdminStats() {
    try {
        const db = firebase.database();
        
        // Загружаем все данные
        const [usersSnapshot, adsSnapshot, complaintsSnapshot] = await Promise.all([
            db.ref('users').once('value'),
            db.ref('ads').once('value'),
            db.ref('complaints').once('value')
        ]);
        
        const stats = {
            totalUsers: usersSnapshot.exists() ? usersSnapshot.numChildren() : 0,
            totalAds: adsSnapshot.exists() ? adsSnapshot.numChildren() : 0,
            totalComplaints: complaintsSnapshot.exists() ? complaintsSnapshot.numChildren() : 0,
            activeAds: 0,
            blockedUsers: 0,
            verifiedUsers: 0
        };
        
        // Считаем активные объявления
        if (adsSnapshot.exists()) {
            adsSnapshot.forEach((child) => {
                const ad = child.val();
                if (!ad.blocked) {
                    stats.activeAds++;
                }
            });
        }
        
        // Считаем заблокированных пользователей
        if (usersSnapshot.exists()) {
            usersSnapshot.forEach((child) => {
                const user = child.val();
                if (user.blocked) {
                    stats.blockedUsers++;
                }
                if (user.verified) {
                    stats.verifiedUsers++;
                }
            });
        }
        
        renderAdminStats(stats);
    } catch (error) {
        console.error('❌ Ошибка загрузки статистики:', error);
    }
}

// Модерация объявления
async function moderateAd(adId, action) {
    try {
        if (!isAdmin()) {
            throw new Error('Доступ запрещен');
        }
        
        const db = firebase.database();
        const adRef = db.ref(`ads/${adId}`);
        
        const updates = {};
        
        switch (action) {
            case 'verify':
                updates.verified = true;
                break;
            case 'block':
                updates.blocked = true;
                break;
            case 'unblock':
                updates.blocked = false;
                break;
            default:
                throw new Error('Неизвестное действие');
        }
        
        await adRef.update(updates);
        
        // Записываем в историю модерации
        await db.ref(`moderationHistory/${adId}`).push().set({
            adminId: currentUser.id,
            adminName: currentUser.username,
            action: action,
            timestamp: Date.now()
        });
        
        console.log(`✅ Объявление ${adId}: ${action}`);
        showSuccess(`Объявление ${action === 'verify' ? 'верифицировано' : action === 'block' ? 'заблокировано' : 'разблокировано'}`);
        
        // Обновляем список
        loadAdminAds();
        
        return true;
    } catch (error) {
        console.error('❌ Ошибка модерации:', error);
        showError(error.message);
        return false;
    }
}

// Управление пользователями
async function moderateUser(userId, action) {
    try {
        if (!isAdmin()) {
            throw new Error('Доступ запрещен');
        }
        
        const db = firebase.database();
        const userRef = db.ref(`users/${userId}`);
        
        const updates = {};
        
        switch (action) {
            case 'block':
                updates.blocked = true;
                break;
            case 'unblock':
                updates.blocked = false;
                break;
            case 'verify':
                updates.verified = true;
                break;
            default:
                throw new Error('Неизвестное действие');
        }
        
        await userRef.update(updates);
        
        console.log(`✅ Пользователь ${userId}: ${action}`);
        showSuccess(`Пользователь ${action === 'block' ? 'заблокирован' : action === 'unblock' ? 'разблокирован' : 'верифицирован'}`);
        
        // Обновляем статистику
        loadAdminStats();
        
        return true;
    } catch (error) {
        console.error('❌ Ошибка модерации пользователя:', error);
        showError(error.message);
        return false;
    }
}

// ============================================
// ФУНКЦИИ ИЗ COMPLAINTS.JS
// ============================================

// Создание жалобы
async function createComplaint(adId, complaintType, description) {
    try {
        if (!currentUser) {
            throw new Error('Войдите в систему');
        }
        
        if (!adId || !complaintType) {
            throw new Error('Укажите тип жалобы');
        }
        
        const db = firebase.database();
        const complaintRef = db.ref('complaints').push();
        
        const complaint = {
            id: complaintRef.key,
            adId: adId,
            userId: currentUser.id,
            userUsername: currentUser.username,
            complaintType: complaintType,
            description: description || '',
            status: 'pending',
            createdAt: Date.now()
        };
        
        await complaintRef.set(complaint);
        
        // Увеличиваем счетчик жалоб в объявлении
        const adRef = db.ref(`ads/${adId}/complaints`);
        const adSnapshot = await adRef.once('value');
        const currentComplaints = adSnapshot.val() || 0;
        await adRef.set(currentComplaints + 1);
        
        console.log('✅ Жалоба создана:', complaint.id);
        showSuccess('Жалоба отправлена на рассмотрение');
        
        return complaint;
    } catch (error) {
        console.error('❌ Ошибка создания жалобы:', error);
        showError('Не удалось отправить жалобу');
        throw error;
    }
}

// Получение жалоб для админа
async function loadComplaints() {
    try {
        if (!isAdmin()) {
            return [];
        }
        
        const db = firebase.database();
        const snapshot = await db.ref('complaints').orderByChild('status').equalTo('pending').once('value');
        
        if (!snapshot.exists()) {
            return [];
        }
        
        const complaints = [];
        snapshot.forEach((childSnapshot) => {
            complaints.push(childSnapshot.val());
        });
        
        return complaints;
    } catch (error) {
        console.error('❌ Ошибка загрузки жалоб:', error);
        return [];
    }
}

// Обработка жалобы
async function processComplaint(complaintId, action) {
    try {
        if (!isAdmin()) {
            throw new Error('Доступ запрещен');
        }
        
        const db = firebase.database();
        const complaintRef = db.ref(`complaints/${complaintId}`);
        
        const updates = {
            status: action,
            processedBy: currentUser.id,
            processedAt: Date.now()
        };
        
        await complaintRef.update(updates);
        
        console.log(`✅ Жалоба ${complaintId}: ${action}`);
        showSuccess(`Жалоба ${action === 'approved' ? 'одобрена' : 'отклонена'}`);
        
        return true;
    } catch (error) {
        console.error('❌ Ошибка обработки жалобы:', error);
        showError(error.message);
        return false;
    }
}

// ============================================
// ФУНКЦИИ ИЗ FAQ.JS
// ============================================

// Загрузка FAQ
function loadFAQ() {
    currentScreen = 'faq';
    renderFAQ();
    loadServerStats();
}

// Загрузка статистики сервера
async function loadServerStats() {
    try {
        const db = firebase.database();
        
        const [usersSnapshot, adsSnapshot] = await Promise.all([
            db.ref('users').once('value'),
            db.ref('ads').once('value')
        ]);
        
        const stats = {
            totalUsers: usersSnapshot.exists() ? usersSnapshot.numChildren() : 0,
            totalAds: adsSnapshot.exists() ? adsSnapshot.numChildren() : 0,
            onlineUsers: 0
        };
        
        // Считаем онлайн пользователей (заходили за последние 5 минут)
        if (usersSnapshot.exists()) {
            const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
            
            usersSnapshot.forEach((child) => {
                const user = child.val();
                if (user.lastSeen && user.lastSeen > fiveMinutesAgo) {
                    stats.onlineUsers++;
                }
            });
        }
        
        renderServerStats(stats);
    } catch (error) {
        console.error('❌ Ошибка загрузки статистики сервера:', error);
    }
}

// ============================================
// ОСНОВНЫЕ ФУНКЦИИ РЕНДЕРИНГА
// ============================================

// Инициализация приложения
async function initializeApp() {
    try {
        console.log('🚀 Инициализация приложения...');
        
        // Инициализируем UI
        initializeUI();
        
        // Авторизуем пользователя
        const user = await authenticateUser();
        
        if (!user) {
            throw new Error('Не удалось авторизовать пользователя');
        }
        
        // Загружаем объявления
        await loadAllAds();
        
        console.log('✅ Приложение успешно инициализировано');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        showErrorScreen('Ошибка загрузки приложения. Пожалуйста, попробуйте позже.');
    }
}

// Инициализация UI
function initializeUI() {
    // Настраиваем кнопки навигации
    document.getElementById('navMain').addEventListener('click', showMainScreen);
    document.getElementById('navProfile').addEventListener('click', showProfileScreen);
    document.getElementById('navFAQ').addEventListener('click', loadFAQ);
    
    // Кнопка создания объявления
    document.getElementById('createAdBtn').addEventListener('click', showCreateAdForm);
    
    // Кнопки фильтрации
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const category = e.target.dataset.category;
            filterAdsByCategory(category);
        });
    });
    
    // Кнопка админ-панели (если админ)
    if (currentUser && isAdmin()) {
        const adminBtn = document.createElement('button');
        adminBtn.className = 'admin-btn';
        adminBtn.innerHTML = '⚙️ Админ';
        adminBtn.addEventListener('click', loadAdminPanel);
        document.querySelector('.nav-buttons').appendChild(adminBtn);
    }
}

// Показ главного экрана
function showMainScreen() {
    currentScreen = 'main';
    document.getElementById('mainScreen').style.display = 'block';
    document.getElementById('profileScreen').style.display = 'none';
    document.getElementById('faqScreen').style.display = 'none';
    document.getElementById('adminScreen').style.display = 'none';
    
    loadAllAds();
}

// Показ профиля
function showProfileScreen() {
    currentScreen = 'profile';
    document.getElementById('mainScreen').style.display = 'none';
    document.getElementById('profileScreen').style.display = 'block';
    document.getElementById('faqScreen').style.display = 'none';
    document.getElementById('adminScreen').style.display = 'none';
    
    renderProfile();
}

// Рендеринг профиля
function renderProfile() {
    if (!currentUser) return;
    
    const profileContent = document.getElementById('profileContent');
    profileContent.innerHTML = `
        <div class="profile-header">
            <div class="avatar">${currentUser.firstName?.[0] || 'U'}</div>
            <div class="profile-info">
                <h3>${currentUser.firstName || ''} ${currentUser.lastName || ''}</h3>
                <p class="username">${currentUser.username || 'Без username'}</p>
                <div class="rating">
                    <span class="star">⭐</span>
                    <span>${currentUser.rating?.toFixed(1) || '0.0'}/5.0</span>
                </div>
            </div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-item">
                <span class="stat-number">${currentUser.adsCount || 0}</span>
                <span class="stat-label">Объявления</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${currentUser.likesCount || 0}</span>
                <span class="stat-label">Лайки</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${currentUser.dislikesCount || 0}</span>
                <span class="stat-label">Дизлайки</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${currentUser.rating?.toFixed(1) || '0.0'}</span>
                <span class="stat-label">Рейтинг</span>
            </div>
        </div>
        
        <div class="profile-actions">
            <button class="btn btn-primary" onclick="loadMyAds()">
                📦 Мои объявления
            </button>
            <button class="btn btn-secondary" onclick="showMainScreen()">
                ↩️ На главную
            </button>
        </div>
        
        <div id="myAdsContainer" style="display: none; margin-top: 20px;">
            <!-- Здесь будут мои объявления -->
        </div>
    `;
}

// Рендеринг объявлений
function renderAds(ads) {
    const adsContainer = document.getElementById('adsContainer');
    
    if (!ads || ads.length === 0) {
        adsContainer.innerHTML = `
            <div class="empty-state">
                <p>📭 Объявлений пока нет</p>
                <button class="btn btn-primary" onclick="showCreateAdForm()">
                    Создать первое объявление
                </button>
            </div>
        `;
        return;
    }
    
    adsContainer.innerHTML = ads.map(ad => `
        <div class="ad-card" data-id="${ad.id}">
            <div class="ad-header">
                <span class="ad-category">${appConfig.categoryShort[ad.category] || ad.category}</span>
                ${ad.verified ? '<span class="ad-verified">✓</span>' : ''}
                <span class="ad-price">${ad.price} ₽</span>
            </div>
            
            <h3 class="ad-title">${ad.title}</h3>
            
            ${ad.photoUrls && ad.photoUrls.length > 0 ? `
                <div class="ad-photos">
                    <img src="${ad.photoUrls[0]}" alt="${ad.title}" loading="lazy">
                </div>
            ` : ''}
            
            <p class="ad-description">${ad.description}</p>
            
            <div class="ad-seller">
                <span>👤 ${ad.sellerName}</span>
                <span class="seller-rating">⭐ ${ad.sellerRating || '0.0'}</span>
            </div>
            
            <div class="ad-actions">
                <div class="rating-buttons">
                    <button class="btn-like" onclick="rateAd('${ad.id}', 'like')">
                        👍 ${ad.likes || 0}
                    </button>
                    <button class="btn-dislike" onclick="rateAd('${ad.id}', 'dislike')">
                        👎 ${ad.dislikes || 0}
                    </button>
                </div>
                
                ${ad.sellerId !== currentUser?.id ? `
                    <button class="btn-contact" onclick="contactSeller('${ad.sellerUsername}', '${ad.title}')">
                        ✉️ Написать
                    </button>
                ` : ''}
                
                ${currentUser && isAdmin() ? `
                    <div class="admin-actions">
                        <button class="btn-small" onclick="moderateAd('${ad.id}', '${ad.verified ? 'unverify' : 'verify'}')">
                            ${ad.verified ? '❌ Снять верификацию' : '✅ Верифицировать'}
                        </button>
                        <button class="btn-small btn-danger" onclick="moderateAd('${ad.id}', '${ad.blocked ? 'unblock' : 'block'}')">
                            ${ad.blocked ? '🔓 Разблокировать' : '🚫 Заблокировать'}
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

// Показать загрузку
function showLoading(show) {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
    }
}

// Показать ошибку
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #ef4444;
        color: white;
        padding: 10px 20px;
        border-radius: 8px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
}

// Показать успех
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #10b981;
        color: white;
        padding: 10px 20px;
        border-radius: 8px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

// Контакт с продавцом
function contactSeller(username, productTitle) {
    if (!username || username === '@') {
        showError('У продавца не указан username');
        return;
    }
    
    const message = `Здравствуйте! Интересует товар: "${productTitle}"`;
    const url = `https://t.me/${username.replace('@', '')}?text=${encodeURIComponent(message)}`;
    
    if (window.Telegram && Telegram.WebApp) {
        Telegram.WebApp.openTelegramLink(url);
    } else {
        window.open(url, '_blank');
    }
}

// Показать экран ошибки
function showErrorScreen(message) {
    document.body.innerHTML = `
        <div class="error-screen">
            <h2>⚠️ Ошибка</h2>
            <p>${message}</p>
            <button onclick="location.reload()">🔄 Обновить</button>
        </div>
    `;
}

// Показать экран блокировки
function showBlockedScreen() {
    document.body.innerHTML = `
        <div class="blocked-screen">
            <h2>🚫 Доступ запрещен</h2>
            <p>Ваш аккаунт заблокирован администрацией.</p>
            <p>По вопросам разблокировки обратитесь к администратору.</p>
        </div>
    `;
}

// Создать CSS для анимаций
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }
    
    .error-screen, .blocked-screen {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        text-align: center;
        padding: 20px;
    }
    
    .loading {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100px;
    }
`;
document.head.appendChild(style);
