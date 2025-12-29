// API для работы с сервером (администрация)
class ServerAPI {
    constructor() {
        this.baseUrl = 'https://your-api-domain.com/api/admin';
        this.headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getToken()}`
        };
    }
    
    getToken() {
        return localStorage.getItem('auth_token');
    }
    
    async getStatistics() {
        try {
            const response = await fetch(`${this.baseUrl}/statistics`, {
                headers: this.headers
            });
            return await response.json();
        } catch (error) {
            console.error('Ошибка получения статистики:', error);
            throw error;
        }
    }
    
    async getUsers(params = {}) {
        try {
            const query = new URLSearchParams(params).toString();
            const response = await fetch(`${this.baseUrl}/users?${query}`, {
                headers: this.headers
            });
            return await response.json();
        } catch (error) {
            console.error('Ошибка получения пользователей:', error);
            throw error;
        }
    }
    
    async blockUser(userId, reason, type = 'temporary') {
        try {
            const response = await fetch(`${this.baseUrl}/users/${userId}/block`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({ reason, type })
            });
            return await response.json();
        } catch (error) {
            console.error('Ошибка блокировки пользователя:', error);
            throw error;
        }
    }
    
    async unblockUser(userId) {
        try {
            const response = await fetch(`${this.baseUrl}/users/${userId}/unblock`, {
                method: 'POST',
                headers: this.headers
            });
            return await response.json();
        } catch (error) {
            console.error('Ошибка разблокировки пользователя:', error);
            throw error;
        }
    }
    
    async getReports(status = 'pending') {
        try {
            const response = await fetch(`${this.baseUrl}/reports?status=${status}`, {
                headers: this.headers
            });
            return await response.json();
        } catch (error) {
            console.error('Ошибка получения жалоб:', error);
            throw error;
        }
    }
    
    async resolveReport(reportId, action) {
        try {
            const response = await fetch(`${this.baseUrl}/reports/${reportId}/resolve`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({ action })
            });
            return await response.json();
        } catch (error) {
            console.error('Ошибка обработки жалобы:', error);
            throw error;
        }
    }
    
    async updateBanner(settings) {
        try {
            const response = await fetch(`${this.baseUrl}/banner`, {
                method: 'PUT',
                headers: this.headers,
                body: JSON.stringify(settings)
            });
            return await response.json();
        } catch (error) {
            console.error('Ошибка обновления баннера:', error);
            throw error;
        }
    }
    
    async updateAdminRights(userId, level, permissions) {
        try {
            const response = await fetch(`${this.baseUrl}/admins/${userId}/rights`, {
                method: 'PUT',
                headers: this.headers,
                body: JSON.stringify({ level, permissions })
            });
            return await response.json();
        } catch (error) {
            console.error('Ошибка обновления прав:', error);
            throw error;
        }
    }
    
    async removeLikes(userId) {
        try {
            const response = await fetch(`${this.baseUrl}/users/${userId}/likes`, {
                method: 'DELETE',
                headers: this.headers
            });
            return await response.json();
        } catch (error) {
            console.error('Ошибка снятия лайков:', error);
            throw error;
        }
    }
    
    async getAdminLogs(params = {}) {
        try {
            const query = new URLSearchParams(params).toString();
            const response = await fetch(`${this.baseUrl}/logs?${query}`, {
                headers: this.headers
            });
            return await response.json();
        } catch (error) {
            console.error('Ошибка получения логов:', error);
            throw error;
        }
    }
}

// Создаем глобальный экземпляр API
window.serverAPI = new ServerAPI();
