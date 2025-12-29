// ==================== VAPE MARKET API ====================
// Серверное хранилище объявлений
// Внимание: данные сбросятся при перезапуске сервера Vercel

let advertisements = [];
let userRatings = {};

export default function handler(req, res) {
    // Настройка CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    // Предварительный запрос OPTIONS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // ==================== GET: Получить все объявления ====================
    if (req.method === 'GET') {
        const { action, userId } = req.query;

        // GET /api/ads - все объявления
        if (!action) {
            console.log(`GET /api/ads - возвращаем ${advertisements.length} объявлений`);
            return res.status(200).json({
                success: true,
                ads: advertisements,
                total: advertisements.length
            });
        }

        // GET /api/ads?action=user&userId=123 - объявления пользователя
        if (action === 'user' && userId) {
            const userAds = advertisements.filter(ad => ad.sellerId === userId);
            console.log(`GET /api/ads?action=user - возвращаем ${userAds.length} объявлений пользователя ${userId}`);
            return res.status(200).json({
                success: true,
                ads: userAds,
                total: userAds.length
            });
        }

        // GET /api/ads?action=ratings - все рейтинги
        if (action === 'ratings') {
            console.log(`GET /api/ads?action=ratings - возвращаем рейтинги`);
            return res.status(200).json({
                success: true,
                ratings: userRatings
            });
        }

        return res.status(400).json({ error: 'Неверный параметр action' });
    }

    // ==================== POST: Создать новое объявление ====================
    if (req.method === 'POST') {
        try {
            const newAd = req.body;

            // Валидация
            if (!newAd) {
                return res.status(400).json({ error: 'Тело запроса пустое' });
            }

            const requiredFields = ['sellerId', 'title', 'price', 'category'];
            const missingFields = requiredFields.filter(field => !newAd[field]);

            if (missingFields.length > 0) {
                return res.status(400).json({ 
                    error: 'Отсутствуют обязательные поля',
                    missing: missingFields
                });
            }

            // Добавляем метаданные
            newAd.id = newAd.id || `ad_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            newAd.createdAt = newAd.createdAt || new Date().toISOString();
            newAd.likes = newAd.likes || 0;
            newAd.dislikes = newAd.dislikes || 0;
            newAd.photoUrls = newAd.photoUrls || [];
            newAd.photos = newAd.photos || 0;

            // Сохраняем объявление
            advertisements.unshift(newAd); // Добавляем в начало

            // Ограничиваем историю (последние 100 объявлений)
            if (advertisements.length > 100) {
                advertisements = advertisements.slice(0, 100);
            }

            console.log(`✅ POST /api/ads - новое объявление от ${newAd.sellerId}: "${newAd.title}"`);

            return res.status(201).json({ 
                success: true, 
                message: 'Объявление успешно опубликовано',
                ad: newAd,
                total: advertisements.length
            });

        } catch (error) {
            console.error('❌ Ошибка POST /api/ads:', error);
            return res.status(500).json({ 
                error: 'Внутренняя ошибка сервера',
                details: error.message 
            });
        }
    }

    // ==================== PUT: Обновить рейтинг ====================
    if (req.method === 'PUT') {
        try {
            const { sellerId, userId, rating } = req.body;

            if (!sellerId || !userId || !rating) {
                return res.status(400).json({ 
                    error: 'Отсутствуют обязательные поля',
                    required: ['sellerId', 'userId', 'rating']
                });
            }

            // Инициализируем рейтинги для продавца если нужно
            if (!userRatings[sellerId]) {
                userRatings[sellerId] = {};
            }

            // Сохраняем рейтинг
            userRatings[sellerId][userId] = rating;

            console.log(`✅ PUT /api/ads - рейтинг: ${userId} -> ${sellerId} = ${rating}`);

            return res.status(200).json({ 
                success: true, 
                message: 'Рейтинг обновлен'
            });

        } catch (error) {
            console.error('❌ Ошибка PUT /api/ads:', error);
            return res.status(500).json({ 
                error: 'Ошибка обновления рейтинга',
                details: error.message 
            });
        }
    }

    // ==================== DELETE: Удалить объявление ====================
    if (req.method === 'DELETE') {
        try {
            const { adId, userId } = req.body;

            if (!adId || !userId) {
                return res.status(400).json({ 
                    error: 'Отсутствуют обязательные поля',
                    required: ['adId', 'userId']
                });
            }

            // Ищем объявление
            const adIndex = advertisements.findIndex(ad => ad.id === adId && ad.sellerId === userId);

            if (adIndex === -1) {
                return res.status(404).json({ 
                    error: 'Объявление не найдено или вы не являетесь владельцем'
                });
            }

            // Удаляем объявление
            const deletedAd = advertisements.splice(adIndex, 1)[0];

            console.log(`🗑️ DELETE /api/ads - удалено объявление ${adId} от ${userId}`);

            return res.status(200).json({ 
                success: true, 
                message: 'Объявление удалено',
                ad: deletedAd,
                total: advertisements.length
            });

        } catch (error) {
            console.error('❌ Ошибка DELETE /api/ads:', error);
            return res.status(500).json({ 
                error: 'Ошибка удаления объявления',
                details: error.message 
            });
        }
    }

    // Метод не поддерживается
    return res.status(405).json({ error: 'Метод не разрешен' });
}
