// Vape Market - Основной файл приложения (обновленный под новый дизайн)
class VapeMarket {
    constructor() {
        this.currentUser = null;
        this.isAdmin = false;
        this.adminLevel = 0;
        this.ads = [];
        
        this.init();
    }
    
    init() {
        this.loadUserData();
        this.setupEventListeners();
        this.loadDemoAds();
        this.checkAdminStatus();
    }
    
    loadUserData() {
        // Для демо - создаем тестового пользователя
        const userData = localStorage.getItem('vape_market_user');
        if (userData) {
            this.currentUser = JSON.parse(userData);
            this.isAdmin = this.currentUser?.isAdmin || false;
            this.adminLevel = this.currentUser?.adminLevel || 0;
        } else {
            // Гостевой режим
            this.currentUser = {
                id: 'guest',
                name: 'Гость',
                avatar: 'Г',
                isGuest: true,
                isAdmin: false,
                adminLevel: 0
            };
            
            // Для демо - админ пользователь
            const adminUser = {
                id: 'admin-1',
                username: 'admin',
                name: 'Администратор',
                avatar: 'A',
                isAdmin: true,
                adminLevel: 3,
                email: 'admin@example.com',
                rating: 5.0,
                ads: 45,
                likes: 289,
                deals: 156
            };
            
            // Сохраняем для демо
            localStorage.setItem('vape_market_user_admin', JSON.stringify(adminUser));
        }
        
        this.updateUserUI();
    }
    
    updateUserUI() {
        const userAvatar = document.getElementById('userAvatar');
        const adminLink = document.getElementById('adminLink');
        
        if (userAvatar) {
            userAvatar.textContent = this.currentUser.avatar;
            userAvatar.title = this.currentUser.name;
            
            // Обновляем стиль аватара для админа
            if (this.isAdmin) {
                userAvatar.style.background = 'linear-gradient(145deg, #ff6b9d 0%, #8a2be2 100%)';
                userAvatar.style.border = '2px solid #ff6b9d';
            }
        }
        
        if (adminLink && this.isAdmin) {
            adminLink.style.display = 'flex';
        }
    }
    
    loadDemoAds() {
        // Демо объявления
        this.ads = [
            {
                id: 1,
                title: 'Caliburn G3',
                price: 1500,
                description: 'Новое устройство, в упаковке. Использовался 1 раз для теста.',
                category: 'devices',
                type: 'sell',
                images: [],
                likes: 12,
                dislikes: 2,
                rating: 4.8,
                user: { name: 'Алексей', avatar: 'А' },
                isNew: true
            },
            {
                id: 2,
                title: 'Жидкости Vampire Vape',
                price: 800,
                description: 'Набор из 3 жидкостей, 60ml каждая. Табачные вкусы.',
                category: 'liquids',
                type: 'sell',
                images: [],
                likes: 8,
                dislikes: 1,
                rating: 4.5,
                user: { name: 'Мария', avatar: 'М' }
            },
            {
                id: 3,
                title: 'Pod система Voopoo',
                price: 2000,
                description: 'Ищу Voopoo Drag X в хорошем состоянии. Можно б/у.',
                category: 'devices',
                type: 'buy',
                images: [],
                likes: 5,
                dislikes: 0,
                rating: 4.9,
                user: { name: 'Иван', avatar: 'И' }
            },
            {
                id: 4,
                title: 'Нагреватели для Caliburn',
                price: 400,
                description: 'Упаковка 4 шт. Оригинальные нагреватели 0.8 ом.',
                category: 'coils',
                type: 'sell',
                images: [],
                likes: 15,
                dislikes: 0,
                rating: 4.7,
                user: { name: 'Сергей', avatar: 'С' }
            },
            {
                id: 5,
                title: 'Готовый набор для вейпа',
                price: 3500,
                description: 'Полный набор: устройство, 5 жидкостей, запасные нагреватели.',
                category: 'devices',
                type: 'sell',
                images: [],
                likes: 23,
                dislikes: 1,
                rating: 4.9,
                user: { name: 'Дмитрий', avatar: 'Д' },
                isNew: true
            },
            {
                id: 6,
                title: 'Жидкости солевые 30mg',
                price: 600,
                description: 'Топовые бренды: Nasty, Dinner Lady, Heisenberg.',
                category: 'liquids',
                type: 'sell',
                images: [],
                likes: 18,
                dislikes: 2,
                rating: 4.6,
                user: { name: 'Ольга', avatar: 'О' }
            }
        ];
        
        this.renderAds();
    }
    
