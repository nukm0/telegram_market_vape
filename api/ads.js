// API для работы с объявлениями
class AdsAPI {
    constructor() {
        this.baseUrl = 'https://your-api-domain.com/api';
        this.headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getToken()}`
        };
    }
    
    getToken() {
        return localStorage.getItem('auth_token');
    }
    
    async getAds(params = {}) {
        try {
            const query = new URLSearchParams(params).toString();
            const response = await fetch(`${this.baseUrl}/ads?${query}`, {
                headers: this.headers
            });
            return await response.json();
        } catch (error) {
            console.error('Ошибка получения объявлений:', error);
            throw error;
        }
    }
    
    async createAd(adData) {
        try {
            const response = await fetch(`${this.baseUrl}/ads`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(adData)
            });
            return await response.json();
        } catch (error) {
            console.error('Ошибка создания объявления:', error);
            throw error;
        }
    }
    
    async updateAd(id, adData) {
        try {
            const response = await fetch(`${this.baseUrl}/ads/${id}`, {
                method: 'PUT',
                headers: this.headers,
                body: JSON.stringify(adData)
            });
            return await response.json();
        } catch (error) {
            console.error('Ошибка обновления объявления:', error);
            throw error;
        }
    }
    
    async deleteAd(id) {
        try {
            const response = await fetch(`${this.baseUrl}/ads/${id}`, {
                method: 'DELETE',
                headers: this.headers
            });
            return await response.json();
        } catch (error) {
            console.error('Ошибка удаления объявления:', error);
            throw error;
        }
    }
    
    async likeAd(id) {
        try {
            const response = await fetch(`${this.baseUrl}/ads/${id}/like`, {
                method: 'POST',
                headers: this.headers
            });
            return await response.json();
        } catch (error) {
            console.error('Ошибка лайка:', error);
            throw error;
        }
    }
    
    async dislikeAd(id) {
        try {
            const response = await fetch(`${this.baseUrl}/ads/${id}/dislike`, {
                method: 'POST',
                headers: this.headers
            });
            return await response.json();
        } catch (error) {
            console.error('Ошибка дизлайка:', error);
            throw error;
        }
    }
    
    async reportAd(id, reportData) {
        try {
            const response = await fetch(`${this.baseUrl}/ads/${id}/report`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(reportData)
            });
            return await response.json();
        } catch (error) {
            console.error('Ошибка отправки жалобы:', error);
            throw error;
        }
    }
    
    async uploadImages(files) {
        try {
            const formData = new FormData();
            files.forEach((file, index) => {
                formData.append(`image${index}`, file);
            });
            
            const response = await fetch(`${this.baseUrl}/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.getToken()}`
                },
                body: formData
            });
            return await response.json();
        } catch (error) {
            console.error('Ошибка загрузки изображений:', error);
            throw error;
        }
    }
}

// Создаем глобальный экземпляр API
window.adsAPI = new AdsAPI();
