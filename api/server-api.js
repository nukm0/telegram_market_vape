const ServerAPI = {
    // Оценить пользователя
    async rateUser(userId, rating, raterId) {
        try {
            const ratings = JSON.parse(localStorage.getItem('user_ratings') || '[]');
            const existingRating = ratings.find(r => r.userId === userId && r.raterId === raterId);
            
            if (existingRating) {
                existingRating.rating = rating;
                existingRating.date = new Date().toISOString();
            } else {
                ratings.push({
                    userId,
                    raterId,
                    rating,
                    date: new Date().toISOString()
                });
            }
            
            localStorage.setItem('user_ratings', JSON.stringify(ratings));
            
            // Обновляем статистику пользователя
            this.updateUserRatingStats(userId);
            
            return true;
        } catch (error) {
            console.error('Ошибка оценки пользователя:', error);
            throw error;
        }
    },
    
    // Обновить статистику рейтинга пользователя
    updateUserRatingStats(userId) {
        try {
            const ratings = JSON.parse(localStorage.getItem('user_ratings') || '[]');
            const userRatings = ratings.filter(r => r.userId === userId);
            
            const stats = {
                likes: userRatings.filter(r => r.rating === 'like').length,
                dislikes: userRatings.filter(r => r.rating === 'dislike').length,
                total: userRatings.length,
                rating: userRatings.length > 0 ? 
                    (userRatings.filter(r => r.rating === 'like').length / userRatings.length * 100).toFixed(1) : 0
            };
            
            // Сохраняем статистику
            const userStats = JSON.parse(localStorage.getItem('user_stats') || '{}');
            userStats[userId] = stats;
            localStorage.setItem('user_stats', JSON.stringify(userStats));
            
            return stats;
        } catch (error) {
            console.error('Ошибка обновления статистики:', error);
            return { likes: 0, dislikes: 0, total: 0, rating: 0 };
        }
    },
    
    // Получить рейтинг пользователя
    async getUserRating(userId) {
        try {
            const userStats = JSON.parse(localStorage.getItem('user_stats') || '{}');
            return userStats[userId] || { likes: 0, dislikes: 0, total: 0, rating: 0 };
        } catch (error) {
            console.error('Ошибка получения рейтинга:', error);
            return { likes: 0, dislikes: 0, total: 0, rating: 0 };
        }
    },
    
    // Пожаловаться на объявление
    async reportAd(reportData) {
        try {
            const reports = JSON.parse(localStorage.getItem('ad_reports') || '[]');
            reports.push({
                ...reportData,
                id: Date.now().toString(),
                date: new Date().toISOString(),
                status: 'pending'
            });
            
            localStorage.setItem('ad_reports', JSON.stringify(reports));
            
            // Также добавляем жалобу в сам объект объявления
            await AdsAPI.addReport(reportData.adId, reportData);
            
            return true;
        } catch (error) {
            console.error('Ошибка отправки жалобы:', error);
            throw error;
        }
    },
    
    // Получить все жалобы
    async getAllReports() {
        try {
            return JSON.parse(localStorage.getItem('ad_reports') || '[]');
        } catch (error) {
            console.error('Ошибка получения жалоб:', error);
            return [];
        }
    },
    
    // Обновить статус жалобы
    async updateReportStatus(reportId, status) {
        try {
            const reports = JSON.parse(localStorage.getItem('ad_reports') || '[]');
            const reportIndex = reports.findIndex(r => r.id === reportId);
            
            if (reportIndex !== -1) {
                reports[reportIndex].status = status;
                reports[reportIndex].processedAt = new Date().toISOString();
                localStorage.setItem('ad_reports', JSON.stringify(reports));
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Ошибка обновления жалобы:', error);
            throw error;
        }
    },
    
    // Получить рекламу
    async getAdvertisement() {
        try {
            return JSON.parse(localStorage.getItem('advertisement') || '{}');
        } catch (error) {
            console.error('Ошибка получения рекламы:', error);
            return null;
        }
    },
    
    // Сохранить рекламу
    async saveAdvertisement(adData) {
        try {
            const ad = {
                ...adData,
                id: 'ad_1',
                enabled: true,
                updatedAt: new Date().toISOString()
            };
            
            localStorage.setItem('advertisement', JSON.stringify(ad));
            return ad;
        } catch (error) {
            console.error('Ошибка сохранения рекламы:', error);
            throw error;
        }
    },
    
    // Получить статистику
    async getStats() {
        try {
            const ads = JSON.parse(localStorage.getItem('market_ads') || '[]');
            const users = JSON.parse(localStorage.getItem('market_users') || '[]');
            const reports = JSON.parse(localStorage.getItem('ad_reports') || '[]');
            
            return {
                totalAds: ads.length,
                activeAds: ads.filter(ad => !ad.isBlocked).length,
                blockedAds: ads.filter(ad => ad.isBlocked).length,
                totalUsers: users.length,
                pendingReports: reports.filter(r => r.status === 'pending').length,
                totalReports: reports.length,
                todayAds: ads.filter(ad => {
                    const adDate = new Date(ad.createdAt);
                    const today = new Date();
                    return adDate.toDateString() === today.toDateString();
                }).length
            };
        } catch (error) {
            console.error('Ошибка получения статистики:', error);
            return {
                totalAds: 0,
                activeAds: 0,
                blockedAds: 0,
                totalUsers: 0,
                pendingReports: 0,
                totalReports: 0,
                todayAds: 0
            };
        }
    },
    
    // Управление пользователями
    async getUsers() {
        try {
            return JSON.parse(localStorage.getItem('market_users') || '[]');
        } catch (error) {
            console.error('Ошибка получения пользователей:', error);
            return [];
        }
    },
    
    // Блокировать/разблокировать пользователя
    async toggleUserBlock(userId, isBlocked) {
        try {
            const users = JSON.parse(localStorage.getItem('market_users') || '[]');
            const userIndex = users.findIndex(u => u.id === userId);
            
            if (userIndex !== -1) {
                users[userIndex].isBlocked = isBlocked;
                users[userIndex].blockedAt = isBlocked ? new Date().toISOString() : null;
                localStorage.setItem('market_users', JSON.stringify(users));
                
                // Также блокируем все объявления пользователя
                const ads = JSON.parse(localStorage.getItem('market_ads') || '[]');
                ads.forEach(ad => {
                    if (ad.userId === userId) {
                        ad.isBlocked = isBlocked;
                    }
                });
                localStorage.setItem('market_ads', JSON.stringify(ads));
                
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Ошибка блокировки пользователя:', error);
            throw error;
        }
    },
    
    // Назначить админа
    async setAdmin(userId, role) {
        try {
            const adminUsers = JSON.parse(localStorage.getItem('admin_users') || '{}');
            adminUsers[userId] = {
                userId,
                role,
                assignedAt: new Date().toISOString()
            };
            
            localStorage.setItem('admin_users', JSON.stringify(adminUsers));
            return true;
        } catch (error) {
            console.error('Ошибка назначения админа:', error);
            throw error;
        }
    },
    
    // Удалить админа
    async removeAdmin(userId) {
        try {
            const adminUsers = JSON.parse(localStorage.getItem('admin_users') || '{}');
            delete adminUsers[userId];
            localStorage.setItem('admin_users', JSON.stringify(adminUsers));
            return true;
        } catch (error) {
            console.error('Ошибка удаления админа:', error);
            throw error;
        }
    },
    
    // Получить список админов
    async getAdmins() {
        try {
            return JSON.parse(localStorage.getItem('admin_users') || '{}');
        } catch (error) {
            console.error('Ошибка получения админов:', error);
            return {};
        }
    }
};
