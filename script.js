// ==================== КОНФИГУРАЦИЯ ====================
// ВАШИ РЕАЛЬНЫЕ ДАННЫЕ
const BOT_TOKEN = '8532550864:AAFrwxWfJF836SVnDGVa73xT5BlrfgapWVw';
const YOUR_CHAT_ID = '998579758';
const SERVER_URL = 'https://telegram-market-vape.vercel.app';

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let allAds = []; // Здесь хранятся все загруженные объявления

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

// Функция загрузки объявлений с сервера
async function loadAds() {
    const loadingText = document.getElementById('loadingText');
    try {
        // Пытаемся получить данные из нашей "базы данных" на сервере
        const response = await fetch(`${SERVER_URL}/api/ads`);
        if (!response.ok) {
            throw new Error('Ошибка загрузки данных');
        }
        allAds = await response.json();
        displayAds();
        updateServerStatus('✅ Связь с сервером установлена');
    } catch (error) {
        console.error('Ошибка при загрузке:', error);
        // Для начала используем локальное хранилище, если сервер не работает
        loadAdsFromLocalStorage();
        updateServerStatus('⚠️ Используется локальное хранилище');
    }
}

// Загрузка из локального хранилища (если сервер не доступен)
function loadAdsFromLocalStorage() {
    const savedAds = localStorage.getItem('vapeMarketAds');
    if (savedAds) {
        allAds = JSON.parse(savedAds);
        displayAds();
    } else {
        document.getElementById('loadingText').innerHTML = 
            '<p class="text-center text-muted">Объявлений пока нет. Будьте первым!</p>';
    }
}

// Функция отображения объявлений на странице
function displayAds() {
    const container = document.getElementById('adsContainer');
    if (allAds.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">Объявлений пока нет. Будьте первым!</p>';
        return;
    }

    // Сортируем по дате (сначала новые)
    const sortedAds = [...allAds].sort((a, b) => new Date(b.date) - new Date(a.date));

    let adsHTML = '';
    sortedAds.forEach(ad => {
        const date = new Date(ad.date).toLocaleString('ru-RU');
        adsHTML += `
            <div class="card ad-card">
                <div class="card-body">
                    <h5 class="card-title">${ad.userName || 'Аноним'}</h5>
                    <p class="card-text">${ad.text}</p>
                    <footer class="blockquote-footer">
                        <small class="text-muted">Опубликовано: ${date} | User ID: ${ad.userId}</small>
                    </footer>
                </div>
            </div>
        `;
    });
    container.innerHTML = adsHTML;
}

// Функция отправки нового объявления
async function submitNewAd() {
    const userIdInput = document.getElementById('userIdInput');
    const userNameInput = document.getElementById('userNameInput');
    const adTextInput = document.getElementById('adTextInput');
    const submitBtn = document.getElementById('submitAdBtn');

    const userId = userIdInput.value.trim();
    const userName = userNameInput.value.trim();
    const adText = adTextInput.value.trim();

    // Простая проверка
    if (!userId || !adText) {
        alert('Пожалуйста, заполните User ID и текст объявления!');
        return;
    }

    // Блокируем кнопку на время отправки
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = 'Отправляем...';
    submitBtn.disabled = true;

    const newAd = {
        userId: userId,
        userName: userName || `User${userId.substring(0, 5)}`,
        text: adText,
        date: new Date().toISOString()
    };

    try {
        // Пытаемся отправить на сервер
        const response = await fetch(`${SERVER_URL}/api/ads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newAd)
        });

        if (!response.ok) {
            throw new Error('Сервер не доступен, сохраняем локально');
        }

        // Уведомляем администратора (вас) через Telegram-бота
        if (YOUR_CHAT_ID && BOT_TOKEN) {
            const messageForAdmin = `📢 Новое объявление!\nОт: ${newAd.userName} (ID: ${newAd.userId})\nТекст: ${newAd.text}`;
            await sendTelegramMessage(YOUR_CHAT_ID, messageForAdmin);
        }

        // Добавляем объявление локально
        allAds.push(newAd);
        saveAdsToLocalStorage();
        
        // Очищаем поле текста и обновляем список
        adTextInput.value = '';
        alert('✅ Объявление успешно опубликовано!');
        displayAds();

    } catch (error) {
        console.error('Ошибка при отправке:', error);
        
        // Работаем в офлайн-режиме
        allAds.push(newAd);
        saveAdsToLocalStorage();
        adTextInput.value = '';
        alert('⚠️ Объявление сохранено локально (сервер не доступен)');
        displayAds();
    } finally {
        // Разблокируем кнопку
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
    }
}

// Сохранение в локальное хранилище
function saveAdsToLocalStorage() {
    // Сохраняем только последние 50 объявлений
    const adsToSave = allAds.slice(-50);
    localStorage.setItem('vapeMarketAds', JSON.stringify(adsToSave));
}

// Вспомогательная функция для отправки сообщений через Telegram Bot API
async function sendTelegramMessage(chatId, text) {
    if (!BOT_TOKEN) return;
    
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const body = {
        chat_id: chatId,
        text: text,
        disable_notification: false
    };

    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    } catch (error) {
        console.error('Не удалось отправить уведомление в Telegram:', error);
    }
}

// Функция обновления статуса связи
function updateServerStatus(status) {
    const statusElement = document.getElementById('serverStatus');
    if (statusElement) {
        statusElement.textContent = `Статус: ${status}`;
    }
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
// Когда страница полностью загружена
document.addEventListener('DOMContentLoaded', function() {
    // Загружаем объявления при старте
    loadAds();

    // Назначаем обработчик на кнопку "Опубликовать"
    const submitBtn = document.getElementById('submitAdBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', submitNewAd);
    }

    // Также можно отправлять по нажатию Enter в поле текста
    const adTextInput = document.getElementById('adTextInput');
    if (adTextInput) {
        adTextInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitNewAd();
            }
        });
    }

    // Автозагрузка каждые 30 секунд
    setInterval(loadAds, 30000);
});
