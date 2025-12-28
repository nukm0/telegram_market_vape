// Авторизация через Telegram
let tg = window.Telegram.WebApp;
let userData = null;

async function initializeAuth() {
    if (!tg.initData) {
        showNotification('Ошибка авторизации', 'error');
        return false;
    }

    try {
        tg.expand();
        tg.enableClosingConfirmation();
        
        // Получаем данные пользователя из Telegram
        const tgUser = tg.initDataUnsafe.user;
        
        if (!tgUser) {
            throw new Error('Данные пользователя не получены');
        }

        userData = {
            id: tgUser.id,
            firstName: tgUser.first_name,
            lastName: tgUser.last_name || '',
            username: tgUser.username || `user_${tgUser.id}`,
            photoUrl: tgUser.photo_url || '',
            languageCode: tgUser.language_code || 'ru'
        };

        // Проверяем, есть ли пользователь в базе
        const userInDb = await getData(`users/${userData.id}`);
        
        if (!userInDb) {
            // Регистрируем нового пользователя
            await registerUser();
        } else {
            // Обновляем данные существующего пользователя
            currentUser = userInDb;
            await updateUserData();
        }

        // Проверяем блокировку
        if (currentUser?.blocked) {
            showBlockedScreen();
            return false;
        }

        // Показываем/скрываем админ-панель
        toggleAdminPanel();
        
        return true;
    } catch (error) {
        console.error('Ошибка авторизации:', error);
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

function showBlockedScreen() {
    document.body.innerHTML = `
        <div class="blocked-screen">
            <div class="blocked-content">
                <i class="fas fa-ban"></i>
                <h2>Аккаунт заблокирован</h2>
                <p>Ваш аккаунт был заблокирован администратором.</p>
                <p>По вопросам разблокировки обратитесь к @nukm0</p>
            </div>
        </div>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        .blocked-screen {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background-color: var(--bg-color);
        }
        .blocked-content {
            text-align: center;
            padding: 40px;
            max-width: 400px;
        }
        .blocked-content i {
            font-size: 4rem;
            color: var(--danger-color);
            margin-bottom: 20px;
        }
        .blocked-content h2 {
            color: var(--danger-color);
            margin-bottom: 16px;
        }
        .blocked-content p {
            color: var(--text-secondary);
            margin-bottom: 8px;
        }
    `;
    document.head.appendChild(style);
}

function toggleAdminPanel() {
    const adminLink = document.getElementById('admin-link');
    if (adminLink && appConfig.adminIds.includes(parseInt(userData.id))) {
        adminLink.style.display = 'flex';
    }
}

// Экспортируем данные пользователя
function getCurrentUser() {
    return currentUser;
}

function getUserId() {
    return userData?.id;
}

function isAdmin() {
    return appConfig.adminIds.includes(parseInt(userData?.id || 0));
}
