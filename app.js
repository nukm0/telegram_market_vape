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
    console.log('🔍 Проверка окружения:');
    console.log('- Telegram доступен:', typeof Telegram !== 'undefined');
    console.log('- Telegram.WebApp доступен:', Telegram && Telegram.WebApp ? 'да' : 'нет');
    console.log('- Firebase доступен:', typeof firebase !== 'undefined');
    
    // Запускаем приложение
    setTimeout(initializeApp, 100);
});

// ============================================
// 2. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

function showLoading(show) {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
    }
}

function showError(message) {
    console.error('❌ Ошибка:', message);
    
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
        font-family: sans-serif;
        font-size: 14px;
        max-width: 80%;
        text-align: center;
    `;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 3000);
}

function showSuccess(message) {
    console.log('✅ Успех:', message);
    
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
        font-family: sans-serif;
        font-size: 14px;
        max-width: 80%;
        text-align: center;
    `;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.parentNode.removeChild(successDiv);
        }
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

// ============================================
// 3. UI ФУНКЦИИ
// ============================================

function showMainScreen() {
    console.log('🏠 Переход на главный экран');
    currentScreen = 'main';
    
    // Скрываем все экраны
    document.querySelectorAll('[id$="Screen"]').forEach(screen => {
        screen.style.display = 'none';
    });
    
    // Показываем главный экран
    document.getElementById('mainScreen').style.display = 'block';
    
    // Загружаем объявления
    loadAllAds();
}

function showProfileScreen() {
    console.log('👤 Переход в профиль');
    currentScreen = 'profile';
    
    document.querySelectorAll('[id$="Screen"]').forEach(screen => {
        screen.style.display = 'none';
    });
    
    document.getElementById('profileScreen').style.display = 'block';
    
    renderProfile();
}

function loadFAQ() {
    console.log('❓ Загрузка FAQ');
    currentScreen = 'faq';
    
    document.querySelectorAll('[id$="Screen"]').forEach(screen => {
        screen.style.display = 'none';
    });
    
    document.getElementById('faqScreen').style.display = 'block';
    
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
    
    document.querySelectorAll('[id$="Screen"]').forEach(screen => {
        screen.style.display = 'none';
    });
    
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

// ============================================
// 4. ФУНКЦИЯ СОЗДАНИЯ ОБЪЯВЛЕНИЯ
// ============================================

function showCreateAdForm() {
    console.log('📝 Показ формы создания объявления');
    
    if (!currentUser) {
        showError('Войдите в систему, чтобы создавать объявления');
        return;
    }
    
    // Закрываем предыдущее модальное окно
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
                <h2 style="margin: 0; color: #333;">Создать объявление</h2>
                <button onclick="closeModal()" style="
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #666;
                ">×</button>
            </div>
            
            <div class="form-group" style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #333;">Название товара *</label>
                <input type="text" id="adTitle" placeholder="Например: Pod Elf Bar 5000" required style="
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    box-sizing: border-box;
                    font-family: sans-serif;
                ">
            </div>
            
            <div class="form-group" style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #333;">Категория *</label>
                <select id="adCategory" style="
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    box-sizing: border-box;
                    font-family: sans-serif;
                ">
                    <option value="Жидкости">Жидкость</option>
                    <option value="Одноразовые">Одноразово</option>
                    <option value="Под-системы">Под-системы</option>
                    <option value="Расходники">Расходники</option>
                </select>
            </div>
            
            <div class="form-group" style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #333;">Цена (₽) *</label>
                <input type="number" id="adPrice" min="1" placeholder="1000" required style="
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    box-sizing: border-box;
                    font-family: sans-serif;
                ">
            </div>
            
            <div class="form-group" style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #333;">Описание *</label>
                <textarea id="adDescription" rows="4" placeholder="Опишите товар..." maxlength="500" style="
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    box-sizing: border-box;
                    resize: vertical;
                    font-family: sans-serif;
                "></textarea>
                <small id="charCount" style="color: #666; font-size: 12px;">0/500 символов</small>
            </div>
            
            <div class="form-group" style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #333;">Контакт (Telegram)</label>
                <input type="text" id="adContact" value="${currentUser?.username || ''}" placeholder="@username" style="
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    box-sizing: border-box;
                    font-family: sans-serif;
                ">
            </div>
            
            <div class="form-group" style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #333;">Фотографии (до 3 штук)</label>
                <input type="file" id="adPhotos" multiple accept="image/*" style="
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    box-sizing: border-box;
                    font-family: sans-serif;
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
                    color: #333;
                    border-radius: 6px;
                    cursor: pointer;
                    font-family: sans-serif;
                    font-weight: 500;
                ">Отмена</button>
                <button onclick="submitAdForm()" style="
                    padding: 10px 20px;
                    border: none;
                    background: #6B21A8;
                    color: white;
                    border-radius: 6px;
                    cursor: pointer;
                    font-family: sans-serif;
                    font-weight: 500;
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
                    border: 1px solid #ddd;
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
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0;
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

// ============================================
// 5. ИНИЦИАЛИЗАЦИЯ UI
// ============================================

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
    
    // Если элементы не найдены, создаем базовую структуру
    if (!navMain || !navProfile || !navFAQ || !createAdBtn) {
        console.warn('⚠️ Элементы навигации не найдены, создаем базовый UI');
        createBasicUI();
        return;
    }
    
    // Настраиваем кнопки навигации
    navMain.addEventListener('click', showMainScreen);
    navProfile.addEventListener('click', showProfileScreen);
    navFAQ.addEventListener('click', loadFAQ);
    
    // Кнопка создания объявления
    createAdBtn.addEventListener('click', showCreateAdForm);
    
    // Кнопки фильтрации
    const filterButtons = document.querySelectorAll('.filter-btn');
    console.log(`🔍 Найдено кнопок фильтрации: ${filterButtons.length}`);
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            const category = e.target.dataset.category;
            console.log(`🎯 Выбрана категория: ${category}`);
            filterAdsByCategory(category);
        });
    });
    
    console.log('✅ UI инициализирован');
}

