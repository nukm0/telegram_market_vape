// Конфигурация приложения Vape Market
const AppConfig = {
    // Firebase конфигурация
    firebaseConfig: {
        apiKey: "AIzaSyBgPG4EXFQHoIOVLt2_BdCmiUJEWTXsGN8",
        authDomain: "telegram-market-vape.firebaseapp.com",
        databaseURL: "https://telegram-market-vape-default-rtdb.europe-west1.firebasedatabase.app",
        projectId: "telegram-market-vape",
        storageBucket: "telegram-market-vape.appspot.com",
        messagingSenderId: "35870048384",
        appId: "1:35870048384:web:acd6501459aa39180b6665",
        measurementId: "G-99R2PPBNF8"
    },

    // Администраторы
    adminUsers: {
        '998579758': {
            id: '998579758',
            username: 'nukm0',
            name: '𓆩nukm0𓆪',
            role: 'superadmin'
        }
    },

    // Настройки приложения
    appSettings: {
        maxPhotosPerAd: 3,
        maxDescriptionLength: 500,
        itemsPerPage: 10,
        syncInterval: 30000, // 30 секунд
        complaintReasons: [
            { id: 'fraud', label: 'Мошенничество' },
            { id: 'wrong_category', label: 'Неправильная категория' },
            { id: 'prohibited', label: 'Запрещенные товары' },
            { id: 'fake_price', label: 'Неверная цена' },
            { id: 'spam', label: 'Спам' },
            { id: 'other', label: 'Другое' }
        ],
        categories: [
            { id: 'liquids', label: 'Жидкости', icon: 'fa-tint' },
            { id: 'disposable', label: 'Одноразовые', icon: 'fa-battery-full' },
            { id: 'pod', label: 'Под-системы', icon: 'fa-microchip' },
            { id: 'consumables', label: 'Расходники', icon: 'fa-box-open' }
        ],
        dealTypes: [
            { id: 'sell', label: 'Продаю', icon: 'fa-tag', color: '#10B981' },
            { id: 'buy', label: 'Покупаю', icon: 'fa-shopping-cart', color: '#3B82F6' }
        ]
    },

    // Строки интерфейса
    strings: {
        appName: 'Vape Market',
        loading: 'Загрузка...',
        noResults: 'Нет результатов',
        error: 'Произошла ошибка',
        success: 'Успешно',
        warning: 'Внимание',
        publishAd: 'Опубликовать объявление',
        searchPlaceholder: 'Поиск товаров...',
        pricePlaceholder: 'Цена (₽)',
        descriptionPlaceholder: 'Описание товара'
    },

    // URL и пути
    urls: {
        adminContact: 'https://t.me/nukm0',
        githubRepo: 'https://github.com/nukm0/telegram_market_vape',
        apiBase: '/api'
    }
};

// Экспорт конфигурации
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppConfig;
} else {
    window.AppConfig = AppConfig;
}
