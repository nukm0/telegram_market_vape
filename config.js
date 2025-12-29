// Конфигурация приложения
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
    adminUsers: ['998579758'],
    superAdmin: '998579758',

    // Настройки
    appSettings: {
        maxPhotosPerAd: 3,
        maxDescriptionLength: 500
    }
};

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppConfig;
} else {
    window.AppConfig = AppConfig;
}
