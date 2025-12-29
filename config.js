// Конфигурация приложения
const CONFIG = {
    // Настройки API
    API_URL: 'https://your-api-domain.com/api',
    WS_URL: 'wss://your-api-domain.com/ws',
    
    // Настройки приложения
    APP_NAME: 'Vape Market',
    VERSION: '1.0.0',
    
    // Лимиты
    MAX_IMAGES_PER_AD: 3,
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    
    // Настройки администратора
    ADMIN_LEVELS: {
        1: 'Модератор',
        2: 'Администратор',
        3: 'Владелец'
    },
    
    // Уровни доступа
    PERMISSIONS: {
        VIEW_STATS: 'view_stats',
        BLOCK_USERS: 'block_users',
        DELETE_ADS: 'delete_ads',
        MANAGE_REPORTS: 'manage_reports',
        MANAGE_BANNER: 'manage_banner',
        MANAGE_ADMINS: 'manage_admins'
    },
    
    // Настройки рекламы
    BANNER_SETTINGS: {
        defaultText: 'Акция! Скидка 15% на все жидкости до конца недели!',
        styles: {
            gradient: 'var(--gradient-secondary)',
            primary: 'var(--primary-color)',
            warning: 'var(--warning-color)',
            success: 'var(--success-color)'
        }
    },
    
    // Настройки рейтинга
    RATING_SETTINGS: {
        min: 1,
        max: 5,
        default: 4.5
    },
    
    // Настройки жалоб
    REPORT_TYPES: {
        light: [
            { id: 'spam', label: 'Спам / Реклама' },
            { id: 'wrong_category', label: 'Неверная категория' }
        ],
        medium: [
            { id: 'fake', label: 'Недостоверная информация' },
            { id: 'duplicate', label: 'Дубликат объявления' }
        ],
        heavy: [
            { id: 'prohibited', label: 'Запрещённый товар' },
            { id: 'scam', label: 'Мошенничество' },
            { id: 'offensive', label: 'Оскорбительный контент' }
        ]
    }
};

export default CONFIG;
