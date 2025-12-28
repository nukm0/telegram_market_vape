// ============================================
// ОБЪЕДИНЕННЫЙ APP.JS ДЛЯ VAPE MARKET
// ============================================

// Глобальные переменные
let currentUser = null;
let allAds = [];
let currentScreen = 'main';
let currentModal = null;

// ============================================
// 1. ДОЖДИТЕСЬ ПОЛНОЙ ЗАГРУЗКИ DOM
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM загружен, начинаем инициализацию');
    initializeApp();
});

// ============================================
// 2. ВАЖНЫЕ ФУНКЦИИ ДЛЯ UI
// ============================================

// Функция показа формы создания объявления
function showCreateAdForm() {
    console.log('📝 Показ формы создания объявления');
    
    if (!currentUser) {
        showError('Войдите в систему, чтобы создавать объявления');
        return;
    }
    
    // Закрываем предыдущее модальное окно, если есть
    if (currentModal) {
        document.body.removeChild(currentModal);
    }
    
    // Создаем модальное окно
    currentModal = document.createElement('div');
    currentModal.className = 'modal';
    currentModal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    currentModal.innerHTML = `
        <div class="modal-content" style="
            background: white;
            padding: 20px;
            border-radius: 12px;
            width: 90%;
            max-width: 500px;
            max-height: 90vh;
            overflow-y: auto;
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0;">Создать объявление</h2>
                <button onclick="closeModal()" style="
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #666;
                ">×</button>
            </div>
            
            <div class="form-group" style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Название товара *</label>
                <input type="text" id="adTitle" placeholder="Например: Pod Elf Bar 5000" required style="
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    box-sizing: border-box;
                ">
            </div>
            
            <div class="form-group" style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Категория *</label>
                <select id="adCategory" style="
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    box-sizing: border-box;
                ">
                    <option value="Жидкости">Жидкость</option>
                    <option value="Одноразовые">Одноразово</option>
                    <option value="Под-системы">Под-системы</option>
                    <option value="Расходники">Расходники</option>
                </select>
            </div>
            
            <div class="form-group" style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Цена (₽) *</label>
                <input type="number" id="adPrice" min="1" placeholder="1000" required style="
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    box-sizing: border-box;
                ">
            </div>
            
            <div class="form-group" style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Описание *</label>
                <textarea id="adDescription" rows="4" placeholder="Опишите товар..." maxlength="500" style="
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    box-sizing: border-box;
                    resize: vertical;
                "></textarea>
                <small id="charCount" style="color: #666; font-size: 12px;">0/500 символов</small>
            </div>
            
            <div class="form-group" style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Контакт (Telegram)</label>
                <input type="text" id="adContact" value="${currentUser?.username || ''}" placeholder="@username" style="
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    box-sizing: border-box;
                ">
            </div>
            
            <div class="form-group" style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Фотографии (до 3 штук)</label>
                <input type="file" id="adPhotos" multiple accept="image/*" style="
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    box-sizing: border-box;
                ">
                <div id="photoPreview" style="margin-top: 10px;"></div>
            </div>
            
            <div class="modal-actions" style="
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            ">
                <button onclick="closeModal()" style="
                    padding: 10px 20px;
                    border: 1px solid #ddd;
                    background: white;
                    border-radius: 6px;
                    cursor: pointer;
                ">Отмена</button>
                <button onclick="submitAdForm()" style="
                    padding: 10px 20px;
                    border: none;
                    background: #6B21A8;
                    color: white;
                    border-radius: 6px;
                    cursor: pointer;
                ">Опубликовать</button>
            </div>
        </div>
    `;
    
    // Добавляем модальное окно на страницу
    document.body.appendChild(currentModal);
    
    // Обработчик подсчета символов
    const textarea = currentModal.querySelector('#adDescription');
    const charCount = currentModal.querySelector('#charCount');
    
    textarea.addEventListener('input', function() {
        const length = this.value.length;
        charCount.textContent = `${length}/500 символов`;
    });
    
    // Обработчик предпросмотра фото
    const fileInput = currentModal.querySelector('#adPhotos');
    const photoPreview = currentModal.querySelector('#photoPreview');
    
    fileInput.addEventListener('change', function() {
        const files = Array.from(this.files).slice(0, 3);
        photoPreview.innerHTML = '';
        
        if (files.length > 3) {
            showError('Максимум 3 фотографии');
            this.value = '';
            return;
        }
        
        files.forEach((file, index) => {
            if (file.size > 5 * 1024 * 1024) { // 5MB
                showError(`Файл ${file.name} слишком большой (макс. 5MB)`);
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(e) {
                const imgContainer = document.createElement('div');
                imgContainer.style.cssText = `
                    display: inline-block;
                    margin: 5px;
                    position: relative;
                `;
                
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.cssText = `
                    width: 80px;
                    height: 80px;
                    object-fit: cover;
                    border-radius: 6px;
                `;
                
                const removeBtn = document.createElement('button');
                removeBtn.textContent = '×';
                removeBtn.style.cssText = `
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: #ef4444;
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    font-size: 12px;
                    cursor: pointer;
                `;
                removeBtn.onclick = function() {
                    imgContainer.remove();
                };
                
                imgContainer.appendChild(img);
                imgContainer.appendChild(removeBtn);
                photoPreview.appendChild(imgContainer);
            };
            reader.readAsDataURL(file);
        });
        
        // Обновляем input
        const dataTransfer = new DataTransfer();
        files.forEach(file => dataTransfer.items.add(file));
        this.files = dataTransfer.files;
    });
}

// Закрытие модального окна
function closeModal() {
    if (currentModal) {
        document.body.removeChild(currentModal);
        currentModal = null;
    }
}

// Отправка формы объявления
async function submitAdForm() {
    try {
        console.log('📤 Отправка формы объявления...');
        
        // Собираем данные
        const title = document.getElementById('adTitle')?.value.trim();
        const category = document.getElementById('adCategory')?.value;
        const price = parseInt(document.getElementById('adPrice')?.value);
        const description = document.getElementById('adDescription')?.value.trim();
        const contact = document.getElementById('adContact')?.value.trim();
        const fileInput = document.getElementById('adPhotos');
        
        // Валидация
        if (!title || !category || !price || !description) {
            throw new Error('Заполните все обязательные поля');
        }
        
        if (price <= 0) {
            throw new Error('Цена должна быть больше 0');
        }
        
        if (description.length > 500) {
            throw new Error('Описание не должно превышать 500 символов');
        }
        
        // Конвертируем фото в base64
        const photoUrls = [];
        if (fileInput && fileInput.files) {
            const files = Array.from(fileInput.files).slice(0, 3);
            
            for (const file of files) {
                const base64 = await fileToBase64(file);
                photoUrls.push(base64);
            }
        }
        
        // Создаем объект объявления
        const adData = {
            title,
            category,
            price,
            description,
            contact: contact || currentUser.username,
            photoUrls
        };
        
        // Создаем объявление
        await createNewAd(adData);
        
        // Закрываем модальное окно
        closeModal();
        
    } catch (error) {
        console.error('❌ Ошибка отправки формы:', error);
        showError(error.message);
    }
}

// Конвертация файла в base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Показать главный экран
function showMainScreen() {
    console.log('🏠 Переход на главный экран');
    currentScreen = 'main';
    document.getElementById('mainScreen').style.display = 'block';
    document.getElementById('profileScreen').style.display = 'none';
    document.getElementById('faqScreen').style.display = 'none';
    document.getElementById('adminScreen').style.display = 'none';
    
    loadAllAds();
}

// Показать профиль
function showProfileScreen() {
    console.log('👤 Переход в профиль');
    currentScreen = 'profile';
    document.getElementById('mainScreen').style.display = 'none';
    document.getElementById('profileScreen').style.display = 'block';
    document.getElementById('faqScreen').style.display = 'none';
    document.getElementById('adminScreen').style.display = 'none';
    
    renderProfile();
}

// Загрузить FAQ
function loadFAQ() {
    console.log('❓ Загрузка FAQ');
    currentScreen = 'faq';
    document.getElementById('mainScreen').style.display = 'none';
    document.getElementById('profileScreen').style.display = 'none';
    document.getElementById('faqScreen').style.display = 'block';
    document.getElementById('adminScreen').style.display = 'none';
    
    renderFAQ();
}

// Загрузить админ-панель
function loadAdminPanel() {
    console.log('⚙️ Загрузка админ-панели');
    if (!isAdmin()) {
        showError('Доступ запрещен');
        showMainScreen();
        return;
    }
    
    currentScreen = 'admin';
    document.getElementById('mainScreen').style.display = 'none';
    document.getElementById('profileScreen').style.display = 'none';
    document.getElementById('faqScreen').style.display = 'none';
    document.getElementById('adminScreen').style.display = 'block';
    
    renderAdminPanel();
}

// Фильтрация объявлений по категории
function filterAdsByCategory(category) {
    console.log(`🎯 Фильтрация по категории: ${category}`);
    if (category === 'all') {
        renderAds(allAds);
    } else {
        const filtered = allAds.filter(ad => ad.category === category);
        renderAds(filtered);
    }
}

// ============================================
// 3. ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// ============================================

async function initializeApp() {
    try {
        console.log('🚀 Инициализация приложения...');
        
        // 1. Проверяем, что Firebase загружен
        console.log('🔍 Проверка Firebase...');
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase не загружен. Проверьте CDN в index.html');
        }
        console.log('✅ Firebase доступен');
        
        // 2. Проверяем конфигурацию
        if (typeof firebaseConfig === 'undefined') {
            throw new Error('Конфигурация Firebase не загружена');
        }
        console.log('✅ Конфигурация загружена');
        
        // 3. Инициализируем Firebase
        console.log('🔥 Инициализация Firebase...');
        firebase.initializeApp(firebaseConfig);
        console.log('✅ Firebase инициализирован');
        
        // 4. Инициализируем UI
        console.log('🎨 Инициализация UI...');
        initializeUI();
        
        // 5. Авторизуем пользователя
        console.log('🔐 Авторизация пользователя...');
        const user = await authenticateUser();
        
        if (!user) {
            throw new Error('Не удалось авторизовать пользователя');
        }
        
        // 6. Загружаем объявления
        console.log('📦 Загрузка объявлений...');
        await loadAllAds();
        
        console.log('🎉 Приложение успешно инициализировано!');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        showErrorScreen('Ошибка загрузки приложения. Пожалуйста, попробуйте позже.');
    }
}

