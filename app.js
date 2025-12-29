// Основной файл приложения
class VapeMarketApp {
    constructor() {
        this.currentUser = null;
        this.isAdmin = false;
        this.adminLevel = 0;
        this.ads = [];
        this.reports = [];
        
        this.init();
    }
    
    async init() {
        this.loadUserData();
        this.setupEventListeners();
        await this.loadAds();
        this.checkAdminStatus();
    }
    
    loadUserData() {
        // Загрузка данных пользователя из localStorage или API
        const userData = localStorage.getItem('vape_market_user');
        if (userData) {
            this.currentUser = JSON.parse(userData);
            this.isAdmin = this.currentUser?.isAdmin || false;
            this.adminLevel = this.currentUser?.adminLevel || 0;
            
            // Обновляем UI
            this.updateUserUI();
        } else {
            // Гость
            this.currentUser = {
                id: 'guest',
                name: 'Гость',
                avatar: 'Г',
                isGuest: true
            };
        }
    }
    
    updateUserUI() {
        const userAvatar = document.getElementById('userAvatar');
        const adminLink = document.getElementById('adminLink');
        
        if (userAvatar) {
            userAvatar.textContent = this.currentUser.avatar;
            userAvatar.title = this.currentUser.name;
        }
        
        if (adminLink && this.isAdmin) {
            adminLink.style.display = 'flex';
        }
    }
    
    async loadAds() {
        try {
            // Загрузка объявлений через API
            const response = await fetch('/api/ads');
            const data = await response.json();
            this.ads = data.ads || [];
            this.renderAds();
        } catch (error) {
            console.error('Ошибка загрузки объявлений:', error);
            // Заглушка для демо
            this.ads = this.getMockAds();
            this.renderAds();
        }
    }
    
