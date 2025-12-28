// ============================================
// ОБЪЕДИНЕННЫЙ APP.JS ДЛЯ VAPE MARKET
// ============================================

// Глобальные переменные
let currentUser = null;
let allAds = [];
let currentScreen = 'main';
let currentModal = null;
let firebaseApp = null;

// ============================================
// ВСЕ ФУНКЦИИ ОБЪЯВЛЕНЫ СРАЗУ
// ============================================

// 1. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
function showLoading(show) {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
    }
}

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

function isAdmin() {
    if (!currentUser) return false;
    return appConfig.adminIds.includes(parseInt(currentUser.id));
}

function closeModal() {
    if (currentModal) {
        document.body.removeChild(currentModal);
        currentModal = null;
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// 2. FIREBASE ИНИЦИАЛИЗАЦИЯ (ТОЛЬКО ОДИН РАЗ)
function initializeFirebase() {
    try {
        console.log('🚀 Инициализация Firebase...');
        
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase не загружен. Проверьте CDN в index.html');
        }
        
        // Проверяем, не инициализирован ли Firebase уже
        try {
            // Пытаемся получить существующее приложение
            const existingApp = firebase.app();
            console.log('✅ Firebase уже инициализирован ранее');
            firebaseApp = existingApp;
        } catch (error) {
            // Если нет существующего приложения - создаем новое
            console.log('🔥 Создание нового Firebase приложения...');
            firebaseApp = firebase.initializeApp(firebaseConfig);
            console.log('✅ Firebase успешно инициализирован');
        }
        
        // Возвращаем сервисы Firebase
        return {
            auth: firebase.auth(),
            database: firebase.database()
        };
    } catch (error) {
        console.error('❌ Ошибка инициализации Firebase:', error);
        throw error;
    }
}

// 3. UI ФУНКЦИИ
function showMainScreen() {
    console.log('🏠 Переход на главный экран');
    currentScreen = 'main';
    document.getElementById('mainScreen').style.display = 'block';
    document.getElementById('profileScreen').style.display = 'none';
    document.getElementById('faqScreen').style.display = 'none';
    document.getElementById('adminScreen').style.display = 'none';
    
    loadAllAds();
}

function showProfileScreen() {
    console.log('👤 Переход в профиль');
    currentScreen = 'profile';
    document.getElementById('mainScreen').style.display = 'none';
    document.getElementById('profileScreen').style.display = 'block';
    document.getElementById('faqScreen').style.display = 'none';
    document.getElementById('adminScreen').style.display = 'none';
    
    renderProfile();
}

function loadFAQ() {
    console.log('❓ Загрузка FAQ');
    currentScreen = 'faq';
    document.getElementById('mainScreen').style.display = 'none';
    document.getElementById('profileScreen').style.display = 'none';
    document.getElementById('faqScreen').style.display = 'block';
    document.getElementById('adminScreen').style.display = 'none';
    
    renderFAQ();
}

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

function filterAdsByCategory(category) {
    console.log(`🎯 Фильтрация по категории: ${category}`);
    if (category === 'all') {
        renderAds(allAds);
    } else {
        const filtered = allAds.filter(ad => ad.category === category);
        renderAds(filtered);
    }
}

// 4. ФУНКЦИЯ СОЗДАНИЯ ОБЪЯВЛЕНИЯ
function showCreateAdForm() {
    console.log('📝 Показ формы создания объявления');
    
    if (!currentUser) {
        showError('Войдите в систему, чтобы создавать объявления');
        return;
    }
    
    if (currentModal) {
        document.body.removeChild(currentModal);
    }
    
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
    
    document.body.appendChild(currentModal);
    
    const textarea = currentModal.querySelector('#adDescription');
    const charCount = currentModal.querySelector('#charCount');
    
    textarea.addEventListener('input', function() {
        const length = this.value.length;
        charCount.textContent = `${length}/500 символов`;
    });
    
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
            if (file.size > 5 * 1024 * 1024) {
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
        
        const dataTransfer = new DataTransfer();
        files.forEach(file => dataTransfer.items.add(file));
        this.files = dataTransfer.files;
    });
}