// Создание базового UI если элементы не найдены
function createBasicUI() {
    console.log('🔨 Создание базового UI...');
    
    // Проверяем наличие контейнеров
    if (!document.getElementById('mainScreen')) {
        document.body.innerHTML = `
            <div style="padding: 20px; font-family: sans-serif;">
                <h1 style="color: #6B21A8;">Vape Market</h1>
                <div class="nav-buttons" style="margin: 20px 0; display: flex; gap: 10px;">
                    <button id="navMain" style="padding: 10px 20px; background: #6B21A8; color: white; border: none; border-radius: 6px; cursor: pointer;">🏠 Главная</button>
                    <button id="navProfile" style="padding: 10px 20px; background: #6B21A8; color: white; border: none; border-radius: 6px; cursor: pointer;">👤 Профиль</button>
                    <button id="navFAQ" style="padding: 10px 20px; background: #6B21A8; color: white; border: none; border-radius: 6px; cursor: pointer;">❓ Помощь</button>
                </div>
                
                <div id="mainScreen">
                    <div class="filters" style="margin: 20px 0; display: flex; gap: 10px; flex-wrap: wrap;">
                        <button class="filter-btn" data-category="all" style="padding: 8px 16px; background: #f3e8ff; color: #6B21A8; border: 1px solid #ddd; border-radius: 6px; cursor: pointer;">Все</button>
                        <button class="filter-btn" data-category="Жидкости" style="padding: 8px 16px; background: #f3e8ff; color: #6B21A8; border: 1px solid #ddd; border-radius: 6px; cursor: pointer;">Жидкость</button>
                        <button class="filter-btn" data-category="Одноразовые" style="padding: 8px 16px; background: #f3e8ff; color: #6B21A8; border: 1px solid #ddd; border-radius: 6px; cursor: pointer;">Одноразово</button>
                        <button class="filter-btn" data-category="Под-системы" style="padding: 8px 16px; background: #f3e8ff; color: #6B21A8; border: 1px solid #ddd; border-radius: 6px; cursor: pointer;">Под-системы</button>
                        <button class="filter-btn" data-category="Расходники" style="padding: 8px 16px; background: #f3e8ff; color: #6B21A8; border: 1px solid #ddd; border-radius: 6px; cursor: pointer;">Расходники</button>
                    </div>
                    
                    <button id="createAdBtn" style="padding: 12px 24px; background: #6B21A8; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; margin-bottom: 20px;">+ Новое объявление</button>
                    
                    <div id="adsContainer"></div>
                </div>
                
                <div id="profileScreen" style="display: none;">
                    <h2>Мой профиль</h2>
                    <div id="profileContent"></div>
                </div>
                
                <div id="faqScreen" style="display: none;">
                    <h2>Помощь и FAQ</h2>
                    <div id="faqContent"></div>
                </div>
                
                <div id="adminScreen" style="display: none;">
                    <h2>Админ-панель</h2>
                    <div id="adminContent"></div>
                </div>
            </div>
        `;
        
        // После создания UI, снова инициализируем
        setTimeout(initializeUI, 100);
    }
}

// ============================================
// 6. FIREBASE ИНИЦИАЛИЗАЦИЯ
// ============================================

function initializeFirebase() {
    try {
        console.log('🚀 Инициализация Firebase...');
        
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase не загружен. Проверьте CDN в index.html');
        }
        
        // Проверяем конфигурацию
        if (typeof firebaseConfig === 'undefined') {
            throw new Error('Конфигурация Firebase не загружена');
        }
        
        // Пытаемся получить существующее приложение
        try {
            const existingApp = firebase.app();
            console.log('✅ Firebase уже инициализирован ранее');
            return {
                auth: firebase.auth(),
                database: firebase.database()
            };
        } catch (error) {
            // Если нет существующего приложения - создаем новое
            console.log('🔥 Создание нового Firebase приложения...');
            firebase.initializeApp(firebaseConfig);
            console.log('✅ Firebase успешно инициализирован');
            return {
                auth: firebase.auth(),
                database: firebase.database()
            };
        }
    } catch (error) {
        console.error('❌ Ошибка инициализации Firebase:', error);
        throw error;
    }
}

// ============================================
// 7. TELEGRAM ИНИЦИАЛИЗАЦИЯ (ОБНОВЛЕННАЯ)
// ============================================

function initializeTelegram() {
    try {
        console.log('🤖 Инициализация Telegram Web App...');
        
        // Проверяем загрузку Telegram SDK
        if (typeof Telegram === 'undefined') {
            console.warn('⚠️ Telegram SDK не загружен');
            
            // Создаем тестовые данные для разработки
            const testUser = {
                id: 998579758,
                first_name: "Тестовый",
                last_name: "Пользователь",
                username: "test_user_998579758",
                photo_url: "",
                language_code: "ru"
            };
            
            console.log('✅ Созданы тестовые данные пользователя:', testUser);
            return testUser;
        }
        
        // Проверяем наличие WebApp
        if (!Telegram.WebApp) {
            console.warn('⚠️ Telegram.WebApp не доступен');
            
            const testUser = {
                id: 998579758,
                first_name: "Тестовый",
                last_name: "Пользователь",
                username: "test_user_998579758",
                photo_url: "",
                language_code: "ru"
            };
            
            return testUser;
        }
        
        const tg = Telegram.WebApp;
        
        // Настраиваем интерфейс
        try {
            tg.expand();
            tg.setHeaderColor('#6B21A8');
            tg.setBackgroundColor('#6B21A8');
            tg.enableClosingConfirmation();
        } catch (uiError) {
            console.warn('⚠️ Ошибка настройки UI Telegram:', uiError);
        }
        
        console.log('✅ Telegram Web App инициализирован');
        
        // Проверяем наличие данных пользователя
        if (!tg.initDataUnsafe || !tg.initDataUnsafe.user) {
            console.warn('⚠️ Данные пользователя Telegram не доступны. Используем тестовые данные.');
            
            // Создаем тестовые данные
            const testUser = {
                id: 998579758,
                first_name: "Тестовый",
                last_name: "Пользователь",
                username: "test_user_998579758",
                photo_url: "",
                language_code: "ru"
            };
            
            return testUser;
        }
        
        console.log('✅ Данные Telegram пользователя получены:', tg.initDataUnsafe.user);
        return tg.initDataUnsafe.user;
        
    } catch (error) {
        console.error('❌ Ошибка инициализации Telegram:', error);
        
        // Всегда возвращаем тестовые данные при ошибке
        const testUser = {
            id: 998579758,
            first_name: "Ошибка",
            last_name: "Инициализации",
            username: "error_user_998579758",
            photo_url: "",
            language_code: "ru"
        };
        
        console.log('✅ Используем тестовые данные из-за ошибки:', testUser);
        return testUser;
    }
}