// Инициализация UI
function initializeUI() {
    console.log('🎨 Инициализация UI...');
    
    // Проверяем существование элементов
    const navMain = document.getElementById('navMain');
    const navProfile = document.getElementById('navProfile');
    const navFAQ = document.getElementById('navFAQ');
    const createAdBtn = document.getElementById('createAdBtn');
    
    console.log('🔍 Поиск элементов DOM:');
    console.log('- navMain:', navMain ? 'найден' : 'НЕ НАЙДЕН');
    console.log('- navProfile:', navProfile ? 'найден' : 'НЕ НАЙДЕН');
    console.log('- navFAQ:', navFAQ ? 'найден' : 'НЕ НАЙДЕН');
    console.log('- createAdBtn:', createAdBtn ? 'найден' : 'НЕ НАЙДЕН');
    
    if (!navMain || !navProfile || !navFAQ || !createAdBtn) {
        console.error('❌ Не найдены элементы DOM. Проверьте HTML структуру.');
        return;
    }
    
    // Настраиваем кнопки навигации
    navMain.addEventListener('click', showMainScreen);
    navProfile.addEventListener('click', showProfileScreen);
    navFAQ.addEventListener('click', loadFAQ);
    
    // Кнопка создания объявления
    createAdBtn.addEventListener('click', showCreateAdForm);
    
    // Кнопки фильтрации
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const category = e.target.dataset.category;
            filterAdsByCategory(category);
        });
    });
    
    console.log('✅ UI инициализирован');
}