async function submitAdForm() {
    try {
        console.log('📤 Отправка формы объявления...');
        
        const title = document.getElementById('adTitle')?.value.trim();
        const category = document.getElementById('adCategory')?.value;
        const price = parseInt(document.getElementById('adPrice')?.value);
        const description = document.getElementById('adDescription')?.value.trim();
        const contact = document.getElementById('adContact')?.value.trim();
        const fileInput = document.getElementById('adPhotos');
        
        if (!title || !category || !price || !description) {
            throw new Error('Заполните все обязательные поля');
        }
        
        if (price <= 0) {
            throw new Error('Цена должна быть больше 0');
        }
        
        if (description.length > 500) {
            throw new Error('Описание не должно превышать 500 символов');
        }
        
        const photoUrls = [];
        if (fileInput && fileInput.files) {
            const files = Array.from(fileInput.files).slice(0, 3);
            
            for (const file of files) {
                const base64 = await fileToBase64(file);
                photoUrls.push(base64);
            }
        }
        
        const adData = {
            title,
            category,
            price,
            description,
            contact: contact || currentUser.username,
            photoUrls
        };
        
        await createNewAd(adData);
        closeModal();
        
    } catch (error) {
        console.error('❌ Ошибка отправки формы:', error);
        showError(error.message);
    }
}

// 5. ИНИЦИАЛИЗАЦИЯ UI
function initializeUI() {
    console.log('🎨 Инициализация UI...');
    
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
    
    navMain.addEventListener('click', showMainScreen);
    navProfile.addEventListener('click', showProfileScreen);
    navFAQ.addEventListener('click', loadFAQ);
    
    createAdBtn.addEventListener('click', showCreateAdForm);
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const category = e.target.dataset.category;
            filterAdsByCategory(category);
        });
    });
    
    console.log('✅ UI инициализирован');
}