// ============================================
// 8. ПОЛЬЗОВАТЕЛИ (ОБНОВЛЕННАЯ)
// ============================================

async function getOrCreateUser(tgUser, firebase) {
    try {
        const { database } = firebase;
        const userId = tgUser.id.toString();
        
        console.log(`👤 Работа с пользователем ID: ${userId}`);
        
        const userRef = database.ref(`users/${userId}`);
        const snapshot = await userRef.once('value');
        
        if (snapshot.exists()) {
            const userData = snapshot.val();
            console.log('✅ Пользователь найден в базе:', userData.username);
            
            // Обновляем время последнего входа
            await userRef.update({ lastSeen: Date.now() });
            
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
            console.log('✅ Новый пользователь создан:', newUser.username);
            
            return newUser;
        }
    } catch (error) {
        console.error('❌ Ошибка при работе с пользователем:', error);
        
        // Создаем локального пользователя при ошибке
        const localUser = {
            id: tgUser.id.toString(),
            firstName: tgUser.first_name || '',
            lastName: tgUser.last_name || '',
            username: tgUser.username ? `@${tgUser.username}` : '@test_user',
            rating: 0,
            adsCount: 0,
            likesCount: 0,
            dislikesCount: 0,
            blocked: false,
            verified: false
        };
        
        console.log('✅ Создан локальный пользователь из-за ошибки:', localUser);
        return localUser;
    }
}

async function authenticateUser() {
    try {
        console.log('🔐 Начало авторизации пользователя...');
        
        // 1. Инициализируем Firebase
        const firebase = initializeFirebase();
        
        // 2. Получаем данные пользователя (из Telegram или тестовые)
        const tgUser = initializeTelegram();
        
        console.log('👤 Получены данные пользователя:', tgUser);
        
        // 3. Получаем или создаем пользователя в Firebase
        const user = await getOrCreateUser(tgUser, firebase);
        
        // 4. Проверяем блокировку
        if (user.blocked) {
            console.warn('🚫 Пользователь заблокирован');
            showBlockedScreen();
            return null;
        }
        
        // 5. Сохраняем пользователя
        currentUser = user;
        console.log('✅ Текущий пользователь установлен:', currentUser.username);
        
        // 6. Анонимная авторизация Firebase
        try {
            await firebase.auth().signInAnonymously();
            console.log('✅ Анонимная авторизация Firebase выполнена');
        } catch (authError) {
            console.warn('⚠️ Ошибка анонимной авторизации Firebase:', authError);
            // Продолжаем работу даже без анонимной авторизации
        }
        
        console.log('🎉 Пользователь успешно авторизован:', user.username);
        return user;
        
    } catch (error) {
        console.error('❌ Критическая ошибка авторизации:', error);
        
        // Создаем тестового пользователя для продолжения работы
        const testUser = {
            id: '998579758',
            firstName: 'Тестовый',
            lastName: 'Пользователь',
            username: '@test_user_998579758',
            rating: 4.5,
            adsCount: 0,
            likesCount: 0,
            dislikesCount: 0,
            blocked: false,
            verified: false
        };
        
        currentUser = testUser;
        console.log('✅ Создан тестовый пользователь для продолжения работы:', testUser);
        
        return testUser;
    }
}

// ============================================
// 9. СИСТЕМА ОБЪЯВЛЕНИЙ
// ============================================