// ============================================
// 4. АВТОРИЗАЦИЯ И ПОЛЬЗОВАТЕЛИ
// ============================================

// Инициализация Firebase
function initializeFirebase() {
    try {
        console.log('🚀 Инициализация Firebase...');
        
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase не загружен. Проверьте CDN в index.html');
        }
        
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
        
        const userRef = database.ref(`users/${userId}`);
        const snapshot = await userRef.once('value');
        
        if (snapshot.exists()) {
            const userData = snapshot.val();
            userRef.update({ lastSeen: Date.now() });
            console.log('👤 Пользователь найден:', userData.username);
            return { ...userData, id: userId };
        } else {
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
        const firebase = initializeFirebase();
        const tg = initializeTelegram();
        
        if (!tg || !tg.initDataUnsafe || !tg.initDataUnsafe.user) {
            throw new Error('Данные Telegram не доступны');
        }
        
        const tgUser = tg.initDataUnsafe.user;
        console.log('🔐 Авторизация пользователя:', tgUser.id);
        
        const user = await getOrCreateUser(tgUser, firebase);
        
        if (user.blocked) {
            showBlockedScreen();
            return null;
        }
        
        currentUser = user;
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
// 5. СИСТЕМА ОБЪЯВЛЕНИЙ
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
            if (!ad.blocked) {
                ads.push(ad);
            }
        });
        
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

