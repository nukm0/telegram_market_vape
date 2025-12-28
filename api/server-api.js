// ==================== СЕРВЕРНЫЙ API ДЛЯ VAPE MARKET ====================
class VapeMarketAPI {
    constructor() {
        this.baseUrl = 'https://telegram-market-vape.vercel.app'; // Замените на ваш бэкенд
        this.useMockData = true; // Использовать мок данные для разработки
    }
    
    // ========== АВТОРИЗАЦИЯ ==========
    async authenticate(userData) {
        if (this.useMockData) {
            return {
                success: true,
                user: {
                    id: userData.id,
                    firstName: userData.first_name || 'Аноним',
                    username: userData.username || `user_${userData.id}`,
                    rating: 3.0,
                    isVerified: false,
                    isAdmin: appConfig.adminIds.includes(parseInt(userData.id)),
                    createdAt: new Date().toISOString()
                }
            };
        }
        
        try {
            const response = await fetch(`${this.baseUrl}/auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            return await response.json();
        } catch (error) {
            console.error('Auth error:', error);
            return { success: false, error: 'Network error' };
        }
    }
    
    // ========== ОБЪЯВЛЕНИЯ ==========
    async getAds(filters = {}) {
        if (this.useMockData) {
            return this.getMockAds(filters);
        }
        
        try {
            const query = new URLSearchParams(filters).toString();
            const response = await fetch(`${this.baseUrl}/ads?${query}`);
            return await response.json();
        } catch (error) {
            console.error('Get ads error:', error);
            return { success: false, error: 'Network error' };
        }
    }
    
    async createAd(adData) {
        if (this.useMockData) {
            const newAd = {
                id: Date.now().toString(),
                ...adData,
                createdAt: new Date().toISOString(),
                views: 0,
                likes: 0,
                dislikes: 0,
                rating: 3.0
            };
            return { success: true, ad: newAd };
        }
        
        try {
            const response = await fetch(`${this.baseUrl}/ads`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(adData)
            });
            return await response.json();
        } catch (error) {
            console.error('Create ad error:', error);
            return { success: false, error: 'Network error' };
        }
    }
    
    async deleteAd(adId, userId) {
        if (this.useMockData) {
            return { success: true, message: 'Объявление удалено' };
        }
        
        try {
            const response = await fetch(`${this.baseUrl}/ads/${adId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            return await response.json();
        } catch (error) {
            console.error('Delete ad error:', error);
            return { success: false, error: 'Network error' };
        }
    }
    
    // ========== РЕЙТИНГИ И ЛАЙКИ ==========
    async rateAd(adId, userId, type) { // type: 'like' или 'dislike'
        if (this.useMockData) {
            return { 
                success: true, 
                rating: Math.random() * 5,
                likes: Math.floor(Math.random() * 100),
                dislikes: Math.floor(Math.random() * 20)
            };
        }
        
        try {
            const response = await fetch(`${this.baseUrl}/ads/${adId}/rate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, type })
            });
            return await response.json();
        } catch (error) {
            console.error('Rate ad error:', error);
            return { success: false, error: 'Network error' };
        }
    }
    
    // ========== ЛИЧНЫЙ КАБИНЕТ ==========
    async getUserProfile(userId) {
        if (this.useMockData) {
            return {
                success: true,
                profile: {
                    id: userId,
                    username: `user_${userId}`,
                    firstName: 'Иван',
                    rating: 4.2,
                    totalAds: 5,
                    activeAds: 3,
                    totalLikes: 42,
                    totalDislikes: 3,
                    isVerified: false,
                    joinDate: '2024-01-15'
                }
            };
        }
        
        try {
            const response = await fetch(`${this.baseUrl}/users/${userId}`);
            return await response.json();
        } catch (error) {
            console.error('Get profile error:', error);
            return { success: false, error: 'Network error' };
        }
    }
    
    // ========== АДМИН-ПАНЕЛЬ ==========
    async getAdminStats() {
        if (this.useMockData) {
            return {
                success: true,
                stats: {
                    totalUsers: 15432,
                    totalAds: 2345,
                    activeAds: 1890,
                    pendingAds: 45,
                    complaints: 12,
                    todayVisitors: 342
                }
            };
        }
        
        try {
            const response = await fetch(`${this.baseUrl}/admin/stats`);
            return await response.json();
        } catch (error) {
            console.error('Get admin stats error:', error);
            return { success: false, error: 'Network error' };
        }
    }
    
    async getAllUsers() {
        if (this.useMockData) {
            const users = [];
            for (let i = 0; i < 20; i++) {
                users.push({
                    id: 1000000 + i,
                    username: `user_${1000000 + i}`,
                    firstName: `Пользователь ${i + 1}`,
                    rating: (Math.random() * 5).toFixed(1),
                    totalAds: Math.floor(Math.random() * 20),
                    isBlocked: i % 10 === 0,
                    isVerified: i % 5 === 0,
                    lastActive: new Date(Date.now() - Math.random() * 10000000000).toISOString()
                });
            }
            return { success: true, users };
        }
        
        try {
            const response = await fetch(`${this.baseUrl}/admin/users`);
            return await response.json();
        } catch (error) {
            console.error('Get all users error:', error);
            return { success: false, error: 'Network error' };
        }
    }
    
    // ========== МОК ДАННЫЕ ДЛЯ РАЗРАБОТКИ ==========
    getMockAds(filters = {}) {
        const mockAds = [];
        const categories = ['Жидкости', 'Одноразовые', 'Под-системы', 'Расходники'];
        const types = ['buy', 'sell'];
        
        for (let i = 1; i <= 15; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            const category = categories[Math.floor(Math.random() * categories.length)];
            
            // Применяем фильтры
            if (filters.category && filters.category !== 'all' && filters.category !== category) {
                continue;
            }
            if (filters.type && filters.type !== type) {
                continue;
            }
            
            mockAds.push({
                id: `ad_${i}`,
                title: `Товар ${i}: ${category}`,
                description: `Отличный товар в хорошем состоянии. ${'Очень качественный товар. '.repeat(5)}`,
                price: Math.floor(Math.random() * 5000) + 500,
                category: category,
                type: type, // 'buy' или 'sell'
                userId: 1000000 + (i % 10),
                username: `seller_${1000000 + (i % 10)}`,
                rating: (Math.random() * 5).toFixed(1),
                views: Math.floor(Math.random() * 1000),
                likes: Math.floor(Math.random() * 100),
                dislikes: Math.floor(Math.random() * 10),
                photos: [],
                createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
                expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
            });
        }
        
        return { success: true, ads: mockAds };
    }
}

// Создаем глобальный инстанс API
const vapeMarketAPI = new VapeMarketAPI();

// Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = vapeMarketAPI;
} else {
    window.vapeMarketAPI = vapeMarketAPI;
}