    getMockAds() {
        return [
            {
                id: 1,
                title: 'Caliburn G3',
                price: 1500,
                description: 'Новое устройство, в упаковке',
                category: 'devices',
                type: 'sell',
                images: [],
                likes: 12,
                dislikes: 2,
                rating: 4.8,
                user: { name: 'Алексей', avatar: 'А' }
            },
            {
                id: 2,
                title: 'Жидкости Vampire Vape',
                price: 800,
                description: 'Набор из 3 жидкостей, 60ml каждая',
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
                description: 'Ищу Voopoo Drag X, можно б/у',
                category: 'devices',
                type: 'buy',
                images: [],
                likes: 5,
                dislikes: 0,
                rating: 4.9,
                user: { name: 'Иван', avatar: 'И' }
            }
        ];
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
        const card = document.createElement('div');
        card.className = 'ad-card';
        card.dataset.id = ad.id;
        
        const categoryNames = {
            'liquids': 'Жидкости',
            'devices': 'Устройства',
            'accessories': 'Аксессуары',
            'pods': 'Поды',
            'coils': 'Нагреватели'
        };
        
        card.innerHTML = `
            <div class="ad-image">
                ${ad.images.length > 0 ? 
                    `<img src="${ad.images[0]}" alt="${ad.title}" style="width: 100%; height: 100%; object-fit: cover;">` : 
                    `<div style="width: 100%; height: 100%; background: var(--gradient-secondary); display: flex; align-items: center; justify-content: center; color: white;">
                        <i class="fas fa-image" style="font-size: 3rem;"></i>
                    </div>`
                }
            </div>
            <div class="ad-content">
                <div class="ad-header">
                    <h3 class="ad-title">${ad.title}</h3>
                    <span class="ad-price">${ad.price} ₽</span>
                </div>
                <p class="ad-description">${ad.description}</p>
                <div class="ad-meta">
                    <span class="ad-category">${categoryNames[ad.category] || ad.category}</span>
                    <span class="ad-type">${ad.type === 'sell' ? 'Продажа' : 'Покупка'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 0.5rem;">
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <button class="btn btn-small" data-action="like" style="background: none; color: var(--primary-color);">
                            <i class="fas fa-thumbs-up"></i> ${ad.likes}
                        </button>
                        <button class="btn btn-small" data-action="dislike" style="background: none; color: var(--danger-color);">
                            <i class="fas fa-thumbs-down"></i> ${ad.dislikes}
                        </button>
                        <span style="color: var(--warning-color);">
                            <i class="fas fa-star"></i> ${ad.rating}
                        </span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.3rem;">
                        <div style="
                            width: 24px;
                            height: 24px;
                            border-radius: 50%;
                            background: var(--gradient-primary);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-size: 0.8rem;
                            font-weight: 600;
                        ">
                            ${ad.user.avatar}
                        </div>
                        <span style="font-size: 0.9rem;">${ad.user.name}</span>
                    </div>
                </div>
                <div class="ad-actions">
                    <button class="btn btn-primary btn-small" data-action="message">
                        <i class="fas fa-comment"></i> Написать
                    </button>
                    <button class="btn btn-secondary btn-small" data-action="favorite">
                        <i class="fas fa-heart"></i>
                    </button>
                    <button class="btn btn-danger btn-small" data-action="report">
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
                    alert('Для создания объявления необходимо авторизоваться');
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
            adForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.createAd(new FormData(adForm));
                modal.classList.remove('active');
                adForm.reset();
            });
        }
        
        // Загрузка файлов
        const fileUpload = document.getElementById('fileUpload');
        const fileInput = document.getElementById('fileInput');
        const filePreview = document.getElementById('filePreview');
        const fileCount = document.getElementById('fileCount');
        
        if (fileUpload && fileInput) {
            fileUpload.addEventListener('click', () => fileInput.click());
            
            fileInput.addEventListener('change', () => {
                this.handleFileUpload(fileInput, filePreview, fileCount);
            });
            
            // Drag & drop
            fileUpload.addEventListener('dragover', (e) => {
                e.preventDefault();
                fileUpload.style.borderColor = 'var(--primary-color)';
            });
            
            fileUpload.addEventListener('dragleave', () => {
                fileUpload.style.borderColor = '#cbd5e1';
            });
            
            fileUpload.addEventListener('drop', (e) => {
                e.preventDefault();
                fileUpload.style.borderColor = '#cbd5e1';
                fileInput.files = e.dataTransfer.files;
                this.handleFileUpload(fileInput, filePreview, fileCount);
            });
        }
        
        // Фильтры
        document.querySelectorAll('[data-filter]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                this.filterAds(filter);
                
                // Обновляем активную кнопку
                document.querySelectorAll('[data-filter]').forEach(b => {
                    b.classList.remove('btn-primary');
                    b.classList.add('btn-secondary');
                });
                e.target.classList.remove('btn-secondary');
                e.target.classList.add('btn-primary');
            });
        });
        
        // Жалобы
        this.setupReportSystem();
        
        // Админ панель
        this.setupAdminPanel();
    }
    
    handleFileUpload(input, preview, count) {
        const files = input.files;
        preview.innerHTML = '';
        
        for (let i = 0; i < Math.min(files.length, 3); i++) {
            const file = files[i];
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const div = document.createElement('div');
                div.className = 'file-preview-item';
                div.innerHTML = `
                    <img src="${e.target.result}" class="file-preview-img">
                    <button class="file-remove" data-index="${i}">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                preview.appendChild(div);
                
                // Удаление файла
                div.querySelector('.file-remove').addEventListener('click', () => {
                    div.remove();
                    const newFiles = Array.from(input.files);
                    newFiles.splice(i, 1);
                    
                    // Обновляем input files
                    const dataTransfer = new DataTransfer();
                    newFiles.forEach(f => dataTransfer.items.add(f));
                    input.files = dataTransfer.files;
                    
                    count.textContent = input.files.length;
                });
            };
            
