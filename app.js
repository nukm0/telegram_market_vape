// Vape Market - Основной файл приложения
class VapeMarket {
    constructor() {
        this.currentUser = null;
        this.isAdmin = false;
        this.adminLevel = 0;
        this.ads = [];
        this.isMobile = window.innerWidth <= 768;
        
        this.init();
    }
    
    async init() {
        await this.autoRegister();
        this.setupEventListeners();
        this.loadDemoAds();
        this.renderBottomNav();
        this.checkAdminStatus();
        this.setupMobileDetection();
    }
    
    // АВТОМАТИЧЕСКАЯ РЕГИСТРАЦИЯ ПО USER_ID
    async autoRegister() {
        // Генерируем уникальный user_id если нет
        let userId = localStorage.getItem('vape_user_id');
        let userData = null;
        
        if (!userId) {
            // Создаем новый user_id
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('vape_user_id', userId);
            
            console.log('Создан новый user_id:', userId);
            
            // Регистрируем пользователя автоматически
            userData = {
                id: userId,
                username: 'user_' + userId.substr(5, 8),
                name: this.generateRandomName(),
                avatar: this.generateAvatar(),
                email: `user_${userId.substr(5, 8)}@example.com`,
                isGuest: false,
                isAdmin: false,
                adminLevel: 0,
                rating: this.randomRating(),
                ads: 0,
                likes: 0,
                deals: 0,
                createdAt: new Date().toISOString(),
                phone: this.generatePhone()
            };
            
            // Для демо: один из пользователей будет админом
            if (Math.random() < 0.3) { // 30% шанс быть админом
                userData.isAdmin = true;
                userData.adminLevel = Math.floor(Math.random() * 3) + 1; // 1-3 уровень
                userData.name = 'Админ ' + userData.name;
                userData.avatar = 'A';
            }
            
            localStorage.setItem('vape_market_user', JSON.stringify(userData));
            localStorage.setItem('vape_user_data', JSON.stringify(userData));
            
            console.log('Автоматически зарегистрирован:', userData);
        } else {
            // Загружаем существующие данные
            userData = JSON.parse(localStorage.getItem('vape_market_user') || localStorage.getItem('vape_user_data') || 'null');
            
            if (!userData) {
                // Создаем данные если их нет
                userData = {
                    id: userId,
                    username: 'user_' + userId.substr(5, 8),
                    name: this.generateRandomName(),
                    avatar: this.generateAvatar(),
                    email: `user_${userId.substr(5, 8)}@example.com`,
                    isGuest: false,
                    isAdmin: false,
                    adminLevel: 0,
                    rating: this.randomRating(),
                    ads: Math.floor(Math.random() * 10),
                    likes: Math.floor(Math.random() * 100),
                    deals: Math.floor(Math.random() * 50),
                    createdAt: new Date().toISOString(),
                    phone: this.generatePhone()
                };
                
                localStorage.setItem('vape_market_user', JSON.stringify(userData));
                localStorage.setItem('vape_user_data', JSON.stringify(userData));
            }
        }
        
        this.currentUser = userData;
        this.isAdmin = this.currentUser?.isAdmin || false;
        this.adminLevel = this.currentUser?.adminLevel || 0;
        
        this.updateUserUI();
    }
    
    generateRandomName() {
        const names = ['Алексей', 'Мария', 'Иван', 'Ольга', 'Дмитрий', 'Елена', 'Сергей', 'Анна', 'Павел', 'Наталья'];
        const surnames = ['Иванов', 'Петрова', 'Сидоров', 'Кузнецова', 'Смирнов', 'Попова', 'Васильев', 'Новикова', 'Федоров', 'Морозова'];
        return `${names[Math.floor(Math.random() * names.length)]} ${surnames[Math.floor(Math.random() * surnames.length)]}`;
    }
    
