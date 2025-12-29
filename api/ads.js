const AdsAPI = {
    // Получить все объявления
    async getAllAds() {
        try {
            const ads = JSON.parse(localStorage.getItem('market_ads') || '[]');
            return ads.filter(ad => !ad.isBlocked);
        } catch (error) {
            console.error('Ошибка получения объявлений:', error);
            return [];
        }
    },
    
    // Получить объявления пользователя
    async getUserAds(userId) {
        try {
            const ads = JSON.parse(localStorage.getItem('market_ads') || '[]');
            return ads.filter(ad => ad.userId === userId && !ad.isBlocked);
        } catch (error) {
            console.error('Ошибка получения объявлений пользователя:', error);
            return [];
        }
    },
    
    // Создать объявление
    async createAd(adData) {
        try {
            const ads = JSON.parse(localStorage.getItem('market_ads') || '[]');
            const newAd = {
                id: Date.now().toString(),
                ...adData,
                createdAt: new Date().toISOString(),
                views: 0,
                likes: 0,
                isBlocked: false,
                reports: []
            };
            
            ads.unshift(newAd);
            localStorage.setItem('market_ads', JSON.stringify(ads));
            
            return newAd;
        } catch (error) {
            console.error('Ошибка создания объявления:', error);
            throw error;
        }
    },
    
    // Удалить объявление
    async deleteAd(adId, userId) {
        try {
            const ads = JSON.parse(localStorage.getItem('market_ads') || '[]');
            const adIndex = ads.findIndex(ad => ad.id === adId && ad.userId === userId);
            
            if (adIndex !== -1) {
                ads.splice(adIndex, 1);
                localStorage.setItem('market_ads', JSON.stringify(ads));
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Ошибка удаления объявления:', error);
            throw error;
        }
    },
    
    // Получить объявление по ID
    async getAdById(adId) {
        try {
            const ads = JSON.parse(localStorage.getItem('market_ads') || '[]');
            return ads.find(ad => ad.id === adId);
        } catch (error) {
            console.error('Ошибка получения объявления:', error);
            return null;
        }
    },
    
    // Обновить счетчик просмотров
    async incrementViews(adId) {
        try {
            const ads = JSON.parse(localStorage.getItem('market_ads') || '[]');
            const adIndex = ads.findIndex(ad => ad.id === adId);
            
            if (adIndex !== -1) {
                ads[adIndex].views = (ads[adIndex].views || 0) + 1;
                localStorage.setItem('market_ads', JSON.stringify(ads));
            }
        } catch (error) {
            console.error('Ошибка обновления просмотров:', error);
        }
    },
    
    // Добавить жалобу на объявление
    async addReport(adId, reportData) {
        try {
            const ads = JSON.parse(localStorage.getItem('market_ads') || '[]');
            const adIndex = ads.findIndex(ad => ad.id === adId);
            
            if (adIndex !== -1) {
                if (!ads[adIndex].reports) {
                    ads[adIndex].reports = [];
                }
                
                ads[adIndex].reports.push({
                    ...reportData,
                    date: new Date().toISOString()
                });
                
                localStorage.setItem('market_ads', JSON.stringify(ads));
                
                // Если жалоб больше 3, блокируем объявление
                if (ads[adIndex].reports.length >= 3) {
                    ads[adIndex].isBlocked = true;
                    localStorage.setItem('market_ads', JSON.stringify(ads));
                }
                
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Ошибка добавления жалобы:', error);
            throw error;
        }
    },
    
    // Блокировать/разблокировать объявление
    async toggleAdBlock(adId, isBlocked) {
        try {
            const ads = JSON.parse(localStorage.getItem('market_ads') || '[]');
            const adIndex = ads.findIndex(ad => ad.id === adId);
            
            if (adIndex !== -1) {
                ads[adIndex].isBlocked = isBlocked;
                localStorage.setItem('market_ads', JSON.stringify(ads));
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Ошибка блокировки объявления:', error);
            throw error;
        }
    }
};
