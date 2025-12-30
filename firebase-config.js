// Firebase конфигурация для клиента
const firebaseConfig = {
    apiKey: "AIzaSyBgPG4EXFQHoIOVLt2_BdCmiUJEWTXsGN8",
    authDomain: "telegram-market-vape.firebaseapp.com",
    databaseURL: "https://telegram-market-vape-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "telegram-market-vape",
    storageBucket: "telegram-market-vape.firebasestorage.app",
    messagingSenderId: "35870048384",
    appId: "1:35870048384:web:acd6501459aa39180b6665",
    measurementId: "G-99R2PPBNF8"
};

// Экспорт конфигурации
if (typeof module !== 'undefined' && module.exports) {
    module.exports = firebaseConfig;
} else {
    window.firebaseConfig = firebaseConfig;
}

// Инициализация Firebase (если библиотека загружена)
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase инициализирован');
}