    generateAvatar() {
        const avatars = ['А', 'М', 'И', 'О', 'Д', 'Е', 'С', 'П', 'Н', 'В'];
        return avatars[Math.floor(Math.random() * avatars.length)];
    }
    
    generatePhone() {
        return '+7 (9' + 
               Math.floor(Math.random() * 90 + 10) + ') ' + 
               Math.floor(Math.random() * 900 + 100) + '-' + 
               Math.floor(Math.random() * 90 + 10) + '-' + 
               Math.floor(Math.random() * 90 + 10);
    }
    
    randomRating() {
        return (Math.random() * 2 + 3).toFixed(1); // 3.0-5.0
    }
    
    updateUserUI() {
        const userAvatar = document.getElementById('userAvatar');
        const adminLink = document.getElementById('adminLink');
        
        if (userAvatar) {
            userAvatar.textContent = this.currentUser.avatar;
            userAvatar.title = `${this.currentUser.name}\n${this.currentUser.email}\nID: ${this.currentUser.id}`;
            
            // Обновляем стиль аватара для админа
            if (this.isAdmin) {
                userAvatar.style.background = 'linear-gradient(145deg, #ff6b9d 0%, #8a2be2 100%)';
                userAvatar.style.border = '2px solid #ff6b9d';
                userAvatar.style.boxShadow = '0 0 15px rgba(138, 43, 226, 0.5)';
            }
        }
        
        if (adminLink) {
            adminLink.style.display = this.isAdmin ? 'flex' : 'none';
        }
        
        // Обновляем нижнюю навигацию
        this.updateBottomNav();
    }
    
    // НИЖНЯЯ ПАНЕЛЬ НАВИГАЦИИ (как в мобильных приложениях)
    renderBottomNav() {
        // Создаем элемент нижней навигации если его нет
        let bottomNav = document.getElementById('bottomNav');
        
        if (!bottomNav) {
            bottomNav = document.createElement('div');
            bottomNav.id = 'bottomNav';
            bottomNav.className = 'bottom-nav';
            document.body.appendChild(bottomNav);
        }
        
        // Определяем текущую страницу
        const currentPage = this.getCurrentPage();
        
        bottomNav.innerHTML = `
            <div class="bottom-nav-content">
                <a href="index.html" class="nav-item ${currentPage === 'home' ? 'active' : ''}" data-page="home">
                    <div class="nav-icon">
                        <i class="fas fa-home"></i>
                    </div>
                    <span class="nav-label">Главная</span>
                </a>
                
                <a href="pages/profile.html" class="nav-item ${currentPage === 'profile' ? 'active' : ''}" data-page="profile">
                    <div class="nav-icon">
                        <i class="fas fa-user"></i>
                    </div>
                    <span class="nav-label">Кабинет</span>
                </a>
                
                <div class="nav-item nav-center" id="createAdBottomBtn">
                    <div class="nav-icon-center">
                        <i class="fas fa-plus"></i>
                    </div>
                    <span class="nav-label">Разместить</span>
                </div>
                
                <a href="pages/faq.html" class="nav-item ${currentPage === 'faq' ? 'active' : ''}" data-page="faq">
                    <div class="nav-icon">
                        <i class="fas fa-question-circle"></i>
                    </div>
                    <span class="nav-label">FAQ</span>
                </a>
                
                <a href="pages/admin-panel.html" class="nav-item ${currentPage === 'admin' ? 'active' : ''} ${this.isAdmin ? '' : 'hidden'}" 
                   data-page="admin" id="bottomAdminLink">
                    <div class="nav-icon">
                        <i class="fas fa-shield-alt"></i>
                    </div>
                    <span class="nav-label">Админ</span>
                </a>
            </div>
        `;
        
        // Добавляем стили для нижней навигации
        this.addBottomNavStyles();
        
        // Навешиваем обработчики событий
        this.setupBottomNavEvents();
    }
    