    renderAds() {
        const adsGrid = document.getElementById('adsGrid');
        if (!adsGrid) return;
        
        adsGrid.innerHTML = '';
        
        this.ads.forEach(ad => {
            const adCard = this.createAdCard(ad);
            adsGrid.appendChild(adCard);
        });
    }
    
    createAdCard(ad) {
        const categoryNames = {
            'liquids': 'Жидкости',
            'devices': 'Устройства',
            'accessories': 'Аксессуары',
            'pods': 'Поды',
            'coils': 'Нагреватели'
        };
        
        const card = document.createElement('div');
        card.className = 'ad-card';
        card.dataset.id = ad.id;
        
        // Определяем цвет для типа сделки
        const typeColor = ad.type === 'sell' ? 'var(--success)' : 'var(--info)';
        const typeText = ad.type === 'sell' ? 'Продажа' : 'Покупка';
        
        card.innerHTML = `
            ${ad.isNew ? `<div class="ad-badge">NEW</div>` : ''}
            
            <div class="ad-image">
                <div class="image-placeholder">
                    <i class="fas fa-image"></i>
                </div>
            </div>
            
            <div class="ad-content">
                <div class="ad-header">
                    <h3 class="ad-title">${ad.title}</h3>
                    <span class="ad-price">${ad.price.toLocaleString()} ₽</span>
                </div>
                
                <p class="ad-description">${ad.description}</p>
                
                <div class="ad-meta">
                    <span class="ad-category">${categoryNames[ad.category] || ad.category}</span>
                    <span class="ad-type" style="color: ${typeColor}">
                        <i class="fas ${ad.type === 'sell' ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
                        ${typeText}
                    </span>
                </div>
                
                <div class="flex justify-between items-center mt-4">
                    <div class="flex items-center gap-2">
                        <button class="btn btn-icon" data-action="like" title="Лайк">
                            <i class="fas fa-thumbs-up"></i>
                            <span class="ml-1">${ad.likes}</span>
                        </button>
                        <button class="btn btn-icon" data-action="dislike" title="Дизлайк">
                            <i class="fas fa-thumbs-down"></i>
                            <span class="ml-1">${ad.dislikes}</span>
                        </button>
                        <span style="color: var(--warning);">
                            <i class="fas fa-star"></i> ${ad.rating}
                        </span>
                    </div>
                    
                    <div class="flex items-center gap-2">
                        <div class="user-avatar" style="width: 32px; height: 32px; font-size: 14px;">
                            ${ad.user.avatar}
                        </div>
                        <span style="font-size: 14px;">${ad.user.name}</span>
                    </div>
                </div>
                
                <div class="ad-actions mt-4">
                    <button class="btn btn-primary" data-action="message">
                        <i class="fas fa-comment"></i> Написать
                    </button>
                    <button class="btn btn-secondary" data-action="favorite" title="В избранное">
                        <i class="fas fa-heart"></i>
                    </button>
                    <button class="btn btn-danger" data-action="report" title="Пожаловаться">
                        <i class="fas fa-flag"></i>
                    </button>
                </div>
            </div>
        `;
        
        return card;
    }
    
    setupEventListeners() {
        // Создание объявления
        const createAdBtn = document.getElementById('createAdBtn');
        const closeModalBtn = document.getElementById('closeModal');
        const cancelBtn = document.getElementById('cancelBtn');
        const modal = document.getElementById('createAdModal');
        const adForm = document.getElementById('adForm');
        
        if (createAdBtn) {
            createAdBtn.addEventListener('click', () => {
                if (this.currentUser.isGuest) {
                    this.showAuthModal();
                    return;
                }
                modal.classList.add('active');
            });
        }
        
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }
        