// Создание нового объявления
async function createNewAd(adData) {
    try {
        console.log('➕ Создание нового объявления...');
        
        if (!currentUser) {
            throw new Error('Пользователь не авторизован');
        }
        
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
        
        await newAdRef.set(newAd);
        
        await db.ref(`users/${currentUser.id}`).update({
            adsCount: (currentUser.adsCount || 0) + 1
        });
        
        console.log('✅ Объявление создано:', newAd.id);
        showSuccess('Объявление успешно создано!');
        
        await loadAllAds();
        
        return newAd;
    } catch (error) {
        console.error('❌ Ошибка создания объявления:', error);
        showError(error.message || 'Не удалось создать объявление');
        throw error;
    }
}

// Рендеринг объявлений
function renderAds(ads) {
    const adsContainer = document.getElementById('adsContainer');
    
    if (!adsContainer) {
        console.error('❌ Не найден контейнер объявлений');
        return;
    }
    
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
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// ============================================
// 6. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
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

// Проверка админа
function isAdmin() {
    if (!currentUser) return false;
    return appConfig.adminIds.includes(parseInt(currentUser.id));
}

// Показать экран ошибки
function showErrorScreen(message) {
    document.body.innerHTML = `
        <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            text-align: center;
            padding: 20px;
            background: linear-gradient(135deg, #6B21A8 0%, #9333EA 100%);
            color: white;
        ">
            <h2 style="margin-bottom: 20px;">⚠️ Ошибка</h2>
            <p style="margin-bottom: 30px; max-width: 300px;">${message}</p>
            <button onclick="location.reload()" style="
                padding: 12px 30px;
                border: none;
                background: white;
                color: #6B21A8;
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
            ">🔄 Обновить</button>
        </div>
    `;
}

// Показать экран блокировки
function showBlockedScreen() {
    document.body.innerHTML = `
        <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            text-align: center;
            padding: 20px;
            background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%);
            color: white;
        ">
            <h2 style="margin-bottom: 20px;">🚫 Доступ запрещен</h2>
            <p style="margin-bottom: 15px;">Ваш аккаунт заблокирован администрацией.</p>
            <p>По вопросам разблокировки обратитесь к администратору.</p>
        </div>
    `;
}

// ============================================
// 7. РЕЙТИНГИ
// ============================================

// Лайк/дизлайк объявления
async function rateAd(adId, ratingType) {
    try {
        if (!currentUser) {
            throw new Error('Войдите в систему');
        }
        
        const db = firebase.database();
        const adRef = db.ref(`ads/${adId}`);
        const ratingRef = db.ref(`ratings/${adId}/${currentUser.id}`);
        
        const adSnapshot = await adRef.once('value');
        const ad = adSnapshot.val();
        
        if (!ad) {
            throw new Error('Объявление не найдено');
        }
        
        if (ad.sellerId === currentUser.id) {
            throw new Error('Нельзя оценивать свои объявления');
        }
        
        const ratingSnapshot = await ratingRef.once('value');
        const previousRating = ratingSnapshot.val();
        
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
        
        await adRef.update(updates);
        await updateSellerRating(ad.sellerId);
        
        console.log(`✅ Оценка обновлена: ${adId} - ${ratingType}`);
        
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
        
        const rating = appConfig.ratingFormula(totalLikes, totalDislikes);
        
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
// 8. ПРОФИЛЬ И ДОПОЛНИТЕЛЬНЫЕ ЭКРАНЫ
// ============================================

// Рендеринг профиля
function renderProfile() {
    if (!currentUser) return;
    
    const profileContent = document.getElementById('profileContent');
    if (!profileContent) return;
    
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
    `;
}

// Рендеринг FAQ
function renderFAQ() {
    const faqContent = document.getElementById('faqContent');
    if (!faqContent) return;
    
    faqContent.innerHTML = `
        <div class="faq-section">
            <h3>❓ Частые вопросы</h3>
            <div class="faq-item">
                <h4>Как создать объявление?</h4>
                <p>Нажмите кнопку "Новое объявление" на главной странице, заполните форму и опубликуйте.</p>
            </div>
            <div class="faq-item">
                <h4>Сколько стоит размещение объявления?</h4>
                <p>Размещение объявлений полностью бесплатно.</p>
            </div>
            <div class="faq-item">
                <h4>Как связаться с продавцом?</h4>
                <p>Нажмите кнопку "Написать" на карточке объявления.</p>
            </div>
        </div>
        
        <div class="stats-section">
            <h3>📊 Статистика платформы</h3>
            <div id="serverStats">Загрузка...</div>
        </div>
    `;
    
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
        
        if (usersSnapshot.exists()) {
            const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
            
            usersSnapshot.forEach((child) => {
                const user = child.val();
                if (user.lastSeen && user.lastSeen > fiveMinutesAgo) {
                    stats.onlineUsers++;
                }
            });
        }
        
        const serverStatsDiv = document.getElementById('serverStats');
        if (serverStatsDiv) {
            serverStatsDiv.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-number">${stats.totalUsers}</span>
                        <span class="stat-label">Всего пользователей</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${stats.onlineUsers}</span>
                        <span class="stat-label">Онлайн сейчас</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${stats.totalAds}</span>
                        <span class="stat-label">Всего объявлений</span>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки статистики сервера:', error);
    }
}

// Загрузка админ-панели
function renderAdminPanel() {
    const adminContent = document.getElementById('adminContent');
    if (!adminContent) return;
    
    adminContent.innerHTML = `
        <div class="admin-section">
            <h3>⚙️ Администрирование</h3>
            
            <div class="admin-stats" id="adminStats">
                Загрузка статистики...
            </div>
            
            <div class="admin-actions">
                <button class="btn btn-primary" onclick="loadAdminAds()">
                    📋 Модерация объявлений
                </button>
                <button class="btn btn-secondary" onclick="loadAdminUsers()">
                    👥 Управление пользователями
                </button>
                <button class="btn btn-secondary" onclick="loadComplaintsPanel()">
                    ⚠️ Жалобы
                </button>
            </div>
            
            <div id="adminListContainer" style="margin-top: 20px;"></div>
        </div>
    `;
    
    loadAdminStats();
}

// Загрузка статистики для админа
async function loadAdminStats() {
    try {
        const db = firebase.database();
        
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
        
        if (adsSnapshot.exists()) {
            adsSnapshot.forEach((child) => {
                const ad = child.val();
                if (!ad.blocked) {
                    stats.activeAds++;
                }
            });
        }
        
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
        
        const adminStatsDiv = document.getElementById('adminStats');
        if (adminStatsDiv) {
            adminStatsDiv.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-number">${stats.totalUsers}</span>
                        <span class="stat-label">Пользователи</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${stats.blockedUsers}</span>
                        <span class="stat-label">Заблокировано</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${stats.activeAds}</span>
                        <span class="stat-label">Активные объявления</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${stats.totalComplaints}</span>
                        <span class="stat-label">Жалоб</span>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки статистики:', error);
    }
}

// ============================================
// 9. ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ ПОЛНОЙ РАБОТОСПОСОБНОСТИ
// ============================================

// Добавьте эти функции, если они используются, но еще не объявлены:

// Загрузка моих объявлений
async function loadMyAds() {
    try {
        if (!currentUser) return;
        
        const profileContent = document.getElementById('profileContent');
        if (!profileContent) return;
        
        profileContent.innerHTML += `
            <div id="myAdsList" style="margin-top: 20px;">
                <h4>📦 Мои объявления</h4>
                <div id="myAdsContainer">Загрузка...</div>
            </div>
        `;
        
        const db = firebase.database();
        const adsRef = db.ref('ads');
        const snapshot = await adsRef.orderByChild('sellerId').equalTo(currentUser.id).once('value');
        
        if (!snapshot.exists()) {
            document.getElementById('myAdsContainer').innerHTML = '<p>У вас нет объявлений</p>';
            return;
        }
        
        const myAds = [];
        snapshot.forEach((childSnapshot) => {
            myAds.push(childSnapshot.val());
        });
        
        myAds.sort((a, b) => b.createdAt - a.createdAt);
        
        const myAdsContainer = document.getElementById('myAdsContainer');
        myAdsContainer.innerHTML = myAds.map(ad => `
            <div class="my-ad-card" style="
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 10px;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h5 style="margin: 0;">${ad.title}</h5>
                    <span style="font-weight: bold; color: #6B21A8;">${ad.price} ₽</span>
                </div>
                <p style="margin: 10px 0; color: #666;">${ad.description.substring(0, 100)}...</p>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <button onclick="editAd('${ad.id}')" style="
                        padding: 5px 10px;
                        background: #6B21A8;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                    ">✏️ Редактировать</button>
                    <button onclick="deleteAd('${ad.id}')" style="
                        padding: 5px 10px;
                        background: #ef4444;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                    ">🗑️ Удалить</button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('❌ Ошибка загрузки моих объявлений:', error);
        showError('Не удалось загрузить ваши объявления');
    }
}

// Редактирование объявления (заглушка)
function editAd(adId) {
    showError('Редактирование в разработке');
}

// Удаление объявления
async function deleteAd(adId) {
    try {
        if (!confirm('Вы уверены, что хотите удалить это объявление?')) {
            return false;
        }
        
        const db = firebase.database();
        const adRef = db.ref(`ads/${adId}`);
        
        const snapshot = await adRef.once('value');
        const ad = snapshot.val();
        
        if (!ad) {
            throw new Error('Объявление не найдено');
        }
        
        if (ad.sellerId !== currentUser.id && !isAdmin()) {
            throw new Error('У вас нет прав для удаления этого объявления');
        }
        
        await adRef.remove();
        
        // Обновляем счетчик пользователя
        if (ad.sellerId === currentUser.id) {
            await db.ref(`users/${currentUser.id}`).update({
                adsCount: Math.max(0, (currentUser.adsCount || 0) - 1)
            });
        }
        
        console.log('🗑️ Объявление удалено:', adId);
        showSuccess('Объявление удалено');
        
        // Обновляем список
        if (currentScreen === 'profile') {
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
            case 'unverify':
                updates.verified = false;
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
        
        console.log(`✅ Объявление ${adId}: ${action}`);
        showSuccess(`Объявление ${action === 'verify' ? 'верифицировано' : action === 'unverify' ? 'снята верификация' : action === 'block' ? 'заблокировано' : 'разблокировано'}`);
        
        // Обновляем список
        if (currentScreen === 'main') {
            loadAllAds();
        }
        
        return true;
    } catch (error) {
        console.error('❌ Ошибка модерации:', error);
        showError(error.message);
        return false;
    }
}

// Остальные функции (заглушки)
function loadAdminAds() {
    showError('Модерация объявлений в разработке');
}

function loadAdminUsers() {
    showError('Управление пользователями в разработке');
}

function loadComplaintsPanel() {
    showError('Система жалоб в разработке');
}

// ============================================
// 10. КОНЕЦ ФАЙЛА
// ============================================

console.log('✅ app.js загружен');
