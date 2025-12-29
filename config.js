const AppConfig = {
    // Основные настройки
    appName: 'Vape Market',
    appVersion: '1.0.0',
    
    // Настройки Telegram Web App
    telegram: {
        botToken: '',
        apiUrl: 'https://api.telegram.org'
    },
    
    // Роли пользователей
    roles: {
        user: 'user',           // Обычный пользователь
        admin1: 'admin1',       // Модератор (управление объявлениями, жалобами)
        admin2: 'admin2',       // Админ (реклама, статистика)
        owner: 'owner'          // Владелец (полные права)
    },
    
    // Права доступа
    permissions: {
        admin1: [
            'view_ads',
            'block_ads',
            'view_reports',
            'process_reports',
            'block_users',
            'view_stats'
        ],
        admin2: [
            'view_ads',
            'block_ads',
            'view_reports',
            'process_reports',
            'block_users',
            'view_stats',
            'manage_ads',
            'manage_advertisement'
        ],
        owner: [
            'view_ads',
            'block_ads',
            'view_reports',
            'process_reports',
            'block_users',
            'view_stats',
            'manage_ads',
            'manage_advertisement',
            'manage_admins',
            'full_access'
        ]
    },
    
    // Лимиты
    limits: {
        maxImagesPerAd: 5,
        maxAdTitleLength: 100,
        maxAdDescriptionLength: 1000,
        maxPrice: 1000000,
        reportThreshold: 3 // Количество жалоб для авто-блокировки
    },
    
    // Категории товаров
    categories: {
        pod: 'Поды и POD-системы',
        mod: 'Моды',
        atomizer: 'Атомайзеры',
        liquid: 'Жидкости',
        accessories: 'Аксессуары',
        other: 'Другое'
    },
    
    // Причины жалоб
    reportReasons: {
        scam: 'Мошенничество',
        fake: 'Фейковый товар',
        spam: 'Спам',
        rules: 'Нарушение правил',
        other: 'Другое'
    },
    
    // Настройки кэширования
    cache: {
        adsTTL: 300000, // 5 минут
        statsTTL: 60000 // 1 минута
    }
};

// Инициализация конфигурации
window.AppConfig = AppConfig;