        if (adForm) {
            adForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createAd(new FormData(adForm));
                modal.classList.remove('active');
                adForm.reset();
                this.resetFileUpload();
            });
        }
        
        // Фильтры
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                
                // Обновляем активную кнопку
                document.querySelectorAll('.category-btn').forEach(b => {
                    b.classList.remove('active');
                });
                e.target.classList.add('active');
                
                if (filter) {
                    this.filterAds(filter);
                }
            });
        });
        
        // Загрузка файлов
        this.setupFileUpload();
        
        // Обработка действий на карточках
        this.setupAdActions();
        
        // Жалобы
        this.setupReportSystem();
    }
    
    setupFileUpload() {
        const fileUpload = document.getElementById('fileUpload');
        const fileInput = document.getElementById('fileInput');
        const filePreview = document.getElementById('filePreview');
        const fileCount = document.getElementById('fileCount');
        
        if (!fileUpload || !fileInput) return;
        
        fileUpload.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', () => this.handleFileUpload(fileInput, filePreview, fileCount));
        
        // Drag & Drop
        fileUpload.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUpload.classList.add('dragover');
        });
        
        fileUpload.addEventListener('dragleave', () => {
            fileUpload.classList.remove('dragover');
        });
        
        fileUpload.addEventListener('drop', (e) => {
            e.preventDefault();
            fileUpload.classList.remove('dragover');
            
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                this.handleFileUpload(fileInput, filePreview, fileCount);
            }
        });
    }
    
    handleFileUpload(input, preview, count) {
        const files = input.files;
        preview.innerHTML = '';
        
        const fileCount = Math.min(files.length, 3);
        
        for (let i = 0; i < fileCount; i++) {
            const file = files[i];
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const previewItem = document.createElement('div');
                previewItem.className = 'preview-item';
                previewItem.innerHTML = `
                    <img src="${e.target.result}" alt="Preview">
                    <button class="remove-file" data-index="${i}">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                preview.appendChild(previewItem);
                
                // Удаление файла
                previewItem.querySelector('.remove-file').addEventListener('click', () => {
                    previewItem.remove();
                    this.updateFileCount(input, preview, count);
                });
            };
            
            reader.readAsDataURL(file);
        }
        
        count.textContent = fileCount;
    }
    
    updateFileCount(input, preview, count) {
        const items = preview.querySelectorAll('.preview-item');
        count.textContent = items.length;
    }
    
    resetFileUpload() {
        const fileInput = document.getElementById('fileInput');
        const filePreview = document.getElementById('filePreview');
        const fileCount = document.getElementById('fileCount');
        
        if (fileInput) fileInput.value = '';
        if (filePreview) filePreview.innerHTML = '';
        if (fileCount) fileCount.textContent = '0';
    }
    
    setupAdActions() {
        document.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]');
            if (!action) return;
            
            const adCard = e.target.closest('.ad-card');
            const adId = adCard?.dataset.id;
            const actionType = action.dataset.action;
            
            if (!adId) return;
            
            switch (actionType) {
                case 'like':
                    this.likeAd(adId);
                    break;
                case 'dislike':
                    this.dislikeAd(adId);
                    break;
                case 'message':
                    this.messageSeller(adId);
                    break;
                case 'favorite':
                    this.toggleFavorite(adId);
                    break;
                case 'report':
                    this.openReportModal(adId);
                    break;
            }
        });
    }
    
    likeAd(adId) {
        if (this.currentUser.isGuest) {
            this.showAuthModal();
            return;
        }
        
        const ad = this.ads.find(a => a.id == adId);
        if (ad) {
            ad.likes++;
            this.renderAds();
            console.log(`Лайк поставлен объявлению ${adId}`);
        }
    }
    
    dislikeAd(adId) {
        if (this.currentUser.isGuest) {
            this.showAuthModal();
            return;
        }
        
        const ad = this.ads.find(a => a.id == adId);
        if (ad) {
            ad.dislikes++;
            this.renderAds();
            console.log(`Дизлайк поставлен объявлению ${adId}`);
        }
    }
    
    messageSeller(adId) {
        if (this.currentUser.isGuest) {
            this.showAuthModal();
            return;
        }
        
        const ad = this.ads.find(a => a.id == adId);
        if (ad) {
            alert(`Открывается чат с ${ad.user.name} по объявлению: ${ad.title}`);
            // Здесь будет логика открытия чата
        }
    }
    
    toggleFavorite(adId) {
        if (this.currentUser.isGuest) {
            this.showAuthModal();
            return;
        }
        
        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        const index = favorites.indexOf(adId);
        
        if (index > -1) {
            favorites.splice(index, 1);
            console.log(`Удалено из избранного: ${adId}`);
        } else {
            favorites.push(adId);
            console.log(`Добавлено в избранное: ${adId}`);
        }
        
        localStorage.setItem('favorites', JSON.stringify(favorites));
        
        // Визуальная обратная связь
        const btn = document.querySelector(`[data-action="favorite"][data-ad-id="${adId}"]`);
        if (btn) {
            btn.innerHTML = index > -1 ? 
                '<i class="far fa-heart"></i>' : 
                '<i class="fas fa-heart" style="color: var(--accent);"></i>';
        }
    }
    
    openReportModal(adId) {
        if (this.currentUser.isGuest) {
            this.showAuthModal();
            return;
        }
        
        const modal = document.getElementById('reportModal');
        if (modal) {
            modal.dataset.adId = adId;
            modal.classList.add('active');
        }
    }
    
    setupReportSystem() {
        const modal = document.getElementById('reportModal');
        const closeBtn = document.getElementById('closeReportModal');
        const cancelBtn = document.getElementById('cancelReportBtn');
        const form = document.getElementById('reportForm');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => modal.classList.remove('active'));
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => modal.classList.remove('active'));
        }
        
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const adId = modal.dataset.adId;
                
                this.submitReport(adId, {
                    type: formData.get('reportType'),
                    comment: formData.get('comment'),
                    userId: this.currentUser.id
                });
                
                modal.classList.remove('active');
                form.reset();
            });
        }
    }
    
    submitReport(adId, reportData) {
        console.log('Жалоба отправлена:', { adId, ...reportData });
        
        // Показать уведомление
        this.showNotification('Жалоба отправлена администраторам', 'success');
        
        // В реальном приложении здесь будет отправка на сервер
        const reports = JSON.parse(localStorage.getItem('reports') || '[]');
        reports.push({
            id: Date.now(),
            adId,
            ...reportData,
            status: 'pending',
            createdAt: new Date().toISOString()
        });
        localStorage.setItem('reports', JSON.stringify(reports));
    }
    
    filterAds(filter) {
        const ads = document.querySelectorAll('.ad-card');
        
        ads.forEach(ad => {
            if (filter === 'all') {
                ad.style.display = 'block';
            } else {
                const typeElement = ad.querySelector('.ad-type');
                if (typeElement) {
                    const typeText = typeElement.textContent.toLowerCase();
                    const shouldShow = typeText.includes(filter === 'sale' ? 'продажа' : 'покупка');
                    ad.style.display = shouldShow ? 'block' : 'none';
                }
            }
        });
    }
    
    createAd(formData) {
        const adData = {
            id: Date.now(),
            title: formData.get('title'),
            price: parseInt(formData.get('price')),
            description: formData.get('description'),
            type: formData.get('type'),
            category: formData.get('category'),
            images: [],
            likes: 0,
            dislikes: 0,
            rating: 5.0,
            user: {
                name: this.currentUser.name,
                avatar: this.currentUser.avatar
            },
            createdAt: new Date().toISOString()
        };
        
        // Добавляем в массив
        this.ads.unshift(adData);
        this.renderAds();
        
        // Показываем уведомление
        this.showNotification('Объявление успешно создано!', 'success');
        
        console.log('Создано объявление:', adData);
    }
    
    checkAdminStatus() {
        const adminBanner = document.getElementById('adminBanner');
        
        if (this.adminLevel >= 3 && adminBanner) {
            adminBanner.classList.remove('hidden');
        }
    }
    
    showAuthModal() {
        // В реальном приложении здесь будет модальное окно авторизации
        const result = confirm('Для выполнения этого действия необходимо авторизоваться. Перейти на страницу входа?');
        if (result) {
            // Здесь будет переход на страницу авторизации
            console.log('Переход на страницу авторизации');
        }
    }
    
    showNotification(message, type = 'info') {
        // Создаем уведомление
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'success' ? 'var(--success)' : 'var(--warning)'};
                color: white;
                padding: 16px 24px;
                border-radius: var(--radius-md);
                box-shadow: var(--shadow-lg);
                z-index: 3000;
                display: flex;
                align-items: center;
                gap: 12px;
            ">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
                ${message}
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Удаляем через 3 секунды
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    window.vapeMarket = new VapeMarket();
    
    // Для демо: возможность переключиться на админа
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) {
        userAvatar.addEventListener('dblclick', () => {
            const adminUser = JSON.parse(localStorage.getItem('vape_market_user_admin') || 'null');
            if (adminUser && confirm('Переключиться на админа для демо?')) {
                localStorage.setItem('vape_market_user', JSON.stringify(adminUser));
                location.reload();
            }
        });
    }
});
