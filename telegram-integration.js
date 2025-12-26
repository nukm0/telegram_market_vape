// telegram-integration.js
class TelegramIntegration {
    constructor() {
        this.tg = window.Telegram?.WebApp;
        this.isTelegram = !!this.tg;
        
        this.init();
    }
    
    init() {
        if (!this.isTelegram) {
            console.log('Открыто вне Telegram Mini App');
            this.setupForBrowser();
            return;
        }
        
        console.log('Telegram Mini App инициализирован');
        this.setupForTelegram();
    }
    
    setupForTelegram() {
        // 1. Раскрываем на весь экран
        this.tg.expand();
        
        // 2. Получаем данные пользователя
        const user = this.tg.initDataUnsafe.user;
        if (user) {
            this.displayUserInfo(user);
        }
        
        // 3. Настраиваем тему
        this.setupTheme();
        
        // 4. Настраиваем кнопки
        this.setupButtons();
        
        // 5. Отслеживаем события
        this.setupEvents();
    }
    
    displayUserInfo(user) {
        console.log('Пользователь Telegram:', user);
        
        // Добавляем информацию о пользователе на страницу
        const userInfoDiv = document.createElement('div');
        userInfoDiv.className = 'telegram-user-info';
        userInfoDiv.innerHTML = `
            <div style="padding: 10px; background: #f0f0f0; border-radius: 10px; margin: 10px 0;">
                <p>👤 <strong>${user.first_name || ''} ${user.last_name || ''}</strong></p>
                <p style="font-size: 12px; color: #666;">ID: ${user.id}</p>
            </div>
        `;
        
        // Вставляем в начало страницы
        const firstElement = document.body.firstChild;
        document.body.insertBefore(userInfoDiv, firstElement);
    }
    
    setupTheme() {
        // Используем тему Telegram
        if (this.tg.colorScheme === 'dark') {
            document.body.classList.add('dark-theme');
        }
        
        // Устанавливаем цвет заголовка
        this.tg.setHeaderColor('#6f42c1'); // Фиолетовый
        this.tg.setBackgroundColor('#ffffff');
    }
    
    setupButtons() {
        // Кнопка "Назад" в Telegram
        this.tg.BackButton.show();
        this.tg.BackButton.onClick(() => {
            this.tg.close();
        });
        
        // Кнопка закрытия
        const closeBtn = document.getElementById('close-app');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.tg.close());
        }
    }
    
    setupEvents() {
        // Отслеживаем изменение темы
        this.tg.onEvent('themeChanged', () => {
            document.body.classList.toggle('dark-theme', this.tg.colorScheme === 'dark');
        });
        
        // Отслеживаем изменение размера окна
        this.tg.onEvent('viewportChanged', () => {
            console.log('Размер окна изменен');
        });
    }
    
    setupForBrowser() {
        // Для браузера добавляем тестовые данные
        const userInfoDiv = document.createElement('div');
        userInfoDiv.className = 'browser-user-info';
        userInfoDiv.innerHTML = `
            <div style="padding: 10px; background: #e3f2fd; border-radius: 10px; margin: 10px 0;">
                <p>🌐 <strong>Демо-режим</strong> (открыто в браузере)</p>
                <p style="font-size: 12px; color: #666;">В Telegram будет доступна информация о пользователе</p>
            </div>
        `;
        
        const firstElement = document.body.firstChild;
        document.body.insertBefore(userInfoDiv, firstElement);
    }
    
    // Метод для отправки данных в бота
    sendOrderToBot(orderData) {
        if (!this.isTelegram) {
            console.log('Демо-заказ:', orderData);
            alert('Демо-заказ отправлен! В Telegram данные уйдут в бота.');
            return;
        }
        
        // В Telegram отправляем данные боту
        this.tg.sendData(JSON.stringify({
            type: 'new_order',
            data: orderData,
            user: this.tg.initDataUnsafe.user
        }));
        
        // Показываем подтверждение
        this.tg.showAlert(`Заказ #${orderData.id} оформлен!`);
        
        // Закрываем приложение через 2 секунды
        setTimeout(() => {
            this.tg.close();
        }, 2000);
    }
    
    // Метод для получения информации о товаре
    getProductInfo(productId) {
        if (this.isTelegram) {
            // Можно использовать данные из initData
            return {
                ...productData,
                user_id: this.tg.initDataUnsafe.user?.id,
                query_id: this.tg.initDataUnsafe.query_id
            };
        }
        return productData;
    }
}

// Инициализируем при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.telegramApp = new TelegramIntegration();
});