            reader.readAsDataURL(file);
        }
        
        count.textContent = Math.min(files.length, 3);
    }
    
    async createAd(formData) {
        try {
            const adData = {
                title: formData.get('title'),
                price: parseInt(formData.get('price')),
                description: formData.get('description'),
                type: formData.get('type'),
                category: formData.get('category'),
                userId: this.currentUser.id
            };
            
            // Здесь должен быть запрос к API
            console.log('Создание объявления:', adData);
            alert('Объявление успешно создано!');
            
            // Обновляем список
            await this.loadAds();
            
        } catch (error) {
            console.error('Ошибка создания объявления:', error);
            alert('Ошибка при создании объявления');
        }
    }
    
    filterAds(filter) {
        const ads = document.querySelectorAll('.ad-card');
        
        ads.forEach(ad => {
            if (filter === 'all') {
                ad.style.display = 'block';
            } else {
                const type = ad.querySelector('.ad-type').textContent.toLowerCase();
                if (type.includes(filter)) {
                    ad.style.display = 'block';
                } else {
                    ad.style.display = 'none';
                }
            }
        });
    }
    
    setupReportSystem() {
        const reportModal = document.getElementById('reportModal');
        const closeReportModal = document.getElementById('closeReportModal');
        const cancelReportBtn = document.getElementById('cancelReportBtn');
        const reportForm = document.getElementById('reportForm');
        
        // Открытие модального окна жалобы
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-action="report"]')) {
                if (this.currentUser.isGuest) {
                    alert('Для отправки жалобы необходимо авторизоваться');
                    return;
                }
                
                const adCard = e.target.closest('.ad-card');
                const adId = adCard?.dataset.id;
                
                if (adId) {
                    reportModal.dataset.adId = adId;
                    reportModal.classList.add('active');
                }
            }
        });
        
        if (closeReportModal) {
            closeReportModal.addEventListener('click', () => {
                reportModal.classList.remove('active');
            });
        }
        
        if (cancelReportBtn) {
            cancelReportBtn.addEventListener('click', () => {
                reportModal.classList.remove('active');
            });
        }
        
        if (reportForm) {
            reportForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(reportForm);
                const adId = reportModal.dataset.adId;
                
                await this.submitReport(adId, {
                    type: formData.get('reportType'),
                    comment: formData.get('comment'),
                    userId: this.currentUser.id
                });
                
                reportModal.classList.remove('active');
                reportForm.reset();
            });
        }
    }
    
    async submitReport(adId, reportData) {
        try {
            // Отправка жалобы через API
            console.log('Отправка жалобы:', { adId, ...reportData });
            alert('Жалоба отправлена администраторам');
            
        } catch (error) {
            console.error('Ошибка отправки жалобы:', error);
            alert('Ошибка при отправке жалобы');
        }
    }
    
    checkAdminStatus() {
        const adminBanner = document.getElementById('adminBanner');
        
        if (this.adminLevel === 3 && adminBanner) {
            adminBanner.classList.remove('hidden');
        }
    }
    
    setupAdminPanel() {
        // Переключение вкладок
        const adminLinks = document.querySelectorAll('.admin-menu a');
        adminLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tabId = link.dataset.tab + 'Tab';
                
                // Скрываем все вкладки
                document.querySelectorAll('.admin-tab').forEach(tab => {
                    tab.classList.add('hidden');
                });
                
                // Показываем выбранную
                const targetTab = document.getElementById(tabId);
                if (targetTab) {
                    targetTab.classList.remove('hidden');
                }
                
                // Обновляем активную ссылку
                adminLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });
        
        // Блокировка пользователя
        const blockUserModal = document.getElementById('blockUserModal');
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-danger .fa-ban')) {
                const userId = e.target.closest('tr')?.dataset.userId;
                if (userId && blockUserModal) {
                    blockUserModal.dataset.userId = userId;
                    blockUserModal.classList.add('active');
                }
            }
        });
        
        // Сохранение баннера
        const saveBannerBtn = document.getElementById('saveBannerBtn');
        if (saveBannerBtn) {
            saveBannerBtn.addEventListener('click', () => {
                const bannerText = document.getElementById('bannerText').value;
                const bannerStatus = document.querySelector('input[name="bannerStatus"]:checked').value;
                
                this.saveBannerSettings({
                    text: bannerText,
                    status: bannerStatus
                });
            });
        }
        
        // Права доступа
        const saveRightsBtn = document.getElementById('saveRightsBtn');
        if (saveRightsBtn) {
            saveRightsBtn.addEventListener('click', () => {
                const userId = document.getElementById('adminUserSelect').value;
                const level = document.querySelector('[data-level].active')?.dataset.level || 1;
                const rights = [];
                
                document.querySelectorAll('input[data-right]:checked').forEach(checkbox => {
                    rights.push(checkbox.dataset.right);
                });
                
                this.saveAdminRights(userId, parseInt(level), rights);
            });
        }
    }
    
    async saveBannerSettings(settings) {
        try {
            // Сохранение настроек баннера
            console.log('Сохранение баннера:', settings);
            localStorage.setItem('admin_banner', JSON.stringify(settings));
            alert('Настройки баннера сохранены!');
            
        } catch (error) {
            console.error('Ошибка сохранения баннера:', error);
            alert('Ошибка при сохранении настроек');
        }
    }
    
    async saveAdminRights(userId, level, rights) {
        try {
            // Сохранение прав администратора
            console.log('Сохранение прав:', { userId, level, rights });
            alert('Права администратора сохранены!');
            
        } catch (error) {
            console.error('Ошибка сохранения прав:', error);
            alert('Ошибка при сохранении прав');
        }
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    window.app = new VapeMarketApp();
});