async function loadAllAds() {
    try {
        console.log('📦 Начало загрузки объявлений...');
        showLoading(true);
        
        const db = firebase.database();
        const adsRef = db.ref('ads');
        
        const snapshot = await adsRef.orderByChild('createdAt').once('value');
        
        if (!snapshot.exists()) {
            console.log('📭 Нет объявлений в базе данных');
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
        
        // Сортируем по дате (новые сверху)
        ads.sort((a, b) => b.createdAt - a.createdAt);
        allAds = ads;
        
        console.log(`✅ Загружено ${ads.length} объявлений`);
        renderAds(ads);
        
        return ads;
    } catch (error) {
        console.error('❌ Ошибка загрузки объявлений:', error);
        showError('Не удалось загрузить объявления. Проверьте подключение к интернету.');
        
        // Показываем тестовые объявления при ошибке
        showTestAds();
        return [];
    } finally {
        showLoading(false);
    }
}

// Показать тестовые объявления при ошибке
function showTestAds() {
    console.log('🔄 Показываем тестовые объявления...');
    
    const testAds = [
        {
            id: 'test1',
            title: 'Тестовое объявление 1',
            category: 'Жидкости',
            price: 1500,
            description: 'Это тестовое объявление для демонстрации.',
            sellerName: 'Тестовый Продавец',
            sellerUsername: '@test_seller',
            sellerRating: 4.5,
            likes: 5,
            dislikes: 1,
            verified: true,
            photoUrls: []
        },
        {
            id: 'test2',
            title: 'Тестовое объявление 2',
            category: 'Одноразовые',
            price: 2000,
            description: 'Еще одно тестовое объявление.',
            sellerName: 'Другой Продавец',
            sellerUsername: '@another_seller',
            sellerRating: 4.0,
            likes: 3,
            dislikes: 0,
            verified: false,
            photoUrls: []
        }
    ];
    
    allAds = testAds;
    renderAds(testAds);
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
            sellerName: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'Аноним',
            sellerUsername: currentUser.username || '@anonymous',
            title: adData.title,
            category: adData.category,
            price: parseInt(adData.price),
            description: adData.description,
            contact: adData.contact || currentUser.username || '@anonymous',
            photoUrls: adData.photoUrls || [],
            likes: 0,
            dislikes: 0,
            complaints: 0,
            verified: false,
            blocked: false,
            createdAt: Date.now()
        };
        
        await newAdRef.set(newAd);
        console.log('✅ Объявление создано в Firebase:', newAd.id);
        
        // Обновляем счетчик объявлений пользователя
        if (currentUser.id) {
            try {
                const userRef = db.ref(`users/${currentUser.id}/adsCount`);
                const snapshot = await userRef.once('value');
                const currentCount = snapshot.val() || 0;
                await userRef.set(currentCount + 1);
                
                // Обновляем локальные данные пользователя
                currentUser.adsCount = currentCount + 1;
            } catch (userError) {
                console.warn('⚠️ Не удалось обновить счетчик объявлений:', userError);
            }
        }
        
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

function renderAds(ads) {
    const adsContainer = document.getElementById('adsContainer');
    
    if (!adsContainer) {
        console.error('❌ Не найден контейнер объявлений');
        return;
    }
    
    if (!ads || ads.length === 0) {
        adsContainer.innerHTML = `
            <div style="
                text-align: center;
                padding: 40px 20px;
                color: #666;
                font-family: sans-serif;
            ">
                <p style="font-size: 18px; margin-bottom: 20px;">📭 Объявлений пока нет</p>
                <button onclick="showCreateAdForm()" style="
                    padding: 12px 24px;
                    background: #6B21A8;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: 500;
                ">
                    Создать первое объявление
                </button>
            </div>
        `;
        return;
    }
    
    adsContainer.innerHTML = ads.map(ad => `
        <div class="ad-card" data-id="${ad.id}" style="
            background: white;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            font-family: sans-serif;
            border: 1px solid #f0f0f0;
        ">
            <div class="ad-header" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                flex-wrap: wrap;
                gap: 10px;
            ">
                <span class="ad-category" style="
                    background: #f3e8ff;
                    color: #6B21A8;
                    padding: 6px 12px;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                ">${appConfig.categoryShort[ad.category] || ad.category}</span>
                
                <div style="display: flex; align-items: center; gap: 10px;">
                    ${ad.verified ? '<span class="ad-verified" style="color: #10b981; font-weight: bold; font-size: 18px;">✓</span>' : ''}
                    <span class="ad-price" style="
                        font-weight: 700;
                        font-size: 22px;
                        color: #6B21A8;
                    ">${ad.price.toLocaleString()} ₽</span>
                </div>
            </div>
            
            <h3 class="ad-title" style="
                margin: 0 0 15px 0;
                font-size: 18px;
                color: #333;
                line-height: 1.4;
            ">${ad.title}</h3>
            
            ${ad.photoUrls && ad.photoUrls.length > 0 ? `
                <div class="ad-photos" style="margin-bottom: 15px;">
                    <img src="${ad.photoUrls[0]}" alt="${ad.title}" loading="lazy" style="
                        width: 100%;
                        height: 200px;
                        object-fit: cover;
                        border-radius: 8px;
                        border: 1px solid #eee;
                    ">
                </div>
            ` : ''}
            
            <p class="ad-description" style="
                margin: 0 0 15px 0;
                color: #666;
                font-size: 15px;
                line-height: 1.6;
            ">${ad.description}</p>
            
            <div class="ad-seller" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                color: #666;
                font-size: 14px;
                padding-top: 15px;
                border-top: 1px solid #f0f0f0;
            ">
                <span style="display: flex; align-items: center; gap: 5px;">
                    👤 ${ad.sellerName}
                </span>
                <span class="seller-rating" style="
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    font-weight: 500;
                ">
                    ⭐ ${ad.sellerRating || '0.0'}
                </span>
            </div>
            
            <div class="ad-actions" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 15px;
            ">
                <div class="rating-buttons" style="display: flex; gap: 10px;">
                    <button onclick="rateAd('${ad.id}', 'like')" style="
                        padding: 10px 20px;
                        border: 2px solid #e0e0e0;
                        background: white;
                        border-radius: 8px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        font-size: 14px;
                        font-weight: 500;
                        color: #555;
                        transition: all 0.2s;
                    " onmouseover="this.style.borderColor='#10b981'; this.style.color='#10b981';" 
                       onmouseout="this.style.borderColor='#e0e0e0'; this.style.color='#555';">
                        👍 ${ad.likes || 0}
                    </button>
                    <button onclick="rateAd('${ad.id}', 'dislike')" style="
                        padding: 10px 20px;
                        border: 2px solid #e0e0e0;
                        background: white;
                        border-radius: 8px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        font-size: 14px;
                        font-weight: 500;
                        color: #555;
                        transition: all 0.2s;
                    " onmouseover="this.style.borderColor='#ef4444'; this.style.color='#ef4444';" 
                       onmouseout="this.style.borderColor='#e0e0e0'; this.style.color='#555';">
                        👎 ${ad.dislikes || 0}
                    </button>
                </div>
                
                ${ad.sellerId !== currentUser?.id ? `
                    <button onclick="contactSeller('${ad.sellerUsername}', '${ad.title}')" style="
                        padding: 10px 20px;
                        background: linear-gradient(135deg, #6B21A8 0%, #9333EA 100%);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        font-size: 14px;
                        font-weight: 600;
                        transition: transform 0.2s;
                    " onmouseover="this.style.transform='translateY(-2px)';" 
                       onmouseout="this.style.transform='translateY(0)';">
                        ✉️ Написать продавцу
                    </button>
                ` : `
                    <div style="color: #666; font-size: 14px; font-style: italic;">
                        Это ваше объявление
                    </div>
                `}
            </div>
        </div>
    `).join('');
    
    console.log(`✅ Отрисовано ${ads.length} объявлений`);
}

// ============================================
// 10. РЕЙТИНГИ
// ============================================

async function rateAd(adId, ratingType) {
    try {
        if (!currentUser) {
            showError('Войдите в систему, чтобы оценивать объявления');
            return false;
        }
        
        const db = firebase.database();
        const adRef = db.ref(`ads/${adId}`);
        const ratingRef = db.ref(`ratings/${adId}/${currentUser.id}`);
        
        const adSnapshot = await adRef.once('value');
        const ad = adSnapshot.val();
        
        if (!ad) {
            showError('Объявление не найдено');
            return false;
        }
        
        if (ad.sellerId === currentUser.id) {
            showError('Нельзя оценивать свои объявления');
            return false;
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
                showSuccess('Лайк отменен');
            } else {
                updates.dislikes = Math.max(0, currentDislikes - 1);
                showSuccess('Дизлайк отменен');
            }
            await ratingRef.remove();
        } else {
            // Новая или измененная оценка
            if (ratingType === 'like') {
                updates.likes = currentLikes + 1;
                updates.dislikes = previousRating === 'dislike' ? Math.max(0, currentDislikes - 1) : currentDislikes;
                showSuccess('Лайк поставлен');
            } else {
                updates.dislikes = currentDislikes + 1;
                updates.likes = previousRating === 'like' ? Math.max(0, currentLikes - 1) : currentLikes;
                showSuccess('Дизлайк поставлен');
            }
            await ratingRef.set(ratingType);
        }
        
        await adRef.update(updates);
        
        // Обновляем рейтинг продавца
        try {
            await updateSellerRating(ad.sellerId);
        } catch (ratingError) {
            console.warn('⚠️ Ошибка обновления рейтинга продавца:', ratingError);
        }
        
        console.log(`✅ Оценка обновлена: ${adId} - ${ratingType}`);
        
        // Обновляем отображение
        if (currentScreen === 'main') {
            await loadAllAds();
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

// ============================================
// 11. ПРОФИЛЬ И ДОПОЛНИТЕЛЬНЫЕ ЭКРАНЫ
// ============================================

function renderProfile() {
    if (!currentUser) {
        document.getElementById('profileContent').innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #666;">
                <p>Пользователь не авторизован</p>
                <button onclick="showMainScreen()" style="
                    padding: 10px 20px;
                    background: #6B21A8;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    margin-top: 20px;
                ">
                    Вернуться на главную
                </button>
            </div>
        `;
        return;
    }
    
    const profileContent = document.getElementById('profileContent');
    if (!profileContent) return;
    
    profileContent.innerHTML = `
        <div class="profile-header" style="
            display: flex;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #f0f0f0;
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
                margin-right: 20px;
                flex-shrink: 0;
            ">${(currentUser.firstName?.[0] || currentUser.username?.[1] || 'U').toUpperCase()}</div>
            <div class="profile-info" style="flex-grow: 1;">
                <h3 style="margin: 0 0 8px 0; color: #333; font-size: 22px;">
                    ${currentUser.firstName || ''} ${currentUser.lastName || ''}
                </h3>
                <p style="margin: 0 0 12px 0; color: #666; font-size: 16px;">
                    ${currentUser.username || 'Без username'}
                </p>
                <div class="rating" style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 20px;">⭐</span>
                    <span style="font-size: 18px; font-weight: 600; color: #f59e0b;">
                        ${currentUser.rating?.toFixed(1) || '0.0'}/5.0
                    </span>
                </div>
            </div>
        </div>
        
        <div class="stats-grid" style="
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin: 30px 0;
        ">
            <div class="stat-item" style="
                background: white;
                padding: 20px;
                border-radius: 12px;
                text-align: center;
                box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                border: 1px solid #f0f0f0;
                transition: transform 0.2s;
            " onmouseover="this.style.transform='translateY(-4px)';" 
               onmouseout="this.style.transform='translateY(0)';">
                <span class="stat-number" style="
                    display: block;
                    font-size: 32px;
                    font-weight: 700;
                    color: #6B21A8;
                    margin-bottom: 8px;
                ">${currentUser.adsCount || 0}</span>
                <span class="stat-label" style="color: #666; font-size: 14px; font-weight: 500;">Объявления</span>
            </div>
            <div class="stat-item" style="
                background: white;
                padding: 20px;
                border-radius: 12px;
                text-align: center;
                box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                border: 1px solid #f0f0f0;
                transition: transform 0.2s;
            " onmouseover="this.style.transform='translateY(-4px)';" 
               onmouseout="this.style.transform='translateY(0)';">
                <span class="stat-number" style="
                    display: block;
                    font-size: 32px;
                    font-weight: 700;
                    color: #10b981;
                    margin-bottom: 8px;
                ">${currentUser.likesCount || 0}</span>
                <span class="stat-label" style="color: #666; font-size: 14px; font-weight: 500;">Лайки</span>
            </div>
            <div class="stat-item" style="
                background: white;
                padding: 20px;
                border-radius: 12px;
                text-align: center;
                box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                border: 1px solid #f0f0f0;
                transition: transform 0.2s;
            " onmouseover="this.style.transform='translateY(-4px)';" 
               onmouseout="this.style.transform='translateY(0)';">
                <span class="stat-number" style="
                    display: block;
                    font-size: 32px;
                    font-weight: 700;
                    color: #ef4444;
                    margin-bottom: 8px;
                ">${currentUser.dislikesCount || 0}</span>
                <span class="stat-label" style="color: #666; font-size: 14px; font-weight: 500;">Дизлайки</span>
            </div>
            <div class="stat-item" style="
                background: white;
                padding: 20px;
                border-radius: 12px;
                text-align: center;
                box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                border: 1px solid #f0f0f0;
                transition: transform 0.2s;
            " onmouseover="this.style.transform='translateY(-4px)';" 
               onmouseout="this.style.transform='translateY(0)';">
                <span class="stat-number" style="
                    display: block;
                    font-size: 32px;
                    font-weight: 700;
                    color: #f59e0b;
                    margin-bottom: 8px;
                ">${currentUser.rating?.toFixed(1) || '0.0'}</span>
                <span class="stat-label" style="color: #666; font-size: 14px; font-weight: 500;">Рейтинг</span>
            </div>
        </div>
        
        <div class="profile-actions" style="margin-top: 30px;">
            <button onclick="loadMyAds()" style="
                width: 100%;
                padding: 16px;
                background: linear-gradient(135deg, #6B21A8 0%, #9333EA 100%);
                color: white;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                margin-bottom: 12px;
                font-size: 16px;
                font-weight: 600;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                transition: transform 0.2s;
            " onmouseover="this.style.transform='translateY(-2px)';" 
               onmouseout="this.style.transform='translateY(0)';">
                📦 Мои объявления
            </button>
            <button onclick="showMainScreen()" style="
                width: 100%;
                padding: 16px;
                background: #f3f4f6;
                color: #4b5563;
                border: 1px solid #e5e7eb;
                border-radius: 10px;
                cursor: pointer;
                font-size: 16px;
                font-weight: 500;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                transition: all 0.2s;
            " onmouseover="this.style.background='#e5e7eb';" 
               onmouseout="this.style.background='#f3f4f6';">
                ↩️ На главную
            </button>
        </div>
    `;
}

function renderFAQ() {
    const faqContent = document.getElementById('faqContent');
    if (!faqContent) return;
    
    faqContent.innerHTML = `
        <div class="faq-section" style="margin-bottom: 40px;">
            <h3 style="margin-bottom: 25px; color: #333; font-size: 24px;">❓ Частые вопросы</h3>
            
            <div class="faq-item" style="
                background: white;
                padding: 25px;
                border-radius: 12px;
                margin-bottom: 15px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                border: 1px solid #f0f0f0;
                transition: transform 0.2s;
            " onmouseover="this.style.transform='translateY(-2px)';" 
               onmouseout="this.style.transform='translateY(0)';">
                <h4 style="margin: 0 0 15px 0; color: #6B21A8; font-size: 18px;">Как создать объявление?</h4>
                <p style="margin: 0; color: #666; font-size: 15px; line-height: 1.6;">
                    Нажмите кнопку "Новое объявление" на главной странице, заполните все обязательные поля 
                    (название, категория, цена, описание) и нажмите "Опубликовать". Вы можете добавить до 3 фотографий.
                </p>
            </div>
            
            <div class="faq-item" style="
                background: white;
                padding: 25px;
                border-radius: 12px;
                margin-bottom: 15px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                border: 1px solid #f0f0f0;
                transition: transform 0.2s;
            " onmouseover="this.style.transform='translateY(-2px)';" 
               onmouseout="this.style.transform='translateY(0)';">
                <h4 style="margin: 0 0 15px 0; color: #6B21A8; font-size: 18px;">Сколько стоит размещение объявления?</h4>
                <p style="margin: 0; color: #666; font-size: 15px; line-height: 1.6;">
                    Размещение объявлений на нашей платформе полностью бесплатно. Мы не берем комиссию с продаж.
                </p>
            </div>
            
            <div class="faq-item" style="
                background: white;
                padding: 25px;
                border-radius: 12px;
                margin-bottom: 15px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                border: 1px solid #f0f0f0;
                transition: transform 0.2s;
            " onmouseover="this.style.transform='translateY(-2px)';" 
               onmouseout="this.style.transform='translateY(0)';">
                <h4 style="margin: 0 0 15px 0; color: #6B21A8; font-size: 18px;">Как связаться с продавцом?</h4>
                <p style="margin: 0; color: #666; font-size: 15px; line-height: 1.6;">
                    Нажмите кнопку "Написать продавцу" на карточке объявления. Откроется чат в Telegram 
                    с заранее подготовленным сообщением о заинтересованности товаром.
                </p>
            </div>
        </div>
        
        <div class="stats-section">
            <h3 style="margin-bottom: 25px; color: #333; font-size: 24px;">📊 Статистика платформы</h3>
            <div id="serverStats" style="
                background: white;
                padding: 25px;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                border: 1px solid #f0f0f0;
            ">
                <div style="text-align: center; color: #666; font-size: 16px;">
                    <div class="loading" style="display: inline-block;">
                        <div style="
                            width: 40px;
                            height: 40px;
                            border: 4px solid #f3f4f6;
                            border-top-color: #6B21A8;
                            border-radius: 50%;
                            animation: spin 1s linear infinite;
                            margin: 0 auto 15px;
                        "></div>
                        <p>Загрузка статистики...</p>
                    </div>
                </div>
            </div>
        </div>
        
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
    
    // Загружаем статистику
    setTimeout(loadServerStats, 500);
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
        
        const serverStatsDiv = document.getElementById('serverStats');
        if (serverStatsDiv) {
            serverStatsDiv.innerHTML = `
                <div class="stats-grid" style="
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 20px;
                ">
                    <div class="stat-item" style="
                        background: #f8fafc;
                        padding: 20px;
                        border-radius: 10px;
                        text-align: center;
                        border: 1px solid #e2e8f0;
                    ">
                        <span class="stat-number" style="
                            display: block;
                            font-size: 28px;
                            font-weight: 700;
                            color: #6B21A8;
                            margin-bottom: 8px;
                        ">${stats.totalUsers}</span>
                        <span class="stat-label" style="color: #64748b; font-size: 14px; font-weight: 500;">Всего пользователей</span>
                    </div>
                    <div class="stat-item" style="
                        background: #f8fafc;
                        padding: 20px;
                        border-radius: 10px;
                        text-align: center;
                        border: 1px solid #e2e8f0;
                    ">
                        <span class="stat-number" style="
                            display: block;
                            font-size: 28px;
                            font-weight: 700;
                            color: #10b981;
                            margin-bottom: 8px;
                        ">${stats.onlineUsers}</span>
                        <span class="stat-label" style="color: #64748b; font-size: 14px; font-weight: 500;">Онлайн сейчас</span>
                    </div>
                    <div class="stat-item" style="
                        background: #f8fafc;
                        padding: 20px;
                        border-radius: 10px;
                        text-align: center;
                        border: 1px solid #e2e8f0;
                    ">
                        <span class="stat-number" style="
                            display: block;
                            font-size: 28px;
                            font-weight: 700;
                            color: #f59e0b;
                            margin-bottom: 8px;
                        ">${stats.totalAds}</span>
                        <span class="stat-label" style="color: #64748b; font-size: 14px; font-weight: 500;">Всего объявлений</span>
                    </div>
                    <div class="stat-item" style="
                        background: #f8fafc;
                        padding: 20px;
                        border-radius: 10px;
                        text-align: center;
                        border: 1px solid #e2e8f0;
                    ">
                        <span class="stat-number" style="
                            display: block;
                            font-size: 28px;
                            font-weight: 700;
                            color: #8b5cf6;
                            margin-bottom: 8px;
                        ">${new Date().getFullYear()}</span>
                        <span class="stat-label" style="color: #64748b; font-size: 14px; font-weight: 500;">Год основания</span>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки статистики сервера:', error);
        const serverStatsDiv = document.getElementById('serverStats');
        if (serverStatsDiv) {
            serverStatsDiv.innerHTML = `
                <div style="text-align: center; color: #666; padding: 20px;">
                    <p style="margin-bottom: 10px;">Не удалось загрузить статистику</p>
                    <button onclick="loadServerStats()" style="
                        padding: 8px 16px;
                        background: #6B21A8;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                    ">
                        Попробовать снова
                    </button>
                </div>
            `;
        }
    }
}

function renderAdminPanel() {
    const adminContent = document.getElementById('adminContent');
    if (!adminContent) return;
    
    adminContent.innerHTML = `
        <div class="admin-section">
            <h3 style="margin-bottom: 25px; color: #333; font-size: 24px;">⚙️ Администрирование</h3>
            
            <div class="admin-stats" id="adminStats">
                <div style="text-align: center; padding: 30px; color: #666;">
                    <div style="
                        width: 40px;
                        height: 40px;
                        border: 4px solid #f3f4f6;
                        border-top-color: #6B21A8;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 15px;
                    "></div>
                    Загрузка статистики...
                </div>
            </div>
            
            <div class="admin-actions" style="margin: 30px 0;">
                <button onclick="loadAdminAds()" style="
                    width: 100%;
                    padding: 18px;
                    background: linear-gradient(135deg, #6B21A8 0%, #9333EA 100%);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    cursor: pointer;
                    margin-bottom: 15px;
                    font-size: 16px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    transition: transform 0.2s;
                " onmouseover="this.style.transform='translateY(-2px)';" 
                   onmouseout="this.style.transform='translateY(0)';">
                    📋 Модерация объявлений
                </button>
                <button onclick="loadAdminUsers()" style="
                    width: 100%;
                    padding: 18px;
                    background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    cursor: pointer;
                    margin-bottom: 15px;
                    font-size: 16px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    transition: transform 0.2s;
                " onmouseover="this.style.transform='translateY(-2px)';" 
                   onmouseout="this.style.transform='translateY(0)';">
                    👥 Управление пользователями
                </button>
                <button onclick="loadComplaints()" style="
                    width: 100%;
                    padding: 18px;
                    background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    cursor: pointer;
                    margin-bottom: 15px;
                    font-size: 16px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    transition: transform 0.2s;
                " onmouseover="this.style.transform='translateY(-2px)';" 
                   onmouseout="this.style.transform='translateY(0)';">
                    ⚠️ Обработка жалоб
                </button>
            </div>
        </div>
    `;
    
    // Загружаем статистику для админа
    setTimeout(loadAdminStats, 500);
}

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
        
        // Считаем активные объявления
        if (adsSnapshot.exists()) {
            adsSnapshot.forEach((child) => {
                const ad = child.val();
                if (!ad.blocked) {
                    stats.activeAds++;
                }
            });
        }
        
        // Считаем заблокированных и верифицированных пользователей
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
                <div class="stats-grid" style="
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 20px;
                ">
                    <div class="stat-item" style="
                        background: #f8fafc;
                        padding: 20px;
                        border-radius: 10px;
                        text-align: center;
                        border: 1px solid #e2e8f0;
                    ">
                        <span class="stat-number" style="
                            display: block;
                            font-size: 28px;
                            font-weight: 700;
                            color: #6B21A8;
                            margin-bottom: 8px;
                        ">${stats.totalUsers}</span>
                        <span class="stat-label" style="color: #64748b; font-size: 14px; font-weight: 500;">Пользователи</span>
                    </div>
                    <div class="stat-item" style="
                        background: #f8fafc;
                        padding: 20px;
                        border-radius: 10px;
                        text-align: center;
                        border: 1px solid #e2e8f0;
                    ">
                        <span class="stat-number" style="
                            display: block;
                            font-size: 28px;
                            font-weight: 700;
                            color: #ef4444;
                            margin-bottom: 8px;
                        ">${stats.blockedUsers}</span>
                        <span class="stat-label" style="color: #64748b; font-size: 14px; font-weight: 500;">Заблокировано</span>
                    </div>
                    <div class="stat-item" style="
                        background: #f8fafc;
                        padding: 20px;
                        border-radius: 10px;
                        text-align: center;
                        border: 1px solid #e2e8f0;
                    ">
                        <span class="stat-number" style="
                            display: block;
                            font-size: 28px;
                            font-weight: 700;
                            color: #10b981;
                            margin-bottom: 8px;
                        ">${stats.activeAds}</span>
                        <span class="stat-label" style="color: #64748b; font-size: 14px; font-weight: 500;">Активные объявления</span>
                    </div>
                    <div class="stat-item" style="
                        background: #f8fafc;
                        padding: 20px;
                        border-radius: 10px;
                        text-align: center;
                        border: 1px solid #e2e8f0;
                    ">
                        <span class="stat-number" style="
                            display: block;
                            font-size: 28px;
                            font-weight: 700;
                            color: #f59e0b;
                            margin-bottom: 8px;
                        ">${stats.totalComplaints}</span>
                        <span class="stat-label" style="color: #64748b; font-size: 14px; font-weight: 500;">Жалоб</span>
                    </div>
                    <div class="stat-item" style="
                        background: #f8fafc;
                        padding: 20px;
                        border-radius: 10px;
                        text-align: center;
                        border: 1px solid #e2e8f0;
                        grid-column: span 2;
                    ">
                        <span class="stat-number" style="
                            display: block;
                            font-size: 28px;
                            font-weight: 700;
                            color: #8b5cf6;
                            margin-bottom: 8px;
                        ">${stats.verifiedUsers}</span>
                        <span class="stat-label" style="color: #64748b; font-size: 14px; font-weight: 500;">Верифицированных пользователей</span>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки статистики:', error);
        const adminStatsDiv = document.getElementById('adminStats');
        if (adminStatsDiv) {
            adminStatsDiv.innerHTML = `
                <div style="text-align: center; color: #ef4444; padding: 20px;">
                    <p>Не удалось загрузить статистику: ${error.message}</p>
                    <button onclick="loadAdminStats()" style="
                        padding: 8px 16px;
                        background: #6B21A8;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        margin-top: 10px;
                    ">
                        Попробовать снова
                    </button>
                </div>
            `;
        }
    }
}

// ============================================
// 12. ФУНКЦИИ ОШИБОК
// ============================================

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
            font-family: sans-serif;
        ">
            <div style="background: white; padding: 30px; border-radius: 16px; max-width: 400px; width: 100%;">
                <h2 style="margin-bottom: 20px; color: #6B21A8;">⚠️ Ошибка загрузки</h2>
                <p style="margin-bottom: 25px; color: #666; line-height: 1.6;">${message}</p>
                <button onclick="location.reload()" style="
                    padding: 14px 30px;
                    border: none;
                    background: #6B21A8;
                    color: white;
                    border-radius: 10px;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 16px;
                    width: 100%;
                    transition: background 0.2s;
                " onmouseover="this.style.background='#7c3aed';" 
                   onmouseout="this.style.background='#6B21A8';">
                    🔄 Обновить страницу
                </button>
                <p style="margin-top: 20px; font-size: 12px; color: #999;">
                    Если ошибка повторяется, обратитесь к администратору
                </p>
            </div>
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
            font-family: sans-serif;
        ">
            <div style="background: white; padding: 30px; border-radius: 16px; max-width: 400px; width: 100%;">
                <h2 style="margin-bottom: 20px; color: #DC2626;">🚫 Доступ запрещен</h2>
                <p style="margin-bottom: 15px; color: #666; line-height: 1.6;">
                    Ваш аккаунт заблокирован администрацией.
                </p>
                <p style="margin-bottom: 25px; color: #666; line-height: 1.6;">
                    По вопросам разблокировки обратитесь к администратору через Telegram: @nukm0
                </p>
                <button onclick="location.reload()" style="
                    padding: 14px 30px;
                    border: 1px solid #DC2626;
                    background: white;
                    color: #DC2626;
                    border-radius: 10px;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 16px;
                    width: 100%;
                    transition: all 0.2s;
                " onmouseover="this.style.background='#DC2626'; this.style.color='white';" 
                   onmouseout="this.style.background='white'; this.style.color='#DC2626';">
                    🔄 Попробовать снова
                </button>
            </div>
        </div>
    `;
}

// ============================================
// 13. ЗАГЛУШКИ ДЛЯ НЕРЕАЛИЗОВАННЫХ ФУНКЦИЙ
// ============================================

function loadMyAds() {
    showError('Функция "Мои объявления" находится в разработке');
}

function loadAdminAds() {
    showError('Функция "Модерация объявлений" находится в разработке');
}

function loadAdminUsers() {
    showError('Функция "Управление пользователями" находится в разработке');
}

function loadComplaints() {
    showError('Функция "Обработка жалоб" находится в разработке');
}

function moderateAd(adId, action) {
    showError('Функция модерации находится в разработке');
}

// ============================================
// 14. ГЛАВНАЯ ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ
// ============================================

async function initializeApp() {
    try {
        console.log('🚀 Начало инициализации приложения...');
        
        // 1. Проверяем Firebase
        console.log('🔍 Проверка Firebase...');
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase не загружен. Проверьте CDN в index.html');
        }
        console.log('✅ Firebase доступен');
        
        // 2. Проверяем конфигурацию
        if (typeof firebaseConfig === 'undefined') {
            throw new Error('Конфигурация Firebase не загружена. Проверьте config.js');
        }
        console.log('✅ Конфигурация Firebase загружена');
        
        // 3. Проверяем конфигурацию приложения
        if (typeof appConfig === 'undefined') {
            throw new Error('Конфигурация приложения не загружена. Проверьте config.js');
        }
        console.log('✅ Конфигурация приложения загружена');
        
        // 4. Инициализируем UI
        console.log('🎨 Инициализация UI...');
        initializeUI();
        
        // 5. Авторизуем пользователя
        console.log('🔐 Авторизация пользователя...');
        const user = await authenticateUser();
        
        if (!user) {
            console.warn('⚠️ Пользователь не авторизован, продолжаем с тестовым пользователем');
            currentUser = {
                id: '998579758',
                firstName: 'Тестовый',
                lastName: 'Пользователь',
                username: '@test_user',
                rating: 0,
                adsCount: 0,
                likesCount: 0,
                dislikesCount: 0
            };
        } else {
            console.log('✅ Пользователь авторизован:', user.username);
        }
        
        // 6. Загружаем объявления
        console.log('📦 Загрузка объявлений...');
        await loadAllAds();
        
        // 7. Показываем главный экран
        showMainScreen();
        
        console.log('🎉 Приложение успешно инициализировано!');
        console.log('👤 Текущий пользователь:', currentUser);
        console.log('📊 Загружено объявлений:', allAds.length);
        
        // Показываем приветственное сообщение
        setTimeout(() => {
            showSuccess(`Добро пожаловать в Vape Market, ${currentUser.firstName || 'Пользователь'}!`);
        }, 1000);
        
    } catch (error) {
        console.error('❌ Критическая ошибка инициализации:', error);
        console.error('🔍 Подробности:', error.message);
        console.error('📋 Stack trace:', error.stack);
        
        // Показываем дружелюбный экран ошибки
        showErrorScreen(`
            Не удалось загрузить приложение.
            
            Возможные причины:
            • Отсутствует подключение к интернету
            • Проблемы с сервером Firebase
            • Ошибка загрузки ресурсов
            
            Попробуйте обновить страницу или обратитесь в поддержку.
            
            Техническая информация: ${error.message}
        `);
    }
}

// ============================================
// 15. ГЛОБАЛЬНЫЙ ДЕБАГ И ПРОВЕРКИ
// ============================================

// Добавляем глобальные функции для отладки
window.debugApp = {
    reload: function() {
        location.reload();
    },
    clearCache: function() {
        localStorage.clear();
        sessionStorage.clear();
        location.reload();
    },
    showUser: function() {
        console.log('👤 Текущий пользователь:', currentUser);
        alert(`Текущий пользователь: ${currentUser?.username || 'Не авторизован'}`);
    },
    showAds: function() {
        console.log('📦 Все объявления:', allAds);
        alert(`Загружено объявлений: ${allAds.length}`);
    },
    testFirebase: async function() {
        try {
            const firebase = initializeFirebase();
            const db = firebase.database();
            const testRef = db.ref('testConnection');
            await testRef.set({ timestamp: Date.now(), test: 'success' });
            console.log('✅ Firebase тест: успешно');
            showSuccess('Firebase подключен успешно!');
        } catch (error) {
            console.error('❌ Firebase тест: ошибка', error);
            showError('Ошибка подключения к Firebase: ' + error.message);
        }
    }
};

// Выводим информацию о версии при загрузке
console.log('================================');
console.log('🚀 Vape Market App Initialized');
console.log('📅 ' + new Date().toLocaleString());
console.log('👤 User ID: 998579758 (тестовый)');
console.log('================================');
