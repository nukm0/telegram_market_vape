// ==================== КОНФИГУРАЦИЯ VAPE MARKET ====================
const appConfig = {
    // Основные настройки
    APP_NAME: 'Vape Market',
    VERSION: '2.0',
    
    // Telegram настройки
    BOT_USERNAME: 'vape_market_bot',
    ADMIN_TELEGRAM: '@nukm0',
    
    // Администраторы (ваш ID 998579758)
    adminIds: [998579758],
    
    // Настройки объявлений
    MAX_PHOTOS: 3,
    AD_EXPIRE_DAYS: 14,
    MAX_DESCRIPTION_LENGTH: 500,
    
    // Категории товаров
    CATEGORIES: [
        { id: 'all', name: 'Все', icon: '📦' },
        { id: 'liquid', name: 'Жидкости', icon: '💧' },
        { id: 'disposable', name: 'Одноразовые', icon: '🚬' },
        { id: 'pod', name: 'Под-системы', icon: '🔋' },
        { id: 'consumables', name: 'Расходники', icon: '🛠️' }
    ],
    
    // Типы объявлений (КУПИТЬ/ПРОДАТЬ)
    AD_TYPES: {
        BUY: 'buy',
        SELL: 'sell'
    },
    
    // Рейтинговая система
    RATING: {
        MIN: 0.1,
        MAX: 5.0,
        DEFAULT: 3.0
    },
    
    // Цветовая схема
    COLORS: {
        PRIMARY: '#6B21A8',
        SECONDARY: '#9333EA',
        BACKGROUND: '#1E1B4B',
        SUCCESS: '#10B981',
        DANGER: '#EF4444'
    },
    
    // URLs
    GITHUB_REPO: 'https://github.com/nukm0/telegram_market_vape'
};

// Экспорт конфигурации
if (typeof module !== 'undefined' && module.exports) {
    module.exports = appConfig;
}
