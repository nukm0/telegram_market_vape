// Конфигурация Vape Market
const CONFIG = {
    // Настройки API
    API_URL: 'https://telegram-market-vape.vercel.app/api',
    WS_URL: 'wss://telegram-market-vape.vercel.app/ws',
    
    // Настройки приложения
    APP_NAME: 'Vape Market',
    VERSION: '1.0.0',
    OWNER_ID: '998579758',
    OWNER_USERNAME: '@nukm0',
    
    // Ограничения
    MAX_IMAGES_PER_AD: 3,
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    AD_LIFETIME_DAYS: 14,
    MAX_TITLE_LENGTH: 100,
    MAX_DESCRIPTION_LENGTH: 1000,
    
    // Настройки рейтинга
    RATING: {
        MIN: 1,
        MAX: 5,
        DEFAULT: 4.5,
        LIKE_WEIGHT: 0.1,
        DISLIKE_WEIGHT: -0.2
    },
    
    // Категории товаров
    CATEGORIES: {
        'liquids': {
            name: 'Жидкости',
            icon: 'fas fa-tint',
            requirePhoto: false
        },
        'devices': {
            name: 'Устройства',
            icon: 'fas fa-smoking',
            requirePhoto: true
        },
        'accessories': {
            name: 'Аксессуары',
            icon: 'fas fa-tools',
            requirePhoto: false
        },
        'pods': {
            name: 'Поды',
            icon: 'fas fa-box',
            requirePhoto: true
        },
        'coils': {
            name: 'Испарители',
            icon: 'fas fa-fire',
            requirePhoto: false
        }
    },
    
    // Типы сделок
    DEAL_TYPES: {
        'sale': {
            name: 'Продажа',
            icon: 'fas fa-tag',
            color: 'var(--success)'
        },
        'buy': {
            name: 'Покупка',
            icon: 'fas fa-shopping-cart',
            color: 'var(--info)'
        }
    },
    
    // Типы жалоб
    REPORT_TYPES: {
        'spam': 'Спам/Реклама',
        'fake': 'Недостоверная информация',
        'prohibited': 'Запрещённый товар',
        'scam': 'Мошенничество',
        'offensive': 'Оскорбительный контент',
        'wrong_category': 'Неверная категория',
        'duplicate': 'Дубликат объявления'
    },
    
    // Уровни администраторов
    ADMIN_LEVELS: {
        1: 'Модератор',
        2: 'Администратор',
        3: 'Владелец'
    },
    
    // Настройки поиска
    SEARCH: {
        MIN_QUERY_LENGTH: 2,
        DEBOUNCE_DELAY: 300 // ms
    },
    
    // Ключевые слова для фильтрации (запрещённые)
    BANNED_KEYWORDS: [
        'нарко',
        'сигарет',
        'алкоголь',
        'оружие',
        'взрывчат',
        // Добавь свои ключевые слова
    ],
    
    // Настройки PWA
    PWA: {
        CACHE_NAME: 'vape-market-v1',
        OFFLINE_PAGE: '/offline.html',
        CACHE_URLS: [
            '/',
            '/index.html',
            '/style.css',
            '/app.js',
            '/config.js',
            '/manifest.json'
        ]
    }
};

// Экспорт конфигурации
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
}
