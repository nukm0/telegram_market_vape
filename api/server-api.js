// ==================== VAPE MARKET SERVER API ====================
// Модуль для работы с сервером Vercel

const SERVER_CONFIG = {
    BASE_URL: 'https://telegram-market-vape.vercel.app',
    API_PATH: '/api/ads',
    MAX_RETRIES: 3,
    TIMEOUT: 10000 // 10 секунд
};

// Универсальная функция для запросов к серверу
async function makeRequest(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SERVER_CONFIG.TIMEOUT);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
        
    } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
            throw new Error('Таймаут запроса к серверу');
        }
        
        console.error(`Ошибка запроса к ${url}:`, error);
        throw error;
    }
}

// ==================== ОБЪЯВЛЕНИЯ ====================

// Получить все объявления с сервера
export async function getAllAds() {
    try {
        const url = `${SERVER_CONFIG.BASE_URL}${SERVER_CONFIG.API_PATH}`;
        const result = await makeRequest(url);
        
        if (result.success && Array.isArray(result.ads)) {
            console.log(`✅ Загружено ${result.ads.length} объявлений с сервера`);
            return result.ads;
        }
        
        console.warn('Сервер вернул неожиданный формат:', result);
        return [];
        
    } catch (error) {
        console.warn('Не удалось загрузить объявления с сервера, используем локальные:', error.message);
        return [];
    }
}

// Получить объявления конкретного пользователя
export async function getUserAds(userId) {
    try {
        const url = `${SERVER_CONFIG.BASE_URL}${SERVER_CONFIG.API_PATH}?action=user&userId=${userId}`;
        const result = await makeRequest(url);
        
        if (result.success) {
            return result.ads || [];
        }
        
        return [];
        
    } catch (error) {
        console.warn('Не удалось загрузить объявления пользователя:', error.message);
        return [];
    }
}

// Опубликовать новое объявление на сервере
export async function publishAd(adData) {
    try {
        const url = `${SERVER_CONFIG.BASE_URL}${SERVER_CONFIG.API_PATH}`;
        const result = await makeRequest(url, {
            method: 'POST',
            body: JSON.stringify(adData)
        });
        
        if (result.success) {
            console.log('✅ Объявление опубликовано на сервере:', result.message);
            return result.ad;
        }
        
        throw new Error(result.error || 'Неизвестная ошибка сервера');
        
    } catch (error) {
        console.error('Ошибка публикации объявления на сервере:', error.message);
        throw error;
    }
}

// Удалить объявление с сервера
export async function deleteAd(adId, userId) {
    try {
        const url = `${SERVER_CONFIG.BASE_URL}${SERVER_CONFIG.API_PATH}`;
        const result = await makeRequest(url, {
            method: 'DELETE',
            body: JSON.stringify({ adId, userId })
        });
        
        if (result.success) {
            console.log('✅ Объявление удалено с сервера');
            return true;
        }
        
        throw new Error(result.error || 'Неизвестная ошибка сервера');
        
    } catch (error) {
        console.error('Ошибка удаления объявления с сервера:', error.message);
        throw error;
    }
}

// ==================== РЕЙТИНГИ ====================

// Получить все рейтинги с сервера
export async function getAllRatings() {
    try {
        const url = `${SERVER_CONFIG.BASE_URL}${SERVER_CONFIG.API_PATH}?action=ratings`;
        const result = await makeRequest(url);
        
        if (result.success && result.ratings) {
            console.log('✅ Загружены рейтинги с сервера');
            return result.ratings;
        }
        
        return {};
        
    } catch (error) {
        console.warn('Не удалось загрузить рейтинги с сервера:', error.message);
        return {};
    }
}

// Обновить рейтинг на сервере
export async function updateRating(sellerId, userId, rating) {
    try {
        const url = `${SERVER_CONFIG.BASE_URL}${SERVER_CONFIG.API_PATH}`;
        const result = await makeRequest(url, {
            method: 'PUT',
            body: JSON.stringify({ sellerId, userId, rating })
        });
        
        if (result.success) {
            console.log(`✅ Рейтинг обновлен: ${userId} -> ${sellerId} = ${rating}`);
            return true;
        }
        
        throw new Error(result.error || 'Неизвестная ошибка сервера');
        
    } catch (error) {
        console.error('Ошибка обновления рейтинга на сервере:', error.message);
        throw error;
    }
}

// ==================== СИНХРОНИЗАЦИЯ ====================

// Синхронизировать локальные данные с сервером
export async function syncWithServer(localAds, localRatings) {
    console.log('🔄 Начинаю синхронизацию с сервером...');
    
    try {
        // 1. Загружаем данные с сервера
        const serverAds = await getAllAds();
        const serverRatings = await getAllRatings();
        
        // 2. Объединяем объявления
        const adsMap = new Map();
        
        // Сначала серверные (они более актуальные)
        serverAds.forEach(ad => {
            if (ad.id) {
                adsMap.set(ad.id, ad);
            }
        });
        
        // Затем локальные (перезапишут серверные если есть конфликт)
        localAds.forEach(ad => {
            if (ad.id) {
                adsMap.set(ad.id, ad);
            }
        });
        
        const mergedAds = Array.from(adsMap.values());
        
        // 3. Объединяем рейтинги
        const mergedRatings = { ...serverRatings, ...localRatings };
        
        console.log(`✅ Синхронизация завершена: ${mergedAds.length} объявлений`);
        
        return {
            ads: mergedAds,
            ratings: mergedRatings,
            synced: true
        };
        
    } catch (error) {
        console.error('❌ Ошибка синхронизации:', error.message);
        return {
            ads: localAds,
            ratings: localRatings,
            synced: false,
            error: error.message
        };
    }
}

// Проверить доступность сервера
export async function checkServerStatus() {
    try {
        const url = `${SERVER_CONFIG.BASE_URL}${SERVER_CONFIG.API_PATH}`;
        const startTime = Date.now();
        
        const response = await fetch(url, { method: 'GET' });
        const endTime = Date.now();
        
        return {
            online: response.ok,
            status: response.status,
            responseTime: endTime - startTime,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        return {
            online: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}
