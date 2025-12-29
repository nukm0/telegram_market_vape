// Серверные API методы для работы с Firebase
class ServerAPI {
    constructor(firebaseApp) {
        this.db = firebaseApp.database();
    }

    // Получить объявления с пагинацией и фильтрами
    async getAds(filters = {}, page = 1, limit = 20) {
        try {
            let query = this.db.ref('ads').orderByChild('createdAt');

            // Применяем фильтры
            if (filters.category && filters.category !== 'all') {
                query = query.orderByChild('category').equalTo(filters.category);
            }

            if (filters.dealType && filters.dealType !== 'all') {
                query = query.orderByChild('dealType').equalTo(filters.dealType);
            }

            if (filters.userId) {
                query = query.orderByChild('sellerId').equalTo(filters.userId);
            }

            const snapshot = await query.once('value');
            let ads = [];

            snapshot.forEach((child) => {
                const ad = child.val();
                ad.id = child.key;

                // Фильтрация по поиску
                if (filters.search) {
                    const searchLower = filters.search.toLowerCase();
                    const matches = (
                        (ad.title && ad.title.toLowerCase().includes(searchLower)) ||
                        (ad.description && ad.description.toLowerCase().includes(searchLower)) ||
                        (ad.category && ad.category.toLowerCase().includes(searchLower))
                    );
                    if (!matches) return;
                }

                // Фильтрация по цене
                if (filters.minPrice && ad.price < filters.minPrice) return;
                if (filters.maxPrice && ad.price > filters.maxPrice) return;

                // Фильтрация по статусу
                if (filters.status && ad.status !== filters.status) return;

                ads.push(ad);
            });

            // Сортировка по дате (новые сначала)
            ads.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            // Пагинация
            const total = ads.length;
            const start = (page - 1) * limit;
            const end = start + limit;
            const paginatedAds = ads.slice(start, end);

            return {
                ads: paginatedAds,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                    hasNext: end < total,
                    hasPrev: page > 1
                }
            };

        } catch (error) {
            console.error('API Error in getAds:', error);
            throw error;
        }
    }

    // Получить статистику
    async getStats() {
        try {
            const [adsSnapshot, usersSnapshot, ratingsSnapshot, complaintsSnapshot] = await Promise.all([
                this.db.ref('ads').once('value'),
                this.db.ref('users').once('value'),
                this.db.ref('ratings').once('value'),
                this.db.ref('complaints').once('value')
            ]);

            // Общая статистика
            const totalAds = adsSnapshot.numChildren();
            const totalUsers = usersSnapshot.numChildren();
            const totalComplaints = complaintsSnapshot.numChildren();

            // Статистика за сегодня
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayAds = [];
            adsSnapshot.forEach((child) => {
                const ad = child.val();
                if (ad.createdAt && new Date(ad.createdAt) >= today) {
                    todayAds.push(ad);
                }
            });

            // Статистика по категориям
            const categories = { liquids: 0, disposable: 0, pod: 0, consumables: 0, other: 0 };
            adsSnapshot.forEach((child) => {
                const ad = child.val();
                const category = ad.category || 'other';
                if (categories[category] !== undefined) {
                    categories[category]++;
                } else {
                    categories.other++;
                }
            });

            // Статистика по типам сделок
            const dealTypes = { sell: 0, buy: 0 };
            adsSnapshot.forEach((child) => {
                const ad = child.val();
                const dealType = ad.dealType || 'sell';
                dealTypes[dealType] = (dealTypes[dealType] || 0) + 1;
            });

            // Подсчет лайков/дизлайков
            let totalLikes = 0;
            let totalDislikes = 0;
            ratingsSnapshot.forEach((userRatings) => {
                userRatings.forEach((rating) => {
                    if (rating.val() === 'like') totalLikes++;
                    if (rating.val() === 'dislike') totalDislikes++;
                });
            });

            return {
                totals: {
                    ads: totalAds,
                    users: totalUsers,
                    complaints: totalComplaints,
                    likes: totalLikes,
                    dislikes: totalDislikes
                },
                today: {
                    ads: todayAds.length
                },
                categories,
                dealTypes,
                lastUpdated: new Date().toISOString()
            };

        } catch (error) {
            console.error('API Error in getStats:', error);
            throw error;
        }
    }

    // Получить жалобы с фильтрами
    async getComplaints(filters = {}, page = 1, limit = 20) {
        try {
            let query = this.db.ref('complaints').orderByChild('createdAt');

            if (filters.status && filters.status !== 'all') {
                query = query.orderByChild('status').equalTo(filters.status);
            }

            if (filters.reporterId) {
                query = query.orderByChild('reporterId').equalTo(filters.reporterId);
            }

            if (filters.targetId) {
                query = query.orderByChild('targetId').equalTo(filters.targetId);
            }

            const snapshot = await query.once('value');
            let complaints = [];

            snapshot.forEach((child) => {
                complaints.unshift({ id: child.key, ...child.val() });
            });

            // Пагинация
            const total = complaints.length;
            const start = (page - 1) * limit;
            const end = start + limit;
            const paginated = complaints.slice(start, end);

            return {
                complaints: paginated,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };

        } catch (error) {
            console.error('API Error in getComplaints:', error);
            throw error;
        }
    }

    // Обновить статус жалобы
    async updateComplaintStatus(complaintId, status, adminNote = '') {
        try {
            const updates = {
                status,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            };

            if (adminNote) {
                updates.adminNote = adminNote;
            }

            if (status === 'resolved' || status === 'rejected') {
                updates.resolvedAt = firebase.database.ServerValue.TIMESTAMP;
            }

            await this.db.ref(`complaints/${complaintId}`).update(updates);
            return true;
        } catch (error) {
            console.error('API Error in updateComplaintStatus:', error);
            throw error;
        }
    }

    // Получить пользователя
    async getUser(userId) {
        try {
            const snapshot = await this.db.ref(`users/${userId}`).once('value');
            return snapshot.val();
        } catch (error) {
            console.error('API Error in getUser:', error);
            throw error;
        }
    }

    // Обновить пользователя
    async updateUser(userId, data) {
        try {
            await this.db.ref(`users/${userId}`).update({
                ...data,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });
            return true;
        } catch (error) {
            console.error('API Error in updateUser:', error);
            throw error;
        }
    }

    // Блокировать пользователя
    async blockUser(userId, reason, durationHours = 24) {
        try {
            const blockedUntil = durationHours === 0 ? 
                'permanent' : 
                Date.now() + (durationHours * 60 * 60 * 1000);

            await this.db.ref(`users/${userId}`).update({
                blocked: true,
                blockReason: reason,
                blockedUntil: blockedUntil,
                blockedAt: firebase.database.ServerValue.TIMESTAMP
            });

            // Запись в историю модерации
            await this.db.ref('moderationHistory').push().set({
                action: 'block',
                userId: userId,
                reason: reason,
                duration: durationHours,
                blockedUntil: blockedUntil,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });

            return true;
        } catch (error) {
            console.error('API Error in blockUser:', error);
            throw error;
        }
    }

    // Получить историю пользователя
    async getUserHistory(userId, limit = 50) {
        try {
            const snapshot = await this.db.ref(`userHistory/${userId}`)
                .orderByChild('timestamp')
                .limitToLast(limit)
                .once('value');

            const history = [];
            snapshot.forEach((child) => {
                history.unshift(child.val());
            });

            return history;
        } catch (error) {
            console.error('API Error in getUserHistory:', error);
            throw error;
        }
    }

    // Умный поиск
    async smartSearch(query, filters = {}) {
        try {
            // Получаем все объявления
            const adsSnapshot = await this.db.ref('ads').once('value');
            const results = [];
            const queryLower = query.toLowerCase();

            // Веса для разных полей
            const weights = {
                title: 3,
                description: 1,
                category: 2,
                sellerName: 1
            };

            adsSnapshot.forEach((child) => {
                const ad = child.val();
                ad.id = child.key;

                // Проверяем фильтры
                if (filters.category && filters.category !== 'all' && ad.category !== filters.category) {
                    return;
                }

                if (filters.dealType && filters.dealType !== 'all' && ad.dealType !== filters.dealType) {
                    return;
                }

                if (filters.minPrice && ad.price < filters.minPrice) {
                    return;
                }

                if (filters.maxPrice && ad.price > filters.maxPrice) {
                    return;
                }

                // Подсчет релевантности
                let relevance = 0;

                // Поиск в заголовке
                if (ad.title && ad.title.toLowerCase().includes(queryLower)) {
                    relevance += weights.title;

                    // Бонус за точное совпадение в начале
                    if (ad.title.toLowerCase().startsWith(queryLower)) {
                        relevance += 2;
                    }
                }

                // Поиск в описании
                if (ad.description && ad.description.toLowerCase().includes(queryLower)) {
                    relevance += weights.description;
                }

                // Поиск в категории
                if (ad.category && ad.category.toLowerCase().includes(queryLower)) {
                    relevance += weights.category;
                }

                // Поиск по имени продавца
                if (ad.sellerName && ad.sellerName.toLowerCase().includes(queryLower)) {
                    relevance += weights.sellerName;
                }

                // Если есть релевантность, добавляем в результаты
                if (relevance > 0) {
                    results.push({
                        ...ad,
                        relevance,
                        matchType: this.getMatchType(relevance, query, ad)
                    });
                }
            });

            // Сортировка по релевантности и дате
            results.sort((a, b) => {
                if (b.relevance !== a.relevance) {
                    return b.relevance - a.relevance;
                }
                return (b.createdAt || 0) - (a.createdAt || 0);
            });

            return results;

        } catch (error) {
            console.error('API Error in smartSearch:', error);
            throw error;
        }
    }

    // Определить тип совпадения
    getMatchType(relevance, query, ad) {
        if (ad.title && ad.title.toLowerCase().startsWith(query.toLowerCase())) {
            return 'exact_title';
        }
        if (ad.title && ad.title.toLowerCase().includes(query.toLowerCase())) {
            return 'title';
        }
        if (ad.category && ad.category.toLowerCase().includes(query.toLowerCase())) {
            return 'category';
        }
        return 'description';
    }
}

// Создание экземпляра API
let serverAPI = null;

function initServerAPI(firebaseApp) {
    if (!serverAPI) {
        serverAPI = new ServerAPI(firebaseApp);
    }
    return serverAPI;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ServerAPI, initServerAPI };
}