    addBottomNavStyles() {
        // Добавляем стили для нижней навигации если их нет
        if (!document.getElementById('bottomNavStyles')) {
            const style = document.createElement('style');
            style.id = 'bottomNavStyles';
            style.textContent = `
                .bottom-nav {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: var(--bg-card);
                    border-top: 1px solid var(--border);
                    padding: 8px 0;
                    z-index: 1000;
                    display: none; /* По умолчанию скрыта на десктопе */
                }
                
                .bottom-nav.active {
                    display: block;
                }
                
                .bottom-nav-content {
                    display: flex;
                    justify-content: space-around;
                    align-items: center;
                    max-width: 500px;
                    margin: 0 auto;
                    padding: 0 10px;
                }
                
                .nav-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-decoration: none;
                    color: var(--text-secondary);
                    padding: 8px 12px;
                    border-radius: var(--radius-md);
                    transition: all var(--transition-normal);
                    position: relative;
                    flex: 1;
                }
                
                .nav-item:hover {
                    color: var(--text);
                    background: rgba(138, 43, 226, 0.1);
                }
                
                .nav-item.active {
                    color: var(--primary);
                }
                
                .nav-item.active .nav-icon {
                    background: rgba(138, 43, 226, 0.2);
                }
                
                .nav-icon {
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                    margin-bottom: 4px;
                    border-radius: var(--radius-full);
                    padding: 8px;
                    transition: all var(--transition-normal);
                }
                
                .nav-center {
                    position: relative;
                    margin-top: -20px;
                }
                
                .nav-icon-center {
                    width: 56px;
                    height: 56px;
                    background: var(--gradient-primary);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                    color: white;
                    margin-bottom: 4px;
                    box-shadow: var(--shadow-primary);
                    transition: all var(--transition-normal);
                }
                
                .nav-icon-center:hover {
                    transform: scale(1.1);
                    box-shadow: 0 8px 25px rgba(138, 43, 226, 0.4);
                }
                
                .nav-label {
                    font-size: 12px;
                    font-weight: 500;
                    text-align: center;
                }
                
                /* Показываем на мобильных устройствах */
                @media (max-width: 768px) {
                    .bottom-nav {
                        display: block;
                    }
                    
                    .header .nav .create-ad-btn {
                        display: none;
                    }
                    
                    body {
                        padding-bottom: 70px; /* Отступ для нижней навигации */
                    }
                }
                
                /* На десктопе показываем по требованию */
                @media (min-width: 769px) {
                    .bottom-nav.desktop-visible {
                        display: block;
                        position: relative;
                        margin-top: 40px;
                        border-top: 1px solid var(--border);
                        border-bottom: none;
                        background: transparent;
                    }
                    
                    .bottom-nav.desktop-visible .bottom-nav-content {
                        max-width: 600px;
                    }
                    
                    body {
                        padding-bottom: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    updateBottomNav() {
        const adminLink = document.getElementById('bottomAdminLink');
        if (adminLink) {
            if (this.isAdmin) {
                adminLink.classList.remove('hidden');
            } else {
                adminLink.classList.add('hidden');
            }
        }
        
        // Обновляем активную страницу
        const currentPage = this.getCurrentPage();
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === currentPage) {
                item.classList.add('active');
            }
        });
    }
    
    getCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('admin-panel.html')) return 'admin';
        if (path.includes('profile.html')) return 'profile';
        if (path.includes('faq.html')) return 'faq';
        return 'home'; // index.html
    }
    
    setupBottomNavEvents() {
        // Кнопка создания объявления в нижней панели
        const createAdBottomBtn = document.getElementById('createAdBottomBtn');
        if (createAdBottomBtn) {
            createAdBottomBtn.addEventListener('click', () => {
                this.openCreateAdModal();
            });
        }
        
        // Показываем/скрываем нижнюю панель на десктопе по нажатию
        const bottomNav = document.getElementById('bottomNav');
        if (bottomNav && !this.isMobile) {
            // На десктопе показываем кнопку для отображения нижней панели
            this.addDesktopToggleButton();
        }
    }
    
    addDesktopToggleButton() {
        const userAvatar = document.getElementById('userAvatar');
        if (userAvatar && !document.getElementById('desktopNavToggle')) {
            // Добавляем всплывающее меню
            userAvatar.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.toggleBottomNav();
            });
            
            // Подсказка при наведении
            userAvatar.title += '\n\nПКМ - показать/скрыть нижнюю панель';
        }
    }
    
    toggleBottomNav() {
        const bottomNav = document.getElementById('bottomNav');
        if (bottomNav) {
            bottomNav.classList.toggle('desktop-visible');
            
            // Показываем уведомление
            const isVisible = bottomNav.classList.contains('desktop-visible');
            this.showNotification(
                isVisible ? 'Нижняя панель показана' : 'Нижняя панель скрыта',
                'info'
            );
        }
    }
    
    setupMobileDetection() {
        window.addEventListener('resize', () => {
            this.isMobile = window.innerWidth <= 768;
            
            // Обновляем отображение нижней панели
            const bottomNav = document.getElementById('bottomNav');
            if (bottomNav) {
                if (this.isMobile) {
                    bottomNav.classList.add('active');
                    bottomNav.classList.remove('desktop-visible');
                } else {
                    bottomNav.classList.remove('active');
                }
            }
        });
    }
    
    openCreateAdModal() {
        if (this.currentUser.isGuest) {
            this.showAuthModal();
            return;
        }
        
        const modal = document.getElementById('createAdModal');
        if (modal) {
            modal.classList.add('active');
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
                user: { name: 'Алексей', avatar: 'А', id: 'user_1' },
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
                user: { name: 'Мария', avatar: 'М', id: 'user_2' }
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
                user: { name: 'Иван', avatar: 'И', id: 'user_3' }
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
        // Создание объявления (верхняя кнопка)
        const createAdBtn = document.getElementById('createAdBtn');
        const closeModalBtn = document.getElementById('closeModal');
        const cancelBtn = document.getElementById('cancelBtn');
        const modal = document.getElementById('createAdModal');
        const adForm = document.getElementById('adForm');
        
        if (createAdBtn) {
            createAdBtn.addEventListener('click', () => {
                this.openCreateAdModal();
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
        
        // Информация о пользователе при клике на аватар
        const userAvatar = document.getElementById('userAvatar');
        if (userAvatar) {
            userAvatar.addEventListener('click', (e) => {
                if (e.ctrlKey) {
                    this.showUserInfo();
                }
            });
        }
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
            
            // Сохраняем действие
            this.saveUserAction('like', adId);
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
            
            // Сохраняем действие
            this.saveUserAction('dislike', adId);
        }
    }
    
    messageSeller(adId) {
        if (this.currentUser.isGuest) {
            this.showAuthModal();
            return;
        }
        
        const ad = this.ads.find(a => a.id == adId);
        if (ad) {
            // Открываем чат
            this.openChat(ad.user.id, ad.user.name);
        }
    }
    
    openChat(userId, userName) {
        // В реальном приложении здесь будет открытие чата
        this.showNotification(`Открывается чат с ${userName}`, 'info');
        
        // Для демо: создаем окно чата
        const chatWindow = `
            <div style="
                position: fixed;
                bottom: 100px;
                right: 20px;
                width: 300px;
                height: 400px;
                background: var(--bg-card);
                border-radius: var(--radius-lg);
                border: 1px solid var(--border);
                box-shadow: var(--shadow-lg);
                z-index: 2000;
                display: flex;
                flex-direction: column;
            ">
                <div style="
                    padding: 16px;
                    border-bottom: 1px solid var(--border);
                    background: var(--gradient-primary);
                    color: white;
                    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
                ">
                    <strong>Чат с ${userName}</strong>
                    <button style="float: right; background: none; border: none; color: white;">×</button>
                </div>
                <div style="flex: 1; padding: 16px; overflow-y: auto;">
                    <p style="color: var(--text-muted); text-align: center;">Начните общение</p>
                </div>
                <div style="padding: 16px; border-top: 1px solid var(--border);">
                    <input type="text" placeholder="Введите сообщение..." 
                           style="width: 100%; padding: 8px; background: var(--bg-input); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--text);">
                </div>
            </div>
        `;
        
        // Добавляем временное окно чата
        const chatDiv = document.createElement('div');
        chatDiv.innerHTML = chatWindow;
        document.body.appendChild(chatDiv);
        
        // Закрытие по кнопке
        chatDiv.querySelector('button').addEventListener('click', () => {
            chatDiv.remove();
        });
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
            this.showNotification('Удалено из избранного', 'info');
        } else {
            favorites.push(adId);
            this.showNotification('Добавлено в избранное', 'success');
        }
        
        localStorage.setItem('favorites', JSON.stringify(favorites));
        
        // Сохраняем действие
        this.saveUserAction('favorite', adId);
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
        
        // Сохраняем жалобу
        const reports = JSON.parse(localStorage.getItem('reports') || '[]');
        reports.push({
            id: Date.now(),
            adId,
            ...reportData,
            userId: this.currentUser.id,
            userName: this.currentUser.name,
            status: 'pending',
            createdAt: new Date().toISOString()
        });
        localStorage.setItem('reports', JSON.stringify(reports));
        
        // Сохраняем действие
        this.saveUserAction('report', adId);
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
                id: this.currentUser.id,
                name: this.currentUser.name,
                avatar: this.currentUser.avatar
            },
            createdAt: new Date().toISOString(),
            user_id: this.currentUser.id // Привязка к user_id
        };
        
        // Добавляем в массив
        this.ads.unshift(adData);
        this.renderAds();
        
        // Обновляем статистику пользователя
        this.currentUser.ads = (this.currentUser.ads || 0) + 1;
        localStorage.setItem('vape_market_user', JSON.stringify(this.currentUser));
        
        // Показываем уведомление
        this.showNotification('Объявление успешно создано!', 'success');
        
        // Сохраняем в localStorage для демо
        const userAds = JSON.parse(localStorage.getItem('user_ads') || '[]');
        userAds.push(adData);
        localStorage.setItem('user_ads', JSON.stringify(userAds));
        
        console.log('Создано объявление:', adData);
    }
    
    checkAdminStatus() {
        const adminBanner = document.getElementById('adminBanner');
        
        if (this.adminLevel >= 3 && adminBanner) {
            adminBanner.classList.remove('hidden');
        }
    }
    
    showAuthModal() {
        // Для демо - просто показываем информацию
        this.showUserInfo();
    }
    
    showUserInfo() {
        const info = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--bg-card);
                padding: 24px;
                border-radius: var(--radius-lg);
                border: 1px solid var(--border);
                box-shadow: var(--shadow-lg);
                z-index: 2000;
                max-width: 400px;
                width: 90%;
            ">
                <h3 style="color: var(--primary); margin-bottom: 16px;">
                    <i class="fas fa-user"></i> Информация о пользователе
                </h3>
                
                <div style="margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                        <div class="user-avatar" style="width: 48px; height: 48px; font-size: 20px;">
                            ${this.currentUser.avatar}
                        </div>
                        <div>
                            <div style="font-weight: 600;">${this.currentUser.name}</div>
                            <div style="color: var(--text-secondary); font-size: 14px;">${this.currentUser.email}</div>
                        </div>
                    </div>
                    
                    <div style="background: var(--bg-input); padding: 12px; border-radius: var(--radius-md); margin-bottom: 12px;">
                        <div style="color: var(--text-muted); font-size: 12px;">USER ID</div>
                        <div style="font-family: monospace; word-break: break-all;">${this.currentUser.id}</div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                        <div>
                            <div style="color: var(--text-muted); font-size: 12px;">Рейтинг</div>
                            <div style="color: var(--warning); font-weight: 600;">
                                <i class="fas fa-star"></i> ${this.currentUser.rating}
                            </div>
                        </div>
                        <div>
                            <div style="color: var(--text-muted); font-size: 12px;">Объявления</div>
                            <div style="font-weight: 600;">${this.currentUser.ads || 0}</div>
                        </div>
                        <div>
                            <div style="color: var(--text-muted); font-size: 12px;">Лайки</div>
                            <div style="font-weight: 600;">${this.currentUser.likes || 0}</div>
                        </div>
                        <div>
                            <div style="color: var(--text-muted); font-size: 12px;">Сделки</div>
                            <div style="font-weight: 600;">${this.currentUser.deals || 0}</div>
                        </div>
                    </div>
                    
                    ${this.isAdmin ? `
                        <div style="margin-top: 12px; padding: 8px; background: rgba(138, 43, 226, 0.1); border-radius: var(--radius-md);">
                            <div style="color: var(--primary); font-weight: 600;">
                                <i class="fas fa-shield-alt"></i> Администратор (Уровень ${this.adminLevel})
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <div style="text-align: center;">
                    <button onclick="this.parentElement.parentElement.remove()" 
                            style="background: var(--primary); color: white; border: none; padding: 10px 24px; border-radius: var(--radius-md); cursor: pointer;">
                        Закрыть
                    </button>
                </div>
            </div>
        `;
        
        const modal = document.createElement('div');
        modal.innerHTML = info;
        document.body.appendChild(modal);
        
        // Закрытие по клику вне модального окна
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    saveUserAction(action, adId) {
        const actions = JSON.parse(localStorage.getItem('user_actions') || '[]');
        actions.push({
            userId: this.currentUser.id,
            action,
            adId,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('user_actions', JSON.stringify(actions));
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
                background: ${type === 'success' ? 'var(--success)' : 
                           type === 'warning' ? 'var(--warning)' : 
                           type === 'danger' ? 'var(--danger)' : 'var(--info)'};
                color: white;
                padding: 16px 24px;
                border-radius: var(--radius-md);
                box-shadow: var(--shadow-lg);
                z-index: 3000;
                display: flex;
                align-items: center;
                gap: 12px;
                animation: slideIn 0.3s ease;
            ">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 
                            type === 'warning' ? 'fa-exclamation-triangle' : 
                            type === 'danger' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                ${message}
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Добавляем стили для анимации
        if (!document.getElementById('notificationStyles')) {
            const style = document.createElement('style');
            style.id = 'notificationStyles';
            style.textContent = `
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Удаляем через 3 секунды
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    window.vapeMarket = new VapeMarket();
    
    // Для демо: возможность переключиться на админа по тройному клику
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) {
        let clickCount = 0;
        let clickTimer;
        
        userAvatar.addEventListener('click', () => {
            clickCount++;
            
            if (clickTimer) {
                clearTimeout(clickTimer);
            }
            
            clickTimer = setTimeout(() => {
                if (clickCount === 3) {
                    const adminUser = {
                        id: 'admin_' + Date.now(),
                        username: 'admin',
                        name: 'Администратор Системы',
                        avatar: 'A',
                        email: 'admin@vapemarket.ru',
                        isGuest: false,
                        isAdmin: true,
                        adminLevel: 3,
                        rating: 5.0,
                        ads: 45,
                        likes: 289,
                        deals: 156,
                        createdAt: new Date().toISOString(),
                        phone: '+7 (999) 123-45-67'
                    };
                    
                    if (confirm('Переключиться на Администратора для демо?')) {
                        localStorage.setItem('vape_market_user', JSON.stringify(adminUser));
                        location.reload();
                    }
                }
                clickCount = 0;
            }, 500);
        });
    }
});
