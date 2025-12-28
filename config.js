// Firebase конфигурация (УЖЕ ГОТОВА!)
const firebaseConfig = {
    apiKey: "AIzaSyBgPG4EXFQHoIOVLt2_BdCmiUJEWTXsGN8",
    authDomain: "telegram-market-vape.firebaseapp.com",
    databaseURL: "https://telegram-market-vape-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "telegram-market-vape",
    storageBucket: "telegram-market-vape.appspot.com",
    messagingSenderId: "35870048384",
    appId: "1:35870048384:web:acd6501459aa39180b6665",
    measurementId: "G-99R2PPBNF8"
};

// Конфигурация приложения
const appConfig = {
    appName: "Vape Market",
    adminIds: [998579758],
    categories: ["Жидкости", "Одноразовые", "Под-системы", "Расходники"], // Исправленные категории
    categoryShort: {
        "Жидкости": "Жидкость",
        "Одноразовые": "Одноразово",
        "Под-системы": "Под-системы",
        "Расходники": "Расходники"
    },
    complaintTypes: ["Мошенничество", "Неправильная категория", "Запрещенные товары", "Спам", "Оскорбления", "Другое"],
    maxPhotos: 3,
    ratingFormula: (likes, dislikes) => {
        const total = likes + dislikes;
        return total === 0 ? 0 : 0.1 + (likes / total) * 4.9;
    }
};