// 6. TELEGRAM ИНИЦИАЛИЗАЦИЯ
function initializeTelegram() {
    try {
        console.log('🤖 Инициализация Telegram Web App...');
        
        if (typeof Telegram === 'undefined' || !Telegram.WebApp) {
            console.warn('⚠️ Telegram Web App SDK не загружен');
            return null;
        }
        
        const tg = Telegram.WebApp;
        
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

// 7. ПОЛЬЗОВАТЕЛИ
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

async function authenticateUser() {
    try {
        // Инициализируем Firebase (только один раз)
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

// 8. СИСТЕМА ОБЪЯВЛЕНИЙ
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
                <button onclick="showCreateAdForm()" style="
                    padding: 10px 20px;
                    background: #6B21A8;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                ">Создать первое объявление</button>
            </div>
        `;
        return;
    }
    
    adsContainer.innerHTML = ads.map(ad => `
        <div class="ad-card" data-id="${ad.id}" style="
            background: white;
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 15px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        ">
            <div class="ad-header" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            ">
                <span class="ad-category" style="
                    background: #f3e8ff;
                    color: #6B21A8;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 500;
                ">${appConfig.categoryShort[ad.category] || ad.category}</span>
                ${ad.verified ? '<span class="ad-verified" style="color: #10b981;">✓</span>' : ''}
                <span class="ad-price" style="
                    font-weight: bold;
                    font-size: 18px;
                    color: #6B21A8;
                ">${ad.price} ₽</span>
            </div>
            
            <h3 class="ad-title" style="
                margin: 0 0 10px 0;
                font-size: 16px;
                color: #333;
            ">${ad.title}</h3>
            
            ${ad.photoUrls && ad.photoUrls.length > 0 ? `
                <div class="ad-photos" style="margin-bottom: 10px;">
                    <img src="${ad.photoUrls[0]}" alt="${ad.title}" loading="lazy" style="
                        width: 100%;
                        height: 200px;
                        object-fit: cover;
                        border-radius: 8px;
                    ">
                </div>
            ` : ''}
            
            <p class="ad-description" style="
                margin: 0 0 10px 0;
                color: #666;
                font-size: 14px;
                line-height: 1.5;
            ">${ad.description}</p>
            
            <div class="ad-seller" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                color: #666;
                font-size: 14px;
            ">
                <span>👤 ${ad.sellerName}</span>
                <span class="seller-rating">⭐ ${ad.sellerRating || '0.0'}</span>
            </div>
            
            <div class="ad-actions" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <div class="rating-buttons" style="display: flex; gap: 10px;">
                    <button onclick="rateAd('${ad.id}', 'like')" style="
                        padding: 8px 15px;
                        border: 1px solid #ddd;
                        background: white;
                        border-radius: 6px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 5px;
                    ">
                        👍 ${ad.likes || 0}
                    </button>
                    <button onclick="rateAd('${ad.id}', 'dislike')" style="
                        padding: 8px 15px;
                        border: 1px solid #ddd;
                        background: white;
                        border-radius: 6px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 5px;
                    ">
                        👎 ${ad.dislikes || 0}
                    </button>
                </div>
                
                ${ad.sellerId !== currentUser?.id ? `
                    <button onclick="contactSeller('${ad.sellerUsername}', '${ad.title}')" style="
                        padding: 8px 15px;
                        background: #6B21A8;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 5px;
                    ">
                        ✉️ Написать
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// 9. РЕЙТИНГИ
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
            if (ratingType === 'like') {
                updates.likes = Math.max(0, currentLikes - 1);
            } else {
                updates.dislikes = Math.max(0, currentDislikes - 1);
            }
            await ratingRef.remove();
        } else {
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

// 10. ПРОФИЛЬ И ДОПОЛНИТЕЛЬНЫЕ ЭКРАНЫ
function renderProfile() {
    if (!currentUser) return;
    
    const profileContent = document.getElementById('profileContent');
    if (!profileContent) return;
    
    profileContent.innerHTML = `
        <div class="profile-header" style="
            display: flex;
            align-items: center;
            margin-bottom: 20px;
        ">
            <div class="avatar" style="
                width: 80px;
                height: 80px;
                background: linear-gradient(135deg, #6B21A8 0%, #9333EA 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 32px;
                font-weight: bold;
                margin-right: 15px;
            ">${currentUser.firstName?.[0] || 'U'}</div>
            <div class="profile-info">
                <h3 style="margin: 0 0 5px 0; color: #333;">${currentUser.firstName || ''} ${currentUser.lastName || ''}</h3>
                <p style="margin: 0 0 10px 0; color: #666;">${currentUser.username || 'Без username'}</p>
                <div class="rating" style="display: flex; align-items: center;">
                    <span style="margin-right: 5px;">⭐</span>
                    <span>${currentUser.rating?.toFixed(1) || '0.0'}/5.0</span>
                </div>
            </div>
        </div>
        
        <div class="stats-grid" style="
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin: 20px 0;
        ">
            <div class="stat-item" style="
                background: white;
                padding: 15px;
                border-radius: 8px;
                text-align: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            ">
                <span class="stat-number" style="
                    display: block;
                    font-size: 24px;
                    font-weight: bold;
                    color: #6B21A8;
                ">${currentUser.adsCount || 0}</span>
                <span class="stat-label" style="color: #666;">Объявления</span>
            </div>
            <div class="stat-item" style="
                background: white;
                padding: 15px;
                border-radius: 8px;
                text-align: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            ">
                <span class="stat-number" style="
                    display: block;
                    font-size: 24px;
                    font-weight: bold;
                    color: #10b981;
                ">${currentUser.likesCount || 0}</span>
                <span class="stat-label" style="color: #666;">Лайки</span>
            </div>
            <div class="stat-item" style="
                background: white;
                padding: 15px;
                border-radius: 8px;
                text-align: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            ">
                <span class="stat-number" style="
                    display: block;
                    font-size: 24px;
                    font-weight: bold;
                    color: #ef4444;
                ">${currentUser.dislikesCount || 0}</span>
                <span class="stat-label" style="color: #666;">Дизлайки</span>
            </div>
            <div class="stat-item" style="
                background: white;
                padding: 15px;
                border-radius: 8px;
                text-align: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            ">
                <span class="stat-number" style="
                    display: block;
                    font-size: 24px;
                    font-weight: bold;
                    color: #f59e0b;
                ">${currentUser.rating?.toFixed(1) || '0.0'}</span>
                <span class="stat-label" style="color: #666;">Рейтинг</span>
            </div>
        </div>
        
        <div class="profile-actions" style="margin-top: 20px;">
            <button onclick="loadMyAds()" style="
                width: 100%;
                padding: 12px;
                background: #6B21A8;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                margin-bottom: 10px;
            ">
                📦 Мои объявления
            </button>
            <button onclick="showMainScreen()" style="
                width: 100%;
                padding: 12px;
                background: #ddd;
                color: #333;
                border: none;
                border-radius: 8px;
                cursor: pointer;
            ">
                ↩️ На главную
            </button>
        </div>
    `;
}

function renderFAQ() {
    const faqContent = document.getElementById('faqContent');
    if (!faqContent) return;
    
    faqContent.innerHTML = `
        <div class="faq-section" style="margin-bottom: 30px;">
            <h3 style="margin-bottom: 15px;">❓ Частые вопросы</h3>
            <div class="faq-item" style="
                background: white;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 10px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            ">
                <h4 style="margin: 0 0 10px 0;">Как создать объявление?</h4>
                <p style="margin: 0; color: #666;">Нажмите кнопку "Новое объявление" на главной странице, заполните форму и опубликуйте.</p>
            </div>
            <div class="faq-item" style="
                background: white;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 10px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            ">
                <h4 style="margin: 0 0 10px 0;">Сколько стоит размещение объявления?</h4>
                <p style="margin: 0; color: #666;">Размещение объявлений полностью бесплатно.</p>
            </div>
            <div class="faq-item" style="
                background: white;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 10px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            ">
                <h4 style="margin: 0 0 10px 0;">Как связаться с продавцом?</h4>
                <p style="margin: 0; color: #666;">Нажмите кнопку "Написать" на карточке объявления.</p>
            </div>
        </div>
        
        <div class="stats-section">
            <h3 style="margin-bottom: 15px;">📊 Статистика платформы</h3>
            <div id="serverStats">Загрузка...</div>
        </div>
    `;
    
    loadServerStats();
}

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
                <div class="stats-grid" style="
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 15px;
                ">
                    <div class="stat-item" style="
                        background: white;
                        padding: 15px;
                        border-radius: 8px;
                        text-align: center;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    ">
                        <span class="stat-number" style="
                            display: block;
                            font-size: 24px;
                            font-weight: bold;
                            color: #6B21A8;
                        ">${stats.totalUsers}</span>
                        <span class="stat-label" style="color: #666;">Всего пользователей</span>
                    </div>
                    <div class="stat-item" style="
                        background: white;
                        padding: 15px;
                        border-radius: 8px;
                        text-align: center;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    ">
                        <span class="stat-number" style="
                            display: block;
                            font-size: 24px;
                            font-weight: bold;
                            color: #10b981;
                        ">${stats.onlineUsers}</span>
                        <span class="stat-label" style="color: #666;">Онлайн сейчас</span>
                    </div>
                    <div class="stat-item" style="
                        background: white;
                        padding: 15px;
                        border-radius: 8px;
                        text-align: center;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    ">
                        <span class="stat-number" style="
                            display: block;
                            font-size: 24px;
                            font-weight: bold;
                            color: #f59e0b;
                        ">${stats.totalAds}</span>
                        <span class="stat-label" style="color: #666;">Всего объявлений</span>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки статистики сервера:', error);
    }
}

function renderAdminPanel() {
    const adminContent = document.getElementById('adminContent');
    if (!adminContent) return;
    
    adminContent.innerHTML = `
        <div class="admin-section">
            <h3 style="margin-bottom: 20px;">⚙️ Администрирование</h3>
            
            <div class="admin-stats" id="adminStats">
                Загрузка статистики...
            </div>
            
            <div class="admin-actions" style="margin: 20px 0;">
                <button onclick="loadAdminAds()" style="
                    width: 100%;
                    padding: 12px;
                    background: #6B21A8;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    margin-bottom: 10px;
                ">
                    📋 Модерация объявлений
                </button>
                <button onclick="loadAdminUsers()" style="
                    width: 100%;
                    padding: 12px;
                    background: #10b981;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    margin-bottom: 10px;
                ">
                    👥 Управление пользователями
                </button>
            </div>
        </div>
    `;
    
    loadAdminStats();
}

async function loadAdminStats() {
    try {
        const db = firebase.database();
        
        const [usersSnapshot, adsSnapshot] = await Promise.all([
            db.ref('users').once('value'),
            db.ref('ads').once('value')
        ]);
        
        const stats = {
            totalUsers: usersSnapshot.exists() ? usersSnapshot.numChildren() : 0,
            totalAds: adsSnapshot.exists() ? adsSnapshot.numChildren() : 0,
            activeAds: 0,
            blockedUsers: 0
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
            });
        }
        
        const adminStatsDiv = document.getElementById('adminStats');
        if (adminStatsDiv) {
            adminStatsDiv.innerHTML = `
                <div class="stats-grid" style="
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 15px;
                ">
                    <div class="stat-item" style="
                        background: white;
                        padding: 15px;
                        border-radius: 8px;
                        text-align: center;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    ">
                        <span class="stat-number" style="
                            display: block;
                            font-size: 24px;
                            font-weight: bold;
                            color: #6B21A8;
                        ">${stats.totalUsers}</span>
                        <span class="stat-label" style="color: #666;">Пользователи</span>
                    </div>
                    <div class="stat-item" style="
                        background: white;
                        padding: 15px;
                        border-radius: 8px;
                        text-align: center;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    ">
                        <span class="stat-number" style="
                            display: block;
                            font-size: 24px;
                            font-weight: bold;
                            color: #ef4444;
                        ">${stats.blockedUsers}</span>
                        <span class="stat-label" style="color: #666;">Заблокировано</span>
                    </div>
                    <div class="stat-item" style="
                        background: white;
                        padding: 15px;
                        border-radius: 8px;
                        text-align: center;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    ">
                        <span class="stat-number" style="
                            display: block;
                            font-size: 24px;
                            font-weight: bold;
                            color: #10b981;
                        ">${stats.activeAds}</span>
                        <span class="stat-label" style="color: #666;">Активные объявления</span>
                    </div>
                    <div class="stat-item" style="
                        background: white;
                        padding: 15px;
                        border-radius: 8px;
                        text-align: center;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    ">
                        <span class="stat-number" style="
                            display: block;
                            font-size: 24px;
                            font-weight: bold;
                            color: #f59e0b;
                        ">${stats.totalAds}</span>
                        <span class="stat-label" style="color: #666;">Всего объявлений</span>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки статистики:', error);
    }
}

// 11. ФУНКЦИИ ОШИБОК
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

// 12. ЗАГЛУШКИ
function loadMyAds() {
    showError('Мои объявления в разработке');
}

function loadAdminAds() {
    showError('Модерация объявлений в разработке');
}

function loadAdminUsers() {
    showError('Управление пользователями в разработке');
}

function moderateAd(adId, action) {
    showError('Модерация в разработке');
}

// 13. ГЛАВНАЯ ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ (УПРОЩЕННАЯ)
async function initializeApp() {
    try {
        console.log('🚀 Инициализация приложения...');
        
        console.log('🔍 Проверка Firebase...');
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase не загружен. Проверьте CDN в index.html');
        }
        console.log('✅ Firebase доступен');
        
        if (typeof firebaseConfig === 'undefined') {
            throw new Error('Конфигурация Firebase не загружена');
        }
        console.log('✅ Конфигурация загружена');
        
        // Firebase инициализируется внутри authenticateUser() при необходимости
        console.log('🎨 Инициализация UI...');
        initializeUI();
        
        console.log('🔐 Авторизация пользователя...');
        const user = await authenticateUser();
        
        if (!user) {
            throw new Error('Не удалось авторизовать пользователя');
        }
        
        console.log('📦 Загрузка объявлений...');
        await loadAllAds();
        
        console.log('🎉 Приложение успешно инициализировано!');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        showErrorScreen('Ошибка загрузки приложения. Пожалуйста, попробуйте позже.');
    }
}

// ============================================
// 14. СТАРТ ПРИЛОЖЕНИЯ
// ============================================

// Ожидаем загрузку DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM загружен, начинаем инициализацию');
    initializeApp();
});
